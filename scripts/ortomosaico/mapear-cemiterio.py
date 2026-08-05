#!/usr/bin/env python3
"""
CLI de apoio ao endereçamento Quadra/Fila/Túmulo por visão do agente.
Subcomandos: mapa, recorte, quadra, filas, gravar, verificar.

Nada aqui fala direto com o Supabase -- só gera imagem/JSON/SQL. Quem
executa o SQL é o agente, via MCP, mesmo caminho das migrations.

Uso típico (ver plano completo no dev log da sessão):
  python mapear-cemiterio.py mapa --src 01.gpkg --out <scratch>
  python mapear-cemiterio.py recorte --src 01.gpkg --centro-utm E,N --largura-m 70 --theta -13 --id Q01_A
  python mapear-cemiterio.py quadra --estado <scratch>/estado.json --src 01.gpkg --recortes-dir <scratch>/recortes --poligono-crop Q01_A:12,8 Q01_A:60,7 ... --nome "Quadra 1"
  python mapear-cemiterio.py filas --estado ... --quadra Q01 --remover 7 --contagem 1=27,2=26
  python mapear-cemiterio.py gravar --estado ... --quadra Q01 --cemiterio-id <uuid> --dry-run
"""

import argparse
import json
import math
from pathlib import Path

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from pyproj import Transformer
from rasterio.enums import Resampling

import lib_malha as lib


# ---------------------------------------------------------------- mapa ----

def cmd_mapa(args):
    ds, T, crs, res_nativa = lib.abrir(args.src)
    fator = args.fator
    out_h, out_w = ds.height // fator, ds.width // fator
    arr = ds.read([1, 2, 3], out_shape=(3, out_h, out_w), resampling=Resampling.average)
    rgb = np.transpose(arr, (1, 2, 0)).astype(np.uint8)
    cinza = rgb.mean(axis=2).astype(np.float64)
    res_m = res_nativa * fator

    janela_px = max(3, int(round(3.0 / res_m)))
    if janela_px % 2 == 0:
        janela_px += 1
    media = cv2.blur(cinza, (janela_px, janela_px))
    media_sq = cv2.blur(cinza ** 2, (janela_px, janela_px))
    textura = np.sqrt(np.clip(media_sq - media ** 2, 0, None))

    limiar = np.percentile(textura, args.percentil)
    mask = (textura >= limiar).astype(np.uint8)
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)

    n, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    area_min_px = args.area_min_m2 / (res_m ** 2)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(out_w / 100, out_h / 100), dpi=100)
    ax.imshow(rgb)
    ax.axis("off")

    candidatos = []
    letra_idx = 0
    for i in range(1, n):
        area_px = stats[i, cv2.CC_STAT_AREA]
        if area_px < area_min_px:
            continue
        x, y, w, h, area = stats[i]
        nome = chr(ord("A") + letra_idx)
        letra_idx += 1
        e0, n0 = T * (x * fator, y * fator)
        e1, n1 = T * ((x + w) * fator, (y + h) * fator)
        area_m2 = float(area_px * (res_m ** 2))
        candidatos.append({
            "nome": nome,
            "bbox_utm": [min(e0, e1), min(n0, n1), max(e0, e1), max(n0, n1)],
            "centro_utm": [(e0 + e1) / 2, (n0 + n1) / 2],
            "area_m2": area_m2,
        })
        rect = plt.Rectangle((x, y), w, h, fill=False, edgecolor="cyan", linewidth=1.5)
        ax.add_patch(rect)
        ax.text(x, max(0, y - 8), f"{nome} ({area_m2:.0f}m²)", color="cyan", fontsize=11, fontweight="bold")

    # barra de escala (50m)
    escala_m = 50
    escala_px = escala_m / res_m
    x0, y0 = out_w * 0.03, out_h * 0.97
    ax.plot([x0, x0 + escala_px], [y0, y0], color="yellow", linewidth=3)
    ax.text(x0, y0 - 15, f"{escala_m} m", color="yellow", fontsize=10, fontweight="bold")

    fig.tight_layout(pad=0)
    fig.savefig(out_dir / "00-geral.png", dpi=100)
    plt.close(fig)

    (out_dir / "candidatos.json").write_text(json.dumps(candidatos, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{len(candidatos)} candidato(s) -- {out_dir / '00-geral.png'}")


# -------------------------------------------------------------- recorte ---

def cmd_recorte(args):
    ds, T, crs, res_nativa = lib.abrir(args.src)

    if args.centro_utm:
        e, n = [float(v) for v in args.centro_utm.split(",")]
    elif args.centro_latlng:
        lat, lng = [float(v) for v in args.centro_latlng.split(",")]
        transformer = Transformer.from_crs("EPSG:4326", str(crs), always_xy=True)
        e, n = transformer.transform(lng, lat)
    else:
        raise SystemExit("precisa --centro-utm E,N ou --centro-latlng lat,lng")

    altura_m = args.altura_m or args.largura_m
    recorte, rgb = lib.Recorte.extrair(ds, (e, n), args.largura_m, altura_m, args.theta, args.escala_m_px, args.id)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    dpi = 150
    fig_w = recorte.largura_px / dpi + 1.0
    fig_h = recorte.altura_px / dpi + 0.8
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=dpi)
    ax.imshow(rgb, extent=[0, args.largura_m, altura_m, 0])
    grade = args.grade_m
    for x in np.arange(0, args.largura_m + 1e-6, grade):
        ax.axvline(x, color="magenta", alpha=0.22, linewidth=0.6)
    for y in np.arange(0, altura_m + 1e-6, grade):
        ax.axhline(y, color="magenta", alpha=0.22, linewidth=0.6)
    ax.set_xticks(np.arange(0, args.largura_m + 1e-6, grade))
    ax.set_yticks(np.arange(0, altura_m + 1e-6, grade))
    ax.tick_params(labelsize=7)
    ax.set_xlabel("metros (local do recorte)", fontsize=8)
    ax.set_title(f"{args.id}  centro_utm=({e:.1f},{n:.1f})  theta={args.theta}°  {args.escala_m_px}m/px", fontsize=8)
    fig.tight_layout()
    fig.savefig(out_dir / f"{args.id}.png", dpi=dpi)
    plt.close(fig)

    (out_dir / f"{args.id}.json").write_text(json.dumps(recorte.to_json(), indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"salvo {out_dir / (args.id + '.png')}")


# --------------------------------------------------------------- quadra ---

def _linha_x_poligono(poligono_2d, valor_corte, i_livre=0, i_corte=1):
    """Interseca a reta {eixo i_corte = valor_corte} com as arestas do
    poligono (pontos 2D genericos), devolve as coordenadas do eixo i_livre
    nos pontos de intersecao, ordenadas."""
    out = []
    for i in range(len(poligono_2d) - 1):
        a1, b1 = poligono_2d[i][i_livre], poligono_2d[i][i_corte]
        a2, b2 = poligono_2d[i + 1][i_livre], poligono_2d[i + 1][i_corte]
        if b1 == b2:
            continue
        if min(b1, b2) <= valor_corte < max(b1, b2):
            t = (valor_corte - b1) / (b2 - b1)
            out.append(a1 + t * (a2 - a1))
    return sorted(out)


def _gerar_pente(poligono_utm, centro, theta_deg, pitch_perp):
    """eu = direcao 'ao longo da fileira' (onde os tumulos se alinham em
    linha, ~vertical numa quadra tipica -- eixo perpendicular ao angulo
    theta medido, que e o angulo do CORREDOR entre fileiras).
    ev = direcao 'entre fileiras' (onde o corredor separa uma fileira da
    seguinte) -- essa e a que anda de pitch_perp em pitch_perp."""
    rad = math.radians(theta_deg)
    ev = np.array([math.cos(rad), math.sin(rad)])   # entre fileiras (corredor)
    eu = np.array([math.sin(rad), -math.cos(rad)])  # ao longo da fileira
    cx, cy = centro
    poligono_uv = []
    for e, n in poligono_utm:
        d = np.array([e - cx, n - cy])
        poligono_uv.append((float(d @ eu), float(d @ ev)))

    vs = [p[1] for p in poligono_uv]
    v_min, v_max = min(vs), max(vs)
    filas = []
    v = v_min + pitch_perp / 2
    idx = 1
    while v < v_max:
        us = _linha_x_poligono(poligono_uv, v, i_livre=0, i_corte=1)
        if len(us) >= 2:
            u0, u1 = us[0], us[-1]
            p0 = np.array([cx, cy]) + u0 * eu + v * ev
            p1 = np.array([cx, cy]) + u1 * eu + v * ev
            filas.append({
                "numero_provisorio": idx,
                "p0_utm": [float(p0[0]), float(p0[1])],
                "p1_utm": [float(p1[0]), float(p1[1])],
            })
            idx += 1
        v += pitch_perp
    return filas


def cmd_quadra(args):
    ds, T, crs, res_nativa = lib.abrir(args.src)
    estado = lib.carregar_estado(args.estado)

    recortes_cache = {}
    poligono_utm = []
    for spec in args.poligono_crop:
        rid, coords = spec.split(":")
        x, y = [float(v) for v in coords.split(",")]
        if rid not in recortes_cache:
            recortes_cache[rid] = lib.Recorte.from_json(json.loads(Path(args.recortes_dir, f"{rid}.json").read_text(encoding="utf-8")))
        e, n = recortes_cache[rid].para_utm(x, y)
        poligono_utm.append([e, n])
    if poligono_utm[0] != poligono_utm[-1]:
        poligono_utm.append(poligono_utm[0])

    xs = [p[0] for p in poligono_utm]
    ys = [p[1] for p in poligono_utm]
    centro = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)

    theta_fold, pitches_detectados, nitidez = lib.achar_malha(ds, poligono_utm)
    print(f"deteccao: theta={theta_fold:.1f}°  pitches={[round(p, 3) for p in pitches_detectados]}  nitidez={nitidez:.3f}")

    if args.theta is None:
        if nitidez < 0.10:
            raise SystemExit(
                f"nitidez baixa ({nitidez:.3f} < 0.10) -- sem malha clara nessa quadra pra confiar no automatico. "
                f"Passe --theta e --pitch-perp na mao (olhando um recorte Tier B da quadra)."
            )
        theta = theta_fold
    else:
        theta = args.theta

    if args.pitch_perp is not None:
        pitch_perp = args.pitch_perp
    elif pitches_detectados:
        pitch_perp = max(pitches_detectados)
    else:
        raise SystemExit("nenhum pitch detectado -- passe --pitch-perp na mao.")

    pitch_ao_longo = args.pitch_ao_longo or (min(pitches_detectados) if len(pitches_detectados) > 1 else pitch_perp)

    filas_propostas = _gerar_pente(poligono_utm, centro, theta, pitch_perp)

    quadra_id = args.id
    estado.setdefault("quadras", {})
    estado["quadras"][quadra_id] = {
        "nome": args.nome or quadra_id,
        "poligono_utm": poligono_utm,
        "centro_utm": list(centro),
        "theta": theta,
        "pitch_perp_m": pitch_perp,
        "pitch_ao_longo_m": pitch_ao_longo,
        "nitidez_deteccao": nitidez,
        "filas_propostas": filas_propostas,
        "filas_final": None,
        "status": "proposto",
    }
    lib.salvar_estado(args.estado, estado)

    # render da proposta sobre recorte retificado
    largura_m = (max(xs) - min(xs)) + 10
    altura_m = (max(ys) - min(ys)) + 10
    escala = max(0.05, round(largura_m / 1400, 3))
    recorte_prop, rgb = lib.Recorte.extrair(ds, centro, largura_m, altura_m, theta, escala, f"{quadra_id}_proposta")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    dpi = 150
    fig, ax = plt.subplots(figsize=(recorte_prop.largura_px / dpi + 1, recorte_prop.altura_px / dpi + 1), dpi=dpi)
    ax.imshow(rgb, extent=[0, largura_m, altura_m, 0])

    poligono_local = [recorte_prop.de_utm(e, n) for e, n in poligono_utm]
    ax.plot([p[0] for p in poligono_local], [p[1] for p in poligono_local], color="cyan", linewidth=2)

    for f in filas_propostas:
        x0, y0 = recorte_prop.de_utm(*f["p0_utm"])
        x1, y1 = recorte_prop.de_utm(*f["p1_utm"])
        ax.plot([x0, x1], [y0, y1], color="yellow", linewidth=1.5)
        ax.text(x0, y0, str(f["numero_provisorio"]), color="yellow", fontsize=9, fontweight="bold")
        ax.text(x1, y1, str(f["numero_provisorio"]), color="yellow", fontsize=9, fontweight="bold")

    ax.set_title(
        f"{quadra_id}  theta={theta:.1f}°  pitch_perp={pitch_perp:.2f}m  "
        f"pitch_ao_longo={pitch_ao_longo:.2f}m  nitidez={nitidez:.2f}  {len(filas_propostas)} fila(s) propostas",
        fontsize=8,
    )
    ax.set_xlabel("metros locais do recorte", fontsize=8)
    fig.tight_layout()
    fig.savefig(out_dir / f"{quadra_id}-proposta.png", dpi=dpi)
    plt.close(fig)

    recorte_json_path = out_dir / f"{quadra_id}_proposta.json"
    recorte_json_path.write_text(json.dumps(recorte_prop.to_json(), indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"theta={theta:.2f} pitch_perp={pitch_perp:.3f}m pitch_ao_longo={pitch_ao_longo:.3f}m nitidez={nitidez:.3f}")
    print(f"{len(filas_propostas)} fila(s) -- {out_dir / (quadra_id + '-proposta.png')}")


# ---------------------------------------------------------------- filas ---

def _parse_pares(lista, tipos):
    out = {}
    for item in lista or []:
        chave, valor = item.split("=") if "=" in item else item.split(":", 1)
        out[chave] = valor
    return out


def cmd_filas(args):
    estado = lib.carregar_estado(args.estado)
    q = estado["quadras"][args.quadra]
    recorte_prop = lib.Recorte.from_json(json.loads(Path(args.recortes_dir, f"{args.quadra}_proposta.json").read_text(encoding="utf-8")))

    remover = set((args.remover or "").split(",")) - {""}
    ajustes = {}
    for item in args.ajustar or []:
        num, coords = item.split(":")
        x0, y0, x1, y1 = [float(v) for v in coords.split(",")]
        ajustes[num] = (x0, y0, x1, y1)
    contagens = {}
    for item in args.contagem or []:
        num, n_vis = item.split("=")
        contagens[num] = int(n_vis)

    filas_finais = []
    proximo_numero = 1
    for f in q["filas_propostas"]:
        num_str = str(f["numero_provisorio"])
        if num_str in remover:
            continue
        p0_utm, p1_utm = f["p0_utm"], f["p1_utm"]
        if num_str in ajustes:
            x0, y0, x1, y1 = ajustes[num_str]
            p0_utm = list(recorte_prop.para_utm(x0, y0))
            p1_utm = list(recorte_prop.para_utm(x1, y1))

        for item in args.adicionar or []:
            pass  # tratado abaixo, fora do loop de propostas

        L = math.dist(p0_utm, p1_utm)
        pitch = q["pitch_ao_longo_m"]
        n_math = round(L / pitch) + 1 if pitch > 0 else None
        n_visual = contagens.get(num_str)
        if n_visual is not None and abs(n_visual - n_math) <= 1:
            status = "ok"
            n_final = n_math
        elif n_visual is not None:
            status = "divergente"
            n_final = n_math
        else:
            status = "sem_conferencia_visual"
            n_final = n_math

        resto = (L / pitch) - math.floor(L / pitch) if pitch > 0 else 0.5
        if 0.35 < resto < 0.65:
            status = "ambiguo_" + status

        filas_finais.append({
            "numero": proximo_numero,
            "p0_utm": p0_utm,
            "p1_utm": p1_utm,
            "comprimento_m": L,
            "n_math": n_math,
            "n_visual": n_visual,
            "quantidade": n_final,
            "status": status,
        })
        proximo_numero += 1

    for item in args.adicionar or []:
        coords = item.split(":")[-1] if ":" in item else item
        x0, y0, x1, y1 = [float(v) for v in coords.split(",")]
        p0_utm = list(recorte_prop.para_utm(x0, y0))
        p1_utm = list(recorte_prop.para_utm(x1, y1))
        L = math.dist(p0_utm, p1_utm)
        pitch = q["pitch_ao_longo_m"]
        n_math = round(L / pitch) + 1 if pitch > 0 else None
        filas_finais.append({
            "numero": proximo_numero, "p0_utm": p0_utm, "p1_utm": p1_utm,
            "comprimento_m": L, "n_math": n_math, "n_visual": None,
            "quantidade": n_math, "status": "adicionada_manual",
        })
        proximo_numero += 1

    q["filas_final"] = filas_finais
    q["status"] = "revisado"
    lib.salvar_estado(args.estado, estado)

    # render de conferencia
    ds, T, crs, res_nativa = lib.abrir(args.src)
    out_dir = Path(args.out)
    dpi = 150
    fig, ax = plt.subplots(figsize=(recorte_prop.largura_px / dpi + 1, recorte_prop.altura_px / dpi + 1), dpi=dpi)
    _, rgb = lib.Recorte.extrair(ds, tuple(q["centro_utm"]), recorte_prop.largura_m, recorte_prop.altura_m, recorte_prop.theta_deg, recorte_prop.escala_m_px, "tmp")
    ax.imshow(rgb, extent=[0, recorte_prop.largura_m, recorte_prop.altura_m, 0])

    cores = {"ok": "lime", "divergente": "red", "sem_conferencia_visual": "orange", "adicionada_manual": "cyan"}
    for f in filas_finais:
        x0, y0 = recorte_prop.de_utm(*f["p0_utm"])
        x1, y1 = recorte_prop.de_utm(*f["p1_utm"])
        cor = cores.get(f["status"].replace("ambiguo_", ""), "white")
        ax.plot([x0, x1], [y0, y1], color=cor, linewidth=1.5)
        ax.plot(x0, y0, "x", color=cor, markersize=8)
        ax.plot(x1, y1, "x", color=cor, markersize=8)
        rotulo = f"{f['numero']}: {f['n_math']}"
        if f["n_visual"] is not None:
            rotulo += f" (visual {f['n_visual']})"
        ax.text((x0 + x1) / 2, (y0 + y1) / 2, rotulo, color=cor, fontsize=7, fontweight="bold")

    ax.set_title(f"{args.quadra} revisada -- verde=ok vermelho=divergente laranja=sem conferência", fontsize=8)
    fig.tight_layout()
    fig.savefig(out_dir / f"{args.quadra}-revisada.png", dpi=dpi)
    plt.close(fig)

    total = sum(f["quantidade"] or 0 for f in filas_finais)
    print(f"{len(filas_finais)} fila(s), {total} túmulo(s) no total -- {out_dir / (args.quadra + '-revisada.png')}")
    for f in filas_finais:
        print(f"  fila {f['numero']}: {f['quantidade']} túmulos ({f['status']}, {f['comprimento_m']:.2f}m)")


# --------------------------------------------------------------- gravar ---

def cmd_gravar(args):
    estado = lib.carregar_estado(args.estado)
    q = estado["quadras"][args.quadra]
    ds, T, crs, res_nativa = lib.abrir(args.src)

    def utm_para_lnglat(e, n):
        return lib.utm_para_wgs84(e, n, crs)

    poligono_wgs84 = [list(utm_para_lnglat(e, n)) for e, n in q["poligono_utm"]]
    centro_lng, centro_lat = utm_para_lnglat(*q["centro_utm"])

    numero_quadra_provisorio = args.numero_quadra

    saida = {
        "quadra_insert": {
            "cemiterio_id": args.cemiterio_id,
            "numero": numero_quadra_provisorio,
            "nome": q["nome"],
            "poligono": {"type": "Polygon", "coordinates": [poligono_wgs84]},
            "centro_latitude": centro_lat,
            "centro_longitude": centro_lng,
        },
        "filas_insert": [],
        "gerar_lapides_calls": [],
    }

    for f in q["filas_final"]:
        p0 = list(utm_para_lnglat(*f["p0_utm"]))
        p1 = list(utm_para_lnglat(*f["p1_utm"]))
        saida["filas_insert"].append({
            "numero_provisorio": f["numero"],
            "cemiterio_id": args.cemiterio_id,
            "eixo": {"type": "LineString", "coordinates": [p0, p1]},
            "comprimento_m": f["comprimento_m"],
            "quantidade_prevista": f["quantidade"],
            "status_contagem": f["status"],
        })
        saida["gerar_lapides_calls"].append({"fila_numero_provisorio": f["numero"], "quantidade": f["quantidade"]})

    out_path = Path(args.out) / f"{args.quadra}-gravar.json"
    out_path.write_text(json.dumps(saida, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(saida, indent=2, ensure_ascii=False) if args.dry_run else f"salvo {out_path}")


# ------------------------------------------------------------- verificar --

def cmd_verificar(args):
    ds, T, crs, res_nativa = lib.abrir(args.src)
    geo = json.loads(Path(args.geojson).read_text(encoding="utf-8"))
    transformer = Transformer.from_crs("EPSG:4326", str(crs), always_xy=True)

    todos_pontos = [f["geometry"]["coordinates"] for f in geo.get("lapides", {}).get("features", [])]
    if not todos_pontos:
        raise SystemExit("geojson sem lapides")

    xs_utm, ys_utm = [], []
    for lng, lat in todos_pontos:
        e, n = transformer.transform(lng, lat)
        xs_utm.append(e)
        ys_utm.append(n)

    centro = ((min(xs_utm) + max(xs_utm)) / 2, (min(ys_utm) + max(ys_utm)) / 2)
    largura_m = (max(xs_utm) - min(xs_utm)) + 10
    altura_m = (max(ys_utm) - min(ys_utm)) + 10
    escala = max(0.05, round(largura_m / 1400, 3))

    recorte, rgb = lib.Recorte.extrair(ds, centro, largura_m, altura_m, 0, escala, "verificacao")
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    dpi = 150
    fig, ax = plt.subplots(figsize=(recorte.largura_px / dpi + 1, recorte.altura_px / dpi + 1), dpi=dpi)
    ax.imshow(rgb, extent=[0, largura_m, altura_m, 0])

    for feat in geo.get("quadras", {}).get("features", []):
        anel = feat["geometry"]["coordinates"][0]
        pontos = [recorte.de_utm(*transformer.transform(lng, lat)) for lng, lat in anel]
        ax.plot([p[0] for p in pontos], [p[1] for p in pontos], color="cyan", linewidth=1.5)

    for feat in geo.get("filas", {}).get("features", []):
        coords = feat["geometry"]["coordinates"]
        pontos = [recorte.de_utm(*transformer.transform(lng, lat)) for lng, lat in coords]
        ax.plot([p[0] for p in pontos], [p[1] for p in pontos], color="yellow", linewidth=1)

    for lng, lat in todos_pontos:
        x, y = recorte.de_utm(*transformer.transform(lng, lat))
        ax.plot(x, y, "o", color="lime", markersize=3)

    ax.set_title(f"Conferência -- {len(todos_pontos)} túmulo(s) no banco", fontsize=9)
    fig.tight_layout()
    fig.savefig(out_dir / "conferencia.png", dpi=dpi)
    plt.close(fig)
    print(f"{len(todos_pontos)} túmulo(s) -- {out_dir / 'conferencia.png'}")


# ------------------------------------------------------------------ main --

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("mapa")
    p.add_argument("--src", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--fator", type=int, default=16)
    p.add_argument("--percentil", type=float, default=88)
    p.add_argument("--area-min-m2", type=float, default=400)
    p.set_defaults(func=cmd_mapa)

    p = sub.add_parser("recorte")
    p.add_argument("--src", required=True)
    p.add_argument("--centro-utm")
    p.add_argument("--centro-latlng")
    p.add_argument("--largura-m", type=float, required=True)
    p.add_argument("--altura-m", type=float)
    p.add_argument("--theta", type=float, default=0.0)
    p.add_argument("--escala-m-px", type=float, default=0.05)
    p.add_argument("--grade-m", type=float, default=5.0)
    p.add_argument("--id", required=True)
    p.add_argument("--out", required=True)
    p.set_defaults(func=cmd_recorte)

    p = sub.add_parser("quadra")
    p.add_argument("--src", required=True)
    p.add_argument("--estado", required=True)
    p.add_argument("--recortes-dir", required=True)
    p.add_argument("--poligono-crop", nargs="+", required=True)
    p.add_argument("--id", required=True)
    p.add_argument("--nome")
    p.add_argument("--theta", type=float, help="override manual do angulo real (graus) -- ignora deteccao automatica")
    p.add_argument("--pitch-perp", type=float, help="override manual do espacamento entre fileiras (m)")
    p.add_argument("--pitch-ao-longo", type=float, help="override manual do espacamento dentro da fileira (m)")
    p.add_argument("--out", required=True)
    p.set_defaults(func=cmd_quadra)

    p = sub.add_parser("filas")
    p.add_argument("--src", required=True)
    p.add_argument("--estado", required=True)
    p.add_argument("--recortes-dir", required=True)
    p.add_argument("--quadra", required=True)
    p.add_argument("--remover", default="")
    p.add_argument("--ajustar", nargs="*")
    p.add_argument("--adicionar", nargs="*")
    p.add_argument("--contagem", nargs="*")
    p.add_argument("--out", required=True)
    p.set_defaults(func=cmd_filas)

    p = sub.add_parser("gravar")
    p.add_argument("--src", required=True)
    p.add_argument("--estado", required=True)
    p.add_argument("--quadra", required=True)
    p.add_argument("--cemiterio-id", required=True)
    p.add_argument("--numero-quadra", type=int, required=True)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--out", required=True)
    p.set_defaults(func=cmd_gravar)

    p = sub.add_parser("verificar")
    p.add_argument("--src", required=True)
    p.add_argument("--geojson", required=True)
    p.add_argument("--out", required=True)
    p.set_defaults(func=cmd_verificar)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
