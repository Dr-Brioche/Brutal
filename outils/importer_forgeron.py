#!/usr/bin/env python3
# Outil de chantier : découpe la planche du forgeron
# (images/sources/forgeron-source.png) en planche de jeu propre
# (images/pnj/forgeron.png), à l'échelle de la CARTE.
#
# Même principe que importer_marchand.py : on RESPECTE le dessin (découpe,
# détourage du fond blanc, réduction — rien n'est redessiné).
#
# La source a 5 lignes. On garde :
#   ligne 1 (8 frames) : animation passive de FACE (marteau + pipe qui fume)
#                        → cases 0-7 (repos = case 0)
#   ligne 4 (1 frame)  : profil GAUCHE  → case 8   (regard vers la gauche)
#   ligne 5 (1 frame)  : profil DROITE  → case 9   (regard vers la droite)
#   ligne 3 (1 frame)  : DOS            → case 10  (regard vers le haut)
# Les 3 dernières servent la RÈGLE des PNJ : se tourner vers le héros.

from PIL import Image, ImageFilter

SRC = 'images/sources/forgeron-source.png'
OUT = 'images/pnj/forgeron.png'
CASE_H = 88            # hauteur cible de la case (jeu)
CASE_L = 104           # largeur FIXE de la case (stable d'une régénération à l'autre)

# (y0, y1, [colonnes (x0, x1)]). Ligne 1 = animation de face (toutes les cases) ;
# lignes directionnelles = UNE frame debout (1re colonne) chacune.
FACE   = (10, 200, [(21,188),(216,375),(400,566),(602,760),(793,953),(983,1143),(1179,1338),(1371,1529)])
GAUCHE = (582, 748, [(23, 151)])   # ligne 4 = profil gauche
DROITE = (764, 935, [(51, 183)])   # ligne 5 = profil droite
DOS    = (405, 569, [(37, 189)])   # ligne 3 = dos (regard vers le haut)
BANDES = [FACE, GAUCHE, DROITE, DOS]


def main():
    im = Image.open(SRC).convert('RGBA')
    W, H = im.size
    px = im.load()

    # 1) Détourage : le fond est clair ET désaturé (blanc).
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if r > 224 and g > 224 and b > 224 and (max(r, g, b) - min(r, g, b)) < 18:
                px[x, y] = (r, g, b, 0)

    # 1bis) L'OMBRE AU SOL du sheet (gris ~185-200, désaturé) survivrait au seuil
    # ci-dessus et ferait une tache claire sous les pieds sur le sol sombre du jeu.
    # On la vire dans le BAS de CHAQUE bande utile (la fumée de pipe, grise elle
    # aussi, est en HAUT des bandes — hors de ces zones).
    for (y0, y1, _cols) in BANDES:
        for y in range(max(0, y1 - 45), min(H, y1 + 12)):
            for x in range(W):
                r, g, b, a = px[x, y]
                if a > 0 and r >= 178 and (max(r, g, b) - min(r, g, b)) <= 14:
                    px[x, y] = (r, g, b, 0)

    # 2) Érode l'alpha de 1 px : mange la frange claire du contour (anti-aliasing).
    im.putalpha(im.split()[3].filter(ImageFilter.MinFilter(3)))

    # 3) Alpha-bleed : fait baver la couleur du sprite dans le transparent voisin
    #    (~3 px) pour que la réduction ne recrée pas de frange blanche.
    apx = im.load()
    for _ in range(3):
        spx = im.copy().load()
        for y in range(H):
            for x in range(W):
                if spx[x, y][3] == 0:
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < W and 0 <= ny < H and spx[nx, ny][3] > 0:
                            r, g, b, _ = spx[nx, ny]
                            apx[x, y] = (r, g, b, 0)
                            break

    # 4) Bbox précise de chaque frame (ordre : face…, gauche, droite, dos).
    A = im.split()[3].load()
    frames = []
    for (y0, y1, cols) in BANDES:
        for a, b in cols:
            xmin, xmax, ymin, ymax = W, 0, y1, y0
            for y in range(y0, y1):
                for x in range(max(0, a-30), min(W, b+30)):
                    if A[x, y] > 60:
                        xmin = min(xmin, x); xmax = max(xmax, x)
                        ymin = min(ymin, y); ymax = max(ymax, y)
            frames.append([xmin, xmax+1, ymin, ymax+1])

    # Échelle COMMUNE (frame la plus haute) → même taille au sol quel que soit le sens.
    pad = 6
    CHn = max(d - t for _, _, t, d in frames) + pad*2
    scale = CASE_H / CHn

    def leg_cx(a, b, t, d):  # centroïde des jambes (bas 25 %) = ancre horizontale
        y0 = int(d - (d-t)*0.25); sx = n = 0
        for y in range(y0, d):
            for x in range(a, b):
                if A[x, y] > 60: sx += x; n += 1
        return sx/n if n else (a+b)/2

    N = len(frames)
    out = Image.new('RGBA', (CASE_L*N, CASE_H), (0, 0, 0, 0))
    for i, (a, b, t, d) in enumerate(frames):
        fr = im.crop((a, t, b, d))
        fw, fh = round(fr.width*scale), round(fr.height*scale)
        fr = fr.resize((fw, fh), Image.LANCZOS)
        cx = (leg_cx(a, b, t, d) - a) * scale
        ox = max(0, min(round(CASE_L/2 - cx), CASE_L - fw))
        out.alpha_composite(fr, (i*CASE_L + ox, CASE_H - round(pad*scale) - fh))
    out.save(OUT)
    nf = len(FACE[2])
    print(f'{OUT} : caseL={CASE_L} caseH={CASE_H} ({N} frames : '
          f'face 0-{nf-1}, gauche {nf}, droite {nf+1}, dos {nf+2})')


if __name__ == '__main__':
    main()
