#!/usr/bin/env python3
# Prépare une ILLUSTRATION (fournie) en sprite de jeu propre pour un ennemi :
# fond transparent, rogné, réduit, PIEDS en bas de case. Bords DOUX conservés
# (le combat rend ces sprites en LISSE — cf. dessinerEnnemiStatique / ui/combat.js).
#
# Détection auto du fond :
#   - image DÉJÀ détourée (vraie transparence) → on garde son alpha ;
#   - image sur fond BLANC opaque             → on retire le blanc.
#
# Usage :
#   python3 outils/preparer_skin.py <source> <sortie.png> [hauteur=200]
# Exemples :
#   python3 outils/preparer_skin.py images/sources/gobelin2-source.png images/ennemis/gobelin-vif.png 190
#   python3 outils/preparer_skin.py images/sources/gobelin-chaman-source.png images/ennemis/gobelin-chaman.png 200

import sys, os
from PIL import Image, ImageFilter, ImageChops

SEUIL_BLANC = 238


def detourer_blanc(im):
    """Rend transparent le fond quasi-blanc d'une illustration opaque."""
    r, g, b = im.convert("RGB").split()
    mn = ImageChops.darker(ImageChops.darker(r, g), b)      # canal minimum
    a = mn.point(lambda v: 0 if v > SEUIL_BLANC else 255)
    a = a.filter(ImageFilter.MinFilter(3))                   # érode le liseré blanc
    out = im.convert("RGBA")
    out.putalpha(a)
    return out


def a_de_la_transparence(im):
    if im.mode not in ("RGBA", "LA") and not (im.mode == "P" and "transparency" in im.info):
        return False
    a = im.convert("RGBA").split()[3]
    transp = a.histogram()[0]
    return transp > 0.05 * (im.size[0] * im.size[1])         # >5% de pixels transparents


def main():
    if len(sys.argv) < 3:
        sys.exit("usage : preparer_skin.py <source> <sortie.png> [hauteur=200]")
    source, sortie = sys.argv[1], sys.argv[2]
    hauteur = int(sys.argv[3]) if len(sys.argv) > 3 else 200

    im = Image.open(source)
    rgba = im.convert("RGBA") if a_de_la_transparence(im) else detourer_blanc(im)

    rgba = rgba.crop(rgba.getbbox())                          # rogne à la boîte du perso
    w, h = rgba.size
    tw = max(1, round(w * hauteur / h))
    rgba = rgba.resize((tw, hauteur), Image.LANCZOS)          # bords DOUX (rendu lisse)
    rgba.save(sortie)

    W, H = rgba.size
    pw = round(0.42 * W); px, py = round(0.05 * W), round(0.02 * H)
    ko = os.path.getsize(sortie) // 1024
    print(f"OK -> {sortie} | case {W}x{H} (~{ko} Ko)")
    print(f"portrait suggéré : {{ sx: {px}, sy: {py}, sw: {pw}, sh: {pw} }}")

    ap = Image.new("RGBA", (W, H), (26, 24, 22, 255)); ap.alpha_composite(rgba)
    base = os.path.splitext(os.path.basename(sortie))[0]
    ap.save(f"/tmp/{base}_apercu.png")
    rgba.crop((px, py, px + pw, py + pw)).save(f"/tmp/{base}_portrait.png")


if __name__ == "__main__":
    main()
