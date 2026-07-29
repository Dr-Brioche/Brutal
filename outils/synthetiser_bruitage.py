#!/usr/bin/env python3
"""Fabrique DE TOUTES PIÈCES les bruitages qui ne s'enregistrent pas.

Certains sons n'existent pas dans le monde réel : on n'enregistre pas une montée
de niveau. Ce script les synthétise, et on les règle en changeant des CHIFFRES
plutôt qu'en refaisant une prise.

    python3 outils/synthetiser_bruitage.py            # écrit tous les sons
    python3 outils/synthetiser_bruitage.py levelup    # un seul

⚠ Le rendu s'écoute, il ne se calcule pas. Les valeurs ci-dessous sont un
PREMIER JET : si un son ne va pas, c'est ici qu'on le change (fréquences,
durées, niveaux), pas dans un éditeur audio — sinon le réglage est perdu au
prochain passage.

Choix de timbre : du MÉTAL FRAPPÉ (cloche, enclume) plutôt que des bips de
synthèse. Le jeu est en pixel art détaillé, avec de la vraie musique — un blip
8-bit jurerait. Et le métal, dans une cité naine, est chez lui.
"""

import argparse
import pathlib
import subprocess
import sys

import numpy as np

try:
    import imageio_ffmpeg
except ImportError:
    sys.exit("Il manque ffmpeg. Installe-le avec :  pip install imageio-ffmpeg")

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
RACINE = pathlib.Path(__file__).resolve().parent.parent
DOSSIER = RACINE / "sons" / "interface"
ECHANT = 44100
PIC_VISE_DB = -3.0
DEBIT = "128k"

# Partiels d'une barre de métal frappée : leurs fréquences ne sont PAS des
# multiples entiers de la fondamentale (c'est ce qui distingue une cloche d'un
# orgue), et les aigus s'éteignent plus vite que les graves.
PARTIELS = [(1.00, 1.00, 1.00),   # (rapport de fréquence, niveau, vitesse d'extinction)
            (2.01, 0.55, 1.60),
            (2.98, 0.32, 2.30),
            (4.16, 0.18, 3.20),
            (5.43, 0.10, 4.40)]


def frappe(f0, duree_s, decroissance=6.0, brillance=1.0):
    """Un coup sur du métal accordé sur `f0`. `decroissance` = vitesse
    d'extinction (plus grand = plus sec)."""
    t = np.arange(int(duree_s * ECHANT)) / ECHANT
    son = np.zeros_like(t)
    for rapport, niveau, vitesse in PARTIELS:
        # Léger désaccord : deux partiels exactement justes sonnent « informatique ».
        f = f0 * rapport * (1 + 0.0015 * (rapport - 1))
        son += niveau * (brillance ** (rapport - 1)) * np.sin(2 * np.pi * f * t) \
            * np.exp(-decroissance * vitesse * t)
    # Le « clac » du contact : un souffle très court au tout début.
    n_clac = int(0.004 * ECHANT)
    clac = np.random.default_rng(7).normal(0, 1, n_clac) * np.exp(-np.linspace(0, 6, n_clac))
    son[:n_clac] += clac * 0.25
    return son


def poser(piste, son, debut_s, gain=1.0):
    a = int(debut_s * ECHANT)
    b = min(piste.size, a + son.size)
    piste[a:b] += son[:b - a] * gain
    return piste


def levelup():
    """MONTÉE DE NIVEAU — quatre frappes de métal qui montent (do-mi-sol-do),
    la dernière tenue longtemps, sur un souffle grave qui enfle. Récompense.
    """
    total = 1.15
    piste = np.zeros(int(total * ECHANT))
    notes = [(523.25, 0.00, 0.9), (659.26, 0.09, 0.9),
             (783.99, 0.18, 0.95), (1046.50, 0.27, 1.0)]
    for i, (f, t0, g) in enumerate(notes):
        dernier = i == len(notes) - 1
        piste = poser(piste, frappe(f, total - t0,
                                    decroissance=2.2 if dernier else 5.5,
                                    brillance=1.05), t0, g)
    # Souffle grave qui enfle sous l'arpège : donne du corps, sinon ça sonne grêle.
    t = np.arange(piste.size) / ECHANT
    enflure = np.sin(2 * np.pi * 130.81 * t) * np.minimum(1, t / 0.35) * np.exp(-2.0 * t)
    piste += enflure * 0.22
    return piste


def echec():
    """ACTION REFUSÉE — court, mat, descendant. Doit dire « non » sans agresser :
    pas de buzzer strident, un choc sourd qui retombe.
    """
    total = 0.26
    t = np.arange(int(total * ECHANT)) / ECHANT
    # Descente de hauteur : 300 → 115 Hz. C'est la CHUTE qui dit l'échec.
    f = 300 * np.exp(np.log(115 / 300) * np.minimum(1, t / 0.16))
    phase = 2 * np.pi * np.cumsum(f) / ECHANT
    corps = np.sin(phase) * np.exp(-9 * t)
    # Un peu de deuxième harmonique : le son reste lisible sur de petits haut-parleurs.
    corps += 0.3 * np.sin(2 * phase) * np.exp(-14 * t)
    # Choc mat de départ (souffle filtré très court).
    n = int(0.02 * ECHANT)
    bruit = np.random.default_rng(3).normal(0, 1, n)
    bruit = np.convolve(bruit, np.ones(24) / 24, mode="same")   # étouffe les aigus
    corps[:n] += bruit * np.exp(-np.linspace(0, 7, n)) * 0.5
    return corps


SONS = {"levelup": levelup, "echec": echec}


def ecrire(nom, x):
    """Normalise, met des fondus et encode en mp3 mono — comme un bruitage enregistré."""
    x = x / (np.max(np.abs(x)) or 1.0) * 10 ** (PIC_VISE_DB / 20)
    duree_s = x.size / ECHANT
    sortie = DOSSIER / f"{nom}-1.mp3"
    filtres = (f"afade=t=in:st=0:d=0.004,"
               f"afade=t=out:st={max(0, duree_s - 0.05):.4f}:d=0.05")
    r = subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-f", "f32le", "-ar", str(ECHANT), "-ac", "1",
         "-i", "-", "-af", filtres, "-ac", "1", "-ar", str(ECHANT), "-b:a", DEBIT, str(sortie)],
        input=x.astype(np.float32).tobytes(), capture_output=True)
    if r.returncode != 0:
        sys.exit(f"échec de l'encodage de {nom}\n{r.stderr.decode()[:300]}")

    # Contrôle : on ne peut pas ÉCOUTER depuis un script, alors on mesure. Le
    # centre de gravité du spectre dit si le son est sourd ou criard.
    spectre = np.abs(np.fft.rfft(x))
    freqs = np.fft.rfftfreq(x.size, 1 / ECHANT)
    centroide = float((spectre * freqs).sum() / spectre.sum())
    return (f"{sortie.name:14} {duree_s * 1000:5.0f} ms · pic {PIC_VISE_DB:+.1f} dB · "
            f"centre du spectre {centroide:5.0f} Hz · {sortie.stat().st_size / 1024:.0f} Ko")


def main():
    ap = argparse.ArgumentParser(description="Fabrique les bruitages non enregistrables.")
    ap.add_argument("noms", nargs="*", help="parmi : " + ", ".join(SONS) + " (défaut : tous)")
    a = ap.parse_args()
    inconnus = [n for n in a.noms if n not in SONS]
    if inconnus:
        sys.exit("son inconnu : " + ", ".join(inconnus) + " — connus : " + ", ".join(SONS))
    for nom in (a.noms or SONS):
        print("  " + ecrire(nom, SONS[nom]()))


if __name__ == "__main__":
    main()
