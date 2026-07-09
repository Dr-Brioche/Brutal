# -*- coding: utf-8 -*-
"""
IMPORTER LA VALEUR DES OBJETS  (Excel  ->  jeu/data/valeurs.js)
==============================================================

Brioche fixe la VALEUR de chaque objet (sa valeur de référence, ≈ prix d'achat)
dans le classeur — la SOURCE :

    docs/BRUTAL-items-et-cartes.xlsx  ->  onglet « Valeurs »

Puis on lance ce script pour régénérer la table lue par le jeu :

    python3 outils/importer_valeurs.py

Le script réécrit UNIQUEMENT le bloc balisé de jeu/data/valeurs.js :

    // <<VALEURS-AUTO>>   ...généré...   // <<FIN-VALEURS-AUTO>>

RÈGLE (cf. docs/concept.md « Valeur des objets ») : la valeur est LIBRE (Brioche
l'ajuste à la main), mais elle a été semée autour d'une cible par rareté
(Common 400 · Uncommon 2 000 · Rare 10 000 · Epic 80 000 · Legendary 250 000)
avec ± 20 % de variation pour que deux objets ne vaillent pas pile pareil. Le
PRIX DE VENTE (au marchand / à l'HV) en découle automatiquement dans le jeu
(−20 à −30 %) ; ici on ne touche QUE la valeur de référence.

Format de l'onglet « Valeurs » : une ligne d'en-tête, puis une ligne par objet :
    colonne A = id · B = nom (info) · C = rareté (info) · D = VALEUR (éditable)
Seules les colonnes A (id) et D (valeur) sont lues ; B et C sont décoratives.
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
VALEURS_JS = RACINE / "jeu" / "data" / "valeurs.js"
ITEMS_JS = RACINE / "jeu" / "data" / "items.js"

DEBUT = "// <<VALEURS-AUTO>>"
FIN = "// <<FIN-VALEURS-AUTO>>"


def ids_items_connus():
    txt = ITEMS_JS.read_text(encoding="utf-8")
    return set(re.findall(r'"([a-z0-9-]+)":\s*\{\s*id:', txt))


def lire_valeurs():
    wb = load_workbook(XLSX, data_only=True)
    if "Valeurs" not in wb.sheetnames:
        raise SystemExit("L'onglet « Valeurs » est introuvable dans le classeur.")
    ws = wb["Valeurs"]
    lignes = list(ws.iter_rows(values_only=True))
    valeurs = []
    for i, ligne in enumerate(lignes):
        if not ligne:
            continue
        iid = str(ligne[0]).strip() if ligne[0] else ""
        # On ne retient QUE les lignes dont la colonne A est un id valide
        # (minuscules/chiffres/tirets) — ça saute titres, lignes vides. La
        # ligne d'en-tête (« id ») est aussi écartée.
        if iid == "id" or not re.fullmatch(r"[a-z0-9-]+", iid):
            continue
        brut = ligne[3] if len(ligne) > 3 else None  # colonne D
        if brut is None or str(brut).strip() == "":
            raise SystemExit(f"Ligne {i + 1} : « {iid} » n'a pas de valeur (colonne D).")
        try:
            val = int(round(float(brut)))
        except (TypeError, ValueError):
            raise SystemExit(f"Ligne {i + 1} : valeur illisible pour « {iid} » : {brut!r}.")
        if val < 1:
            raise SystemExit(f"Ligne {i + 1} : valeur < 1 pour « {iid} ».")
        valeurs.append((iid, val))
    return valeurs


def main():
    connus = ids_items_connus()
    valeurs = lire_valeurs()
    if not valeurs:
        raise SystemExit("Aucune valeur trouvée dans l'onglet « Valeurs ».")

    vus = set()
    lignes_js = []
    for iid, val in valeurs:
        if iid in vus:
            raise SystemExit(f"Doublon d'id dans l'onglet « Valeurs » : « {iid} ».")
        vus.add(iid)
        if iid not in connus:
            print(f"  ! Attention : « {iid} » n'existe pas dans items.js (faute de frappe ?)",
                  file=sys.stderr)
        lignes_js.append(f'  "{iid}": {val},')

    contenu = VALEURS_JS.read_text(encoding="utf-8") if VALEURS_JS.exists() else ""
    if DEBUT not in contenu or FIN not in contenu:
        # (Re)crée le fichier de zéro avec l'entête + les balises.
        contenu = (
            "// Valeur de RÉFÉRENCE de chaque objet (≈ prix d'achat / valeur « trouvée »).\n"
            "// SOURCE ÉDITABLE : onglet « Valeurs » du classeur Excel — régénéré par\n"
            "// outils/importer_valeurs.py. NE PAS éditer le bloc auto à la main.\n"
            "// Le PRIX DE VENTE (marchand/HV) en découle dans le jeu (cf. data/items.js\n"
            "// et systems/marche.js) : −20 à −30 % de cette valeur.\n\n"
            f"{DEBUT}\n{FIN}\n"
        )

    genere = (
        f"{DEBUT}\n"
        "export const VALEUR_OBJET = {\n"
        + "\n".join(lignes_js)
        + "\n};\n"
        f"{FIN}"
    )
    avant = contenu.split(DEBUT)[0]
    apres = contenu.split(FIN)[1]
    VALEURS_JS.write_text(avant + genere + apres, encoding="utf-8")
    print(f"OK — {len(lignes_js)} valeurs écrites dans {VALEURS_JS.relative_to(RACINE)}.")


if __name__ == "__main__":
    main()
