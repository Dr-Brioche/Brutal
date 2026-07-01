#!/usr/bin/env python3
# Outil de chantier : découpe la planche du marchand « Renaud »
# (images/sources/marchand-source.png) en planche de jeu propre
# (images/pnj/marchand.png), à l'échelle de la CARTE.
#
# On RESPECTE le dessin : on découpe, on détoure le fond (damier clair aplati),
# on réduit — rien n'est redessiné.
#
# La source contient plusieurs lignes (face, dos, profils). Le marchand est
# STATIONNAIRE et de FACE : on ne garde que la LIGNE 1 (8 frames) = l'animation
# passive où il fait tourner une pièce.
#   frame 0        : repos (pièce en bas)
#   frames 1-2     : lève la pièce
#   frame 3        : la lance (main haute, pièce en l'air)
#   frame 4        : la rattrape
#   frames 5-6     : la tient
#   frame 7        : redescend
# Planche finale : 8 frames en une bande, cases égales, alignées sur les pieds.

from PIL import Image, ImageFilter

SRC = 'images/sources/marchand-source.png'
OUT = 'images/pnj/marchand.png'
CASE_H = 88            # hauteur cible de la case (jeu)
CASE_L = 104           # largeur FIXE de la case (marge autour du nain le plus large)
BY0, BY1 = 20, 212     # bande verticale de la ligne 1 (de face)
# Colonnes (x) des 8 nains dans la source (le reste = pièce en l'air, ignoré).
COLS = [(49,196),(235,381),(408,571),(611,770),(806,960),(993,1151),(1191,1346),(1374,1536)]


def main():
    im = Image.open(SRC).convert('RGBA')
    W, H = im.size
    px = im.load()

    # 1) Détourage : le fond est clair ET désaturé (damier de transparence aplati).
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if r > 224 and g > 224 and b > 224 and (max(r, g, b) - min(r, g, b)) < 18:
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

    # 4) Découpe des 8 frames (bbox précise dans la bande), alignées pieds + jambes.
    A = im.split()[3].load()
    frames = []
    for a, b in COLS:
        xmin, xmax, ymin, ymax = W, 0, BY1, BY0
        for y in range(BY0, BY1):
            for x in range(a-30, b+30):
                if 0 <= x < W and A[x, y] > 60:
                    xmin = min(xmin, x); xmax = max(xmax, x)
                    ymin = min(ymin, y); ymax = max(ymax, y)
        frames.append([xmin, xmax+1, ymin, ymax+1])
    baseline = max(f[3] for f in frames)   # ligne des pieds commune
    top = min(f[2] for f in frames)
    pad = 6
    CWn = max(f[1]-f[0] for f in frames) + pad*2
    CHn = (baseline - top) + pad*2

    def leg_cx(a, b, t, d):  # centroïde des jambes (bas 25 %) = ancre horizontale
        y0 = int(d - (d-t)*0.25); sx = n = 0
        for y in range(y0, d):
            for x in range(a, b):
                if A[x, y] > 60: sx += x; n += 1
        return sx/n if n else (a+b)/2

    strip = Image.new('RGBA', (CWn*8, CHn), (0, 0, 0, 0))
    for i, (a, b, t, d) in enumerate(frames):
        fr = im.crop((a, t, b, d))
        cx = leg_cx(a, b, t, d) - a
        strip.alpha_composite(fr, (int(round(i*CWn + CWn/2 - cx)), int(round(CHn - pad - (d-t)))))

    # 5) Mise à l'échelle jeu, puis recentrage dans une case de largeur FIXE
    #    (CASE_L) : ainsi la taille de case ne bouge JAMAIS d'une régénération à
    #    l'autre (sinon le code devrait être réajusté à chaque nouvel upload).
    scale = CASE_H / CHn
    cw = round(CWn * scale)
    scaled = strip.resize((cw*8, CASE_H), Image.LANCZOS)
    out = Image.new('RGBA', (CASE_L*8, CASE_H), (0, 0, 0, 0))
    for i in range(8):
        cell = scaled.crop((i*cw, 0, (i+1)*cw, CASE_H))
        out.alpha_composite(cell, ((CASE_L - cw)//2 + i*CASE_L, 0))
    out.save(OUT)
    print(f'{OUT} : caseL={CASE_L} caseH={CASE_H} (8 frames)')


if __name__ == '__main__':
    main()
