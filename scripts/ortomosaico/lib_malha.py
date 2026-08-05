"""
Helpers de deteccao de malha de tumulos (angulo/pitch/corredor) e de
georreferencia de recortes retificados, usados por mapear-cemiterio.py.

Trabalha inteiramente em metros no CRS metrico nativo do raster (ex:
EPSG:31982, SIRGAS 2000/UTM 22S) -- conversao pra WGS84 (lng/lat) so
acontece no ultimo passo, antes de gravar no banco.

A fase de BUSCA (achar_angulo/achar_pitch_eixo/achar_corredores) roda em
memoria com cv2.warpAffine sobre um array ja lido do raster -- rapido,
testa dezenas de angulos sem reler disco. A fase de RENDER/GRAVACAO usa
WarpedVRT com uma Affine explicita (mesmo padrao ja usado e testado em
converter-ortomosaico.py) -- e essa Affine (guardada em Recorte) que vira
a fonte unica de verdade pra qualquer conversao pixel<->metro<->UTM,
nunca derivada de novo por trigonometria solta.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, asdict
from pathlib import Path

import cv2
import numpy as np
import rasterio
from affine import Affine
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from rasterio.windows import Window
from scipy.signal import find_peaks

_transformer_cache: dict[str, Transformer] = {}


def abrir(src: str):
    ds = rasterio.open(src)
    res_m = abs(ds.transform.a)
    return ds, ds.transform, ds.crs, res_m


def utm_para_wgs84(x: float, y: float, crs_origem: str):
    key = str(crs_origem)
    if key not in _transformer_cache:
        _transformer_cache[key] = Transformer.from_crs(crs_origem, "EPSG:4326", always_xy=True)
    lng, lat = _transformer_cache[key].transform(x, y)
    return lng, lat


# --------------------------------------------------------------------
# Fase de busca (em memoria, aproximada -- serve pra achar theta/pitch,
# nao pra gravar coordenada final)
# --------------------------------------------------------------------

def ler_janela_cinza(ds, centro_utm: tuple[float, float], lado_m: float, alvo_px: int = 1400):
    """Le um recorte quadrado em tons de cinza (media RGB) ao redor do
    centro, decimando via overview se precisar pra nao estourar memoria."""
    res_nativa = abs(ds.transform.a)
    col_c, row_c = ~ds.transform * centro_utm
    meio_px_nativo = (lado_m / 2) / res_nativa
    window = Window(col_c - meio_px_nativo, row_c - meio_px_nativo, meio_px_nativo * 2, meio_px_nativo * 2)
    window = window.intersection(Window(0, 0, ds.width, ds.height))

    fator = max(1, int(round(window.width / alvo_px)))
    out_h = max(1, int(window.height / fator))
    out_w = max(1, int(window.width / fator))
    arr = ds.read([1, 2, 3], window=window, out_shape=(3, out_h, out_w), resampling=Resampling.average)
    cinza = arr.mean(axis=0).astype(np.float64)
    res_m = res_nativa * fator
    return cinza, res_m


def autocorr(x: np.ndarray) -> np.ndarray:
    n = len(x)
    f = np.fft.rfft(x, n=2 * n)
    ac = np.fft.irfft(f * np.conj(f))[:n]
    return ac / (ac[0] + 1e-9)


def pico_autocorr(ac: np.ndarray, res_m: float, faixa_m: tuple[float, float] = (0.8, 4.0)):
    """Devolve (lag, forca). (0, 0.0) -- falha honesta -- quando não há pico
    de verdade na faixa, nunca a borda da busca disfarçada de resultado."""
    lag_min = max(1, int(faixa_m[0] / res_m))
    lag_max = min(len(ac) - 1, int(faixa_m[1] / res_m))
    if lag_min >= lag_max:
        return 0, 0.0
    janela = ac[lag_min:lag_max + 1]
    picos, props = find_peaks(janela, prominence=0.02)
    if len(picos) == 0:
        return 0, 0.0
    idx = picos[int(np.argmax(props["prominences"]))]
    return lag_min + int(idx), float(janela[idx])


def _perfil_rotacionado(img_cinza: np.ndarray, theta_deg: float, eixo: str) -> np.ndarray:
    """So usado hoje por achar_pitch_eixo (afinar um eixo já escolhido) --
    achar_malha (abaixo) é quem decide ângulo, não isso mais."""
    h, w = img_cinza.shape
    centro = (w / 2, h / 2)
    m = cv2.getRotationMatrix2D(centro, theta_deg, 1.0)
    rot = cv2.warpAffine(img_cinza, m, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    perfil = (rot.mean(axis=1) if eixo == "perp" else rot.mean(axis=0)).astype(np.float64)
    from scipy.ndimage import gaussian_filter1d
    janela = max(3, int(len(perfil) * 0.05))
    suave = gaussian_filter1d(perfil, sigma=janela / 2, mode="nearest")
    sinal = perfil - suave
    return sinal * np.hanning(len(sinal))  # taper -- sem isso a borda ainda pesa demais


def achar_pitch_eixo(img_cinza: np.ndarray, res_m: float, theta_deg: float, eixo: str):
    """Afina o pitch (e as fases) de um eixo cujo ângulo já foi decidido por
    achar_malha. Devolve (pitch_m, forca, fases_m)."""
    sinal = _perfil_rotacionado(img_cinza, theta_deg, eixo)
    ac = autocorr(sinal)
    lag, forca = pico_autocorr(ac, res_m)
    pitch_m = lag * res_m
    dist_px = max(1, int(lag * 0.6)) if lag > 0 else max(1, int(1.0 / res_m))
    picos, _ = find_peaks(sinal, distance=dist_px, prominence=0.01)
    return pitch_m, forca, (picos * res_m).tolist()


def achar_corredores(img_cinza: np.ndarray, res_m: float, theta_deg: float, eixo: str):
    """Corredor = textura LOCAL baixa (nao desvio da linha inteira, que
    diluia o sinal) -- ainda mais ruidoso que achar_pitch_eixo, so rascunho
    pro eixo fraco."""
    h, w = img_cinza.shape
    centro = (w / 2, h / 2)
    m = cv2.getRotationMatrix2D(centro, theta_deg, 1.0)
    rot = cv2.warpAffine(img_cinza, m, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float64)

    janela_px = max(3, int(round(0.5 / res_m)))
    if janela_px % 2 == 0:
        janela_px += 1
    media = cv2.blur(rot, (janela_px, janela_px))
    media_sq = cv2.blur(rot ** 2, (janela_px, janela_px))
    textura_local = np.sqrt(np.clip(media_sq - media ** 2, 0, None))

    axis = 1 if eixo == "perp" else 0
    perfil = textura_local.mean(axis=axis)
    contraste = float((perfil.max() - perfil.min()) / (perfil.mean() + 1e-9))
    dist_px = max(1, int(0.5 / res_m))
    picos, _ = find_peaks(-perfil, distance=dist_px, prominence=perfil.std() * 0.3)
    return (picos * res_m).tolist(), contraste


# --------------------------------------------------------------------
# Deteccao de malha por FFT 2D + voto entre sub-janelas -- substitui a
# antiga achar_angulo (1D, comprovadamente instavel: 3m de deslocamento
# de janela trocava o angulo detectado de -1.5 pra +23.5 graus). Colapsar
# a imagem numa unica dimensao perde informacao demais numa quadra
# heterogenea; o espectro 2D + votacao por sub-regiao e o que sobrevive
# a heterogeneidade (testado e validado no bloco real do Jose Lazaro).
# --------------------------------------------------------------------

def _ponto_no_poligono(x: float, y: float, anel: list[tuple[float, float]]) -> bool:
    dentro = False
    for i in range(len(anel) - 1):
        x1, y1 = anel[i]
        x2, y2 = anel[i + 1]
        if (y1 > y) != (y2 > y):
            xin = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < xin:
                dentro = not dentro
    return dentro


def _grade_dentro_do_poligono(poligono_utm, passo_m: float):
    xs = [p[0] for p in poligono_utm]
    ys = [p[1] for p in poligono_utm]
    pontos = []
    x = min(xs) + passo_m / 2
    while x <= max(xs):
        y = min(ys) + passo_m / 2
        while y <= max(ys):
            if _ponto_no_poligono(x, y, poligono_utm):
                pontos.append((x, y))
            y += passo_m
        x += passo_m
    return pontos


def _picos_fft(img_cinza: np.ndarray, res_m: float, faixa_pitch: tuple[float, float], n: int = 4):
    """Espectro 2D de potencia -- devolve ate n picos como (pitch_m, angulo_0_90, peso).
    Angulo 'dobrado' (mod 90) porque uma familia de linhas e seu perpendicular
    sao indistinguiveis so pela frequencia -- dois eixos reais de uma malha
    retangular caem no mesmo histograma se nao dobrar."""
    from scipy.ndimage import gaussian_filter

    N = min(img_cinza.shape)
    if N < 16:
        return []
    img = img_cinza[:N, :N].astype(np.float64)
    sigma_px = max(1.0, 12.0 / res_m)
    g = img - gaussian_filter(img, sigma_px)
    win = np.outer(np.hanning(N), np.hanning(N))
    F = np.abs(np.fft.fftshift(np.fft.fft2(g * win))) ** 2

    cy, cx = N // 2, N // 2
    freqs = np.fft.fftshift(np.fft.fftfreq(N, d=res_m))
    F = F.copy()
    F[cy, cx] = 0

    picos = []
    tentativas = 0
    while len(picos) < n and tentativas < n * 4:
        tentativas += 1
        py, px = np.unravel_index(int(np.argmax(F)), F.shape)
        power = F[py, px]
        if power <= 0:
            break
        fy, fx = freqs[py], freqs[px]
        freq_mag = math.hypot(fy, fx)
        raio = 3
        y0, y1 = max(0, py - raio), min(N, py + raio + 1)
        x0, x1 = max(0, px - raio), min(N, px + raio + 1)
        py2, px2 = 2 * cy - py, 2 * cx - px
        if freq_mag > 1e-9:
            pitch = 1.0 / freq_mag
            if faixa_pitch[0] <= pitch <= faixa_pitch[1]:
                # fy vem do eixo linha (axis 0) do array lido do raster, que
                # aumenta pra SUL (Northing decrescente) -- convencao de
                # imagem, oposta ao y-pra-cima do atan2 matematico padrao.
                # Sem negar aqui, todo angulo sai com o sinal trocado em UTM
                # (achado empirico real: comparei theta=+15 vs -15 renderizado,
                # +15 retificava certo, o calculo cru dava -15).
                ang = math.degrees(math.atan2(-fy, fx)) % 180
                picos.append((pitch, ang % 90, float(power)))
        F[y0:y1, x0:x1] = 0
        if 0 <= py2 < N and 0 <= px2 < N:
            y0b, y1b = max(0, py2 - raio), min(N, py2 + raio + 1)
            x0b, x1b = max(0, px2 - raio), min(N, px2 + raio + 1)
            F[y0b:y1b, x0b:x1b] = 0
    return picos


def _agrupar_remover_harmonicos(pitches: list[float], tol: float = 0.15) -> list[float]:
    if not pitches:
        return []
    clusters: list[list[float]] = []
    for p in sorted(pitches):
        for c in clusters:
            if abs(p - np.mean(c)) / np.mean(c) < tol:
                c.append(p)
                break
        else:
            clusters.append([p])
    medios = sorted(float(np.mean(c)) for c in clusters)
    fundamentais = []
    for m in medios:
        eh_harmonico = any(abs(m * 2 - f) / f < tol for f in medios if f > m)
        if not eh_harmonico:
            fundamentais.append(m)
    return fundamentais


def achar_malha(ds, poligono_utm: list[tuple[float, float]], faixa_pitch=(0.7, 6.0),
                 lado_sub_m: float = 30.0, passo_m: float = 10.0):
    """Varre sub-janelas dentro do poligono da quadra, agrega picos do
    espectro 2D de cada uma, devolve o angulo por voto (moda) e os pitches
    dos eixos da malha (fundamentais, harmonicos removidos).

    Devolve (theta_deg, pitches_m, nitidez). nitidez baixa (<0.10) = sem
    malha clara nessa quadra -- pedir override manual em vez de confiar
    num numero de qualquer jeito."""
    votos = []
    for centro in _grade_dentro_do_poligono(poligono_utm, passo_m):
        img, res_m = ler_janela_cinza(ds, centro, lado_sub_m, alvo_px=400)
        votos += _picos_fft(img, res_m, faixa_pitch, n=4)

    if not votos:
        return 0.0, [], 0.0

    angs = np.array([v[1] for v in votos])
    pesos = np.array([v[2] for v in votos])
    h, edges = np.histogram(angs, bins=45, range=(0, 90), weights=pesos)
    idx = int(np.argmax(h))
    theta_dobrado = (edges[idx] + edges[idx + 1]) / 2
    theta = theta_dobrado - 90 if theta_dobrado > 45 else theta_dobrado
    nitidez = float(h[idx] / (h.sum() + 1e-9))

    pitches_perto = [v[0] for v in votos if min(abs(v[1] - theta_dobrado), 90 - abs(v[1] - theta_dobrado)) < 8]
    pitches = _agrupar_remover_harmonicos(pitches_perto)
    return theta, pitches, nitidez


# --------------------------------------------------------------------
# Recorte retificado -- fonte unica de verdade pra pixel<->metro<->UTM
# --------------------------------------------------------------------

@dataclass
class Recorte:
    id: str
    crs: str
    origem_utm: tuple[float, float]  # UTM do pixel (0,0) -- canto superior esquerdo
    theta_deg: float
    escala_m_px: float
    largura_m: float
    altura_m: float

    @property
    def largura_px(self) -> int:
        return int(round(self.largura_m / self.escala_m_px))

    @property
    def altura_px(self) -> int:
        return int(round(self.altura_m / self.escala_m_px))

    def _transform(self) -> Affine:
        s = self.escala_m_px
        rad = math.radians(self.theta_deg)
        a, b = s * math.cos(rad), s * math.sin(rad)
        d, e = s * math.sin(rad), -s * math.cos(rad)
        c, f = self.origem_utm
        return Affine(a, b, c, d, e, f)

    def para_utm(self, x_m: float, y_m: float) -> tuple[float, float]:
        col, row = x_m / self.escala_m_px, y_m / self.escala_m_px
        return self._transform() * (col, row)

    def de_utm(self, e: float, n: float) -> tuple[float, float]:
        col, row = ~self._transform() * (e, n)
        return col * self.escala_m_px, row * self.escala_m_px

    def to_json(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_json(d: dict) -> "Recorte":
        return Recorte(**{**d, "origem_utm": tuple(d["origem_utm"])})

    @staticmethod
    def extrair(ds, centro_utm: tuple[float, float], largura_m: float, altura_m: float,
                theta_deg: float, escala_m_px: float, id_: str) -> tuple["Recorte", np.ndarray]:
        """Extrai o recorte retificado via WarpedVRT com Affine explicita --
        mesma tecnica ja usada e testada em converter-ortomosaico.py."""
        s = escala_m_px
        rad = math.radians(theta_deg)
        a, b = s * math.cos(rad), s * math.sin(rad)
        d, e = s * math.sin(rad), -s * math.cos(rad)

        largura_px = int(round(largura_m / s))
        altura_px = int(round(altura_m / s))
        col_c, row_c = largura_px / 2, altura_px / 2
        ec, nc = centro_utm
        e0 = ec - (a * col_c + b * row_c)
        f0 = nc - (d * col_c + e * row_c)

        transform = Affine(a, b, e0, d, e, f0)

        with WarpedVRT(ds, crs=ds.crs, transform=transform, width=largura_px, height=altura_px,
                        resampling=Resampling.cubic) as vrt:
            arr = vrt.read([1, 2, 3])

        recorte = Recorte(
            id=id_, crs=str(ds.crs), origem_utm=(e0, f0), theta_deg=theta_deg,
            escala_m_px=s, largura_m=largura_m, altura_m=altura_m,
        )
        rgb = np.transpose(arr, (1, 2, 0))
        return recorte, rgb


def ocupacao(ds, pontos_utm: list[tuple[float, float]], raio_m: float = 0.6) -> list[float]:
    """Desvio padrao local (RGB) em cada ponto -- baixo = provavel vaga
    (terra/grama uniforme) em vez de tumulo (pedra com textura/contraste)."""
    res_m = abs(ds.transform.a)
    raio_px = max(1, int(raio_m / res_m))
    out = []
    for e, n in pontos_utm:
        col, row = ~ds.transform * (e, n)
        window = Window(col - raio_px, row - raio_px, raio_px * 2, raio_px * 2)
        window = window.intersection(Window(0, 0, ds.width, ds.height))
        if window.width < 2 or window.height < 2:
            out.append(0.0)
            continue
        arr = ds.read([1, 2, 3], window=window).astype(np.float64)
        out.append(float(arr.std()))
    return out


def salvar_estado(caminho: str, estado: dict):
    Path(caminho).write_text(json.dumps(estado, indent=2, ensure_ascii=False), encoding="utf-8")


def carregar_estado(caminho: str) -> dict:
    p = Path(caminho)
    if not p.exists():
        return {"cemiterio_id": None, "quadras": {}}
    return json.loads(p.read_text(encoding="utf-8"))
