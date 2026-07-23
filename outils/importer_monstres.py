# -*- coding: utf-8 -*-
"""
IMPORTER LES STATS DES MONSTRES  (Excel  ->  jeu/data/ennemis.js)
=================================================================

Les CHIFFRES d'équilibrage des monstres (vie, dégâts, XP, vitesse, actions
spéciales) sont éditables dans le classeur — la SOURCE :

    docs/BRUTAL-items-et-cartes.xlsx  ->  onglet « Monstres »

Puis on régénère le bloc lu par le jeu :

    python3 outils/importer_monstres.py

Le script réécrit UNIQUEMENT le bloc balisé de jeu/data/ennemis.js :

    // <<MONSTRES-AUTO>>   ...généré...   // <<FIN-MONSTRES-AUTO>>

Ces stats REMPLACENT (source de vérité) les valeurs de secours écrites dans
ENNEMIS. L'ART et la technique (planche, sprite, portrait, butin…) restent, eux,
dans le code : l'Excel ne sert qu'à RÉGLER des monstres existants.

Onglet « Monstres » (ligne 1 = titres, ligne 2 = aide, données ensuite) :
    A=id · B=nom · C=niveau · D=famille · E=pv · F=attaque · G=xp · H=vitesse
    I=actions  (spéciales, format « type:valeur:poids » séparés par « | »)
Types d'action reconnus (doivent matcher le moteur, cf. systems/combat.js) :
    attaque · soigner · haste-allie          (vide = attaque simple)
"""

import re
import sys
from pathlib import Path

try:
    from openpyxl import load_workbook
except ImportError:
    print("openpyxl manquant :  pip install openpyxl", file=sys.stderr)
    sys.exit(1)

RACINE = Path(__file__).resolve().parent.parent
XLSX = RACINE / "docs" / "BRUTAL-items-et-cartes.xlsx"
ENN_JS = RACINE / "jeu" / "data" / "ennemis.js"

DEBUT = "// <<MONSTRES-AUTO>>"
FIN = "// <<FIN-MONSTRES-AUTO>>"

ACTIONS_OK = {"attaque", "soigner", "haste-allie"}


def echapper(s):
    return str(s).replace("\\", "\\\\").replace('"', '\\"')


def lire_int(cellule, iid, ligne, quoi):
    """Lit un entier, en TOLÉRANT une note humaine autour (ex. « 2x2 » → 2, « 5 (acide) »
    → 5). On prend le PREMIER entier trouvé. Sert à pv/attaque/xp/vitesse/niveau."""
    if isinstance(cellule, (int, float)):
        return int(round(cellule))
    m = re.search(r"-?\d+", str(cellule) if cellule is not None else "")
    if not m:
        raise SystemExit(f"« Monstres » ligne {ligne} ({iid}) : {quoi} illisible « {cellule} ».")
    return int(m.group())


def lire_actions(cellule, iid, ligne):
    """Parse « type:valeur:poids | type:valeur:poids » -> liste de dicts.

    TOLÉRANT : si la cellule ne ressemble PAS à une liste d'actions structurées
    (aucun morceau ne commence par un type connu suivi de « : »), on la considère
    comme une simple NOTE humaine (ex. « rapide », « frappe 2× ») et on renvoie []
    — le moteur gère ces cas via les champs inline (attaqueHits, poisonParCoup…).
    En revanche, une cellule QUI RESSEMBLE à des actions mais mal formée lève une
    erreur (pour attraper les vraies fautes de frappe)."""
    txt = str(cellule).strip() if cellule else ""
    if not txt:
        return []
    morceaux = [m.strip() for m in txt.split("|") if m.strip()]

    def ressemble_action(m):
        bouts = [b.strip() for b in m.split(":")]
        return len(bouts) >= 1 and bouts[0] in ACTIONS_OK

    if not any(ressemble_action(m) for m in morceaux):
        return []  # note libre → aucune action structurée

    out = []
    for morceau in morceaux:
        bouts = [b.strip() for b in morceau.split(":")]
        if len(bouts) != 3 or bouts[0] not in ACTIONS_OK:
            raise SystemExit(f"« Monstres » ligne {ligne} ({iid}) : action « {morceau} » "
                             f"mal formée (attendu type:valeur:poids ; types : "
                             f"{', '.join(sorted(ACTIONS_OK))}).")
        typ, val, poids = bouts
        try:
            val, poids = int(round(float(val))), int(round(float(poids)))
        except ValueError:
            raise SystemExit(f"« Monstres » ligne {ligne} ({iid}) : valeur/poids illisible dans « {morceau} ».")
        out.append((typ, val, poids))
    return out


def lire_monstres(wb):
    if "Monstres" not in wb.sheetnames:
        raise SystemExit("L'onglet « Monstres » est introuvable dans le classeur.")
    ws = wb["Monstres"]
    monstres, vus = [], set()
    for i, lg in enumerate(ws.iter_rows(values_only=True), start=1):
        if not lg:
            continue
        iid = str(lg[0]).strip() if lg[0] else ""
        if iid == "id" or not re.fullmatch(r"[a-z0-9-]+", iid):
            continue  # titre / aide / ligne vide
        if iid in vus:
            raise SystemExit(f"« Monstres » : id en double « {iid} ».")
        vus.add(iid)

        def champ(k):
            return lg[k] if len(lg) > k else None

        nom = str(champ(1)).strip() if champ(1) else iid
        niveau = lire_int(champ(2), iid, i, "niveau") if champ(2) is not None else 1
        famille = str(champ(3)).strip() if champ(3) else ""
        pv = lire_int(champ(4), iid, i, "pv")
        attaque = lire_int(champ(5), iid, i, "attaque")   # « 2x2 » → 2 (dégâts/coup ; les coups multiples sont inline)
        xp = lire_int(champ(6), iid, i, "xp")
        vitesse = lire_int(champ(7), iid, i, "vitesse")
        actions = lire_actions(champ(8), iid, i)
        # Colonne J = « grand » : 1/oui/true → monstre GRAND (occupe 2 places, rare).
        gv = str(champ(9)).strip().lower() if champ(9) is not None else ""
        grand = gv in ("1", "oui", "true", "vrai", "x")
        monstres.append(dict(id=iid, nom=nom, niveau=niveau, famille=famille, pv=pv,
                             attaque=attaque, xp=xp, vitesse=vitesse, actions=actions, grand=grand))
    if not monstres:
        raise SystemExit("Aucun monstre trouvé dans l'onglet « Monstres ».")
    return monstres


def bloc_js(monstres):
    lignes = ["const STATS_MONSTRES = {"]
    for m in monstres:
        champs = [
            f'nom: "{echapper(m["nom"])}"',
            f'niveau: {m["niveau"]}',
        ]
        if m["famille"]:
            champs.append(f'famille: "{echapper(m["famille"])}"')
        champs += [
            f'pv: {m["pv"]}', f'attaque: {m["attaque"]}',
            f'xp: {m["xp"]}', f'vitesse: {m["vitesse"]}',
        ]
        if m["actions"]:
            acts = ", ".join(
                f'{{ type: "{t}", valeur: {v}, poids: {p} }}' for t, v, p in m["actions"])
            champs.append(f'actions: [{acts}]')
        else:
            champs.append("actions: []")
        if m["grand"]:
            champs.append("grand: true")
        lignes.append(f'  "{m["id"]}": {{ ' + ", ".join(champs) + " },")
    lignes.append("};")
    return "\n".join(lignes) + "\n"


def main():
    wb = load_workbook(XLSX, data_only=True)
    monstres = lire_monstres(wb)
    corps = bloc_js(monstres)

    contenu = ENN_JS.read_text(encoding="utf-8")
    if DEBUT not in contenu or FIN not in contenu:
        raise SystemExit(f"Balises {DEBUT} / {FIN} absentes de {ENN_JS.name}.")
    avant = contenu.split(DEBUT)[0]
    apres = contenu.split(FIN)[1]
    ENN_JS.write_text(f"{avant}{DEBUT}\n{corps}{FIN}{apres}", encoding="utf-8")
    print(f"OK — {len(monstres)} monstres écrits dans {ENN_JS.relative_to(RACINE)} : "
          + ", ".join(m["id"] for m in monstres))


if __name__ == "__main__":
    main()
