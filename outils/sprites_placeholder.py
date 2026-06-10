"""Atelier de sprites provisoires du projet BRUTAL.

Génère les planches de sprites "de chantier" (placeholder) :
- les sets d'armure du nain (un PNG complet par set, grille 4x4 de cases 32x32)
- les armes (un PNG par arme, même grille, dessinées par-dessus le héros)

Grille commune : 4 colonnes (poses) x 4 lignes (directions).
Lignes : 0 = bas (face), 1 = gauche, 2 = droite (miroir), 3 = haut (dos).
Poses  : 0 = arrêt, 1 = pas A, 2 = arrêt, 3 = pas B.

Le vrai pixel art remplacera ces fichiers plus tard : il suffit de garder
la même grille, le code du jeu n'a pas besoin de changer.

Usage : python3 outils/sprites_placeholder.py
"""
from PIL import Image, ImageDraw

T = 32  # taille d'une case

# ---- Couleurs communes ----
PEAU        = (236, 192, 149, 255)
OEIL        = (43, 32, 20, 255)
BARBE       = (201, 118, 42, 255)
BARBE_FONCE = (168, 94, 31, 255)
BOUCLE      = (217, 163, 47, 255)
BOIS        = (122, 78, 42, 255)
FER         = (170, 180, 191, 255)
FER_FONCE   = (120, 128, 138, 255)

# ---- Palettes des sets d'armure ----
SETS = {
    # nain.png : la tenue de départ (tunique bleue, casque d'acier)
    "nain": dict(
        TUNIQUE=(59, 93, 201, 255), TUNIQUE_F=(45, 72, 158, 255),
        CASQUE=(153, 163, 173, 255), CASQUE_F=(107, 114, 124, 255),
        CEINTURE=(90, 58, 33, 255), PANTALON=(107, 74, 47, 255),
        BOTTE=(47, 34, 24, 255),
    ),
    # nain-onyx.png : plate sombre des Onyx-Guardians
    "nain-onyx": dict(
        TUNIQUE=(42, 45, 51, 255), TUNIQUE_F=(30, 32, 37, 255),
        CASQUE=(60, 63, 69, 255), CASQUE_F=(38, 40, 45, 255),
        CEINTURE=(25, 20, 16, 255), PANTALON=(52, 54, 60, 255),
        BOTTE=(20, 18, 16, 255),
    ),
    # nain-forge.png : maille rouge braise des Rune-Awakener
    "nain-forge": dict(
        TUNIQUE=(179, 66, 42, 255), TUNIQUE_F=(140, 48, 30, 255),
        CASQUE=(138, 106, 58, 255), CASQUE_F=(100, 75, 40, 255),
        CEINTURE=(60, 38, 22, 255), PANTALON=(90, 60, 35, 255),
        BOTTE=(40, 28, 18, 255),
    ),
}


def R(d, x, y, w, h, c):
    d.rectangle((x, y, x + w - 1, y + h - 1), fill=c)


# ---------------------------------------------------------------- le nain --

def frame_bas(P, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -1 if pose in (1, 3) else 0  # léger rebond du corps en marchant

    # Bras puis tunique, ceinture, jambes
    R(d, 6, 18 + bob, 2, 6, P["TUNIQUE_F"])
    R(d, 24, 18 + bob, 2, 6, P["TUNIQUE_F"])
    R(d, 6, 24 + bob, 2, 2, PEAU)
    R(d, 24, 24 + bob, 2, 2, PEAU)
    R(d, 8, 17 + bob, 16, 7, P["TUNIQUE"])
    R(d, 8, 24 + bob, 16, 2, P["CEINTURE"])
    R(d, 15, 24 + bob, 2, 2, BOUCLE)
    gauche_dy = -1 if pose == 1 else 0
    droite_dy = -1 if pose == 3 else 0
    R(d, 10, 26 + gauche_dy, 5, 3, P["PANTALON"])
    R(d, 17, 26 + droite_dy, 5, 3, P["PANTALON"])
    R(d, 10, 29 + gauche_dy, 5, 3, P["BOTTE"])
    R(d, 17, 29 + droite_dy, 5, 3, P["BOTTE"])
    # Tête : visage, yeux, casque, barbe
    R(d, 11, 10 + bob, 10, 4, PEAU)
    R(d, 13, 11 + bob, 1, 1, OEIL)
    R(d, 18, 11 + bob, 1, 1, OEIL)
    R(d, 11, 3 + bob, 10, 2, P["CASQUE"])
    R(d, 9, 5 + bob, 14, 4, P["CASQUE"])
    R(d, 9, 9 + bob, 14, 1, P["CASQUE_F"])
    R(d, 9, 11 + bob, 2, 4, BARBE)
    R(d, 21, 11 + bob, 2, 4, BARBE)
    R(d, 9, 13 + bob, 14, 6, BARBE)
    R(d, 12, 19 + bob, 8, 2, BARBE_FONCE)
    return img


def frame_gauche(P, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -1 if pose in (1, 3) else 0

    R(d, 10, 17 + bob, 13, 7, P["TUNIQUE"])
    R(d, 10, 24 + bob, 13, 2, P["CEINTURE"])
    if pose == 1:        # grande foulée
        jambes = ((10, 26), (18, 26))
    elif pose == 3:      # jambes qui se croisent
        jambes = ((13, 26), (16, 26))
    else:                # à l'arrêt
        jambes = ((12, 26), (17, 26))
    for jx, jy in jambes:
        R(d, jx, jy, 4, 3, P["PANTALON"])
        R(d, jx - (1 if pose == 1 and jx == 10 else 0), jy + 3, 4, 3, P["BOTTE"])
    # Bras visible (balancement en marchant)
    bras_dx = {0: 0, 1: -2, 2: 0, 3: 2}[pose]
    R(d, 14 + bras_dx, 19 + bob, 3, 5, P["TUNIQUE_F"])
    R(d, 14 + bras_dx, 24 + bob, 3, 2, PEAU)
    # Tête
    R(d, 10, 10 + bob, 7, 4, PEAU)
    R(d, 12, 11 + bob, 1, 1, OEIL)
    R(d, 17, 10 + bob, 6, 4, P["CASQUE_F"])
    R(d, 11, 3 + bob, 11, 2, P["CASQUE"])
    R(d, 10, 5 + bob, 13, 4, P["CASQUE"])
    R(d, 10, 9 + bob, 13, 1, P["CASQUE_F"])
    R(d, 9, 13 + bob, 8, 5, BARBE)
    R(d, 10, 18 + bob, 5, 3, BARBE_FONCE)
    return img


def frame_haut(P, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -1 if pose in (1, 3) else 0

    R(d, 6, 18 + bob, 2, 6, P["TUNIQUE_F"])
    R(d, 24, 18 + bob, 2, 6, P["TUNIQUE_F"])
    R(d, 6, 24 + bob, 2, 2, PEAU)
    R(d, 24, 24 + bob, 2, 2, PEAU)
    # Tunique haute : pas de barbe visible de dos.
    # (L'arme du héros, elle, est dessinée par le jeu par-dessus ce sprite.)
    R(d, 8, 12 + bob, 16, 12, P["TUNIQUE"])
    R(d, 8, 24 + bob, 16, 2, P["CEINTURE"])
    gauche_dy = -1 if pose == 1 else 0
    droite_dy = -1 if pose == 3 else 0
    R(d, 10, 26 + gauche_dy, 5, 3, P["PANTALON"])
    R(d, 17, 26 + droite_dy, 5, 3, P["PANTALON"])
    R(d, 10, 29 + gauche_dy, 5, 3, P["BOTTE"])
    R(d, 17, 29 + droite_dy, 5, 3, P["BOTTE"])
    R(d, 11, 3 + bob, 10, 2, P["CASQUE"])
    R(d, 9, 5 + bob, 14, 5, P["CASQUE"])
    R(d, 9, 10 + bob, 14, 2, P["CASQUE_F"])
    return img


# --------------------------------------------------------------- les armes --
# Chaque arme est dessinée seule sur une case transparente : le jeu la pose
# par-dessus le sprite du héros. Les décalages suivent la main du nain
# (même rebond "bob", même balancement de bras que dans les frames du héros).

def tete_arme(d, arme, x, y):
    """Dessine la tête de l'arme, ancrée en haut du manche (x = colonne du manche)."""
    if arme == "hache":
        R(d, x - 5, y + 1, 5, 5, FER)
        R(d, x - 1, y + 1, 1, 5, FER_FONCE)
    elif arme == "marteau":
        R(d, x - 3, y, 8, 4, FER)
        R(d, x - 3, y + 3, 8, 1, FER_FONCE)
    elif arme == "pioche":
        R(d, x - 5, y + 1, 12, 2, FER)
        R(d, x - 5, y + 3, 2, 1, FER_FONCE)
        R(d, x + 5, y + 3, 2, 1, FER_FONCE)


def arme_bas(arme, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -1 if pose in (1, 3) else 0
    R(d, 25, 12 + bob, 2, 14, BOIS)        # manche, dans la main droite
    tete_arme(d, arme, 25, 10 + bob)
    return img


def arme_gauche(arme, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -1 if pose in (1, 3) else 0
    bras_dx = {0: 0, 1: -2, 2: 0, 3: 2}[pose]   # suit le balancement du bras
    R(d, 14 + bras_dx, 12 + bob, 2, 13, BOIS)
    tete_arme(d, arme, 14 + bras_dx, 10 + bob)
    return img


def arme_haut(arme, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -1 if pose in (1, 3) else 0
    R(d, 15, 12 + bob, 2, 11, BOIS)        # rangée dans le dos
    tete_arme(d, arme, 15, 10 + bob)
    return img


# ---------------------------------------------------------------- finition --
# Trois techniques de base du pixel art, appliquées automatiquement :
# contour sombre, ombre sur les bords bas/droite, lumière sur les bords
# haut/gauche. Même 32x32, rendu nettement moins "brut".

CONTOUR = (24, 16, 11, 255)

def finition(frame):
    px = frame.load()

    def opaque(x, y):
        return 0 <= x < T and 0 <= y < T and px[x, y][3] > 0

    travaille = frame.copy()
    tpx = travaille.load()
    for y in range(T):
        for x in range(T):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if not opaque(x + 1, y) or not opaque(x, y + 1):    # ombre
                tpx[x, y] = (int(r * 0.68), int(g * 0.68), int(b * 0.68), a)
            elif not opaque(x - 1, y) or not opaque(x, y - 1):  # lumière
                tpx[x, y] = (min(255, int(r * 1.22) + 12),
                             min(255, int(g * 1.22) + 12),
                             min(255, int(b * 1.22) + 12), a)

    resultat = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rpx = resultat.load()
    for y in range(T):
        for x in range(T):
            if tpx[x, y][3] > 0:
                rpx[x, y] = tpx[x, y]
            elif any(opaque(x + dx, y + dy)
                     for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                rpx[x, y] = CONTOUR
    return resultat


# ------------------------------------------------------------- fabrication --

def planche_nain(P):
    planche = Image.new("RGBA", (T * 4, T * 4), (0, 0, 0, 0))
    for pose in range(4):
        gauche = finition(frame_gauche(P, pose))
        planche.paste(finition(frame_bas(P, pose)), (pose * T, 0))
        planche.paste(gauche, (pose * T, T))
        planche.paste(gauche.transpose(Image.FLIP_LEFT_RIGHT), (pose * T, 2 * T))
        planche.paste(finition(frame_haut(P, pose)), (pose * T, 3 * T))
    return planche


def planche_arme(arme):
    planche = Image.new("RGBA", (T * 4, T * 4), (0, 0, 0, 0))
    for pose in range(4):
        gauche = finition(arme_gauche(arme, pose))
        planche.paste(finition(arme_bas(arme, pose)), (pose * T, 0))
        planche.paste(gauche, (pose * T, T))
        planche.paste(gauche.transpose(Image.FLIP_LEFT_RIGHT), (pose * T, 2 * T))
        planche.paste(finition(arme_haut(arme, pose)), (pose * T, 3 * T))
    return planche


if __name__ == "__main__":
    import os
    racine = os.path.join(os.path.dirname(__file__), "..")

    os.makedirs(os.path.join(racine, "images", "heros"), exist_ok=True)
    os.makedirs(os.path.join(racine, "images", "armes"), exist_ok=True)

    planches_sets = {}
    for nom, palette in SETS.items():
        planche = planche_nain(palette)
        planche.save(os.path.join(racine, "images", "heros", nom + ".png"))
        planches_sets[nom] = planche
        print("OK  images/heros/" + nom + ".png")

    planches_armes = {}
    for arme in ("hache", "marteau", "pioche"):
        planche = planche_arme(arme)
        planche.save(os.path.join(racine, "images", "armes", arme + ".png"))
        planches_armes[arme] = planche
        print("OK  images/armes/" + arme + ".png")

    # Aperçu pour vérification : 1 ligne par set (4 directions),
    # + 1 ligne des 3 armes portées par le set de base, vue de face.
    apercu = Image.new("RGBA", (T * 4, T * 4), (20, 17, 15, 255))
    for ligne, nom in enumerate(SETS):
        for direction in range(4):
            case = planches_sets[nom].crop((0, direction * T, T, (direction + 1) * T))
            apercu.alpha_composite(case, (direction * T, ligne * T))
    for colonne, arme in enumerate(("hache", "marteau", "pioche")):
        case = planches_sets["nain"].crop((0, 0, T, T)).copy()
        case.alpha_composite(planches_armes[arme].crop((0, 0, T, T)))
        apercu.alpha_composite(case, (colonne * T, 3 * T))
    apercu.resize((T * 16, T * 16), Image.NEAREST).save("/tmp/equipement_apercu.png")
    print("OK  /tmp/equipement_apercu.png (aperçu x4)")
