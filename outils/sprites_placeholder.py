"""Atelier de sprites provisoires du projet BRUTAL.

Génère les planches de sprites "de chantier" (placeholder) :
- les sets d'armure du nain (un PNG complet par set, grille 4x4 de cases 64x64)
- les armes (un PNG par arme, même grille, dessinées par-dessus le héros)

Grille commune : 4 colonnes (poses) x 4 lignes (directions).
Lignes : 0 = bas (face), 1 = gauche, 2 = droite (miroir), 3 = haut (dos).
Poses  : 0 = arrêt, 1 = pas A, 2 = arrêt, 3 = pas B.

Le vrai pixel art remplacera ces fichiers plus tard : il suffit de garder
la même grille, le code du jeu n'a pas besoin de changer.

Usage : python3 outils/sprites_placeholder.py
"""
from PIL import Image, ImageDraw

T = 64  # taille d'une case

# ---- Couleurs communes ----
PEAU        = (236, 192, 149, 255)
PEAU_F      = (205, 160, 118, 255)
OEIL        = (43, 32, 20, 255)
OEIL_GLINT  = (140, 150, 160, 255)
SOURCIL     = (140, 80, 30, 255)
BARBE       = (201, 118, 42, 255)
BARBE_F     = (168, 94, 31, 255)
BOUCLE      = (217, 163, 47, 255)
BOUCLE_F    = (160, 115, 28, 255)
LACET       = (120, 95, 70, 255)
BOIS        = (122, 78, 42, 255)
BOIS_C      = (150, 100, 58, 255)
FER         = (170, 180, 191, 255)
FER_F       = (120, 128, 138, 255)
FER_C       = (205, 214, 224, 255)


def claire(c):
    """Version éclaircie d'une couleur (pour les reflets)."""
    return (min(255, int(c[0] * 1.22) + 12),
            min(255, int(c[1] * 1.22) + 12),
            min(255, int(c[2] * 1.22) + 12), 255)


# ---- Palettes des sets d'armure ----
SETS = {
    # nain.png : la tenue de départ (tunique bleue, casque d'acier)
    "nain": dict(
        TUNIQUE=(59, 93, 201, 255), TUNIQUE_F=(45, 72, 158, 255),
        CASQUE=(153, 163, 173, 255), CASQUE_F=(107, 114, 124, 255),
        CEINTURE=(90, 58, 33, 255), CEINTURE_F=(62, 40, 22, 255),
        PANTALON=(107, 74, 47, 255), BOTTE=(47, 34, 24, 255),
    ),
    # nain-onyx.png : plate sombre des Onyx-Guardians
    "nain-onyx": dict(
        TUNIQUE=(42, 45, 51, 255), TUNIQUE_F=(30, 32, 37, 255),
        CASQUE=(60, 63, 69, 255), CASQUE_F=(38, 40, 45, 255),
        CEINTURE=(25, 20, 16, 255), CEINTURE_F=(15, 12, 10, 255),
        PANTALON=(52, 54, 60, 255), BOTTE=(20, 18, 16, 255),
    ),
    # nain-forge.png : maille rouge braise des Rune-Awakener
    "nain-forge": dict(
        TUNIQUE=(179, 66, 42, 255), TUNIQUE_F=(140, 48, 30, 255),
        CASQUE=(138, 106, 58, 255), CASQUE_F=(100, 75, 40, 255),
        CEINTURE=(60, 38, 22, 255), CEINTURE_F=(42, 26, 15, 255),
        PANTALON=(90, 60, 35, 255), BOTTE=(40, 28, 18, 255),
    ),
}


def R(d, x, y, w, h, c):
    d.rectangle((x, y, x + w - 1, y + h - 1), fill=c)


# ---------------------------------------------------------------- le nain --

def jambes_face(d, P, pose):
    """Jambes vues de face ou de dos : l'une se lève en pose 1, l'autre en 3."""
    gdy = -2 if pose == 1 else 0
    ddy = -2 if pose == 3 else 0
    R(d, 20, 52 + gdy, 10, 6, P["PANTALON"])
    R(d, 34, 52 + ddy, 10, 6, P["PANTALON"])
    R(d, 20, 58 + gdy, 10, 6, P["BOTTE"])
    R(d, 34, 58 + ddy, 10, 6, P["BOTTE"])
    R(d, 23, 60 + gdy, 4, 1, LACET)
    R(d, 37, 60 + ddy, 4, 1, LACET)


def frame_bas(P, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -2 if pose in (1, 3) else 0  # léger rebond du corps en marchant

    # Bras et mains
    R(d, 12, 36 + bob, 4, 12, P["TUNIQUE_F"])
    R(d, 48, 36 + bob, 4, 12, P["TUNIQUE_F"])
    R(d, 12, 48 + bob, 4, 4, PEAU)
    R(d, 48, 48 + bob, 4, 4, PEAU)
    # Tunique : col clair, plis, liseré
    R(d, 16, 34 + bob, 32, 14, P["TUNIQUE"])
    R(d, 16, 34 + bob, 32, 1, claire(P["TUNIQUE"]))
    R(d, 22, 36 + bob, 1, 11, P["TUNIQUE_F"])
    R(d, 41, 36 + bob, 1, 11, P["TUNIQUE_F"])
    R(d, 16, 46 + bob, 32, 1, P["TUNIQUE_F"])
    # Ceinture : boucle dorée travaillée + trous
    R(d, 16, 48 + bob, 32, 4, P["CEINTURE"])
    R(d, 30, 48 + bob, 4, 4, BOUCLE)
    R(d, 31, 49 + bob, 2, 2, BOUCLE_F)
    for x in (22, 26, 40):
        R(d, x, 49 + bob, 1, 1, P["CEINTURE_F"])
    # Jambes
    jambes_face(d, P, pose)
    # Visage : joues, sourcils, yeux avec reflet
    R(d, 22, 20 + bob, 20, 8, PEAU)
    R(d, 23, 25 + bob, 2, 1, PEAU_F)
    R(d, 39, 25 + bob, 2, 1, PEAU_F)
    R(d, 25, 21 + bob, 4, 1, SOURCIL)
    R(d, 35, 21 + bob, 4, 1, SOURCIL)
    R(d, 26, 22 + bob, 2, 2, OEIL)
    R(d, 36, 22 + bob, 2, 2, OEIL)
    R(d, 27, 22 + bob, 1, 1, OEIL_GLINT)
    R(d, 37, 22 + bob, 1, 1, OEIL_GLINT)
    # Casque : dôme, reflet, rivets, rebord, protège-nez
    R(d, 22, 6 + bob, 20, 4, P["CASQUE"])
    R(d, 18, 10 + bob, 28, 8, P["CASQUE"])
    R(d, 20, 11 + bob, 24, 2, claire(P["CASQUE"]))
    for x in (20, 31, 42):
        R(d, x, 14 + bob, 2, 2, P["CASQUE_F"])
    R(d, 18, 18 + bob, 28, 2, P["CASQUE_F"])
    R(d, 31, 18 + bob, 2, 8, P["CASQUE"])
    R(d, 31, 18 + bob, 1, 8, claire(P["CASQUE"]))
    # Barbe : favoris, masse, moustache, mèches, pointe, tresses à anneaux
    R(d, 18, 22 + bob, 4, 8, BARBE)
    R(d, 42, 22 + bob, 4, 8, BARBE)
    R(d, 18, 26 + bob, 28, 12, BARBE)
    R(d, 26, 26 + bob, 12, 2, BARBE_F)
    for x in (21, 25, 29, 33, 37, 41):
        R(d, x, 29 + bob, 1, 8, BARBE_F)
    for x in (23, 27, 31, 35, 39):
        R(d, x, 28 + bob, 1, 2, claire(BARBE))
    R(d, 24, 38 + bob, 16, 4, BARBE)
    R(d, 26, 42 + bob, 4, 7, BARBE)
    R(d, 34, 42 + bob, 4, 7, BARBE)
    R(d, 26, 44 + bob, 4, 1, BOUCLE)
    R(d, 34, 44 + bob, 4, 1, BOUCLE)
    R(d, 26, 48 + bob, 4, 1, BARBE_F)
    R(d, 34, 48 + bob, 4, 1, BARBE_F)
    return img


def frame_gauche(P, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -2 if pose in (1, 3) else 0

    # Tunique : col, plis, liseré
    R(d, 20, 34 + bob, 26, 14, P["TUNIQUE"])
    R(d, 20, 34 + bob, 26, 1, claire(P["TUNIQUE"]))
    R(d, 26, 36 + bob, 1, 11, P["TUNIQUE_F"])
    R(d, 38, 36 + bob, 1, 11, P["TUNIQUE_F"])
    R(d, 20, 46 + bob, 26, 1, P["TUNIQUE_F"])
    # Ceinture
    R(d, 20, 48 + bob, 26, 4, P["CEINTURE"])
    for x in (26, 34, 40):
        R(d, x, 49 + bob, 1, 1, P["CEINTURE_F"])
    # Jambes : foulée selon la pose
    if pose == 1:        # grande foulée
        jambes = ((20, 52), (36, 52))
    elif pose == 3:      # jambes qui se croisent
        jambes = ((26, 52), (32, 52))
    else:                # à l'arrêt
        jambes = ((24, 52), (34, 52))
    for jx, jy in jambes:
        R(d, jx, jy, 8, 6, P["PANTALON"])
        bx = jx - (2 if pose == 1 and jx == 20 else 0)  # pointe du pied avant
        R(d, bx, jy + 6, 8, 6, P["BOTTE"])
        R(d, bx + 2, jy + 8, 4, 1, LACET)
    # Bras visible (balancement en marchant)
    bras_dx = {0: 0, 1: -4, 2: 0, 3: 4}[pose]
    R(d, 28 + bras_dx, 38 + bob, 6, 10, P["TUNIQUE_F"])
    R(d, 28 + bras_dx, 48 + bob, 6, 4, PEAU)
    # Visage : joue, sourcil, œil avec reflet ; couvre-nuque derrière
    R(d, 20, 20 + bob, 14, 8, PEAU)
    R(d, 21, 25 + bob, 2, 1, PEAU_F)
    R(d, 23, 21 + bob, 5, 1, SOURCIL)
    R(d, 24, 22 + bob, 2, 2, OEIL)
    R(d, 25, 22 + bob, 1, 1, OEIL_GLINT)
    R(d, 34, 20 + bob, 12, 8, P["CASQUE_F"])
    # Casque
    R(d, 22, 6 + bob, 22, 4, P["CASQUE"])
    R(d, 20, 10 + bob, 26, 8, P["CASQUE"])
    R(d, 22, 11 + bob, 22, 2, claire(P["CASQUE"]))
    for x in (22, 33, 42):
        R(d, x, 14 + bob, 2, 2, P["CASQUE_F"])
    R(d, 20, 18 + bob, 26, 2, P["CASQUE_F"])
    # Barbe vers l'avant : mèches, pointe, une tresse à anneau
    R(d, 18, 22 + bob, 4, 6, BARBE)
    R(d, 18, 26 + bob, 16, 10, BARBE)
    for x in (20, 24, 28, 32):
        R(d, x, 28 + bob, 1, 6, BARBE_F)
    for x in (22, 26, 30):
        R(d, x, 27 + bob, 1, 2, claire(BARBE))
    R(d, 20, 36 + bob, 10, 6, BARBE)
    R(d, 22, 40 + bob, 6, 2, BARBE_F)
    R(d, 24, 42 + bob, 4, 6, BARBE)
    R(d, 24, 44 + bob, 4, 1, BOUCLE)
    R(d, 24, 47 + bob, 4, 1, BARBE_F)
    return img


def frame_haut(P, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -2 if pose in (1, 3) else 0

    # Bras et mains
    R(d, 12, 36 + bob, 4, 12, P["TUNIQUE_F"])
    R(d, 48, 36 + bob, 4, 12, P["TUNIQUE_F"])
    R(d, 12, 48 + bob, 4, 4, PEAU)
    R(d, 48, 48 + bob, 4, 4, PEAU)
    # Tunique haute (pas de barbe visible de dos) : épaules, couture, liseré
    # (L'arme du héros, elle, est dessinée par le jeu par-dessus ce sprite.)
    R(d, 16, 24 + bob, 32, 24, P["TUNIQUE"])
    R(d, 16, 24 + bob, 32, 1, claire(P["TUNIQUE"]))
    R(d, 31, 26 + bob, 2, 20, P["TUNIQUE_F"])
    R(d, 16, 46 + bob, 32, 1, P["TUNIQUE_F"])
    # Ceinture
    R(d, 16, 48 + bob, 32, 4, P["CEINTURE"])
    for x in (26, 37):
        R(d, x, 49 + bob, 1, 1, P["CEINTURE_F"])
    # Jambes
    jambes_face(d, P, pose)
    # Casque : dôme, reflet, rivets, couvre-nuque
    R(d, 22, 6 + bob, 20, 4, P["CASQUE"])
    R(d, 18, 10 + bob, 28, 10, P["CASQUE"])
    R(d, 20, 11 + bob, 24, 2, claire(P["CASQUE"]))
    for x in (20, 31, 42):
        R(d, x, 15 + bob, 2, 2, P["CASQUE_F"])
    R(d, 18, 20 + bob, 28, 4, P["CASQUE_F"])
    return img


# --------------------------------------------------------------- les armes --
# Chaque arme est dessinée seule sur une case transparente : le jeu la pose
# par-dessus le sprite du héros. Les décalages suivent la main du nain
# (même rebond "bob", même balancement de bras que dans les frames du héros).

def tete_arme(d, arme, x, y):
    """Dessine la tête de l'arme. x = colonne gauche du manche (large de 4)."""
    if arme == "hache":
        R(d, x - 10, y + 2, 10, 10, FER)
        R(d, x - 10, y + 2, 1, 10, FER_C)      # le tranchant
        R(d, x - 1, y + 2, 1, 10, FER_F)
    elif arme == "marteau":
        R(d, x - 6, y, 16, 8, FER)
        R(d, x - 6, y, 16, 1, FER_C)
        R(d, x - 6, y + 6, 16, 2, FER_F)
    elif arme == "pioche":
        R(d, x - 10, y + 2, 24, 4, FER)
        R(d, x - 10, y + 2, 24, 1, FER_C)
        R(d, x - 10, y + 6, 4, 2, FER_F)       # les deux pointes
        R(d, x + 10, y + 6, 4, 2, FER_F)


def manche(d, x, y, h):
    R(d, x, y, 4, h, BOIS)
    R(d, x + 1, y, 1, h, BOIS_C)               # le fil du bois


def arme_bas(arme, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -2 if pose in (1, 3) else 0
    manche(d, 50, 24 + bob, 28)                # dans la main droite
    tete_arme(d, arme, 50, 20 + bob)
    return img


def arme_gauche(arme, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -2 if pose in (1, 3) else 0
    bras_dx = {0: 0, 1: -4, 2: 0, 3: 4}[pose]  # suit le balancement du bras
    manche(d, 28 + bras_dx, 24 + bob, 26)
    tete_arme(d, arme, 28 + bras_dx, 20 + bob)
    return img


def arme_haut(arme, pose):
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = -2 if pose in (1, 3) else 0
    manche(d, 30, 24 + bob, 22)                # rangée dans le dos
    tete_arme(d, arme, 30, 20 + bob)
    return img


# ---------------------------------------------------------------- finition --
# Trois techniques de base du pixel art, appliquées automatiquement :
# contour sombre, ombre sur les bords bas/droite, lumière sur les bords
# haut/gauche. Rendu nettement moins "brut".

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
    apercu.resize((T * 12, T * 12), Image.NEAREST).save("/tmp/equipement_apercu.png")
    print("OK  /tmp/equipement_apercu.png (aperçu x3)")
