// Logique pure du CRAFT (aucune UI ici) : reconnaître le motif posé sur la table
// et en déduire la recette. Rangé à part pour garder le craft isolé.

import { RECETTES } from "../data/recettes.js";

// Marqueur touché dans le mini-jeu → qualité de forge. Raté (hors marqueurs) =
// « normale » (cf. le choix : on forge quand même, sans bonus).
export const QUALITE_PAR_MARQUEUR = {
  grand: "artisan",
  moyen: "maitre",
  petit: "exceptionnel",
  rate: "normale",
};

// Réduit une grille 2D (ids ou null) à sa BOÎTE ENGLOBANTE (lignes/colonnes non
// vides). Ainsi la position sur la table n'a pas d'importance, seule la forme.
// Renvoie null si la grille est entièrement vide.
function recadrer(grille) {
  let rMin = Infinity, rMax = -1, cMin = Infinity, cMax = -1;
  for (let r = 0; r < grille.length; r++) {
    for (let c = 0; c < grille[r].length; c++) {
      if (grille[r][c]) {
        rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
        cMin = Math.min(cMin, c); cMax = Math.max(cMax, c);
      }
    }
  }
  if (rMax < 0) return null;
  const out = [];
  for (let r = rMin; r <= rMax; r++) {
    const ligne = [];
    for (let c = cMin; c <= cMax; c++) ligne.push(grille[r][c] ?? null);
    out.push(ligne);
  }
  return out;
}

// Transforme une recette (forme + légende) en grille 2D d'ids (null = case vide).
function motifRecette(recette) {
  return recette.forme.map((ligne) =>
    [...ligne].map((ch) => (ch === "." ? null : recette.legende[ch] ?? null)));
}

// Deux grilles DÉJÀ recadrées ont-elles exactement le même motif ?
function memeMotif(a, b) {
  if (a.length !== b.length || a[0].length !== b[0].length) return false;
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if ((a[r][c] ?? null) !== (b[r][c] ?? null)) return false;
    }
  }
  return true;
}

// Cherche la recette correspondant à la grille de la table (tableau 2D d'ids/null,
// typiquement 5×5). Style Minecraft : la forme compte, pas la position ; aucun
// ingrédient parasite toléré (la boîte englobante doit matcher pile). Renvoie la
// recette (objet avec `resultat`) ou null.
export function trouverRecette(grille) {
  const pose = recadrer(grille);
  if (!pose) return null;
  for (const recette of RECETTES) {
    if (memeMotif(pose, recadrer(motifRecette(recette)))) return recette;
  }
  return null;
}

// Liste des ingrédients (ids) présents sur la grille — à CONSOMMER après un craft
// réussi. Un id par case occupée.
export function ingredientsPoses(grille) {
  const ids = [];
  for (const ligne of grille) for (const cell of ligne) if (cell) ids.push(cell);
  return ids;
}
