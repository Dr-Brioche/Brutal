from PIL import Image
import os

src = Image.open("/home/user/Brutal/images/sources/cadres-cartes-source.png").convert("RGBA")
W, H = src.size
rgb = src.convert("RGB").load()

def col_active(x, seuil=24):
    return any(max(rgb[x, y]) > seuil for y in range(0, H, 3))
def ligne_active(y, x0, x1, seuil=24):
    return any(max(rgb[x, y]) > seuil for x in range(x0, x1, 3))

# Blocs horizontaux (cartes) séparés par gouttières noires
blocs = []
x = 0
while x < W:
    if col_active(x):
        x0 = x
        while x < W and col_active(x): x += 1
        if x - x0 > W * 0.1: blocs.append((x0, x))
    else: x += 1

# Bornes verticales par carte, puis bande commune (min/max) pour les aligner
ys = []
for (x0, x1) in blocs:
    y0 = 0
    while y0 < H and not ligne_active(y0, x0, x1): y0 += 1
    y1 = H
    while y1 > y0 and not ligne_active(y1-1, x0, x1): y1 -= 1
    ys.append((y0, y1))
y0c = min(y for y, _ in ys)
y1c = max(y for _, y in ys)

# Largeur commune = la plus PETITE largeur détectée (évite de réinclure du fond),
# fenêtre centrée sur le milieu de chaque carte.
Lc = min(x1 - x0 for x0, x1 in blocs)

noms = ["cadre-attaque", "cadre-buff", "cadre-defense"]
os.makedirs("/home/user/Brutal/images/cartes", exist_ok=True)
for i, (x0, x1) in enumerate(blocs):
    cx = (x0 + x1) // 2
    nx0 = cx - Lc // 2
    nx1 = nx0 + Lc
    carte = src.crop((nx0, y0c, nx1, y1c))
    out = f"/home/user/Brutal/images/cartes/{noms[i]}.png"
    carte.save(out, optimize=True)
    cw, ch = carte.size
    kb = os.path.getsize(out) // 1024
    print(f"{noms[i]}.png : {cw}x{ch}  ratio {cw/ch:.3f}  {kb} Ko")
