#!/usr/bin/env python3
# Outil de chantier : découpe la planche du PNJ « fanatique » (moine à la croix)
# (images/sources/fanatique-source.png) en planche de jeu propre
# (images/pnj/fanatique.png), à l'échelle de la CARTE.
#
# Même pipeline que importer_marchand.py / importer_forgeron.py : détourage du
# fond blanc, anti-frange, frames alignées sur les pieds, cases FIXES.
#
# Le fanatique fait un VA-ET-VIENT horizontal + une pose face (prière) :
#   source ligne 1 (8 frames)  : prière de face  → cases 0-7  (repos = case 0,
#                                animation passive occasionnelle = 0-7)
#   source ligne 4 (4 frames)  : marche profil GAUCHE → cases 8-11
#   source ligne 5 (4 frames)  : marche profil DROIT  → cases 12-15
# (lignes 2-3 = marche face/dos, inutilisées : il ne se déplace qu'à l'horizontale)
# Planche finale : 16 cases de CASE_L×CASE_H en une bande.

from PIL import Image, ImageFilter

SRC = 'images/sources/fanatique-source.png'
OUT = 'images/pnj/fanatique.png'
CASE_H = 88
CASE_L = 104
# (y0, y1, [colonnes (x0, x1)]) — mesuré sur la source (fond détouré)
LIGNES = [
    (20, 208, [(113,213),(297,395),(475,572),(652,749),(828,925),(1004,1102),(1182,1280),(1359,1457)]),
    (554, 715, [(119,203),(297,381),(476,559),(656,735)]),
    (719, 883, [(121,205),(301,383),(478,560),(654,738)]),
]


def main():
    im = Image.open(SRC).convert('RGBA')
    W, H = im.size
    px = im.load()

    # 1) Détourage : fond clair et désaturé (blanc) → transparent.
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if r > 224 and g > 224 and b > 224 and (max(r, g, b) - min(r, g, b)) < 18:
                px[x, y] = (r, g, b, 0)

    # 2) Érosion 1 px : mange la frange claire d'anti-aliasing du contour.
    im.putalpha(im.split()[3].filter(ImageFilter.MinFilter(3)))

    # 3) Alpha-bleed (~3 px) : la couleur bave dans le transparent voisin pour que
    #    la réduction ne réintroduise pas de liseré blanc.
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

    # 4) Bbox précise de chaque frame, dans l'ordre final (prière, gauche, droite).
    A = im.split()[3].load()
    frames = []
    for y0, y1, cols in LIGNES:
        for a, b in cols:
            xmin, xmax, ymin, ymax = W, 0, y1, y0
            for y in range(y0, y1):
                for x in range(max(0, a-20), min(W, b+20)):
                    if A[x, y] > 60:
                        xmin = min(xmin, x); xmax = max(xmax, x)
                        ymin = min(ymin, y); ymax = max(ymax, y)
            frames.append([xmin, xmax+1, ymin, ymax+1])

    # Échelle COMMUNE (d'après la frame la plus haute) + pieds posés au bas de la
    # case → le moine garde la même taille au sol quel que soit le sens.
    pad = 6
    CHn = max(d - t for _, _, t, d in frames) + pad*2
    scale = CASE_H / CHn

    def leg_cx(a, b, t, d):  # centroïde des jambes (bas 25 %) = ancre horizontale
        y0 = int(d - (d-t)*0.25); sx = n = 0
        for y in range(y0, d):
            for x in range(a, b):
                if A[x, y] > 60: sx += x; n += 1
        return sx/n if n else (a+b)/2

    out = Image.new('RGBA', (CASE_L*len(frames), CASE_H), (0, 0, 0, 0))
    for i, (a, b, t, d) in enumerate(frames):
        fr = im.crop((a, t, b, d))
        fw, fh = round(fr.width*scale), round(fr.height*scale)
        fr = fr.resize((fw, fh), Image.LANCZOS)
        cx = (leg_cx(a, b, t, d) - a) * scale
        out.alpha_composite(fr, (int(round(i*CASE_L + CASE_L/2 - cx)), CASE_H - round(pad*scale) - fh))
    out.save(OUT)
    print(f'{OUT} : caseL={CASE_L} caseH={CASE_H} ({len(frames)} frames : prière 0-7, gauche 8-11, droite 12-15)')


if __name__ == '__main__':
    main()
