#!/usr/bin/env python3
# Prépare l'illustration fournie (images/sources/gobelin2-source.png, fond blanc)
# en un sprite de jeu propre : fond transparent, rogné, réduit, pieds en bas de case.
# Sortie : images/ennemis/gobelin-vif.png  (skin du « Goblin Skirmisher »).
#
# Lancer :  python3 outils/preparer_gobelin_vif.py

from PIL import Image, ImageFilter, ImageChops
import os

RACINE = os.path.join(os.path.dirname(__file__), "..")
SOURCE = os.path.join(RACINE, "images", "sources", "gobelin2-source.png")
SORTIE = os.path.join(RACINE, "images", "ennemis", "gobelin-vif.png")

HAUTEUR_CIBLE = 190   # hauteur finale du sprite (case) — un peu > gobelin de base (150)
SEUIL_BLANC = 238     # r,g,b tous au-dessus = fond blanc -> transparent


def main():
    im = Image.open(SOURCE).convert("RGB")
    r, g, b = im.split()
    # Canal MINIMUM par pixel : élevé partout = blanc (fond). alpha=0 si min>seuil.
    mn = ImageChops.darker(ImageChops.darker(r, g), b)
    a_img = mn.point(lambda v: 0 if v > SEUIL_BLANC else 255)
    # Érode 1px pour manger le liseré blanc anti-aliasé au bord du personnage.
    a_img = a_img.filter(ImageFilter.MinFilter(3))

    rgba = im.convert("RGBA")
    rgba.putalpha(a_img)

    # Rogner à la boîte du personnage.
    bbox = rgba.getbbox()
    rgba = rgba.crop(bbox)

    # Réduire à la hauteur cible (largeur proportionnelle).
    w, h = rgba.size
    ech = HAUTEUR_CIBLE / h
    tw = max(1, round(w * ech))
    rgba = rgba.resize((tw, HAUTEUR_CIBLE), Image.LANCZOS)
    # Bords DURS : on retire les pixels semi-transparents (l'anti-aliasing du
    # redimensionnement). Sinon, agrandis par le rendu « pixels nets » du jeu, ils
    # deviennent des blocs translucides → effet « on voit à travers » en mouvement.
    r2, g2, b2, a2 = rgba.split()
    a2 = a2.point(lambda v: 255 if v >= 128 else 0)
    rgba = Image.merge("RGBA", (r2, g2, b2, a2))
    rgba.save(SORTIE)

    # Portrait suggéré : carré autour de la TÊTE (haut-gauche de l'illustration).
    W, H = rgba.size
    pw = round(0.42 * W)
    px, py = round(0.05 * W), round(0.02 * H)
    print(f"OK -> images/ennemis/gobelin-vif.png | case {W}x{H} (poids ~{os.path.getsize(SORTIE)//1024} Ko)")
    print(f"portrait suggéré : {{ sx: {px}, sy: {py}, sw: {pw}, sh: {pw} }}")

    # Aperçu sur fond sombre + crop du portrait, pour vérifier détourage & cadrage.
    ap = Image.new("RGBA", (W, H), (26, 24, 22, 255)); ap.alpha_composite(rgba)
    ap.save("/tmp/gobvif_apercu.png")
    rgba.crop((px, py, px + pw, py + pw)).save("/tmp/gobvif_portrait.png")


if __name__ == "__main__":
    main()
