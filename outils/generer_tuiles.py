#!/usr/bin/env python3
"""Fabrique les PLANCHES D'AUTOTUILAGE du décor (images/tuiles/*.png).

    python3 outils/generer_tuiles.py            # tout : modèle + planches
    python3 outils/generer_tuiles.py sol-ville  # une seule planche

Ces planches sont un PREMIER JET dessiné par le code, pour que le mécanisme
d'autotuilage soit visible en jeu tout de suite. Elles sont faites pour être
REMPLACÉES : dès que Brioche dessine sa version d'un sol, il écrase le PNG et
plus personne ne relance ce script pour cette matière.

Le format de planche (2 tuiles de large × 3 de haut) est expliqué en tête de
`jeu/world/tileset.js` et dans `images/tuiles/LISEZMOI.md`.

────────────────────────────────────────────────────────────────────────────
⚠ LA CONTRAINTE À CONNAÎTRE AVANT DE DESSINER UN SOL
Dans un autotuilage par quarts, le remplissage d'une case peut être piqué à
plusieurs endroits de la planche, décalés de 32 px (un quart). Un motif dont le
dessin change tous les 64 px se verrait donc « sauter » d'un quart à l'autre.
La règle : LE MOTIF DE FOND SE RÉPÈTE TOUS LES 32 px (un quart). Une dalle de
32 px, un grain qui se répète tous les 32 px → tout se raccorde partout.
La variété ne vient pas du fond, elle vient de la case « remplissage variante ».
────────────────────────────────────────────────────────────────────────────
"""

import argparse
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RACINE = pathlib.Path(__file__).resolve().parent.parent
DOSSIER = RACINE / "images" / "tuiles"

TUILE = 64          # px d'art par tuile de jeu (le jeu rend à 2×, donc 64 = net)
Q = TUILE // 2      # un quart
PERIODE = Q         # le motif de fond DOIT se répéter tous les 32 px (cf. en-tête)
LARGEUR, HAUTEUR = 2 * TUILE, 3 * TUILE   # 128 × 192

# Profondeur et portée de l'ombre portée le long des bordures (en px d'art).
AO_FORCE = 0.62
AO_PORTEE = 15.0


def _hachage(x, y, graine):
    """Bruit déterministe 0..1 — même position, même valeur, toujours."""
    h = (x.astype(np.int64) * 374761393 + y.astype(np.int64) * 668265263
         + graine * 2246822519) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFFFF) / 0xFFFFFFFF


def _grille(w, h, ox, oy):
    """Coordonnées absolues de chaque pixel d'une zone posée en (ox, oy)."""
    ys, xs = np.mgrid[0:h, 0:w]
    return xs + ox, ys + oy


def _disque(x, y, cx, cy, r):
    """Un petit rond plein centré en (cx, cy) — pour poser un caillou, un éclat."""
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def _trait(x, y, x0, y0, x1, y1, ep=1.0):
    """Un trait fin de (x0,y0) à (x1,y1) — pour une fissure, un joint cassé."""
    dx, dy = x1 - x0, y1 - y0
    n = max(dx * dx + dy * dy, 1)
    t = np.clip(((x - x0) * dx + (y - y0) * dy) / n, 0, 1)
    return (x - (x0 + t * dx)) ** 2 + (y - (y0 + t * dy)) ** 2 <= ep * ep


# ---- Les matières ----------------------------------------------------------
# Chaque fonction rend un tableau (h, w, 3) de couleurs, pour des coordonnées
# ABSOLUES : c'est ce qui garantit que deux morceaux voisins se raccordent.
# Tout ce qui varie doit être calculé modulo PERIODE.
#
# `var=True` = la case « remplissage variante ». ⚠ Elle doit garder EXACTEMENT
# la même géométrie (même grille de dalles, même phase) : seuls les détails
# changent. Décaler le motif ferait un décrochage visible dès qu'une variante
# se retrouve à côté d'une case normale.

def sol_ville(x, y, var=False):
    """DALLAGE DE LA CITÉ — dalles taillées, joints discrets, pierre chaude.

    ⚠ ÉCLAIRCI par rapport au sol peint d'avant (#211c18), qui rendait la ville
    presque noire. Pour revenir en arrière ou pousser plus loin : la couleur
    DALLE ci-dessous, puis relancer le script — c'est le seul endroit à toucher.

    Le motif reste VOLONTAIREMENT peu contrasté : sur un sol, tout ce qui est
    plus foncé que la bordure lui vole la vedette, et le décor redevient plat.
    """
    DALLE = np.array([0x3e, 0x36, 0x2c], float)
    px, py = x % PERIODE, y % PERIODE
    g = 40 if var else 0                        # variante : autres tirages, MÊME grille

    # Une dalle de 32 px (16 px de jeu) par période, joint de 2 px.
    # ⚠ Tout ne dépend QUE de px/py : une teinte tirée sur x,y (donc différente
    # d'une dalle à l'autre) casserait le raccord entre les quarts.
    couleur = np.zeros(px.shape + (3,)) + DALLE
    couleur = couleur + ((_hachage(px, py, 3 + g) - 0.5) * 7)[..., None]
    # ⚠ Variation par plaques de 8 px : AMPLITUDE FAIBLE obligatoire. Le motif
    # se répétant tous les 32 px, une plaque claire au bord de la période forme
    # une rayure visible d'un bout à l'autre de la carte.
    couleur = couleur * (0.97 + _hachage(px // 8, py // 8, 11 + g) * 0.06)[..., None]

    joint = (px < 2) | (py < 2)
    couleur = np.where(joint[..., None], couleur * 0.80, couleur)
    # Chanfrein : l'arête qui suit le joint accroche la lumière (venue du haut).
    couleur = np.where(((px == 2) | (py == 2))[..., None], couleur * 1.10, couleur)

    if var:
        # ⚠ LES DÉTAILS RARES VIVENT ICI, PAS DANS LE FOND. Le fond se répète
        # tous les 32 px : une fissure « rare » posée dedans réapparaîtrait sur
        # CHAQUE demi-case et dessinerait une grille. Dans la variante, elle
        # n'apparaît qu'une fois — et seulement sur les cases tirées au sort.
        # Chaque détail tient dans UN quart (les quarts sont piochés séparément).
        fissure = _trait(x, y, 38, 36, 56, 52, 0.8)
        couleur = np.where(fissure[..., None], couleur * 0.62, couleur)
        eclat = _disque(x, y, 12, 45, 2) | _disque(x, y, 20, 20, 1.5)
        couleur = np.where(eclat[..., None], couleur * 0.74, couleur)
    return couleur


def sol_caverne(x, y, var=False):
    """SOL DE CAVERNE — terre battue et gravats, avec de rares veines de cuivre.
    Pas de dallage : une roche usée, sans structure, pour que la bordure porte
    tout le relief."""
    FOND = np.array([0x3b, 0x32, 0x2a], float)
    GRAVAT = np.array([0x47, 0x3d, 0x32], float)
    VEINE = np.array([0x6d, 0x4d, 0x26], float)   # cuivre SOURD : la variante
    # sort sur ~1 case sur 3 ; une veine trop vive s'y verrait comme un motif.
    px, py = x % PERIODE, y % PERIODE
    d = 40 if var else 0                        # variante : autres tirages

    # Grain FIN (par pixel) : il porte tout le relief sans jamais faire de
    # rayure — contrairement aux plaques larges, dont la couture se voit.
    couleur = FOND + ((_hachage(px, py, 5 + d) - 0.5) * 15)[..., None]
    plaque = _hachage(px // 8, py // 8, 13 + d)
    couleur = couleur * (0.97 + plaque * 0.06)[..., None]

    if var:
        # ⚠ Comme pour le dallage : ce qui doit être RARE ne peut pas vivre dans
        # le fond (répété tous les 32 px → il ferait une grille régulière). La
        # veine de minerai et les cailloux sont donc ici, dans la variante.
        veine = _trait(x, y, 38, 42, 51, 55, 0.9)
        couleur = np.where(veine[..., None], VEINE, couleur)
        cailloux = _disque(x, y, 13, 44, 3) | _disque(x, y, 19, 48, 2) | _disque(x, y, 22, 12, 2)
        ombre = _disque(x, y, 13, 46, 3) | _disque(x, y, 19, 50, 2) | _disque(x, y, 22, 14, 2)
        couleur = np.where((ombre & ~cailloux)[..., None], couleur * 0.66, couleur)
        couleur = np.where(cailloux[..., None], GRAVAT, couleur)
    return couleur


MATIERES = {"sol-ville": sol_ville, "sol-caverne": sol_caverne}


# ---- Ombre des bordures ----------------------------------------------------

def _bande(d):
    """Assombrissement à la distance `d` du vide (0 = collé au bord)."""
    return AO_FORCE * np.exp(-np.maximum(d, 0) / (AO_PORTEE / 2.2))


def ombre_ilot(w, h):
    """L'ÎLOT : du vide sur les 4 côtés. Les angles cumulent les deux ombres
    (deux murs occultent plus qu'un seul) → les coins sortants s'assombrissent
    tout seuls, sans avoir à les dessiner à part."""
    ys, xs = np.mgrid[0:h, 0:w]
    a = _bande(np.minimum(xs, w - 1 - xs))
    b = _bande(np.minimum(ys, h - 1 - ys))
    return 1 - (1 - a) * (1 - b)


def ombre_coins_rentrants(t):
    """LES 4 COINS RENTRANTS : dans chaque quart, le vide n'est QUE dans la
    diagonale. L'ombre se concentre donc sur l'angle et s'efface très vite."""
    occ = np.zeros((t, t))
    q = t // 2
    for qx in (0, 1):
        for qy in (0, 1):
            ys, xs = np.mgrid[0:q, 0:q]
            dx = xs if qx == 0 else (q - 1 - xs)   # distance à l'angle sortant du quart
            dy = ys if qy == 0 else (q - 1 - ys)
            occ[qy * q:(qy + 1) * q, qx * q:(qx + 1) * q] = np.minimum(_bande(dx), _bande(dy))
    return occ


# ---- Assemblage d'une planche ----------------------------------------------

def planche(nom):
    tex = MATIERES[nom]
    img = np.zeros((HAUTEUR, LARGEUR, 4), np.uint8)

    def poser(dx, dy, w, h, occ, var=False):
        # ⚠ Les coordonnées passées à la matière sont celles de la PLANCHE, pas
        # de l'écran — c'est ce qui aligne les morceaux entre eux (cf. en-tête).
        gx, gy = _grille(w, h, 0, 0)
        couleur = tex(gx, gy, var) * (1 - occ)[..., None]
        img[dy:dy + h, dx:dx + w, :3] = np.clip(couleur, 0, 255).astype(np.uint8)
        img[dy:dy + h, dx:dx + w, 3] = 255

    # 1) Les 4 coins rentrants (tuile en haut à gauche).
    poser(0, 0, TUILE, TUILE, ombre_coins_rentrants(TUILE))

    # 2) Le remplissage variante (tuile en haut à droite) : même dallage, autres
    #    tirages → un second visage de la même matière, sans nouveau dessin.
    poser(TUILE, 0, TUILE, TUILE, np.zeros((TUILE, TUILE)), var=True)

    # 3) L'îlot (les 2 rangées du bas) : la matière entourée de vide.
    poser(0, TUILE, 2 * TUILE, 2 * TUILE, ombre_ilot(2 * TUILE, 2 * TUILE))

    return Image.fromarray(img, "RGBA")


# ---- Le modèle à dessiner ---------------------------------------------------

def modele():
    """Un canevas vide aux bonnes dimensions, avec le quadrillage des quarts —
    à ouvrir dans un éditeur de pixel art et à peindre par-dessus."""
    img = Image.new("RGBA", (LARGEUR, HAUTEUR), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for x in range(0, LARGEUR + 1, Q):
        d.line([(x, 0), (x, HAUTEUR)], fill=(255, 255, 255, 40))
    for y in range(0, HAUTEUR + 1, Q):
        d.line([(0, y), (LARGEUR, y)], fill=(255, 255, 255, 40))
    for x in range(0, LARGEUR + 1, TUILE):
        d.line([(x, 0), (x, HAUTEUR)], fill=(255, 255, 255, 90))
    for y in range(0, HAUTEUR + 1, TUILE):
        d.line([(0, y), (LARGEUR, y)], fill=(255, 255, 255, 90))
    return img


POLICES = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
           "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]


def _police(taille):
    for chemin in POLICES:
        if pathlib.Path(chemin).exists():
            return ImageFont.truetype(chemin, taille)
    return ImageFont.load_default()         # dernier recours : accents abîmés


def guide(exemple="sol-ville"):
    """La planche ANNOTÉE, agrandie, posée sur une vraie planche en exemple :
    on voit du premier coup d'œil ce qui va dans chaque case.
    Image de documentation — ce n'est pas un asset du jeu."""
    k = 5
    bas = 112
    img = Image.new("RGB", (LARGEUR * k, HAUTEUR * k + bas), (24, 20, 16))
    # La planche d'exemple, ÉCLAIRCIE : elle sert à montrer où sont les bordures,
    # pas à juger les couleurs — sur un fond de doc, le sol du jeu est trop sombre.
    ex = np.clip(np.array(planche(exemple).convert("RGB"), float) * 1.9, 0, 255).astype(np.uint8)
    img.paste(Image.fromarray(ex).resize((LARGEUR * k, HAUTEUR * k), Image.NEAREST), (0, 0))
    voile = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(voile)
    gros, petit = _police(18), _police(13)

    zones = [
        (0, 0, 1, 1, (240, 185, 95), "LES 4 COINS RENTRANTS",
         "l'angle en creux, celui qu'on\nvoit dans un recoin.\nRangés comme les 4 quarts\nd'une tuile."),
        (1, 0, 1, 1, (150, 215, 160), "REMPLISSAGE VARIANTE",
         "une 2ᵉ version du centre,\ntirée au hasard pour qu'un\ngrand sol ne se répète pas.\n(facultatif)"),
        (0, 1, 2, 2, (150, 180, 255), "L'ÎLOT",
         "la matière ENTOURÉE de sa bordure sur ses 4 côtés.\n\n"
         "ses 4 angles   →  les coins sortants\n"
         "ses 4 milieux  →  les bords (haut, bas, gauche, droite)\n"
         "son centre     →  le remplissage"),
    ]
    for cx, cy, cw, ch, coul, titre, expl in zones:
        x0, y0 = cx * TUILE * k, cy * TUILE * k
        x1, y1 = x0 + cw * TUILE * k, y0 + ch * TUILE * k
        d.rectangle([x0 + 2, y0 + 2, x1 - 3, y1 - 3], outline=coul + (255,), width=3)
        # Voile sombre UNIQUEMENT derrière le texte : ailleurs on veut voir la
        # planche (c'est elle qui montre où tombent les bordures).
        haut = 118 + 22 * expl.count("\n")
        d.rectangle([x0 + 6, y0 + 6, x1 - 7, y0 + haut], fill=(0, 0, 0, 190))
        d.text((x0 + 16, y0 + 14), titre, font=gros, fill=coul + (255,))
        d.multiline_text((x0 + 16, y0 + 46), expl, font=petit, fill=(232, 224, 204, 255), spacing=6)

    for x in range(0, LARGEUR * k + 1, Q * k):
        d.line([(x, 0), (x, HAUTEUR * k)], fill=(255, 255, 255, 45))
    for y in range(0, HAUTEUR * k + 1, Q * k):
        d.line([(0, y), (LARGEUR * k, y)], fill=(255, 255, 255, 45))

    img.paste(Image.alpha_composite(img.convert("RGBA"), voile).convert("RGB"), (0, 0))
    ImageDraw.Draw(img).multiline_text(
        (14, HAUTEUR * k + 14),
        f"Planche d'autotuilage — {LARGEUR}×{HAUTEUR} px ({TUILE} px par tuile, {Q} px par quart).\n"
        "Le trait fin = un QUART. Tout le décor se recompose\n"
        "à partir de ces six cases. Règle du fond : le motif doit se répéter\n"
        "tous les 32 px, sinon les quarts « sautent » les uns par rapport aux autres.",
        font=petit, fill=(190, 180, 160), spacing=7)
    return img


def main():
    ap = argparse.ArgumentParser(description="Fabrique les planches d'autotuilage.")
    ap.add_argument("noms", nargs="*", help="parmi : " + ", ".join(MATIERES) + " (défaut : toutes)")
    a = ap.parse_args()
    inconnus = [n for n in a.noms if n not in MATIERES]
    if inconnus:
        sys.exit("matière inconnue : " + ", ".join(inconnus) + " — connues : " + ", ".join(MATIERES))

    DOSSIER.mkdir(parents=True, exist_ok=True)
    if not a.noms:
        modele().save(DOSSIER / "MODELE.png")
        guide().save(DOSSIER / "GUIDE.png")
        print(f"  MODELE.png     canevas vide {LARGEUR}×{HAUTEUR} (à peindre par-dessus)")
        print(f"  GUIDE.png      la même planche annotée (documentation)")
    for nom in (a.noms or MATIERES):
        chemin = DOSSIER / f"{nom}.png"
        planche(nom).save(chemin)
        print(f"  {chemin.name:15} {LARGEUR}×{HAUTEUR} · {chemin.stat().st_size / 1024:.1f} Ko")


if __name__ == "__main__":
    main()
