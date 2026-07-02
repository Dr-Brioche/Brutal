#!/usr/bin/env python3
# Outil de chantier : OPTIMISE les illustrations de cartes pour le web.
#
# Brioche uploade ses illustrations en PNG pleine taille (~1372 px, ~2,5 Mo) dans
# images/cartes/illustrations/. Ce script les convertit en WebP :
#   - redimensionnées à LARGEUR_MAX px de large (jamais agrandies),
#   - qualité 90 (indiscernable à l'écran : l'aperçu deck affiche ~790 px max),
#   - le PNG d'origine est SUPPRIMÉ (il reste dans l'historique git).
#   - nom normalisé en minuscules (Windows capitalise parfois : Punch.png → punch.webp).
#
# À relancer après chaque upload : `python3 outils/optimiser_illustrations.py`
# (les .webp déjà présents ne sont pas retraités). Le jeu tente .webp puis .png
# (cf. jeu/ui/carte.js) : un PNG frais s'affiche donc même avant conversion.

from PIL import Image
import os, glob

DOSSIER = "images/cartes/illustrations"
LARGEUR_MAX = 1024   # > ~790 px = taille d'affichage physique max (aperçu deck, écran 4K)
QUALITE = 90

total_avant = total_apres = n = 0
for chemin in sorted(glob.glob(f"{DOSSIER}/*.png")):
    nom = os.path.splitext(os.path.basename(chemin))[0].lower()
    sortie = f"{DOSSIER}/{nom}.webp"
    im = Image.open(chemin).convert("RGB")
    if im.width > LARGEUR_MAX:
        im = im.resize((LARGEUR_MAX, round(im.height * LARGEUR_MAX / im.width)), Image.LANCZOS)
    im.save(sortie, "WEBP", quality=QUALITE, method=6)
    avant, apres = os.path.getsize(chemin), os.path.getsize(sortie)
    total_avant += avant; total_apres += apres; n += 1
    os.remove(chemin)
    print(f"  {nom}: {avant//1024} Ko → {apres//1024} Ko")

if n == 0:
    print("Aucun PNG à convertir (tout est déjà en WebP).")
else:
    print(f"\n{n} illustration(s) : {total_avant//1048576} Mo → {total_apres//1048576} Mo")
