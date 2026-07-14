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


def lire_actions(cellule, iid, ligne):
    """Parse « type:valeur:poids | type:valeur:poids » -> liste de dicts."""
    txt = str(cellule).strip() if cellule else ""
    if not txt:
        return []
    out = []
    for morceau in txt.split("|"):
        morceau = morceau.strip()
        if not morceau:
            continue
        bouts = [b.strip() for b in morceau.split(":")]
        if len(bouts) != 3:
            raise SystemExit(f"« Monstres » ligne {ligne} ({iid}) : action « {morceau} » "
                             f"mal formée (attendu type:valeur:poids).")
        typ, val, poids = bouts
        if typ not in ACTIONS_OK:
            raise SystemExit(f"« Monstres » ligne {ligne} ({iid}) : action inconnue « {typ} » "
                             f"(attendues : {', '.join(sorted(ACTIONS_OK))}).")
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
        try:
            niveau = int(round(float(champ(2)))) if champ(2) is not None else 1
        except ValueError:
            raise SystemExit(f"« Monstres » ligne {i} ({iid}) : niveau illisible.")
        famille = str(champ(3)).strip() if champ(3) else ""
        try:
            pv = int(round(float(champ(4))))
            attaque = int(round(float(champ(5))))
            xp = int(round(float(champ(6))))
            vitesse = int(round(float(champ(7))))
        except (TypeError, ValueError):
            raise SystemExit(f"« Monstres » ligne {i} ({iid}) : pv/attaque/xp/vitesse illisible.")
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
