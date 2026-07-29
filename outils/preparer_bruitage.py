#!/usr/bin/env python3
"""Prépare un BRUITAGE brut en fichier prêt pour le jeu.

Brioche enregistre au téléphone et dépose ses prises dans `sons/interface/`. Une
prise brute, ça ressemble à ça : 2 à 4 secondes de silence avec, quelque part au
milieu, le son qu'on voulait — plus, souvent, un deuxième coup, un frottement de
doigt sur le micro, ou le bruit du bouton d'arrêt.

Ce script fait donc tout seul ce qu'on ferait à la main dans Audacity :

  1. TROUVE L'ÉVÉNEMENT       — la zone la plus intense de l'enregistrement, et
                                ses vraies limites (pas la seule pointe : un son
                                respire, on suit sa montée et sa décroissance) ;
  2. JETTE LE RESTE           — le silence, ET les autres bruits de la prise ;
  3. COUPE LES GRAVES         — passe-haut à 70 Hz : un enregistrement au
                                téléphone porte toujours du grondement de
                                manipulation, inaudible mais qui mange du niveau ;
  4. NORMALISE le pic à -3 dB — aucun son ne fait sursauter, aucun n'est noyé ;
  5. FONDU d'entrée et de sortie + export mp3 mono 128 kbps.

L'ORIGINAL n'est jamais perdu : il est copié dans `sons/interface/sources/` avant
traitement, et c'est TOUJOURS de là qu'on repart. Relancer le script deux fois
donne donc exactement le même résultat — aucune dégradation qui s'accumule.

Usage :
    python3 outils/preparer_bruitage.py --tous            # traite tout
    python3 outils/preparer_bruitage.py coup-1.mp3        # un seul
    python3 outils/preparer_bruitage.py --tous --verifier  # ne fait RIEN, mesure

⚠ Ne traite JAMAIS les musiques (sons/ambiance/, sons/combat/) : une musique
n'a pas à être normalisée ni tronquée comme un bruitage. Le jingle `victoire.mp3`
est également exclu.
"""

import argparse
import math
import pathlib
import re
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

ECHANT = 44100
PAS_MS = 5              # finesse de l'enveloppe d'énergie
SEUIL_EVENT_DB = -32    # limite de l'événement, SOUS SON PROPRE PIC
TROU_MS = 90            # un creux plus court ne coupe pas l'événement (il respire)
PRE_MS = 12             # air gardé AVANT l'attaque (ne jamais tronquer le transitoire)
QUEUE_MS = 60           # air gardé APRÈS, pour la décroissance
DUREE_MAX_MS = 1200     # au-delà, on coupe (et on le signale)
FONDU_ENTREE_MS = 4     # micro-fondu : supprime le « clic » de coupure au début
FONDU_SORTIE_MS = 40
PIC_VISE_DB = -3.0
HIGHPASS_HZ = 70
DEBIT = "128k"

EXCLUS = {"victoire.mp3"}

# FENÊTRES FORCÉES — les prises où la détection automatique se trompe.
#
# Elle réussit sur 41 des 43 prises. Pour les deux autres, aucun réglage de
# seuil ne marche : le resserrer assez pour les corriger décapite les sons à
# montée progressive (une carte qu'on tire commence tout doucement). Plutôt que
# de tordre les réglages jusqu'à casser ailleurs, on écrit la fenêtre à la main.
# Toujours avec la RAISON : sans elle, personne ne saura pourquoi ce chiffre.
FENETRES_FORCEES = {
    # 600 ms de ronflement à -25 dB (manipulation) avant le vrai impact à 1440 ms.
    "coup-armure-2.mp3": (1425, 1700),
    # La prise contient DEUX clics (1200 ms et 1360 ms) : on garde le premier.
    "clic-1.mp3": (1190, 1320),
}

# Les noms de sons que le JEU sait jouer (doit rester aligné sur VARIANTES dans
# jeu/core/sons.js). Sert à repérer un fichier mal nommé : sans ce contrôle, un
# `hero-touche-1.mp3` déposé à la place de `heros-touche-1.mp3` est simplement
# IGNORÉ par le jeu, en silence — exactement le genre de perte de temps qu'on
# a déjà payée avec les trous de numérotation.
NOMS_CONNUS = {
    "coup", "coup-armure", "heros-touche", "monstre-mort", "carte-piochee",
    "carte-jouee", "sortilege", "bouclier", "echec", "minage", "minerai-ramasse",
    "forge-marteau", "levelup", "or", "clic",
}


def decoder(chemin):
    """Décode en mono float32 (numpy)."""
    r = subprocess.run(
        [FFMPEG, "-v", "error", "-i", str(chemin),
         "-f", "f32le", "-ac", "1", "-ar", str(ECHANT), "-"],
        capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg n'a pas pu lire {chemin.name}\n{r.stderr.decode()[:300]}")
    return np.frombuffer(r.stdout, dtype=np.float32)


def decoder_filtre(chemin, filtres):
    """Décode APRÈS avoir appliqué une chaîne de filtres ffmpeg. Sert à mesurer
    ce que le traitement produit vraiment, avant de décider du gain final."""
    r = subprocess.run(
        [FFMPEG, "-v", "error", "-i", str(chemin), "-af", filtres,
         "-f", "f32le", "-ac", "1", "-ar", str(ECHANT), "-"],
        capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg a refusé les filtres sur {chemin.name}\n{r.stderr.decode()[:300]}")
    return np.frombuffer(r.stdout, dtype=np.float32)


def enveloppe(x):
    """Énergie (RMS) par tranches de PAS_MS. C'est là-dessus qu'on raisonne :
    la forme d'onde brute oscille trop vite pour qu'on y lise un « événement »."""
    n = max(1, int(PAS_MS * ECHANT / 1000))
    m = x.size // n
    if m == 0:
        return np.array([1e-12]), n
    return np.sqrt((x[:m * n].reshape(m, n) ** 2).mean(axis=1)) + 1e-12, n


def trouver_evenement(x):
    """Bornes (début, fin) de l'événement le PLUS INTENSE de la prise.

    On part de la pointe d'énergie et on s'étend des deux côtés tant qu'on reste
    au-dessus d'un seuil relatif à cette pointe. Le seuil est relatif AU PIC et
    non au bruit de fond : c'est ce qui fait qu'un deuxième coup, plus faible,
    n'est PAS rattrapé — alors qu'un simple détecteur de silence les collerait
    ensemble avec tout l'intervalle.

    `TROU_MS` évite l'excès inverse : un son a des creux internes (un rebond, une
    résonance qui repart), et couper au premier creux le décapiterait.
    """
    env, n = enveloppe(x)
    i = int(env.argmax())
    seuil = env[i] * 10 ** (SEUIL_EVENT_DB / 20)
    trou = max(1, int(TROU_MS / PAS_MS))

    g = i
    creux = 0
    while g > 0:
        g -= 1
        creux = creux + 1 if env[g] < seuil else 0
        if creux >= trou:
            g += creux
            break
    d = i
    creux = 0
    while d < env.size - 1:
        d += 1
        creux = creux + 1 if env[d] < seuil else 0
        if creux >= trou:
            d -= creux
            break

    debut, fin = g * n, min(x.size, (d + 1) * n)

    # RECALAGE FIN DE L'ATTAQUE. L'enveloppe est calculée par tranches de 5 ms et
    # tolère des creux de 90 ms : elle donne la bonne ZONE, pas la milliseconde
    # exacte où le son commence. Or c'est justement ce début qui compte — 60 ms
    # de silence en tête et le son paraît en retard sur l'image. On cherche donc,
    # DANS la zone retenue, le premier échantillon vraiment audible.
    zone = x[debut:fin]
    if zone.size:
        pic = float(np.max(np.abs(zone))) or 1e-9
        fort = np.flatnonzero(np.abs(zone) >= pic * 10 ** (-40 / 20))
        if fort.size:
            debut += int(fort[0])
            fin = debut + int(fort[-1] - fort[0]) + 1

    debut = max(0, debut - int(PRE_MS * ECHANT / 1000))
    fin = min(x.size, fin + int(QUEUE_MS * ECHANT / 1000))
    return debut, fin, env, i


def rapport_hors_evenement(env, n, debut, fin, pic):
    """Niveau du plus fort bruit RESTÉ dehors, en dB sous le pic gardé. Sert à
    dire « il y avait un 2e son dans la prise » — utile à savoir, pas une erreur."""
    a, b = debut // n, fin // n
    dehors = np.concatenate([env[:a], env[b:]])
    if dehors.size == 0:
        return -99.0
    return 20 * math.log10(dehors.max() / pic)


def mesurer(x):
    """Pic, RMS, silence de tête, en dB / ms."""
    pic = float(np.max(np.abs(x))) if x.size else 0.0
    if pic <= 0:
        return None
    seuil = pic * 10 ** (-45 / 20)
    fort = np.flatnonzero(np.abs(x) >= seuil)
    return {
        "pic_db": 20 * math.log10(pic),
        "duree_ms": round(x.size / ECHANT * 1000),
        "tete_ms": round(int(fort[0]) / ECHANT * 1000) if fort.size else 0,
    }


def original(chemin):
    """La prise BRUTE. On la met de côté au premier passage, et on repart
    toujours d'elle : deux exécutions donnent le même résultat."""
    src = SOURCES / chemin.name
    if not src.exists():
        SOURCES.mkdir(parents=True, exist_ok=True)
        shutil.copy2(chemin, src)
    return src


def isoler(src):
    """Découpe l'événement le plus intense d'une prise et le renvoie déjà filtré
    (passe-haut appliqué), avec les informations pour le compte rendu.

    Utilisé aussi bien pour un fichier seul que pour chaque COUCHE d'un montage :
    dans les deux cas, on veut le même geste — trouver le son, jeter le reste.
    L'attaque se retrouve toujours à PRE_MS du début, ce qui suffit à CALER
    plusieurs couches entre elles (cf. assembler).
    """
    x = decoder(src)
    avant = mesurer(x)
    if avant is None:
        return None
    debut, fin, env, i = trouver_evenement(x)
    _, n = enveloppe(x)
    forcee = FENETRES_FORCEES.get(src.name)
    if forcee:
        debut = max(0, int(forcee[0] * ECHANT / 1000))
        fin = min(x.size, int(forcee[1] * ECHANT / 1000))
    autre = rapport_hors_evenement(env, n, debut, fin, env[i])

    tronque = ""
    if (fin - debut) / ECHANT * 1000 > DUREE_MAX_MS:
        fin = debut + int(DUREE_MAX_MS * ECHANT / 1000)
        tronque = f" ✂ coupé à {DUREE_MAX_MS} ms"

    decoupe = (f"atrim=start={debut / ECHANT:.4f}:end={fin / ECHANT:.4f},asetpts=N/SR/TB,"
               f"highpass=f={HIGHPASS_HZ}")
    return {"son": decoder_filtre(src, decoupe), "avant": avant, "autre": autre,
            "tronque": tronque + (" 🔧 fenêtre forcée" if forcee else ""),
            "decoupe": decoupe, "duree_s": (fin - debut) / ECHANT}


def encoder(x, sortie):
    """Écrit un signal numpy en mp3 mono, avec ses fondus et son niveau final."""
    duree_s = x.size / ECHANT
    fs = min(FONDU_SORTIE_MS / 1000, duree_s / 3)
    fe_ = min(FONDU_ENTREE_MS / 1000, duree_s / 10)
    pic = float(np.max(np.abs(x))) or 1e-9
    gain = 10 ** (PIC_VISE_DB / 20) / pic
    filtres = (f"afade=t=in:st=0:d={fe_:.4f},"
               f"afade=t=out:st={max(0, duree_s - fs):.4f}:d={fs:.4f}")
    r = subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-f", "f32le", "-ar", str(ECHANT), "-ac", "1",
         "-i", "-", "-af", filtres, "-ac", "1", "-ar", str(ECHANT), "-b:a", DEBIT, str(sortie)],
        input=(x * gain).astype(np.float32).tobytes(), capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"échec de l'encodage\n{r.stderr.decode()[:300]}")


def assembler(nom_final, parties):
    """MONTAGE EN COUCHES : plusieurs prises SUPERPOSÉES en un seul bruitage.

    Convention (décision Brioche 29/07/2026) : `coup-1.1.mp3` + `coup-1.2.mp3`
    donnent `coup-1.mp3`. C'est ainsi qu'on fabrique un vrai son d'impact — un
    son GRAVE pour le poids, un son CLAQUANT par-dessus pour la netteté. Un seul
    enregistrement ne donne jamais les deux.

    Calage : chaque couche est d'abord ISOLÉE, ce qui place son attaque à PRE_MS
    du début. Les superposer à partir de zéro fait donc coïncider les attaques —
    et c'est cette coïncidence qui les fait entendre comme UN seul coup, pas
    comme deux bruits.

    Niveaux : on respecte le RAPPORT enregistré entre les couches (aucun gain
    par couche), et on normalise seulement la somme. Si une couche doit rester
    discrète, il suffit de l'enregistrer plus bas — l'outil ne le défera pas.
    """
    # ⚠ LES COUCHES RESTENT DANS sons/interface/ (et ne sont PAS recopiées dans
    # sources/) : ce sont elles, les prises brutes. On les relit telles quelles à
    # chaque exécution, donc le montage se refait à l'identique.
    # Le piège évité : si on effaçait les couches après montage, `bouclier-1.mp3`
    # redeviendrait un fichier simple au passage suivant — et comme un
    # `sources/bouclier-1.mp3` d'une ancienne prise traîne, l'outil aurait
    # reconstruit le son À PARTIR D'ELLE, détruisant le montage sans rien dire.
    # (Le jeu, lui, ne cherche que `nom-1.mp3` … `nom-8.mp3` : les fichiers
    # `nom-1.1.mp3` ne sont jamais demandés, ils ne le gênent pas.)
    couches, details = [], []
    for p in sorted(parties):
        iso = isoler(p)
        if iso is None:
            details.append(f"{p.name} SILENCIEUSE")
            continue
        couches.append(iso["son"])
        pic = float(np.max(np.abs(iso["son"]))) or 1e-9
        details.append(f"{p.name.split('-')[-1]} {iso['son'].size / ECHANT * 1000:.0f} ms "
                       f"({20 * math.log10(pic):+.1f} dB)")
    if not couches:
        return f"{nom_final} : aucune couche exploitable"

    n = max(c.size for c in couches)
    melange = np.zeros(n, dtype=np.float64)
    for c in couches:
        melange[:c.size] += c            # attaques calées : on part toutes de 0

    sortie = DOSSIER / nom_final
    # Une ANCIENNE prise unique du même nom (avant qu'on passe au montage) doit
    # partir : sinon elle resterait dans sources/ comme une bombe à retardement,
    # prête à écraser le montage au moindre changement de nommage.
    vieille = SOURCES / nom_final
    if vieille.exists():
        vieille.unlink()
    encoder(melange, sortie)
    apres = mesurer(decoder(sortie))
    return (f"{nom_final:24} {len(couches)} couches → {apres['duree_ms']:>4} ms · "
            f"pic {apres['pic_db']:+.1f} dB · {sortie.stat().st_size / 1024:.0f} Ko"
            f"   [{' + '.join(details)}]")


def traiter(chemin):
    src = original(chemin)
    x = decoder(src)
    avant = mesurer(x)
    if avant is None:
        return f"{chemin.name} : prise SILENCIEUSE, rien à faire"

    debut, fin, env, i = trouver_evenement(x)
    _, n = enveloppe(x)
    forcee = FENETRES_FORCEES.get(src.name)
    if forcee:
        debut = max(0, int(forcee[0] * ECHANT / 1000))
        fin = min(x.size, int(forcee[1] * ECHANT / 1000))
    autre = rapport_hors_evenement(env, n, debut, fin, env[i])

    duree_s = (fin - debut) / ECHANT
    tronque = " 🔧 fenêtre forcée" if forcee else ""
    if duree_s * 1000 > DUREE_MAX_MS:
        fin = debut + int(DUREE_MAX_MS * ECHANT / 1000)
        duree_s = (fin - debut) / ECHANT
        tronque = f" ✂ coupé à {DUREE_MAX_MS} ms"

    fs = min(FONDU_SORTIE_MS / 1000, duree_s / 3)
    fe_ = min(FONDU_ENTREE_MS / 1000, duree_s / 10)
    decoupe = (f"atrim=start={debut / ECHANT:.4f}:end={fin / ECHANT:.4f},asetpts=N/SR/TB,"
               f"highpass=f={HIGHPASS_HZ}")

    # ⚠ EN DEUX TEMPS. Le gain doit se calculer APRÈS le passe-haut : le filtre
    # retire des graves, donc il fait BAISSER le pic. En calculant avant, les
    # fichiers sortaient entre -2,3 et -4,9 dB au lieu des -3 visés — soit
    # 2,6 dB d'écart entre deux sons, ce qu'on entend. On découpe et on filtre
    # d'abord, on MESURE le résultat, puis on applique le gain juste.
    coupe = decoder_filtre(src, decoupe)
    pic_filtre = float(np.max(np.abs(coupe))) or 1e-9
    gain_db = PIC_VISE_DB - 20 * math.log10(pic_filtre)

    filtres = (f"{decoupe},volume={gain_db:.2f}dB,"
               f"afade=t=in:st=0:d={fe_:.4f},"
               f"afade=t=out:st={max(0, duree_s - fs):.4f}:d={fs:.4f}")

    sortie = chemin.with_suffix(".tmp.mp3")
    r = subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-i", str(src), "-af", filtres,
         "-ac", "1", "-ar", str(ECHANT), "-b:a", DEBIT, str(sortie)],
        capture_output=True)
    if r.returncode != 0:
        sortie.unlink(missing_ok=True)
        raise RuntimeError(f"{chemin.name} : échec de l'encodage\n{r.stderr.decode()[:300]}")
    sortie.replace(chemin)

    apres = mesurer(decoder(chemin))
    ko = chemin.stat().st_size / 1024
    note = ""
    if autre > -25:
        note = f"  (2e son dans la prise à {autre:+.0f} dB — écarté)"
    return (f"{chemin.name:24} {avant['duree_ms']:>5}→{apres['duree_ms']:>4} ms · "
            f"pic {avant['pic_db']:+.1f}→{apres['pic_db']:+.1f} dB · {ko:.0f} Ko{tronque}{note}")


def verifier(chemin):
    src = SOURCES / chemin.name
    x = decoder(src if src.exists() else chemin)
    m = mesurer(x)
    if m is None:
        return f"{chemin.name:24} SILENCIEUSE"
    debut, fin, env, i = trouver_evenement(x)
    _, n = enveloppe(x)
    autre = rapport_hors_evenement(env, n, debut, fin, env[i])
    return (f"{chemin.name:24} prise {m['duree_ms']:>5} ms → événement "
            f"{(fin - debut) / ECHANT * 1000:>5.0f} ms à {debut / ECHANT * 1000:>5.0f} ms"
            + (f"   ⚠ 2e son à {autre:+.0f} dB" if autre > -25 else ""))


# Une COUCHE de montage : `coup-1.1.mp3` = 1re couche du bruitage `coup-1`.
RE_COUCHE = re.compile(r"(.+-\d+)\.(\d+)\.mp3$")


def grouper_couches(cibles):
    """Sépare les fichiers en MONTAGES (nom-N.M.mp3, à superposer) et fichiers
    simples. Renvoie ({« coup-1.mp3 »: [parties…]}, [fichiers simples])."""
    montages, simples = {}, []
    for c in cibles:
        m = RE_COUCHE.fullmatch(c.name)
        if m:
            montages.setdefault(f"{m.group(1)}.mp3", []).append(c)
        else:
            simples.append(c)
    # Un nom PRODUIT par un montage ne doit pas être traité comme fichier simple :
    # sinon `bouclier-1.mp3` était d'abord reconstruit depuis l'ancienne prise
    # unique, puis écrasé par le montage. Le résultat était bon — mais seulement
    # grâce à l'ordre des deux passes, ce qui ne tient qu'à un fil.
    simples = [s for s in simples if s.name not in montages]
    return montages, simples


def controler_noms(cibles):
    """Signale les fichiers dont le NOM LOGIQUE est inconnu du jeu. Sans ça, un
    fichier mal nommé est ignoré en silence et on cherche longtemps pourquoi."""
    soucis = []
    for c in cibles:
        m = RE_COUCHE.fullmatch(c.name) or re.fullmatch(r"(.+)-(\d+)\.mp3", c.name)
        if not m:
            soucis.append(f"{c.name} : nom hors convention "
                          "(attendu « nom-1.mp3 », ou « nom-1.1.mp3 » pour une couche)")
            continue
        base = m.group(1).rsplit("-", 1)[0] if RE_COUCHE.fullmatch(c.name) else m.group(1)
        if base not in NOMS_CONNUS:
            proches = [n for n in NOMS_CONNUS if n.startswith(base[:4])]
            soucis.append(f"{c.name} : « {base} » inconnu du jeu → IGNORÉ"
                          + (f" (voulais-tu « {proches[0]} » ?)" if proches else ""))
    return soucis


def main():
    ap = argparse.ArgumentParser(description="Prépare les bruitages du jeu.")
    ap.add_argument("fichiers", nargs="*", help="noms dans sons/interface/ (défaut : --tous)")
    ap.add_argument("--tous", action="store_true", help="tout sons/interface/")
    ap.add_argument("--verifier", action="store_true", help="ne modifie RIEN, affiche les mesures")
    a = ap.parse_args()

    if a.tous or not a.fichiers:
        cibles = sorted(p for p in DOSSIER.glob("*.mp3") if p.name not in EXCLUS)
    else:
        cibles = [DOSSIER / f for f in a.fichiers]

    if not cibles:
        sys.exit(f"Aucun bruitage dans {DOSSIER.relative_to(RACINE)}")

    soucis = controler_noms(cibles)
    if soucis:
        print("⚠ NOMS À CORRIGER (ces fichiers ne seront jamais joués) :")
        for s in soucis:
            print(f"    {s}")
        print()

    montages, simples = grouper_couches(cibles)

    for c in simples:
        if not c.exists():
            print(f"  introuvable : {c}")
            continue
        try:
            print("  " + (verifier(c) if a.verifier else traiter(c)))
        except RuntimeError as e:
            print(f"  {e}")

    for final, parties in sorted(montages.items()):
        try:
            if a.verifier:
                print(f"  {final:24} MONTAGE de {len(parties)} couches : "
                      + ", ".join(p.name for p in sorted(parties)))
            else:
                print("  " + assembler(final, parties))
        except RuntimeError as e:
            print(f"  {e}")

    if not a.verifier:
        print(f"\nPrises brutes gardées dans {SOURCES.relative_to(RACINE)}/")


if __name__ == "__main__":
    main()
