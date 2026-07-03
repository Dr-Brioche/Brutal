// Logique pure du CRAFT (aucune UI ici) : reconnaître le motif posé sur la table
// et en déduire la recette. Rangé à part pour garder le craft isolé.

import { RECETTES } from "../data/recettes.js";

// Résultat d'une FRAPPE du mini-jeu → qualité de forge (ou rien).
//   petit  → exceptionnel (+3)   moyen → maitre (+2)   grand → artisan (+1)
//   orange (raté simple) → normale (objet créé, sans bonus)
//   rouge  (raté EXTRÊME, aux extrémités) → PAS d'objet (composants perdus)
export const QUALITE_PAR_MARQUEUR = {
  petit: "exceptionnel",
  moyen: "maitre",
  grand: "artisan",
  orange: "normale",
  // "rouge" absent volontairement → resoudre = pas d'objet.
};

// Géométrie du mini-jeu, en position NORMALISÉE le long de la jauge (0 = gauche,
// 1 = droite). ROUGE = largeur de chaque zone rouge aux extrémités ; H* = DEMI-
// largeur de chaque bande du marqueur (grand/moyen/petit), concentriques.
// HG (grand/vert, Artisan) = large ; HM (moyen/bleu, Master) = moyen ; HP
// (petit/or, Exceptional) = TRÈS fin. Difficulté croissante vers le centre.
export const MJ = { ROUGE: 0.10, HG: 0.145, HM: 0.045, HP: 0.008 };

// Où est le marqueur (son centre) ? Au hasard, mais assez au centre pour que même
// sa plus GRANDE bande ne touche pas les zones rouges. `alea` ∈ [0,1[ (injectable
// pour les tests). Renvoie le centre normalisé.
export function centreMarqueur(alea) {
  const min = MJ.ROUGE + MJ.HG, max = 1 - MJ.ROUGE - MJ.HG;
  return min + alea * (max - min);
}

// Frappe validée en `x` (position du curseur, 0..1) alors que le marqueur est
// centré en `centre` → renvoie "petit"|"moyen"|"grand"|"orange"|"rouge".
export function outcomeFrappe(x, centre) {
  const d = Math.abs(x - centre);
  if (d <= MJ.HP) return "petit";
  if (d <= MJ.HM) return "moyen";
  if (d <= MJ.HG) return "grand";
  if (x < MJ.ROUGE || x > 1 - MJ.ROUGE) return "rouge";
  return "orange";
}

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
