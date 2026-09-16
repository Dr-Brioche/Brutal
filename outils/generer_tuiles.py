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
⚠ LA CONTRAINTE, ET POURQUOI ELLE NE S'APPLIQUE QU'ICI
Ce script CARRELLE une texture pour fabriquer l'îlot. Or le remplissage d'une
case est piqué à plusieurs endroits de la planche, décalés d'un quart : un motif
carrelé doit donc SE RÉPÉTER TOUS LES 32 px, sinon il « saute » d'un quart à
l'autre. La variété ne vient pas du fond, elle vient de la case « variante ».

→ `outils/planche_depuis_carre.py`, lui, ne carrelle pas : il pose dans chaque
  quart de l'îlot le quart du dessin correspondant à sa DESTINATION. Il n'a donc
  aucune contrainte de motif. C'est la voie à privilégier dès qu'il existe un
  dessin ; ce script-ci ne sert plus qu'aux matières encore fabriquées au code.
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
    # sort sur ~1 case sur 5 ; une veine trop vive s'y verrait comme un motif.
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


# ⚠ `sol-ville` a été RETIRÉ de cette table : la planche du jeu vient maintenant
# du dessin de Brioche (images/tuiles/sources/City_floor_1.png, monté par
# outils/planche_depuis_carre.py). La fonction sol_ville() reste là comme
# exemple de matière fabriquée au code, mais ce script ne l'écrit plus.
MATIERES = {"sol-caverne": sol_caverne}


# ---- Ombre des bordures ----------------------------------------------------

# `portee` est en pixels d'ART : une planche dessinée en 32 px par tuile doit
# donc l'écraser de moitié, sinon l'ombre est deux fois trop large en jeu.
def _bande(d, portee=None):
    """Assombrissement à la distance `d` du vide (0 = collé au bord)."""
    return AO_FORCE * np.exp(-np.maximum(d, 0) / ((portee or AO_PORTEE) / 2.2))


def ombre_ilot(w, h, portee=None):
    """L'ÎLOT : du vide sur les 4 côtés. Les angles cumulent les deux ombres
    (deux murs occultent plus qu'un seul) → les coins sortants s'assombrissent
    tout seuls, sans avoir à les dessiner à part."""
    ys, xs = np.mgrid[0:h, 0:w]
    a = _bande(np.minimum(xs, w - 1 - xs), portee)
    b = _bande(np.minimum(ys, h - 1 - ys), portee)
    return 1 - (1 - a) * (1 - b)


def ombre_coins_rentrants(t, portee=None):
    """LES 4 COINS RENTRANTS : dans chaque quart, le vide n'est QUE dans la
    diagonale. L'ombre se concentre donc sur l'angle et s'efface très vite."""
    occ = np.zeros((t, t))
    q = t // 2
    for qx in (0, 1):
        for qy in (0, 1):
            ys, xs = np.mgrid[0:q, 0:q]
            dx = xs if qx == 0 else (q - 1 - xs)   # distance à l'angle sortant du quart
            dy = ys if qy == 0 else (q - 1 - ys)
            occ[qy * q:(qy + 1) * q, qx * q:(qx + 1) * q] = np.minimum(
                _bande(dx, portee), _bande(dy, portee))
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


# ---- Un autotuileur en Python (le même que jeu/world/tileset.js) ------------
# Il ne sert QU'À FABRIQUER LE GUIDE : montrer le découpage en images est mille
# fois plus clair que l'expliquer en mots. Il doit rester identique au JS — si
# l'un des deux change, les images du guide mentiraient.

# Pour chaque quart d'une case : le coin où il se pose, les 3 voisins qu'il
# regarde (côté / dessus-dessous / diagonale), puis où le prendre dans la
# planche selon le cas — en QUARTS de planche (4 colonnes × 6 rangées).
QUARTS = [
    # (dx, dy), voisin côté, voisin haut/bas, voisin diagonale,
    #   plein,  bordH,  bordV,  sortant, rentrant, variante
    ((0, 0), (-1, 0), (0, -1), (-1, -1), (1, 3), (1, 2), (0, 3), (0, 2), (0, 0), (2, 0)),
    ((1, 0), (1, 0), (0, -1), (1, -1), (2, 3), (2, 2), (3, 3), (3, 2), (1, 0), (3, 0)),
    ((0, 1), (-1, 0), (0, 1), (-1, 1), (1, 4), (1, 5), (0, 4), (0, 5), (0, 1), (2, 1)),
    ((1, 1), (1, 0), (0, 1), (1, 1), (2, 4), (2, 5), (3, 4), (3, 5), (1, 1), (3, 1)),
]

# Un rôle = une couleur, la même dans tout le guide. C'est le fil conducteur :
# on retrouve la couleur d'un morceau sur la planche ET sur la carte reconstruite.
ROLES = {
    "remplissage": (110, 200, 130),
    "bord": (240, 175, 80),
    "coin sortant": (235, 105, 105),
    "coin rentrant": (130, 175, 255),
}
VIDE = (26, 23, 19)


def rendre_carte(pl, grille, teinter=False, echelle=1):
    """Dessine une carte (liste de chaînes, 'X' = matière) avec la planche `pl`.
    `teinter` colorie chaque quart selon son rôle — c'est ce qui rend le
    découpage visible. La taille de tuile est déduite de la planche : toutes ne
    sont pas dessinées à la même finesse."""
    Q = pl.width // 4
    TUILE = pl.width // 2
    h, w = len(grille), len(grille[0])
    img = Image.new("RGB", (w * TUILE, h * TUILE), VIDE)
    voile = Image.new("RGBA", img.size, (0, 0, 0, 0))
    plein = lambda c, l: 0 <= l < h and 0 <= c < w and grille[l][c] == "X"

    for l in range(h):
        for c in range(w):
            if not plein(c, l):
                continue
            for (dx, dy), vh, vv, vd, p, bh, bv, so, re, _ in QUARTS:
                a = plein(c + vh[0], l + vh[1])          # voisin de côté
                b = plein(c + vv[0], l + vv[1])          # voisin dessus / dessous
                diag = plein(c + vd[0], l + vd[1])
                if a and b and diag:  src, role = p, "remplissage"
                elif a and b:         src, role = re, "coin rentrant"
                elif a:               src, role = bh, "bord"
                elif b:               src, role = bv, "bord"
                else:                 src, role = so, "coin sortant"
                bx, by = c * TUILE + dx * Q, l * TUILE + dy * Q
                img.paste(pl.crop((src[0] * Q, src[1] * Q, src[0] * Q + Q, src[1] * Q + Q)), (bx, by))
                if teinter:
                    ImageDraw.Draw(voile).rectangle([bx, by, bx + Q - 1, by + Q - 1],
                                                    fill=ROLES[role] + (105,))
    img = Image.alpha_composite(img.convert("RGBA"), voile).convert("RGB")
    return img if echelle == 1 else img.resize((img.width * echelle, img.height * echelle), Image.NEAREST)


# La carte de démonstration du guide : une salle, un pilier au milieu (pour les
# coins rentrants) et un couloir qui part (pour les coins sortants et les bouts).
DEMO = [
    "........",
    ".XXXXXX.",
    ".XXXXXX.",
    ".XX..XX.",
    ".XX..XX.",
    ".XXXXXX.",
    ".XXX....",
    "........",
]


def guide(exemple="sol-ville"):
    """LE GUIDE : trois images qui racontent le mécanisme dans l'ordre —
    ce qu'on dessine, comment le jeu le découpe, ce qu'il en fait.
    Image de documentation (ce n'est pas un asset du jeu)."""
    # On montre la VRAIE planche du jeu quand elle existe (donc le dessin de
    # Brioche), sinon celle que ce script sait fabriquer.
    fichier = DOSSIER / f"{exemple}.png"
    brut = Image.open(fichier).convert("RGB") if fichier.exists() else planche(exemple).convert("RGB")
    # Éclaircie juste ce qu'il faut pour être lisible sur une page de doc : ici on
    # montre OÙ tombent les bordures, on ne juge pas les couleurs.
    a = np.array(brut, float)
    src = np.clip(a * min(2.0, max(1.0, 120 / max(a.mean(), 1))), 0, 255)
    pl = Image.fromarray(src.astype(np.uint8))
    TW = pl.width // 2                       # une tuile, dans CETTE planche

    W = 1144
    img = Image.new("RGB", (W, 2270), (22, 19, 16))
    d = ImageDraw.Draw(img)
    titre, sous, corps, mini = _police(30), _police(21), _police(15), _police(13)
    OR, BLANC, GRIS = (226, 182, 96), (238, 232, 216), (170, 160, 146)
    M = 40                                   # marge gauche

    def cartouche(y, n, texte):
        d.rectangle([M - 14, y - 10, M + 34, y + 34], fill=(58, 46, 26), outline=OR, width=2)
        d.text((M + 10 - d.textlength(n, font=sous) / 2, y + 1), n, font=sous, fill=OR)
        d.text((M + 52, y - 2), texte, font=titre, fill=BLANC)
        return y + 52

    def poser(im, x, y, legende, coul=GRIS):
        img.paste(im, (x, y))
        d.rectangle([x - 1, y - 1, x + im.width, y + im.height], outline=(70, 62, 52))
        d.multiline_text((x, y + im.height + 9), legende, font=mini, fill=coul, spacing=5)

    d.text((M, 30), "Une planche de tuiles, en 3 images", font=_police(38), fill=OR)
    d.text((M, 80), "Tu dessines 6 carrés. Le jeu en fabrique les 47 raccords possibles.",
           font=corps, fill=GRIS)

    # ---------- 1. Ce que tu dessines ----------
    y = cartouche(130, "1", "Ce que tu dessines")
    d.multiline_text((M, y), "L'ÎLOT, c'est simplement une FLAQUE DE SOL POSÉE TOUTE SEULE AU MILIEU DU VIDE :\n"
                             "de la matière au centre, et sa bordure tout autour. Rien de plus.",
                     font=corps, fill=BLANC, spacing=7)
    y += 62
    ilot = pl.crop((0, TW, pl.width, pl.height)).resize((384, 384), Image.NEAREST)
    cadre = Image.new("RGB", (444, 444), VIDE)
    cadre.paste(ilot, (30, 30))
    poser(cadre, M, y, "L'ÎLOT  (2 tuiles × 2)\nla flaque de sol, seule dans le vide", BLANC)
    coins = pl.crop((0, 0, TW, TW)).resize((192, 192), Image.NEAREST)
    varia = pl.crop((TW, 0, pl.width, TW)).resize((192, 192), Image.NEAREST)
    poser(coins, M + 500, y + 20, "LES 4 COINS RENTRANTS\nl'angle en CREUX (le seul que\nl'îlot ne contient pas)",
          ROLES["coin rentrant"])
    poser(varia, M + 740, y + 20, "REMPLISSAGE VARIANTE\nfacultatif : une 2ᵉ version\ndu centre, pour varier",
          ROLES["remplissage"])
    d.multiline_text((M + 500, y + 300),
                     f"Le fichier fait {pl.width} × {pl.height} px :\n"
                     f"2 tuiles de large, 3 de haut,\n{TW} px par tuile.\n\n"
                     "L'îlot occupe les deux rangées\ndu bas ; les deux petites cases\nsont la rangée du haut.",
                     font=corps, fill=GRIS, spacing=7)
    y += 560

    # ---------- 2. Le découpage ----------
    y = cartouche(y, "2", "Le jeu la découpe en 16 morceaux")
    d.multiline_text((M, y), "Il coupe l'îlot en 16 petits carrés (des QUARTS de tuile). Chaque morceau a un rôle,\n"
                             "donné par sa place : les angles, les milieux, le centre.",
                     font=corps, fill=BLANC, spacing=7)
    y += 62
    ilot4 = pl.crop((0, TW, pl.width, pl.height)).resize((384, 384), Image.NEAREST)
    voile = Image.new("RGBA", ilot4.size, (0, 0, 0, 0))
    dv = ImageDraw.Draw(voile)
    for qy in range(4):
        for qx in range(4):
            bord_x, bord_y = qx in (0, 3), qy in (0, 3)
            role = ("coin sortant" if bord_x and bord_y else
                    "bord" if bord_x or bord_y else "remplissage")
            dv.rectangle([qx * 96, qy * 96, qx * 96 + 95, qy * 96 + 95],
                         fill=ROLES[role] + (105,), outline=(255, 255, 255, 70))
    ilot4 = Image.alpha_composite(ilot4.convert("RGBA"), voile).convert("RGB")
    poser(ilot4, M, y, "")
    coins4 = pl.crop((0, 0, TW, TW)).resize((128, 128), Image.NEAREST)
    v2 = Image.new("RGBA", coins4.size, ROLES["coin rentrant"] + (105,))
    coins4 = Image.alpha_composite(coins4.convert("RGBA"), v2).convert("RGB")
    poser(coins4, M + 420, y + 120, "+ les 4 coins\nrentrants", ROLES["coin rentrant"])

    ly = y + 14
    for role, texte in [
        ("remplissage", "REMPLISSAGE — le centre. Quand la case a\nde la matière tout autour d'elle."),
        ("bord", "BORD — les milieux des 4 côtés. Quand le\nvide est d'un seul côté."),
        ("coin sortant", "COIN SORTANT — les 4 angles. Quand le vide\nest sur deux côtés à la fois."),
        ("coin rentrant", "COIN RENTRANT — quand le vide n'est QUE\ndans la diagonale : c'est le creux d'un recoin."),
    ]:
        d.rectangle([M + 600, ly + 2, M + 624, ly + 26], fill=ROLES[role], outline=(0, 0, 0))
        d.multiline_text((M + 636, ly), texte, font=corps, fill=BLANC, spacing=6)
        ly += 72
    y += 500

    # ---------- 3. Le recollage ----------
    y = cartouche(y, "3", "Puis il recolle les morceaux")
    d.multiline_text((M, y), "Pour chaque case de la carte, il regarde ses voisins et choisit le bon morceau, quart\n"
                             "par quart. À droite, la MÊME image avec les morceaux coloriés selon leur rôle.",
                     font=corps, fill=BLANC, spacing=7)
    y += 62
    carte = rendre_carte(pl, DEMO)
    poser(carte.resize((512, 512), Image.NEAREST), M, y, "ce que voit le joueur", BLANC)
    poser(rendre_carte(pl, DEMO, teinter=True).resize((512, 512), Image.NEAREST), M + 560, y,
          "les mêmes morceaux, coloriés : on retrouve\nles 4 rôles de l'étape 2", GRIS)

    d.multiline_text(
        (M, 2130),
        "⚠ LA SEULE RÈGLE QUAND TU DESSINES : le motif du fond doit se répéter tous les 32 px "
        "(la taille d'un quart).\n"
        "Un même morceau sert à plusieurs endroits — si le dessin change tous les 64 px, "
        "les quarts « sautent » les uns par rapport aux autres.\n"
        "Ce qui doit rester RARE (fissure, flaque, veine) ne va donc pas dans le fond, "
        "mais dans la case « remplissage variante ».",
        font=corps, fill=(236, 190, 120), spacing=8)
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
