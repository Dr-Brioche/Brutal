#!/usr/bin/env python3
# Atelier de sprite : l'OGRE GRIS AU MASQUE DE BOIS (monstre de niveau 3).
#
# Dessiné à la main, pixel par pixel, dans le style « propre » du projet :
#   - une grille NATIVE chunky (64x60), agrandie ×3 en NEAREST (pixels nets),
#   - passe `finition()` : contour sombre + ombre bas/droite + lumière haut/gauche.
#
# Sortie : images/ennemis/ogre.png — UNE bande horizontale de 9 frames, cases
# égales, pieds alignés en bas, fond transparent. Indices lus par data/ennemis.js :
#   idle 0-2 · attaque 3-5 · coup reçu 6-7 · KO 8
#
# Lancer :  python3 outils/generer_ogre.py
# (Aperçu ×3 supplémentaire écrit dans /tmp/ogre_apercu.png pour vérifier à l'œil.)

import os
from PIL import Image, ImageDraw

NW, NH = 64, 60      # grille native (chunky)
S = 3                # facteur d'agrandissement -> case 192x180 (plus GROS qu'un gobelin)
SOL = 58             # ligne de sol (les pieds y touchent)

# ---- Palette : peau GRISE (légère nuance froide), bois du masque/gourdin ------
PEAU    = (126, 131, 128, 255)
PEAU_O  = (94, 99, 98, 255)     # ombre de peau
PEAU_C  = (163, 168, 163, 255)  # peau éclairée
VENTRE  = (138, 142, 138, 255)  # ventre un peu plus clair
BOIS    = (120, 78, 44, 255)    # bois du masque + gourdin
BOIS_O  = (86, 54, 30, 255)     # bois ombré (rainures)
BOIS_C  = (152, 102, 60, 255)   # bois éclairé
CORDE   = (150, 128, 86, 255)   # ligatures / sangles claires
CUIR    = (68, 50, 36, 255)     # pagne / sangles sombres
CUIR_C  = (96, 72, 50, 255)
DENT    = (224, 216, 192, 255)  # défenses / ongles
OEIL    = (232, 150, 46, 255)   # lueur ambre dans les trous du masque
OEIL_C  = (255, 214, 120, 255)  # éclat de l'œil
POIL    = (58, 52, 46, 255)     # tignasse sombre
NOIR    = (20, 20, 22, 255)     # trous du masque (creux)


def R(d, x, y, w, h, c):
    if w <= 0 or h <= 0:
        return
    d.rectangle((x, y, x + w - 1, y + h - 1), fill=c)


# ------------------------------------------------------------ parties du corps --

def jambes(d, bob):
    y = SOL + bob
    # cuisses trapues
    R(d, 20, y - 16, 11, 10, PEAU_O)
    R(d, 33, y - 16, 11, 10, PEAU_O)
    R(d, 21, y - 16, 9, 8, PEAU)
    R(d, 34, y - 16, 9, 8, PEAU)
    # mollets + gros pieds
    R(d, 21, y - 7, 10, 5, PEAU)
    R(d, 33, y - 7, 10, 5, PEAU)
    R(d, 18, y - 3, 15, 4, PEAU_O)   # pied gauche (large)
    R(d, 31, y - 3, 15, 4, PEAU_O)   # pied droit
    # ongles
    for x in (18, 22, 26):
        R(d, x, y - 1, 2, 1, DENT)
    for x in (33, 37, 41):
        R(d, x, y - 1, 2, 1, DENT)


def pagne(d, bob):
    y = SOL + bob
    R(d, 18, y - 22, 28, 8, CUIR)
    R(d, 18, y - 22, 28, 1, CUIR_C)
    for x in (23, 31, 39):                # lanières pendantes
        R(d, x, y - 15, 3, 5, CUIR)
    R(d, 30, y - 21, 4, 6, CORDE)         # nœud central


def torse(d, bob, lean):
    y = SOL + bob
    x0 = 16 + lean
    # bosse du dos (ogre voûté) : hump central plus haut que les épaules
    R(d, x0 + 6, y - 46, 22, 7, PEAU_O)
    R(d, x0 + 8, y - 46, 18, 6, PEAU)
    R(d, x0 + 9, y - 46, 10, 1, PEAU_C)
    # épaules épaisses, coins adoucis (on décale d'1px les extrémités hautes)
    R(d, x0, y - 41, 32, 9, PEAU_O)
    R(d, x0 + 2, y - 42, 28, 9, PEAU)
    R(d, x0 - 1, y - 39, 2, 6, PEAU_O)   # moignon d'épaule gauche arrondi
    R(d, x0 + 31, y - 39, 2, 6, PEAU_O)  # moignon d'épaule droite
    # torse + gros ventre (taille un peu resserrée sous les épaules)
    R(d, x0 + 1, y - 34, 30, 16, PEAU)
    R(d, x0 + 5, y - 26, 24, 12, VENTRE) # bedaine bombée
    R(d, x0 + 2, y - 33, 28, 1, PEAU_C)  # lumière du haut du torse
    # pectoraux / plis / nombril
    R(d, x0 + 6, y - 32, 8, 2, PEAU_O)
    R(d, x0 + 18, y - 32, 8, 2, PEAU_O)
    R(d, x0 + 15, y - 22, 2, 2, PEAU_O)  # nombril
    R(d, x0 + 9, y - 18, 14, 1, PEAU_O)  # pli du bas-ventre


def bras_gauche(d, bob):
    # bras massif qui pend (poing fermé), côté gauche de l'image
    y = SOL + bob
    R(d, 8, y - 38, 9, 20, PEAU_O)
    R(d, 9, y - 37, 7, 18, PEAU)
    R(d, 7, y - 20, 11, 8, PEAU_O)       # poing
    R(d, 8, y - 19, 9, 6, PEAU)
    for x in (9, 12, 15):                # jointures
        R(d, x, y - 20, 1, 2, PEAU_O)


def gourdin(d, x, y, ang):
    """Gros gourdin de bois noueux. `ang` : 0 = manche vertical, 1 = incliné,
    2 = brandi haut, 3 = abattu en avant."""
    if ang == 0:      # au repos : gros gourdin dressé, tête noueuse en haut
        manche = [(x, y - 2, 5, 24)]
        tete = (x - 5, y - 16, 15, 16)
        clous = [(x - 2, y - 12), (x + 7, y - 9), (x + 2, y - 4)]
    elif ang == 2:    # brandi au-dessus de la tête
        manche = [(x, y, 5, 16)]
        tete = (x - 4, y - 12, 13, 14)
        clous = [(x - 1, y - 9), (x + 6, y - 5)]
    elif ang == 3:    # abattu vers l'avant (frappe)
        manche = [(x - 2, y, 20, 5)]
        tete = (x + 16, y - 4, 12, 13)
        clous = [(x + 19, y - 1), (x + 23, y + 4)]
    else:             # levé, incliné
        manche = [(x, y, 5, 18)]
        tete = (x - 3, y - 6, 12, 13)
        clous = [(x, y - 3), (x + 5, y + 1)]
    for mx, my, mw, mh in manche:
        R(d, mx, my, mw, mh, BOIS)
        R(d, mx + 1, my, 1, mh, BOIS_C)      # fil du bois
        R(d, mx + mw - 1, my, 1, mh, BOIS_O)
    tx, ty, tw, th = tete
    R(d, tx, ty, tw, th, BOIS)
    R(d, tx, ty, tw, 2, BOIS_C)              # dessus éclairé
    R(d, tx, ty + th - 2, tw, 2, BOIS_O)     # dessous ombré
    R(d, tx + 1, ty + 3, 2, th - 5, BOIS_O)  # rainure
    for cx, cy in clous:                     # clous / éclats de pierre
        R(d, cx, cy, 2, 2, CORDE)


def masque_et_tete(d, bob, headDy):
    """Tête grise coiffée d'une tignasse, face couverte d'un MASQUE DE BOIS
    (planches verticales, deux trous d'yeux qui luisent, arête de nez)."""
    y = SOL + bob + headDy
    cx = 22
    # crâne gris (ce qui dépasse du masque)
    R(d, cx + 6, y - 52, 20, 14, PEAU_O)
    R(d, cx + 7, y - 52, 18, 12, PEAU)
    # tignasse hirsute sur le dessus et les côtés
    R(d, cx + 5, y - 55, 22, 5, POIL)
    for x in range(cx + 5, cx + 27, 3):
        R(d, x, y - 57, 2, 3, POIL)
    R(d, cx + 4, y - 50, 3, 8, POIL)
    R(d, cx + 25, y - 50, 3, 8, POIL)
    # oreilles grises pointues
    R(d, cx + 3, y - 47, 3, 5, PEAU_O)
    R(d, cx + 26, y - 47, 3, 5, PEAU_O)

    # --- LE MASQUE DE BOIS : planches verticales devant le visage ---
    mx, my, mw, mh = cx + 6, y - 48, 20, 22
    R(d, mx, my, mw, mh, BOIS)
    # planches : rainures verticales
    for x in range(mx + 3, mx + mw, 4):
        R(d, x, my, 1, mh, BOIS_O)
    R(d, mx, my, mw, 2, BOIS_C)              # liseré éclairé en haut
    R(d, mx, my + mh - 2, mw, 2, BOIS_O)     # bord bas ombré
    R(d, mx, my, 1, mh, BOIS_C)
    R(d, mx + mw - 1, my, 1, mh, BOIS_O)
    # arête de nez sculptée (relief central)
    R(d, mx + mw // 2 - 1, my + 6, 3, 12, BOIS_C)
    R(d, mx + mw // 2 + 1, my + 6, 1, 12, BOIS_O)
    # deux trous d'yeux (creux noirs) + lueur ambre
    R(d, mx + 3, my + 6, 5, 4, NOIR)
    R(d, mx + mw - 8, my + 6, 5, 4, NOIR)
    R(d, mx + 4, my + 7, 3, 2, OEIL)
    R(d, mx + mw - 7, my + 7, 3, 2, OEIL)
    R(d, mx + 4, my + 7, 1, 1, OEIL_C)
    R(d, mx + mw - 7, my + 7, 1, 1, OEIL_C)
    # fentes de bouche du masque + défenses qui dépassent dessous
    R(d, mx + 5, my + mh - 6, mw - 10, 2, NOIR)
    R(d, mx + 4, my + mh - 1, 3, 4, DENT)    # défense gauche (pointe en haut)
    R(d, mx + mw - 7, my + mh - 1, 3, 4, DENT)
    # sangle du masque autour du crâne
    R(d, cx + 4, y - 44, mw + 4, 2, CUIR)


# ------------------------------------------------------------------ une frame --

def dessiner_frame(pose):
    img = Image.new("RGBA", (NW, NH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = pose.get("bob", 0)
    lean = pose.get("lean", 0)
    headDy = pose.get("headDy", 0)
    shift = pose.get("shift", 0)          # décalage global (stagger du coup reçu)

    if pose.get("ko"):
        return dessiner_ko()

    # ordre de superposition : bras arrière -> jambes/pagne -> torse -> bras avant -> tête
    off = shift
    d.rectangle((0, 0, 0, 0), fill=None)
    # bras gauche (arrière)
    bras_gauche(d, bob)
    jambes(d, bob)
    pagne(d, bob)
    torse(d, bob, lean)
    # bras droit + gourdin (avant), selon la pose
    y = SOL + bob
    ang = pose.get("club", 0)
    if ang == 0:
        R(d, 47, y - 38, 9, 20, PEAU_O); R(d, 48, y - 37, 7, 18, PEAU)
        R(d, 47, y - 20, 10, 7, PEAU_O)                 # poing
        gourdin(d, 49, y - 16, 0)
    elif ang == 1:
        R(d, 47, y - 38, 9, 16, PEAU_O); R(d, 48, y - 37, 7, 14, PEAU)
        R(d, 48, y - 26, 9, 7, PEAU_O)
        gourdin(d, 50, y - 30, 1)
    elif ang == 2:
        R(d, 46, y - 44, 9, 16, PEAU_O); R(d, 47, y - 44, 7, 15, PEAU)   # bras tendu haut
        R(d, 46, y - 46, 9, 6, PEAU_O)
        gourdin(d, 48, y - 58, 2)
    elif ang == 3:
        R(d, 46, y - 34, 14, 8, PEAU_O); R(d, 46, y - 33, 13, 6, PEAU)   # bras tendu avant
        R(d, 57, y - 33, 7, 7, PEAU_O)
        gourdin(d, 52, y - 30, 3)
    # coutures d'ombre : détachent les bras du torse (sinon masse grise unie)
    if ang in (0, 1):
        R(d, 16, y - 36, 1, 18, PEAU_O)   # côté bras gauche
        R(d, 46, y - 34, 1, 16, PEAU_O)   # côté bras droit
    # tête + masque par-dessus les épaules
    masque_et_tete(d, bob, headDy)

    if off:
        img = img.transform(img.size, Image.AFFINE, (1, 0, -off, 0, 1, 0))
    return img


def dessiner_ko():
    """Ogre à terre : effondré sur les genoux, masque penché en avant."""
    img = Image.new("RGBA", (NW, NH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = SOL
    # masse du corps affaissée, plus basse et large
    R(d, 10, y - 6, 18, 6, PEAU_O)          # jambe/hanche repliée gauche
    R(d, 34, y - 6, 18, 6, PEAU_O)
    R(d, 14, y - 20, 34, 16, PEAU)          # torse tombé en avant
    R(d, 16, y - 14, 28, 10, VENTRE)
    R(d, 8, y - 14, 10, 8, PEAU_O)          # bras étalé gauche
    R(d, 44, y - 14, 12, 8, PEAU_O)         # bras étalé droit
    # gourdin lâché au sol
    R(d, 40, y - 3, 20, 4, BOIS)
    R(d, 56, y - 5, 8, 8, BOIS_O)
    # tête basculée en avant, masque de bois vers le sol
    R(d, 18, y - 30, 18, 12, PEAU)
    R(d, 17, y - 33, 20, 4, POIL)
    R(d, 19, y - 28, 16, 10, BOIS)          # masque incliné
    for x in range(22, 35, 4):
        R(d, x, y - 28, 1, 10, BOIS_O)
    R(d, 21, y - 24, 4, 3, NOIR)            # yeux éteints (plus de lueur)
    R(d, 29, y - 24, 4, 3, NOIR)
    R(d, 19, y - 19, 3, 3, DENT)            # défenses
    return img


# --------------------------------------------------------------- finition ------
# Contour sombre + ombre (bords bas/droite) + lumière (bords haut/gauche).

CONTOUR = (22, 16, 12, 255)


def finition(frame):
    w, h = frame.size
    px = frame.load()

    def opaque(x, y):
        return 0 <= x < w and 0 <= y < h and px[x, y][3] > 0

    trav = frame.copy(); tpx = trav.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if not opaque(x + 1, y) or not opaque(x, y + 1):
                tpx[x, y] = (int(r * 0.66), int(g * 0.66), int(b * 0.66), a)
            elif not opaque(x - 1, y) or not opaque(x, y - 1):
                tpx[x, y] = (min(255, int(r * 1.20) + 10),
                             min(255, int(g * 1.20) + 10),
                             min(255, int(b * 1.20) + 10), a)

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0)); opx = out.load()
    for y in range(h):
        for x in range(w):
            if tpx[x, y][3] > 0:
                opx[x, y] = tpx[x, y]
            elif any(opaque(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                                                            (1, 1), (-1, 1), (1, -1), (-1, -1))):
                opx[x, y] = CONTOUR
    return out


# ------------------------------------------------------------- fabrication -----

# Poses des 9 frames (idle 0-2 · attaque 3-5 · coup reçu 6-7 · KO 8)
POSES = [
    {"bob": 0, "club": 0},                                   # 0 idle repos
    {"bob": -1, "club": 0, "headDy": -1},                    # 1 idle respire (monte)
    {"bob": 1, "club": 1},                                    # 2 idle balance (gourdin levé un peu)
    {"bob": -1, "club": 1, "lean": -1},                      # 3 attaque : arme se lève
    {"bob": -2, "club": 2, "lean": -2, "headDy": -1},        # 4 attaque : brandi haut
    {"bob": 1, "club": 3, "lean": 3},                        # 5 attaque : abat le gourdin
    {"bob": 0, "club": 0, "headDy": 2, "shift": 3},          # 6 coup reçu : recule
    {"bob": 1, "club": 0, "headDy": 3, "shift": 5},          # 7 coup reçu : chancelle
    {"ko": True},                                             # 8 KO : à terre
]


def main():
    racine = os.path.join(os.path.dirname(__file__), "..")
    frames = [finition(dessiner_frame(p)) for p in POSES]

    cw, ch = NW * S, NH * S
    planche = Image.new("RGBA", (cw * len(frames), ch), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        big = f.resize((cw, ch), Image.NEAREST)     # agrandissement net (chunky)
        planche.alpha_composite(big, (i * cw, 0))

    dossier = os.path.join(racine, "images", "ennemis")
    os.makedirs(dossier, exist_ok=True)
    sortie = os.path.join(dossier, "ogre.png")
    planche.save(sortie)
    print(f"OK -> images/ennemis/ogre.png | {len(frames)} frames | case {cw}x{ch} | "
          f"planche {planche.size[0]}x{planche.size[1]}")

    # Aperçu (fond sombre) pour vérifier à l'œil, agrandi encore ×1.
    apercu = Image.new("RGBA", (planche.size[0], planche.size[1]), (26, 24, 22, 255))
    apercu.alpha_composite(planche)
    apercu.save("/tmp/ogre_apercu.png")
    print("OK -> /tmp/ogre_apercu.png (aperçu sur fond sombre)")


if __name__ == "__main__":
    main()
