#!/usr/bin/env python3
"""Prépare une PLANCHE D'ARMURE du héros pour le combat (détourage + calage).

À quoi ça sert
--------------
Quand Brioche dessine une nouvelle armure de set, il fournit deux images (pose
1 main et pose 2 mains), souvent sur FOND VERT et en grand format. Ce script en
fait des planches directement utilisables par le jeu :

  1. DÉTOURAGE du fond vert (chroma key), avec bord adouci et anti-frange ;
  2. CALAGE sur le gabarit de la planche par défaut de la pose, pour que
     l'arme tombe pile dans le poing ;
  3. export en .webp (≈50 Ko au lieu de ~2 Mo en PNG).

Pourquoi le calage est indispensable
------------------------------------
`jeu/ui/combat.js` dessine le héros dans un cadre dont :
  - la HAUTEUR est fixe, la LARGEUR suit le ratio de l'image (et le nain est
    centré dessus) → le ratio doit être celui de la planche par défaut ;
  - le BAS de l'image est la ligne de SOL → les pieds doivent toucher le bas ;
  - le skin d'arme pose la prise à une FRACTION (fx, fy) du cadre → le poing
    doit se retrouver à cette même fraction.
Trois contraintes, trois inconnues (échelle, décalage x, décalage y) : le calage
est donc entièrement déterminé. Appliqué à une planche par défaut, il la
reproduit à l'identique — c'est le test de non-régression ci-dessous (--verifier).

Usage
-----
    python3 outils/caler_planche_heros.py source-1.png 1 -o images/heros/mon-set-1.webp
    python3 outils/caler_planche_heros.py source-2.png 2 -o images/heros/mon-set-2.webp
    python3 outils/caler_planche_heros.py --verifier      # contrôle sur les défauts

Le « 1 » / « 2 » = la pose (arme à une main / à deux mains).
Ensuite : déclarer la paire dans PLANCHES_SET (jeu/ui/combat.js).
"""

import argparse
import sys
from collections import deque
from math import ceil

import numpy as np
from PIL import Image

# ── Gabarits, relevés sur les planches par défaut ────────────────────────────
# fx, fy : fraction du cadre où le skin d'arme pose la PRISE (cf. SKINS_ARME_*
#          et SKIN_DEFAUT_* dans jeu/ui/combat.js).
# retrait, ecart : où se trouve la prise par rapport au POING DÉTECTÉ, en
#          fractions de la hauteur du personnage. Mesurés sur les deux planches
#          par défaut, qui concordent (~0,07·H et ~0,032·H).
POSES = {
    1: dict(gabarit=(140, 210), fx=0.891, fy=0.480, retrait=0.0679, ecart=0.0324,
            defaut="images/heros/nain-combat.png"),
    2: dict(gabarit=(170, 210), fx=0.900, fy=0.460, retrait=0.0762, ecart=0.0314,
            defaut="images/heros/nain-combat-2mains.png"),
}
ZOOM = 2          # sortie en 2× le gabarit : le héros fait ~390 px à l'écran
HAUT_FRAC = 0.55  # on cherche le poing dans les 55 % supérieurs du corps


def detourer(chemin):
    """Enlève le fond vert. Renvoie une image RGBA (bord adouci, sans frange)."""
    im = Image.open(chemin).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    verdeur = G - np.maximum(R, B)          # à quel point le vert domine
    fond_sur = (verdeur > 60) & (G > 90)    # vert franc
    fond_large = (verdeur > 18) & (G > 60)  # + la frange anti-aliasée

    # Remplissage depuis les BORDS : seul le vert relié au bord est du fond.
    # Protège les parties vertes du personnage (manche de pioche, reflets…).
    h, w = G.shape
    vu = np.zeros((h, w), bool)
    q = deque()
    bords = [(y, x) for x in range(w) for y in (0, h - 1)]
    bords += [(y, x) for y in range(h) for x in (0, w - 1)]
    for y, x in bords:
        if fond_large[y, x] and not vu[y, x]:
            vu[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and fond_large[ny, nx] and not vu[ny, nx]:
                vu[ny, nx] = True
                q.append((ny, nx))

    alpha = np.full((h, w), 255.0)
    alpha[vu & fond_sur] = 0.0
    frange = vu & ~fond_sur
    alpha[frange] = np.clip((60 - verdeur[frange].astype(np.float64)) / 42.0, 0, 1) * 255.0

    # Anti-frange : là où du vert bave encore sur le sujet, on rabaisse le canal vert.
    out = a.astype(np.float64)
    spill = (verdeur > 8) & (alpha > 0)
    out[:, :, 1] = np.where(spill, np.minimum(out[:, :, 1], np.maximum(R, B) + 8), out[:, :, 1])
    return Image.fromarray(np.dstack([np.clip(out, 0, 255).astype(np.uint8),
                                      alpha.astype(np.uint8)]), "RGBA")


def reperes(im):
    """Repère le POING AVANT et les PIEDS dans une planche détourée.

    Le poing est l'extrémité DROITE de la silhouette, cherchée dans le HAUT du
    corps seulement : sinon la botte avant, qui avance aussi, fausse la mesure.
    """
    a = np.asarray(im.getchannel("A")) > 24
    ys, xs = np.nonzero(a)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    H = y1 - y0 + 1
    haut = a[y0:y0 + int(HAUT_FRAC * H), :]
    _, xb = np.nonzero(haut)
    tip = int(xb.max())
    bande = haut[:, tip - max(2, int(0.05 * H)):tip + 1]
    lignes = np.nonzero(bande.any(axis=1))[0]
    return dict(x0=x0, x1=x1, y0=y0, pieds=y1, H=H, tip=tip,
                y_poing=float(y0 + (lignes.min() + lignes.max()) / 2))


def caler(im, pose):
    """Place le personnage dans le gabarit de la pose.

    Renvoie (image, échelle, marges). Le personnage n'est JAMAIS rogné : si le
    dessin déborde du gabarit (un sac à dos plus large, un heaume plus haut), la
    planche est AGRANDIE d'autant et les MARGES ajoutées sont renvoyées, en px de
    gabarit. Le jeu s'en sert pour dessiner l'image entière tout en gardant le
    personnage exactement au même endroit (cf. PLANCHES_SET dans ui/combat.js).
    Marge du BAS : jamais — le bas de l'image EST la ligne de sol.
    """
    P = POSES[pose]
    Wc, Hc = P["gabarit"][0] * ZOOM, P["gabarit"][1] * ZOOM
    m = reperes(im)
    # Point de prise déduit du poing détecté (calibrage des planches par défaut).
    gx = m["tip"] - P["retrait"] * m["H"]
    gy = m["y_poing"] + P["ecart"] * m["H"]
    # +1 : le SOL est le BAS de l'image, pas la dernière ligne de pixels.
    s = (Hc - P["fy"] * Hc) / (m["pieds"] + 1 - gy)
    tx = P["fx"] * Wc - gx * s
    ty = Hc - (m["pieds"] + 1) * s

    red = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    # Ce qui sort du gabarit devient une MARGE (px de sortie), jamais un rognage.
    # Tolérance d'un demi-pixel : l'échelle n'est jamais RIGOUREUSEMENT ronde, et
    # sans ça une planche par défaut se verrait attribuer une marge de 1 px fantôme.
    mg = max(0, ceil(-(tx + m["x0"] * s) - 0.5))
    md = max(0, ceil(tx + (m["x1"] + 1) * s - Wc - 0.5))
    mh = max(0, ceil(-(ty + m["y0"] * s) - 0.5))
    out = Image.new("RGBA", (Wc + mg + md, Hc + mh), (0, 0, 0, 0))
    out.alpha_composite(red, (round(tx) + mg, round(ty) + mh))
    return out, s, dict(g=mg / ZOOM, d=md / ZOOM, h=mh / ZOOM)


def verifier():
    """Non-régression : calé, un sprite par défaut doit revenir à l'identique (échelle = ZOOM)."""
    ok = True
    for pose, P in POSES.items():
        im = Image.open(P["defaut"]).convert("RGBA")
        _, s, mar = caler(im, pose)
        bon = abs(s - ZOOM) < 0.01 and not any(mar.values())
        ok &= bon
        print(f"  pose {pose} : échelle {s:.4f} (attendu {ZOOM}), marges {fmt_marge(mar)}"
              f"   → {'OK' if bon else 'ÉCHEC'}")
    return ok


def fmt_marge(mar):
    """La marge telle qu'on la recopie dans PLANCHES_SET (jeu/ui/combat.js)."""
    utile = {k: round(v, 1) for k, v in mar.items() if v}
    if not utile:
        return "aucune"
    return "{ " + ", ".join(f"{k}: {v}" for k, v in utile.items()) + " }"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", nargs="?", help="image source (fond vert)")
    ap.add_argument("pose", nargs="?", type=int, choices=[1, 2],
                    help="1 = arme à une main, 2 = arme à deux mains")
    ap.add_argument("-o", "--sortie", help="fichier .webp de sortie")
    ap.add_argument("--verifier", action="store_true",
                    help="contrôle du calage sur les planches par défaut")
    args = ap.parse_args()

    if args.verifier:
        print("Contrôle du calage sur les planches par défaut :")
        sys.exit(0 if verifier() else 1)

    if not (args.source and args.pose and args.sortie):
        ap.error("il faut source, pose et -o (ou --verifier)")

    im = detourer(args.source)
    out, s, mar = caler(im, args.pose)
    out.save(args.sortie, "WEBP", quality=92, method=6)
    print(f"{args.sortie} : {out.size[0]}×{out.size[1]}, échelle {s:.4f}")
    print(f"  marge à déclarer dans PLANCHES_SET : {fmt_marge(mar)}")


if __name__ == "__main__":
    main()
