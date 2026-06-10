#!/usr/bin/env python3
# Outil de chantier : transforme la planche de présentation du gobelin
# (images/sources/gobelin-source.png, fond noir + cadres + titres) en une
# planche de jeu propre (images/ennemis/gobelin.png) : fond transparent,
# frames découpées et rangées dans des cases uniformes, alignées sur les pieds.
#
# On RESPECTE le dessin fourni : on découpe et on nettoie, on ne redessine rien.
#
# Disposition de la source (détectée automatiquement) :
#   - rangée IDLE        : 8 frames
#   - rangée ATTAQUE     : 3 frames
#   - rangée COUP REÇU   : 3 frames
# La planche finale met les 14 frames en UNE bande horizontale, cases égales.
#
# Lancer :  python3 outils/importer_gobelin.py

from PIL import Image, ImageChops

SOURCE = "images/sources/gobelin-source.png"
SORTIE = "images/ennemis/gobelin.png"
FRAMES_ATTENDUES = [8, 3, 3]   # idle, attaque, coup reçu
HAUTEUR_CIBLE = 150            # hauteur d'une case dans la planche finale (px)
SEUIL_FOND = 18               # <= cette luminosité = fond noir -> transparent


def masque_sprite(im):
    """Pixels « colorés » du gobelin : ni noir, ni gris (cadres), ni blanc (texte)."""
    r, g, b = im.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    mn = ImageChops.darker(ImageChops.darker(r, g), b)
    ecart = ImageChops.subtract(mx, mn)
    assez_clair = mx.point(lambda v: 255 if v > 30 else 0)
    assez_colore = ecart.point(lambda v: 255 if v > 25 else 0)
    return ImageChops.multiply(assez_clair, assez_colore)


def plages(profil, seuil, taille_min):
    """Renvoie les intervalles [debut, fin] où le profil dépasse le seuil."""
    out, debut = [], None
    for i, v in enumerate(profil):
        if v > seuil and debut is None:
            debut = i
        elif v <= seuil and debut is not None:
            out.append((debut, i - 1)); debut = None
    if debut is not None:
        out.append((debut, len(profil) - 1))
    return [(a, b) for a, b in out if b - a + 1 >= taille_min]


def fusionner(runs, ecart_max=8):
    """Recolle les morceaux trop proches (ex. l'os détaché du gobelin à terre)."""
    out = []
    for a, b in runs:
        if out and a - out[-1][1] <= ecart_max:
            out[-1] = (out[-1][0], b)
        else:
            out.append((a, b))
    return out


def bbox_frame(px, x0, x1, y0, y1):
    """Boîte serrée du sprite dans la sous-zone (mask px déjà chargé)."""
    minx, miny, maxx, maxy = x1, y1, x0, y0
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if px[x, y]:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    return minx, miny, maxx, maxy


def main():
    src = Image.open(SOURCE).convert("RGB")
    W, H = src.size
    masque = masque_sprite(src)
    px = masque.load()

    # 1) Les rangées : lignes où il y a du sprite. On recolle les bandes
    # verticalement proches (ex. la pointe de l'os levé, détachée du corps).
    rowsum = [sum(1 for x in range(W) if px[x, y]) for y in range(H)]
    bandes = fusionner(plages(rowsum, max(rowsum) * 0.03, 20), ecart_max=30)
    if len(bandes) != len(FRAMES_ATTENDUES):
        raise SystemExit(f"Attendu {len(FRAMES_ATTENDUES)} rangées, trouvé {len(bandes)}")

    # 2) Les frames de chaque rangée + leur boîte serrée
    pad = 10
    frames = []
    for (y0, y1), attendu in zip(bandes, FRAMES_ATTENDUES):
        yb0, yb1 = max(0, y0 - pad), min(H - 1, y1 + pad)
        colsum = [sum(1 for y in range(yb0, yb1 + 1) if px[x, y]) for x in range(W)]
        cols = fusionner(plages(colsum, max(colsum) * 0.06, 12))
        cols = [c for c in cols if c[1] - c[0] + 1 >= 30]
        if len(cols) != attendu:
            raise SystemExit(f"Rangée y={y0}: attendu {attendu} frames, trouvé {len(cols)}")
        for x0, x1 in cols:
            frames.append(bbox_frame(px, x0, x1, yb0, yb1))

    # 3) Fond noir -> transparent (sur l'image entière, une fois)
    rgba = src.convert("RGBA")
    r, g, b = src.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    rgba.putalpha(mx.point(lambda v: 0 if v <= SEUIL_FOND else 255))

    # 4) Case native = plus grande frame (+ marge), puis échelle vers la cible
    cw = max(x1 - x0 + 1 for x0, _, x1, _ in frames)
    ch = max(y1 - y0 + 1 for _, y0, _, y1 in frames)
    cw += 8; ch += 8
    echelle = HAUTEUR_CIBLE / ch
    tcw, tch = round(cw * echelle), HAUTEUR_CIBLE

    planche = Image.new("RGBA", (tcw * len(frames), tch), (0, 0, 0, 0))
    for i, (x0, y0, x1, y1) in enumerate(frames):
        frame = rgba.crop((x0, y0, x1 + 1, y1 + 1))
        case = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        # aligné en bas (pieds), centré horizontalement
        case.alpha_composite(frame, ((cw - frame.width) // 2, ch - frame.height))
        case = case.resize((tcw, tch), Image.NEAREST)
        planche.alpha_composite(case, (i * tcw, 0))

    planche.save(SORTIE)
    print(f"OK -> {SORTIE}")
    print(f"  {len(frames)} frames | case {tcw}x{tch} | planche {planche.size[0]}x{planche.size[1]}")
    print(f"  idle: 0-7  attaque: 8-10  coup reçu: 11-13")


if __name__ == "__main__":
    main()
