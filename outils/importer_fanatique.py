#!/usr/bin/env python3
# Outil de chantier : découpe la planche du PNJ « fanatique »
# (images/sources/fanatique-source.png) en planche de jeu propre
# (images/pnj/fanatique.png), à l'échelle de la CARTE (petit, comme le héros).
#
# On RESPECTE le dessin : on découpe, on détoure le fond noir, on réduit — rien
# n'est redessiné.
#
# Disposition de la source (détectée auto) :
#   - repos        : 5 frames (de face)
#   - discussion   : 3 frames (de face, gestes)
#   - marche       : 8 frames (4 vers la gauche, puis 4 vers la droite)
# Planche finale : 16 frames en une bande, cases égales, alignées sur les pieds.
#   repos 0-4 | discussion 5-7 | marche gauche 8-11 | marche droite 12-15
#
# Lancer :  python3 outils/importer_fanatique.py

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageChops
from importer_gobelin import masque_sprite, plages, fusionner, bbox_frame

SOURCE = "images/sources/fanatique-source.png"
SORTIE = "images/pnj/fanatique.png"
FRAMES_ATTENDUES = [5, 3, 8]   # repos, discussion, marche (gauche+droite)
HAUTEUR_CIBLE = 72             # hauteur d'une case (px) — échelle carte
SEUIL_FOND = 18


def main():
    src = Image.open(SOURCE).convert("RGB")
    W, H = src.size
    px = masque_sprite(src).load()

    rowsum = [sum(1 for x in range(W) if px[x, y]) for y in range(H)]
    bandes = fusionner(plages(rowsum, max(rowsum) * 0.03, 20), ecart_max=30)
    if len(bandes) != len(FRAMES_ATTENDUES):
        raise SystemExit(f"Attendu {len(FRAMES_ATTENDUES)} rangées, trouvé {len(bandes)}")

    pad = 10
    frames = []
    for (y0, y1), attendu in zip(bandes, FRAMES_ATTENDUES):
        yb0, yb1 = max(0, y0 - pad), min(H - 1, y1 + pad)
        colsum = [sum(1 for y in range(yb0, yb1 + 1) if px[x, y]) for x in range(W)]
        cols = fusionner(plages(colsum, max(colsum) * 0.06, 12))
        cols = [c for c in cols if c[1] - c[0] + 1 >= 20]
        if len(cols) != attendu:
            raise SystemExit(f"Rangée y={y0}: attendu {attendu}, trouvé {len(cols)}")
        for x0, x1 in cols:
            frames.append(bbox_frame(px, x0, x1, yb0, yb1))

    rgba = src.convert("RGBA")
    r, g, b = src.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    rgba.putalpha(mx.point(lambda v: 0 if v <= SEUIL_FOND else 255))

    cw = max(x1 - x0 + 1 for x0, _, x1, _ in frames) + 8
    ch = max(y1 - y0 + 1 for _, y0, _, y1 in frames) + 8
    echelle = HAUTEUR_CIBLE / ch
    tcw, tch = round(cw * echelle), HAUTEUR_CIBLE

    planche = Image.new("RGBA", (tcw * len(frames), tch), (0, 0, 0, 0))
    for i, (x0, y0, x1, y1) in enumerate(frames):
        frame = rgba.crop((x0, y0, x1 + 1, y1 + 1))
        case = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        case.alpha_composite(frame, ((cw - frame.width) // 2, ch - frame.height))
        # LANCZOS : belle réduction d'un dessin détaillé vers une petite taille
        case = case.resize((tcw, tch), Image.LANCZOS)
        planche.alpha_composite(case, (i * tcw, 0))

    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    planche.save(SORTIE)
    print(f"OK -> {SORTIE}")
    print(f"  {len(frames)} frames | case {tcw}x{tch} | planche {planche.size[0]}x{planche.size[1]}")
    print(f"  repos 0-4 | discussion 5-7 | marche gauche 8-11 | marche droite 12-15")


if __name__ == "__main__":
    main()
