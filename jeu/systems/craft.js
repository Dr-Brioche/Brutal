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

// Largeur des zones ROUGES (ratage extrême) selon la RARETÉ : plus l'objet est
// rare, plus les zones rouges aux extrémités sont larges → plus risqué de rater à
// l'extérieur du marqueur (décision Brioche). Uncommon = la largeur historique.
export const ROUGE_PAR_RARETE = {
  commun: 0.08, uncommon: 0.10, rare: 0.13, epique: 0.16, legendaire: 0.20,
};
export function rougeRarete(rarete) {
  return ROUGE_PAR_RARETE[rarete] ?? MJ.ROUGE;
}

// VITESSE DU CURSEUR selon la RARETÉ de l'objet forgé (ms pour un aller-retour) :
// plus l'objet est rare, plus le curseur file → plus dur d'attraper les petites
// bandes (décision Brioche 09/07/2026). Uncommon = la vitesse « historique ».
export const MJ_PERIODE = {
  commun: 1600,       // un peu plus lent
  uncommon: 1300,     // référence
  rare: 1000,         // plus rapide
  epique: 700,        // très rapide
  legendaire: 480,    // vraiment trop rapide
};

// L'AGILITÉ ralentit la barre du mini-jeu de forge : plus le nain est agile, plus
// le curseur va lentement → plus facile d'attraper les bandes. Le plafond garantit
// qu'un LÉGENDAIRE reste dur à réussir même avec beaucoup d'agilité (base 480 ms →
// 720 ms au max, toujours bien plus rapide qu'un commun). — décision Brioche.
//
// ⚠ Ne compte que l'agilité GAGNÉE (bottes + talents), pas la base du nain. Le pas
// est de 0,1 % par point depuis que l'agilité est passée sur l'échelle 100 : à
// +1 % par point, les toutes premières bottes (+10) valaient déjà l'ancien bonus
// maximum, et la paire d'onyx (+200) saturait le plafond d'un coup — toute la
// progression de cet axe disparaissait. Repères actuels : bottes usées (+10) →
// +1 %, bottes d'onyx (+200) → +20 %, tout l'arbre de talents en plus → ~34 %.
export const AGILITE_RALENTI = 0.001;      // +0,1 % de période par point d'agilité
export const AGILITE_RALENTI_MAX = 0.50;   // plafond : +50 % de période

// Facteur de ralentissement (0..0,50) apporté par une agilité donnée.
export function ralentiAgilite(agilite = 0) {
  return Math.min(AGILITE_RALENTI_MAX, AGILITE_RALENTI * Math.max(0, agilite));
}

// Période effective du mini-jeu pour une rareté + l'agilité TOTALE du héros.
export function periodeMiniJeu(rarete, agilite = 0) {
  const base = MJ_PERIODE[rarete] ?? MJ_PERIODE.uncommon;
  return Math.round(base * (1 + ralentiAgilite(agilite)));
}

// Où est le marqueur (son centre) ? Au hasard, mais assez au centre pour que même
// sa plus GRANDE bande ne touche pas les zones rouges. `alea` ∈ [0,1[ (injectable
// pour les tests). Renvoie le centre normalisé.
export function centreMarqueur(alea, rouge = MJ.ROUGE) {
  const min = rouge + MJ.HG, max = 1 - rouge - MJ.HG;
  return min + alea * (max - min);
}

// Frappe validée en `x` (position du curseur, 0..1) alors que le marqueur est
// centré en `centre` → renvoie "petit"|"moyen"|"grand"|"orange"|"rouge".
export function outcomeFrappe(x, centre, rouge = MJ.ROUGE) {
  const d = Math.abs(x - centre);
  if (d <= MJ.HP) return "petit";
  if (d <= MJ.HM) return "moyen";
  if (d <= MJ.HG) return "grand";
  if (x < rouge || x > 1 - rouge) return "rouge";
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
