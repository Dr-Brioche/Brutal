#!/usr/bin/env python3
"""Prépare un BRUITAGE brut en fichier prêt pour le jeu.

Brioche enregistre et dépose ses prises dans `sons/interface/`. Ce script fait
tout seul les cinq gestes qu'on ferait à la main dans Audacity :

  1. COUPE le silence du début   — sinon le son arrive en retard sur l'image, et
                                    ça se sent énormément (c'est LE défaut n°1) ;
  2. COUPE le silence de la fin  — du poids pour rien ;
  3. NORMALISE le pic à -3 dB    — pour qu'aucun son ne fasse sursauter et
                                    qu'aucun ne soit inaudible à côté des autres ;
  4. FONDU de sortie (30 ms)     — supprime le « clac » de coupure nette ;
  5. EXPORTE en mp3 mono 128 k   — quelques Ko par fichier.

L'ORIGINAL n'est jamais perdu : il est déplacé dans `sons/interface/sources/`
avant traitement (même convention que les planches de monstres). Un fichier déjà
traité est reconnu et laissé tranquille, sauf avec --forcer.

Usage :
    python3 outils/preparer_bruitage.py --tous          # tout sons/interface/
    python3 outils/preparer_bruitage.py coup-1.mp3      # un seul
    python3 outils/preparer_bruitage.py --tous --forcer # même les déjà traités
    python3 outils/preparer_bruitage.py --tous --verifier  # ne fait RIEN, mesure

⚠ Ne traite JAMAIS les musiques (sons/ambiance/, sons/combat/) : une musique
n'a pas à être normalisée ni tronquée comme un bruitage. Le jingle `victoire.mp3`
est également exclu pour la même raison.
"""

import argparse
import math
import pathlib
import shutil
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
SOURCES = DOSSIER / "sources"

PIC_VISE_DB = -3.0     # niveau de sortie : tous les bruitages au même pic
SEUIL_DB = -45.0       # sous ce niveau (par rapport au pic), c'est du silence
MARGE_MS = 5           # on garde ce petit avant-coup : ne pas tronquer l'attaque
FONDU_MS = 30          # fondu de sortie
DEBIT = "128k"
ECHANT = 44100

# Fichiers à ne PAS toucher (ce ne sont pas des bruitages courts).
EXCLUS = {"victoire.mp3"}


def decoder(chemin):
    """Décode en mono float32 (numpy). Renvoie (echantillons, frequence)."""
    r = subprocess.run(
        [FFMPEG, "-v", "error", "-i", str(chemin),
         "-f", "f32le", "-ac", "1", "-ar", str(ECHANT), "-"],
        capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"{chemin.name} : ffmpeg n'a pas pu lire le fichier\n{r.stderr.decode()[:300]}")
    return np.frombuffer(r.stdout, dtype=np.float32), ECHANT


def mesurer(x, fe):
    """Pic, RMS, silence de tête et de queue — en dB et en millisecondes."""
    pic = float(np.max(np.abs(x))) if x.size else 0.0
    if pic <= 0:
        return None
    seuil = pic * (10 ** (SEUIL_DB / 20))
    fort = np.flatnonzero(np.abs(x) >= seuil)
    debut, fin = int(fort[0]), int(fort[-1])
    rms = float(np.sqrt(np.mean(np.square(x))))
    return {
        "pic_db": 20 * math.log10(pic),
        "rms_db": 20 * math.log10(rms) if rms > 0 else -99.0,
        "duree_ms": round(x.size / fe * 1000),
        "tete_ms": round(debut / fe * 1000),
        "queue_ms": round((x.size - 1 - fin) / fe * 1000),
        "debut": debut,
        "fin": fin,
    }


def traiter(chemin, forcer=False):
    """Nettoie un bruitage EN PLACE (l'original part dans sources/)."""
    x, fe = decoder(chemin)
    m = mesurer(x, fe)
    if m is None:
        return f"{chemin.name} : fichier SILENCIEUX, rien à faire"

    # Déjà propre ? (démarrage franc, pic déjà au bon niveau) → on ne retouche pas :
    # repasser un mp3 dans un encodeur mp3 dégrade un peu à chaque fois.
    propre = m["tete_ms"] <= 15 and m["queue_ms"] <= 60 and abs(m["pic_db"] - PIC_VISE_DB) <= 1.0
    if propre and not forcer:
        return f"{chemin.name} : déjà propre, laissé tel quel"

    # Bornes de coupe, avec la petite marge avant l'attaque.
    marge = int(MARGE_MS * fe / 1000)
    debut = max(0, m["debut"] - marge)
    fin = min(x.size, m["fin"] + marge)
    debut_s, fin_s = debut / fe, fin / fe
    gain_db = PIC_VISE_DB - m["pic_db"]
    duree_s = fin_s - debut_s
    fondu_s = min(FONDU_MS / 1000, duree_s / 3)   # jamais plus d'un tiers du son

    filtres = (f"atrim=start={debut_s:.4f}:end={fin_s:.4f},asetpts=N/SR/TB,"
               f"volume={gain_db:.2f}dB,"
               f"afade=t=out:st={max(0, duree_s - fondu_s):.4f}:d={fondu_s:.4f}")

    SOURCES.mkdir(parents=True, exist_ok=True)
    original = SOURCES / chemin.name
    if not original.exists():          # on ne remplace jamais une source gardée
        shutil.copy2(chemin, original)

    sortie = chemin.with_suffix(".tmp.mp3")
    r = subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-i", str(original),
         "-af", filtres, "-ac", "1", "-ar", str(ECHANT), "-b:a", DEBIT, str(sortie)],
        capture_output=True)
    if r.returncode != 0:
        sortie.unlink(missing_ok=True)
        raise RuntimeError(f"{chemin.name} : échec de l'encodage\n{r.stderr.decode()[:300]}")
    sortie.replace(chemin)

    apres = mesurer(*decoder(chemin))
    ko = chemin.stat().st_size / 1024
    return (f"{chemin.name} : {m['duree_ms']}→{apres['duree_ms']} ms · "
            f"début {m['tete_ms']}→{apres['tete_ms']} ms · "
            f"pic {m['pic_db']:+.1f}→{apres['pic_db']:+.1f} dB · {ko:.0f} Ko")


def verifier(chemin):
    m = mesurer(*decoder(chemin))
    if m is None:
        return f"{chemin.name:24} SILENCIEUX"
    alertes = []
    if m["tete_ms"] > 15:
        alertes.append(f"⚠ {m['tete_ms']} ms de silence au début")
    if m["pic_db"] > -0.5:
        alertes.append("⚠ sature (pic à 0 dB)")
    if abs(m["pic_db"] - PIC_VISE_DB) > 3:
        alertes.append(f"⚠ pic à {m['pic_db']:+.1f} dB (visé {PIC_VISE_DB:+.0f})")
    return (f"{chemin.name:24} {m['duree_ms']:>5} ms · début {m['tete_ms']:>4} ms · "
            f"pic {m['pic_db']:>+6.1f} dB   {' '.join(alertes)}")


def main():
    ap = argparse.ArgumentParser(description="Prépare les bruitages du jeu.")
    ap.add_argument("fichiers", nargs="*", help="noms dans sons/interface/ (défaut : --tous)")
    ap.add_argument("--tous", action="store_true", help="tout sons/interface/")
    ap.add_argument("--forcer", action="store_true", help="retraiter même les fichiers déjà propres")
    ap.add_argument("--verifier", action="store_true", help="ne modifie RIEN, affiche les mesures")
    a = ap.parse_args()

    if a.tous or not a.fichiers:
        cibles = sorted(p for p in DOSSIER.glob("*.mp3") if p.name not in EXCLUS)
    else:
        cibles = [DOSSIER / f if "/" not in f else pathlib.Path(f) for f in a.fichiers]

    if not cibles:
        sys.exit(f"Aucun bruitage dans {DOSSIER.relative_to(RACINE)}")

    for c in cibles:
        if not c.exists():
            print(f"  introuvable : {c}")
            continue
        try:
            print("  " + (verifier(c) if a.verifier else traiter(c, a.forcer)))
        except RuntimeError as e:
            print(f"  {e}")

    if not a.verifier:
        print(f"\nOriginaux gardés dans {SOURCES.relative_to(RACINE)}/")


if __name__ == "__main__":
    main()
