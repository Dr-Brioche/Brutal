#!/usr/bin/env python3
# Écrit, à côté de chaque carte de l'onglet « Cartes », un RÉSUMÉ D'ÉQUILIBRAGE :
# la valeur-cible à viser d'après le « Tableau de référence » (onglet « Lisez-moi »,
# édité par Brioche). Exemple : une carte d'ATTAQUE Rare qui coûte 3 → 3×12 = 36
# dégâts visés. Une carte de DÉFENSE utilise la colonne « Armure / énergie ».
#
# La cible est calculée automatiquement à partir de :
#   coût (Chaleur) × (dégât OU armure par énergie selon la rareté), ×1,5 si la carte
#   ne vient QUE d'armes à deux mains (règle du tableau de référence).
#
# Re-lançable à volonté (idempotent) : relance-le après avoir changé le tableau de
# référence pour rafraîchir toutes les cibles.
#   python3 outils/resumer_cartes.py
#
# Dépendances : node (pour lire la liste des armes 2 mains) + openpyxl.

import json, os, subprocess
import openpyxl
from openpyxl.styles import Font, Alignment
from openpyxl.comments import Comment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "docs", "BRUTAL-items-et-cartes.xlsx")
ENTETE_CIBLE = "Cible (barème)"


def armes_deux_mains():
    """Noms (anglais) des armes à DEUX MAINS, lus dans le code réel (items.js)."""
    code = (
        'import { ITEMS } from "./jeu/data/items.js";'
        'const n = Object.values(ITEMS).filter(i => i.mains === 2).map(i => i.nom);'
        'process.stdout.write(JSON.stringify(n));'
    )
    out = subprocess.check_output(["node", "--input-type=module", "-e", code], cwd=ROOT)
    return set(json.loads(out))


def lire_bareme(ws):
    """Lit le tableau de référence (rareté → dégât/énergie, armure/énergie)."""
    entete = None
    for r in range(1, ws.max_row + 1):
        if ws.cell(r, 1).value == "Rareté" and ws.cell(r, 3).value and "gât" in str(ws.cell(r, 3).value):
            entete = r
            break
    if entete is None:
        raise SystemExit("Tableau de référence introuvable dans « Lisez-moi ».")
    bareme = {}
    r = entete + 1
    while r <= ws.max_row and ws.cell(r, 1).value in ("Common", "Uncommon", "Rare", "Epic", "Legendary"):
        rarete = ws.cell(r, 1).value
        bareme[rarete] = {"degat": ws.cell(r, 3).value, "armure": ws.cell(r, 4).value}
        r += 1
    return bareme


def entetes_cartes(ws):
    """Trouve la ligne d'en-tête (« Famille … ») et l'index des colonnes utiles."""
    for r in range(1, ws.max_row + 1):
        if ws.cell(r, 1).value == "Famille":
            noms = {ws.cell(r, c).value: c for c in range(1, ws.max_column + 2) if ws.cell(r, c).value}
            return r, noms
    raise SystemExit("En-tête « Famille » introuvable dans l'onglet « Cartes ».")


def est_deux_mains(donnee_par, armes2m):
    """Vrai si la carte n'est fournie QUE par des armes à deux mains."""
    if not donnee_par or donnee_par.strip().startswith("—"):
        return False
    sources = [s.strip() for s in donnee_par.split(",") if s.strip()]
    return bool(sources) and all(s in armes2m for s in sources)


def num(v):
    """Formatage compact : 36 et non 36.0 ; 1,5 avec virgule décimale (français)."""
    if v == int(v):
        return str(int(v))
    return ("%g" % v).replace(".", ",")


def cible(cout, type_, rarete, deux_mains, bareme):
    """Le texte-résumé pour une carte (ou '' si hors barème)."""
    if rarete not in bareme:
        return "deck de base — hors barème"
    if not isinstance(cout, (int, float)):
        return ""
    if cout == 0:
        return "gratuite (0 énergie) — hors barème"
    mult = 1.5 if deux_mains else 1
    suffixe = "×1,5" if deux_mains else ""
    if type_ == "Attaque":
        base = bareme[rarete]["degat"]
        return f"≈ {num(cout * base * mult)} dégâts  ({cout}×{num(base)}{suffixe})"
    if type_ == "Defense":
        base = bareme[rarete]["armure"]
        return f"≈ {num(cout * base * mult)} armure  ({cout}×{num(base)}{suffixe})"
    return "hors barème (buff)"


def main():
    armes2m = armes_deux_mains()
    wb = openpyxl.load_workbook(XLSX)
    bareme = lire_bareme(wb["Lisez-moi"])
    ws = wb["Cartes"]
    ligne_entete, cols = entetes_cartes(ws)

    # Colonne de sortie : réutilise « Cible (barème) » si déjà présente, sinon en ajoute une.
    col_cible = cols.get(ENTETE_CIBLE) or (max(cols.values()) + 1)
    c = ws.cell(ligne_entete, col_cible, ENTETE_CIBLE)
    c.font = Font(bold=True)
    c.comment = Comment(
        "Cible d'équilibrage calculée automatiquement (outils/resumer_cartes.py) :\n"
        "coût × (dégât ou armure par énergie selon la rareté, tableau « Lisez-moi »),\n"
        "×1,5 pour une carte fournie uniquement par des armes à deux mains.\n"
        "Ajuste l'effet de la carte pour t'en approcher (un peu au-dessus / en dessous, au choix).",
        "BRUTAL",
    )
    ws.column_dimensions[ws.cell(1, col_cible).column_letter].width = 26

    n = 0
    for r in range(ligne_entete + 1, ws.max_row + 1):
        idc = ws.cell(r, cols["ID"]).value
        if not idc:
            continue  # ligne séparatrice (« ▸ … ») ou vide
        cout = ws.cell(r, cols["Coût"]).value
        type_ = ws.cell(r, cols["Type"]).value
        rarete = ws.cell(r, cols["Rareté"]).value
        donnee = ws.cell(r, cols["Donnée par"]).value
        txt = cible(cout, type_, rarete, est_deux_mains(donnee, armes2m), bareme)
        cell = ws.cell(r, col_cible, txt)
        cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        n += 1

    wb.save(XLSX)
    print(f"{n} cartes résumées · colonne « {ENTETE_CIBLE} » (barème lu : {', '.join(bareme)}).")


if __name__ == "__main__":
    main()
