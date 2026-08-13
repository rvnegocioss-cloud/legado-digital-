#!/usr/bin/env python3
"""
Converte um ortomosaico georreferenciado num arquivo PMTiles pronto pra
servir no MapLibre GL JS via HTTP range requests, sem precisar de servidor
de tiles. 2 modos de entrada:

  --src <arquivo.gpkg>   GeoPackage raster (qualquer CRS) -> WarpedVRT
                         alinhada a EPSG:3857 -> tiles WebP com alfa.
  --src-xyz <pasta.zip>  Pirâmide de tiles pronta em esquema XYZ (Google/
                         slippy map), já em EPSG:3857 -- copia direto,
                         sem reamostrar (mais rápido, sem perda extra).
                         Achado 2026-08-13 (São Pedro): quando o
                         processador do voo (Agisoft Metashape etc.) já
                         entrega a pirâmide renderizada, é melhor
                         reaproveitar os tiles nativos do que tentar
                         remontar um raster único e rewarp -- ver
                         docs/mapa.md.

Ambos os modos terminam em: MBTiles (SQLite, esquema TMS) -> pmtiles.convert()
-> .pmtiles

Uso (GeoPackage):
  python converter-ortomosaico.py --src "C:\caminho\01.gpkg" --out "C:\tmp\orto"
      --minzoom 14 --maxzoom 22 --quality 78 --quality-overview 70

Uso (pirâmide XYZ pronta):
  python converter-ortomosaico.py --src-xyz "C:\caminho\mapa.zip" --out "C:\tmp\orto"
      --minzoom 15 --maxzoom 23 --quality 55 --quality-overview 62

Gera <out>.mbtiles e <out>.pmtiles. --resume retoma um job interrompido
sem reprocessar tiles ja gravados.
"""

import argparse
import io
import math
import re
import sqlite3
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

import numpy as np
import rasterio
from affine import Affine
from PIL import Image
from rasterio.vrt import WarpedVRT
from rasterio.warp import transform_bounds
from rasterio.windows import Window
from rasterio.enums import Resampling

WEB_MERCATOR_ORIGIN = 20037508.342789244  # metros, meio da circunferencia da Terra em 3857


def calcular_grade(src, zmax):
    """Alinha os limites do raster origem à grade de tiles XYZ do zoom máximo,
    em EPSG:3857 -- devolve a janela de tiles (xmin..xmax, ymin..ymax) e a
    Affine transform da VRT que faz cada tile cair exatamente numa janela
    de 256x256 sem leitura boundless (WarpedVRT não permite boundless)."""
    tile_size_m = 2 * WEB_MERCATOR_ORIGIN / (2 ** zmax)
    res = tile_size_m / 256

    w, s, e, n = transform_bounds(src.crs, "EPSG:3857", *src.bounds)

    xmin = math.floor((w + WEB_MERCATOR_ORIGIN) / tile_size_m)
    xmax = math.floor((e + WEB_MERCATOR_ORIGIN) / tile_size_m)
    ymin = math.floor((WEB_MERCATOR_ORIGIN - n) / tile_size_m)
    ymax = math.floor((WEB_MERCATOR_ORIGIN - s) / tile_size_m)

    left = -WEB_MERCATOR_ORIGIN + xmin * tile_size_m
    top = WEB_MERCATOR_ORIGIN - ymin * tile_size_m
    vrt_transform = Affine(res, 0, left, 0, -res, top)

    largura = (xmax - xmin + 1) * 256
    altura = (ymax - ymin + 1) * 256

    return xmin, xmax, ymin, ymax, vrt_transform, largura, altura


def bounds_wgs84(src):
    w, s, e, n = transform_bounds(src.crs, "EPSG:4326", *src.bounds)
    return w, s, e, n


def criar_mbtiles(caminho, nome, bounds4326, center, minzoom, maxzoom):
    con = sqlite3.connect(caminho)
    cur = con.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA synchronous=OFF")
    cur.execute("CREATE TABLE IF NOT EXISTS metadata (name TEXT, value TEXT)")
    cur.execute(
        "CREATE TABLE IF NOT EXISTS tiles ("
        "zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB)"
    )
    cur.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS tile_index "
        "ON tiles (zoom_level, tile_column, tile_row)"
    )
    metadata = {
        "name": nome,
        "format": "webp",
        "type": "overlay",
        "version": "1.0",
        "bounds": ",".join(f"{v:.6f}" for v in bounds4326),
        "center": f"{center[0]:.6f},{center[1]:.6f},{minzoom}",
        "minzoom": str(minzoom),
        "maxzoom": str(maxzoom),
        "attribution": "Ortomosaico de drone — Legado Digital",
    }
    cur.executemany("INSERT INTO metadata (name, value) VALUES (?, ?)", metadata.items())
    con.commit()
    return con


def tile_existe(con, z, x, y_tms):
    cur = con.execute(
        "SELECT 1 FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=? LIMIT 1",
        (z, x, y_tms),
    )
    return cur.fetchone() is not None


def gravar_tile(con, z, x, y_xyz, arr_rgba, quality):
    """arr_rgba: numpy array (4, 256, 256) uint8. Pula tile 100% transparente."""
    if arr_rgba[3].max() == 0:
        return False

    img = Image.fromarray(np.transpose(arr_rgba, (1, 2, 0)), "RGBA")
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=quality, method=4)

    y_tms = (2 ** z - 1) - y_xyz  # MBTiles usa esquema TMS (eixo Y invertido de XYZ)
    con.execute(
        "INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) "
        "VALUES (?, ?, ?, ?)",
        (z, x, y_tms, buf.getvalue()),
    )
    return True


def gerar_zoom_maximo(src, con, zmax, quality, resume):
    xmin, xmax, ymin, ymax, vrt_transform, largura, altura = calcular_grade(src, zmax)
    total = (xmax - xmin + 1) * (ymax - ymin + 1)
    gravados = 0
    pulados_vazio = 0
    pulados_resume = 0
    processados = 0

    print(f"[zoom {zmax}] grade x:{xmin}-{xmax} y:{ymin}-{ymax} ({total} tiles possíveis)")

    with WarpedVRT(
        src,
        crs="EPSG:3857",
        transform=vrt_transform,
        width=largura,
        height=altura,
        resampling=Resampling.cubic,
    ) as vrt:
        for ty in range(ymin, ymax + 1):
            for tx in range(xmin, xmax + 1):
                processados += 1
                if resume and tile_existe(con, zmax, tx, (2 ** zmax - 1) - ty):
                    pulados_resume += 1
                    continue

                janela = Window((tx - xmin) * 256, (ty - ymin) * 256, 256, 256)
                arr = vrt.read(window=janela)

                if gravar_tile(con, zmax, tx, ty, arr, quality):
                    gravados += 1
                else:
                    pulados_vazio += 1

                if processados % 500 == 0:
                    con.commit()
                    print(
                        f"  {processados}/{total} — gravados {gravados}, "
                        f"vazios {pulados_vazio}, retomados {pulados_resume}"
                    )

    con.commit()
    print(
        f"[zoom {zmax}] fim — gravados {gravados}, vazios {pulados_vazio}, "
        f"retomados {pulados_resume}"
    )
    return xmin, xmax, ymin, ymax


def gerar_overviews(con, zmax, zmin, extents, quality):
    """Constrói cada zoom menor mesclando 2x2 filhos já gravados no MBTiles —
    nunca re-warpa a origem, só reamostra a própria pirâmide (mais rápido e
    garante alinhamento perfeito entre níveis)."""
    xmin_z, xmax_z, ymin_z, ymax_z = extents

    for z in range(zmax - 1, zmin - 1, -1):
        xmin_z = xmin_z // 2
        xmax_z = xmax_z // 2
        ymin_z = ymin_z // 2
        ymax_z = ymax_z // 2
        total = (xmax_z - xmin_z + 1) * (ymax_z - ymin_z + 1)
        gravados = 0
        print(f"[zoom {z}] mesclando filhos do zoom {z + 1} ({total} tiles possíveis)")

        for ty in range(ymin_z, ymax_z + 1):
            for tx in range(xmin_z, xmax_z + 1):
                canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
                algum_filho = False

                for dy in (0, 1):
                    for dx in (0, 1):
                        fx, fy = tx * 2 + dx, ty * 2 + dy
                        fy_tms = (2 ** (z + 1) - 1) - fy
                        row = con.execute(
                            "SELECT tile_data FROM tiles WHERE zoom_level=? "
                            "AND tile_column=? AND tile_row=?",
                            (z + 1, fx, fy_tms),
                        ).fetchone()
                        if row:
                            filho = Image.open(io.BytesIO(row[0])).convert("RGBA")
                            canvas.paste(filho, (dx * 256, dy * 256))
                            algum_filho = True

                if not algum_filho:
                    continue

                reduzido = canvas.resize((256, 256), Image.LANCZOS)
                arr = np.transpose(np.array(reduzido), (2, 0, 1))
                if gravar_tile(con, z, tx, ty, arr, quality):
                    gravados += 1

        con.commit()
        print(f"[zoom {z}] fim — {gravados} tiles gravados")


def tile2lonlat(x, y, z):
    """Formula padrao slippy map: canto superior-esquerdo do tile x/y/z."""
    n = 2 ** z
    lon = x / n * 360 - 180
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    return lon, math.degrees(lat_rad)


def indexar_piramide_xyz(zf):
    """Varre o zip sem extrair -- devolve {z: [(x, y, arcname), ...]}."""
    padrao = re.compile(r"^(\d+)/(\d+)/(\d+)\.png$")
    por_zoom = defaultdict(list)
    for nome in zf.namelist():
        m = padrao.match(nome)
        if not m:
            continue
        z, x, y = (int(g) for g in m.groups())
        por_zoom[z].append((x, y, nome))
    return por_zoom


def processar_piramide_xyz(caminho_zip, con, minzoom, maxzoom, quality, quality_overview, resume):
    """Copia uma piramide XYZ (ja em EPSG:3857, tipo Google/slippy map) direto
    pro MBTiles -- sem rewarp, sem reamostragem: os tiles do zoom escolhido
    ja vem prontos do processador do voo (gdal2tiles/Metashape/etc)."""
    with zipfile.ZipFile(caminho_zip) as zf:
        por_zoom = indexar_piramide_xyz(zf)
        disponiveis = sorted(por_zoom)
        if not disponiveis:
            raise SystemExit(f"Nenhum tile z/x/y.png encontrado em {caminho_zip}")
        print(f"Niveis disponiveis no zip: {disponiveis[0]}-{disponiveis[-1]}")

        zmax_real = min(maxzoom, disponiveis[-1])
        if zmax_real != maxzoom:
            print(f"AVISO: --maxzoom {maxzoom} pedido, mas o zip so tem ate {zmax_real}. Usando {zmax_real}.")

        # Bounds/center vem do range real de tiles no nivel mais fino usado --
        # nao depende de nenhum manifesto externo, e sempre bate com o
        # conteudo de verdade do zip.
        xs = [t[0] for t in por_zoom[zmax_real]]
        ys = [t[1] for t in por_zoom[zmax_real]]
        xmin, xmax, ymin, ymax = min(xs), max(xs), min(ys), max(ys)
        w, n = tile2lonlat(xmin, ymin, zmax_real)
        e, s = tile2lonlat(xmax + 1, ymax + 1, zmax_real)
        center = ((w + e) / 2, (s + n) / 2)
        print(f"  bounds WGS84 (derivado dos tiles z{zmax_real}): {w:.6f},{s:.6f},{e:.6f},{n:.6f}")

        for z in range(zmax_real, minzoom - 1, -1):
            tiles = por_zoom.get(z)
            if not tiles:
                print(f"[zoom {z}] nenhum tile no zip -- pulando (buraco na piramide de origem)")
                continue

            q = quality if z == zmax_real else quality_overview
            gravados = pulados_vazio = pulados_resume = 0
            print(f"[zoom {z}] {len(tiles)} tiles no zip")

            for i, (x, y, arcname) in enumerate(tiles, 1):
                y_tms = (2 ** z - 1) - y
                if resume and tile_existe(con, z, x, y_tms):
                    pulados_resume += 1
                    continue

                with zf.open(arcname) as f:
                    img = Image.open(io.BytesIO(f.read())).convert("RGBA")
                if img.size != (256, 256):
                    img = img.resize((256, 256), Image.LANCZOS)
                arr = np.transpose(np.array(img), (2, 0, 1))

                if gravar_tile(con, z, x, y, arr, q):
                    gravados += 1
                else:
                    pulados_vazio += 1

                if i % 1000 == 0:
                    con.commit()
                    print(f"  {i}/{len(tiles)} — gravados {gravados}, vazios {pulados_vazio}, retomados {pulados_resume}")

            con.commit()
            print(f"[zoom {z}] fim — gravados {gravados}, vazios {pulados_vazio}, retomados {pulados_resume}")

    return w, s, e, n, center, zmax_real


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    origem = ap.add_mutually_exclusive_group(required=True)
    origem.add_argument("--src", help="Caminho do GeoPackage (.gpkg) de origem")
    origem.add_argument("--src-xyz", help="Zip com piramide de tiles XYZ pronta (ja em EPSG:3857)")
    ap.add_argument("--out", required=True, help="Prefixo de saída (sem extensão)")
    ap.add_argument("--minzoom", type=int, default=14)
    ap.add_argument("--maxzoom", type=int, default=22)
    ap.add_argument("--quality", type=int, default=78, help="Qualidade WebP do zoom máximo")
    ap.add_argument(
        "--quality-overview", type=int, default=70, help="Qualidade WebP dos zooms menores"
    )
    ap.add_argument("--nome", default="Ortomosaico", help="Nome gravado nos metadados")
    ap.add_argument("--resume", action="store_true", help="Retoma job interrompido")
    args = ap.parse_args()

    mbtiles_path = f"{args.out}.mbtiles"
    pmtiles_path = f"{args.out}.pmtiles"
    zmax_final = args.maxzoom

    if args.src_xyz:
        print(f"Abrindo piramide XYZ {args.src_xyz} ...")
        # Bounds só são conhecidos depois de indexar o zip -- criar_mbtiles
        # roda dentro de processar_piramide_xyz por causa disso, diferente
        # do fluxo --src (que já sabe os bounds antes de começar).
        con = None

        with zipfile.ZipFile(args.src_xyz) as zf_peek:
            por_zoom_peek = indexar_piramide_xyz(zf_peek)
        if not por_zoom_peek:
            raise SystemExit(f"Nenhum tile z/x/y.png encontrado em {args.src_xyz}")
        zmax_final = min(args.maxzoom, max(por_zoom_peek))
        xs = [t[0] for t in por_zoom_peek[zmax_final]]
        ys = [t[1] for t in por_zoom_peek[zmax_final]]
        w, n = tile2lonlat(min(xs), min(ys), zmax_final)
        e, s = tile2lonlat(max(xs) + 1, max(ys) + 1, zmax_final)
        center = ((w + e) / 2, (s + n) / 2)

        con = criar_mbtiles(
            mbtiles_path, args.nome, (w, s, e, n), center, args.minzoom, zmax_final
        )
        w, s, e, n, center, zmax_final = processar_piramide_xyz(
            args.src_xyz, con, args.minzoom, args.maxzoom, args.quality, args.quality_overview, args.resume
        )
        con.close()
    else:
        print(f"Abrindo {args.src} ...")
        with rasterio.open(args.src) as src:
            print(f"  CRS origem: {src.crs}")
            print(f"  dimensões: {src.width}x{src.height}, {src.count} bandas")

            w, s, e, n = bounds_wgs84(src)
            center = ((w + e) / 2, (s + n) / 2)
            print(f"  bounds WGS84: {w:.6f},{s:.6f},{e:.6f},{n:.6f}")

            con = criar_mbtiles(
                mbtiles_path, args.nome, (w, s, e, n), center, args.minzoom, args.maxzoom
            )

            extents = gerar_zoom_maximo(src, con, args.maxzoom, args.quality, args.resume)
            gerar_overviews(con, args.maxzoom, args.minzoom, extents, args.quality_overview)

            con.close()

    tamanho_mb = Path(mbtiles_path).stat().st_size / 1024 / 1024
    print(f"\nMBTiles pronto: {mbtiles_path} ({tamanho_mb:.1f} MB)")

    print("Convertendo pra PMTiles...")
    from pmtiles.convert import mbtiles_to_pmtiles

    mbtiles_to_pmtiles(mbtiles_path, pmtiles_path, zmax_final)

    tamanho_pm_mb = Path(pmtiles_path).stat().st_size / 1024 / 1024
    print(f"PMTiles pronto: {pmtiles_path} ({tamanho_pm_mb:.1f} MB)")
    print(f"\nbounds pra salvar no banco: [{w:.6f}, {s:.6f}, {e:.6f}, {n:.6f}]")
    print(f"center: {center[0]:.6f}, {center[1]:.6f}")
    print(f"minzoom: {args.minzoom}  maxzoom: {zmax_final}")


if __name__ == "__main__":
    sys.exit(main())
