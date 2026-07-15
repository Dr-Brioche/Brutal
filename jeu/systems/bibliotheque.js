// LE LIVRE D'ARTISANAT — la bibliothèque des recettes DÉCOUVERTES (logique pure).
//
// Principe (décision Brioche 09/07/2026) : une recette n'apparaît dans le livre
// que si le joueur l'a APPRISE — soit en LISANT un parchemin de craft, soit en
// FABRIQUANT l'objet à la forge « par hasard » (en trouvant le bon motif). Le
// reste des recettes reste caché. C'est un savoir qui s'accumule.
//
// Le livre est RANGÉ par catégorie d'objet (la colonne « A » du classeur Excel :
// Arme / Arme à deux mains / Armure / Main seconde / Gant / Botte / Bague /
// Collier) — dérivée ici du résultat (categorie + mains), à l'identique du seed.

import { RECETTES } from "../data/recettes.js";
import { itemDef } from "../data/items.js";

// Catégorie d'une recette — libellés EN ANGLAIS (comme tout l'affichage du jeu),
// cohérents avec les onglets du marchand.
const LABEL = {
  bouclier: "Off-Hand", armure: "Armor", gant: "Gloves",
  botte: "Boots", bague: "Rings", collier: "Amulets",
};
export function categorieRecette(resultatId) {
  const d = itemDef(resultatId);
  if (!d) return "Other";
  if (d.categorie === "arme") return d.mains === 2 ? "Two-Handed Weapons" : "Weapons";
  return LABEL[d.categorie] ?? "Other";
}

// Ordre d'affichage des catégories dans le livre.
export const ORDRE_CATEGORIES = [
  "Weapons", "Two-Handed Weapons", "Off-Hand", "Armor",
  "Gloves", "Boots", "Rings", "Amulets", "Other",
];

const idsRecettes = () => new Set(RECETTES.map((r) => r.resultat));

// ----- État -------------------------------------------------------------------

export function creerBibliotheque() {
  return { connues: new Set() };
}

// Marque une recette comme apprise. Renvoie true si c'est une NOUVELLE découverte
// (pour prévenir le joueur « ✨ Recipe learned! »).
export function decouvrir(biblio, resultatId) {
  if (!resultatId || biblio.connues.has(resultatId)) return false;
  if (!idsRecettes().has(resultatId)) return false; // pas une vraie recette
  biblio.connues.add(resultatId);
  return true;
}

export function estConnue(biblio, resultatId) {
  return biblio.connues.has(resultatId);
}

// Nombre de recettes connues / total (pour un compteur « 12 / 118 »).
export function compteBibliotheque(biblio) {
  return { connues: biblio.connues.size, total: RECETTES.length };
}

// Les recettes connues, GROUPÉES par catégorie et triées pour l'affichage.
export function recettesParCategorie(biblio) {
  const groupes = {};
  for (const r of RECETTES) {
    if (!biblio.connues.has(r.resultat)) continue;
    const cat = categorieRecette(r.resultat);
    (groupes[cat] ??= []).push(r);
  }
  for (const cat of Object.keys(groupes)) {
    groupes[cat].sort((a, b) => (itemDef(a.resultat)?.nom ?? "").localeCompare(itemDef(b.resultat)?.nom ?? ""));
  }
  return ORDRE_CATEGORIES
    .filter((cat) => groupes[cat]?.length)
    .map((cat) => ({ categorie: cat, recettes: groupes[cat] }));
}

// ----- Sauvegarde -------------------------------------------------------------

export function etatBibliotheque(biblio) {
  return [...biblio.connues];
}

export function chargerBibliotheque(biblio, etat) {
  const valides = idsRecettes();
  biblio.connues = new Set(Array.isArray(etat) ? etat.filter((id) => valides.has(id)) : []);
}
