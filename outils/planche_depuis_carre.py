#!/usr/bin/env python3
"""UN CARRÉ DESSINÉ → UNE PLANCHE D'AUTOTUILAGE COMPLÈTE.

Brioche dessine UNE seule tuile de sol (un carré qui se répète sans couture).
Ce script en fabrique la planche entière : l'îlot, ses bordures, les quatre
coins rentrants — toute la partie mécanique du format.

    python3 outils/planche_depuis_carre.py sol-ville images/tuiles/sources/City_floor_1.png
    python3 outils/planche_depuis_carre.py sol-ville carre.png variante.png   # avec variante

Le carré source va dans `images/tuiles/sources/` (il n'est pas lu par le jeu),
la planche produite dans `images/tuiles/<nom>.png`.

╔══════════════════════════════════════════════════════════════════════════════╗
║ POURQUOI CE SCRIPT LÈVE LA CONTRAINTE DES 32 px                              ║
║                                                                              ║
║ Un autotuilage par quarts pioche le remplissage d'une case à plusieurs       ║
║ endroits de la planche. Si on FABRIQUE l'îlot en carrelant bêtement une      ║
║ texture, il faut donc que cette texture se répète tous les demi-carreaux,    ║
║ sinon les quarts « sautent » les uns par rapport aux autres.                 ║
║                                                                              ║
║ Mais on n'est pas obligé de carreler bêtement. Chaque quart de l'îlot a une  ║
║ DESTINATION connue d'avance (le quart haut-gauche d'une case, le haut-droit, ║
║ etc.). Il suffit d'y poser LE QUART CORRESPONDANT du dessin :                ║
║                                                                              ║
║     colonnes de quarts de l'îlot   0  1  2  3                                ║
║     moitié du dessin qu'on y met   G  G  D  D     (idem pour les rangées)    ║
║                                                                              ║
║ Chaque morceau arrive alors en jeu exactement à la place pour laquelle il a  ║
║ été dessiné, et le motif reste continu — quelle que soit sa taille.          ║
║ → LE DESSIN PEUT OCCUPER LA CASE ENTIÈRE. Aucune contrainte de répétition,   ║
║   à part la seule qui compte : le carré doit boucler sur lui-même.           ║
║                                                                              ║
║ (Cette astuce ne marche que parce qu'on fabrique la planche. Une planche     ║
║  dessinée entièrement à la main, elle, reste soumise à la règle des 32 px.)  ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import argparse
import pathlib
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from generer_tuiles import AO_PORTEE, DOSSIER, ombre_coins_rentrants, ombre_ilot  # noqa: E402

TUILE_REF = 64      # la taille d'art de référence, pour mettre l'ombre à l'échelle


def _teinter(tuile, occ):
    """Assombrit une image d'après un champ d'occlusion (0 = rien, 1 = noir)."""
    a = np.array(tuile.convert("RGB"), float) * (1 - occ)[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def _recoudre(a, f):
    """Rend un morceau raccordable avec lui-même.

    `a` mesure (h+f, w+f) ; on en sort un (h, w) qui boucle. L'idée : la bande
    de GAUCHE du résultat est un fondu entre le début du morceau et ce qui venait
    JUSTE APRÈS sa fin. Du coup la colonne w-1 est suivie, en bouclant, de ce qui
    la suivait vraiment. Même chose en hauteur, appliquée après — ce qui règle le
    coin d'un seul coup, sans cas particulier.
    """
    f = max(f, 2)
    h, w = a.shape[0] - f, a.shape[1] - f
    a = a.astype(float)

    t = (np.arange(f) / (f - 1))[None, :, None]        # 0 → 1, le long des colonnes
    b = a[:, :w].copy()
    b[:, :f] = t * a[:, :f] + (1 - t) * a[:, w:w + f]

    t = (np.arange(f) / (f - 1))[:, None, None]        # 0 → 1, le long des lignes
    out = b[:h].copy()
    out[:f] = t * b[:f] + (1 - t) * b[h:h + f]
    return np.clip(out, 0, 255).astype(np.uint8)


def decouper(src, cases, px):
    """Extrait de `src` UNE tuile de jeu.

    `cases` = combien de cases du jeu la texture d'origine doit couvrir. Une
    photo de pavés qui couvre 3 cases doit être découpée en morceaux de 1/3,
    sinon tout le motif se retrouve écrasé dans une seule case et les pavés
    deviennent du gravier. Le morceau est ensuite RECOUSU (il ne boucle plus
    tout seul une fois découpé), puis réduit à `px`.
    """
    a = np.array(src.convert("RGB"))
    if cases > 1:
        w = src.width // cases
        f = max(4, w // 8)                       # largeur du fondu de couture
        if w + f > src.width:
            sys.exit(f"texture trop petite pour la découper en {cases} cases.")
        a = _recoudre(a[:w + f, :w + f], f)
    im = Image.fromarray(a)
    cible = px or (im.width if im.width <= 64 else 64)
    if im.width != cible:
        im = im.resize((cible, cible), Image.LANCZOS if im.width > cible else Image.NEAREST)
    return im


def planche_depuis(carre, variante=None):
    """Fabrique la planche (2 tuiles de large × 3 de haut) à partir d'un carré."""
    n = carre.width
    if carre.height != n:
        sys.exit(f"le carré doit être carré (ici {carre.width}×{carre.height}).")
    if n % 2:
        sys.exit(f"le côté du carré doit être pair (ici {n}).")
    q = n // 2                                   # un quart
    portee = AO_PORTEE * n / TUILE_REF           # ombre à la même largeur EN JEU

    img = Image.new("RGBA", (2 * n, 3 * n))
    quart = lambda im, qx, qy: im.crop((qx * q, qy * q, qx * q + q, qy * q + q))

    # 1) L'ÎLOT (les deux rangées du bas) : 4×4 quarts. Chacun reçoit le quart du
    #    dessin correspondant à SA DESTINATION — colonnes 0,1 → moitié gauche du
    #    dessin ; colonnes 2,3 → moitié droite (idem en hauteur). C'est ce
    #    « dédoublement » qui rend le motif continu quelle que soit sa taille.
    ilot = Image.new("RGB", (2 * n, 2 * n))
    for qy in range(4):
        for qx in range(4):
            ilot.paste(quart(carre, qx // 2, qy // 2), (qx * q, qy * q))
    img.paste(_teinter(ilot, ombre_ilot(2 * n, 2 * n, portee)), (0, n))

    # 2) LES 4 COINS RENTRANTS : chaque quart est déjà à sa place dans le dessin,
    #    on ne fait qu'y ajouter l'ombre du creux.
    img.paste(_teinter(carre, ombre_coins_rentrants(n, portee)), (0, 0))

    # 3) LE REMPLISSAGE VARIANTE : le second dessin s'il existe, sinon une copie
    #    du premier (inoffensif : la tuile ne déclare alors pas `variantes`).
    img.paste((variante or carre).convert("RGB"), (n, 0))

    img.putalpha(255)
    return img


def main():
    ap = argparse.ArgumentParser(description="Fabrique une planche d'autotuilage depuis un carré.")
    ap.add_argument("nom", help="nom de la matière (ex. sol-ville) → images/tuiles/<nom>.png")
    ap.add_argument("carre", help="le carré dessiné, qui doit boucler sur lui-même")
    ap.add_argument("variante", nargs="?", help="second carré, facultatif (remplissage variante)")
    ap.add_argument("--cases", type=int, default=1, metavar="N",
                    help="combien de CASES DU JEU la texture d'origine doit couvrir "
                         "(défaut 1). Une photo de pavés qui couvre 3 cases : --cases 3, "
                         "sinon tout le motif est écrasé dans une case et devient du gravier.")
    ap.add_argument("--px", type=int, default=0, metavar="N",
                    help="px d'art par case dans la planche (défaut : la taille native "
                         "si elle tient en 64, sinon réduite à 64 — soit 1 pixel d'art "
                         "pour 1 pixel d'écran)")
    a = ap.parse_args()

    carre = decouper(Image.open(a.carre), a.cases, a.px)
    variante = decouper(Image.open(a.variante), a.cases, a.px) if a.variante else None
    if variante and variante.size != carre.size:
        sys.exit("la variante doit avoir exactement la même taille que le carré.")

    pl = planche_depuis(carre, variante)
    sortie = DOSSIER / f"{a.nom}.png"
    pl.save(sortie)
    n = carre.width
    print(f"  {sortie.name:16} {pl.width}×{pl.height} px "
          f"({n} px par tuile, {n // 2} px par quart) · {sortie.stat().st_size / 1024:.1f} Ko")
    if variante is None:
        print(f"  (pas de variante fournie → laisser `variantes: false` sur cette tuile "
              f"dans jeu/data/tuiles.js)")
    if n != TUILE_REF:
        print(f"  ⚠ le reste du jeu est dessiné à {TUILE_REF} px par case : à {n} px, "
              f"les pixels du sol\n    seront {TUILE_REF // n} fois plus gros que ceux des personnages.")


if __name__ == "__main__":
    main()
