# Découpe la planche « cadres-cartes-source.png » en 3 cadres transparents PROPRES.
# Pour chaque carte : extérieur noir -> transparent, fenêtre blanche -> transparente,
# puis NETTOYAGE des liserés d'anti-aliasing (érosion de l'opacité) pour qu'il ne
# reste aucune « zone morte » claire autour du détourage, et léger adoucissement.
#   Sortie : images/cartes/cadre-*.png
from PIL import Image, ImageDraw, ImageFilter
import os

SRC = "/home/user/Brutal/images/sources/cadres-cartes-source.png"
OUT = "/home/user/Brutal/images/cartes"
NOMS = ["cadre-attaque", "cadre-buff", "cadre-defense"]
LARGEUR = 500
MARK = (255, 0, 255)
TH_NOIR = 42            # extérieur noir (somme des diffs au noir)
TH_BLANC = 150          # fenêtre blanche (somme des diffs au blanc)
EROSION = 5             # MinFilter (5 = ronge 2 px d'opacité) : efface le liseré clair
FLOU = 0.7             # léger flou de l'alpha : bord net mais pas crénelé

src = Image.open(SRC).convert("RGB")
W, H = src.size
rgb = src.load()

def col_active(x, s=24): return any(max(rgb[x, y]) > s for y in range(0, H, 3))
def ligne_active(y, x0, x1, s=24): return any(max(rgb[x, y]) > s for x in range(x0, x1, 3))

blocs = []
x = 0
while x < W:
    if col_active(x):
        x0 = x
        while x < W and col_active(x): x += 1
        if x - x0 > W * 0.1: blocs.append((x0, x))
    else: x += 1

ys = []
for (x0, x1) in blocs:
    y0 = 0
    while y0 < H and not ligne_active(y0, x0, x1): y0 += 1
    y1 = H
    while y1 > y0 and not ligne_active(y1 - 1, x0, x1): y1 -= 1
    ys.append((y0, y1))
y0c, y1c = min(y for y, _ in ys), max(y for _, y in ys)
Lc = min(x1 - x0 for x0, x1 in blocs)

os.makedirs(OUT, exist_ok=True)
for i, (x0, x1) in enumerate(blocs):
    cx = (x0 + x1) // 2
    carte = src.crop((cx - Lc // 2, y0c, cx - Lc // 2 + Lc, y1c)).convert("RGB")
    w, h = carte.size
    for c in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(carte, c, MARK, thresh=TH_NOIR)
    ImageDraw.floodfill(carte, (w // 2, int(h * 0.26)), MARK, thresh=TH_BLANC)
    rgba = carte.convert("RGBA")
    px = rgba.load()
    for yy in range(h):
        for xx in range(w):
            r, g, b, _ = px[xx, yy]
            if (r, g, b) == MARK: px[xx, yy] = (0, 0, 0, 0)
    # Nettoyage des bords : éroder l'opacité (mange le liseré clair résiduel),
    # puis léger flou pour un bord doux. Travail à pleine résolution avant resize.
    alpha = rgba.getchannel("A")
    alpha = alpha.filter(ImageFilter.MinFilter(EROSION))
    alpha = alpha.filter(ImageFilter.GaussianBlur(FLOU))
    rgba.putalpha(alpha)
    rgba = rgba.resize((LARGEUR, round(h * LARGEUR / w)), Image.LANCZOS)
    out = f"{OUT}/{NOMS[i]}.png"
    rgba.save(out, optimize=True)
    print(f"{NOMS[i]}.png : {rgba.size[0]}x{rgba.size[1]}  {os.path.getsize(out)//1024} Ko")
