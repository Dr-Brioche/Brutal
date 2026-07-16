// LES PROFONDEURS COMME UN « RUN » (logique pure — décision Brioche 09/07/2026).
//
// Idée : à chaque DESCENTE (passage `>` vers un étage plus profond ; PAS à
// l'entrée de la mine), on choisit UN loot parmi 2 (ou plus, avec le talent).
// L'étage 1 (entrée) ne donne rien : le run part « vide ». Ce sont des BUFFS qui
// s'ACCUMULENT toute la descente et disparaissent quand on ressort. C'est ce qui
// donne le « sentiment de run » : plus on descend, plus on est fort, mais tout est
// perdu au retour (sauf l'or, versé seulement si on sort VIVANT).
//
// Le CONTENU (types de loot + valeurs par rareté + chances) vient de l'Excel
// (cf. data/profondeur.js, régénéré par outils/importer_profondeur.py) — Brioche
// ajoute des loots au fil du temps sans toucher à ce fichier.

import { LOOTS_PROFONDEUR, CHANCES_RARETE_PROFONDEUR } from "../data/profondeur.js";

// Rareté d'un loot : nom affiché + couleur (comme les objets).
export const RARETES_PROFONDEUR = {
  normale: { nom: "Common", couleur: "#c9c4b8" },
  rare:    { nom: "Rare",   couleur: "#3f7fd0" },
  epique:  { nom: "Epic",   couleur: "#a24ad0" },
};

// ----- État du run ------------------------------------------------------------
// Les CLÉS (force/gold/celerite/armure) sont exactement les `effet` de l'Excel :
// appliquer un loot = additionner sa valeur sur la clé de même nom.
export function creerRunProfondeur() {
  return { force: 0, gold: 0, celerite: 0, armure: 0, agilite: 0, etages: 0 };
}

// A-t-on au moins un buff actif (pour l'afficher au HUD) ?
export function runActif(run) {
  return Boolean(run) && (run.force || run.gold || run.celerite || run.armure || run.agilite);
}

// ----- Tirages ----------------------------------------------------------------

// Tire une rareté selon les chances de l'Excel (normale 70 % / rare 25 % / épique 5 %).
export function tirerRarete(rng = Math.random) {
  const r = rng();
  let cumul = 0;
  for (const rar of ["normale", "rare", "epique"]) {
    cumul += CHANCES_RARETE_PROFONDEUR[rar] ?? 0;
    if (r < cumul) return rar;
  }
  return "normale"; // filet (si les chances ne somment pas à 1)
}

// Tire UN loot (type au hasard + rareté au hasard) pour un emplacement de choix.
export function tirerLoot(rng = Math.random) {
  // On re-tire tant que le butin n'existe pas à la rareté tirée (valeur `null` = « / »
  // dans l'Excel : ex. « Wave of Calm » n'apparaît qu'en épique).
  for (let essai = 0; essai < 30; essai++) {
    const def = LOOTS_PROFONDEUR[Math.floor(rng() * LOOTS_PROFONDEUR.length)];
    const rarete = tirerRarete(rng);
    const valeur = def.valeurs[rarete];
    if (valeur == null) continue;
    return { id: def.id, nom: def.nom, effet: def.effet, icone: def.icone, rarete, valeur };
  }
  const def = LOOTS_PROFONDEUR[0]; // filet
  return { id: def.id, nom: def.nom, effet: def.effet, icone: def.icone, rarete: "normale", valeur: def.valeurs.normale };
}

// Génère N choix (ils peuvent se répéter — c'est voulu).
export function tirerChoix(n, rng = Math.random) {
  return Array.from({ length: Math.max(1, n) }, () => tirerLoot(rng));
}

// ----- Application ------------------------------------------------------------

// Ajoute le loot choisi au run (accumulation). Incrémente le compteur d'étages.
export function appliquerLoot(run, loot) {
  if (!run || !loot) return run;
  run[loot.effet] = (run[loot.effet] ?? 0) + loot.valeur;
  return run;
}

// Marque un étage franchi (pour l'info / le HUD), même si on n'ajoute rien.
export function etageSuivant(run) {
  if (run) run.etages = (run.etages ?? 0) + 1;
  return run;
}

// Bonus de COMBAT dérivés du run (branchés dans demarrerCombat).
//   force   → forcePerm (dégâts bonus permanents tout le combat)
//   celerite→ celeritePct (% de vitesse d'initiative)
//   armure  → armureDepart (Pierre au début du combat)
export function bonusCombatRun(run) {
  if (!run) return { forcePerm: 0, celeritePct: 0, armureDepart: 0, agilite: 0 };
  return {
    forcePerm: run.force || 0,
    celeritePct: run.celerite || 0,
    armureDepart: run.armure || 0,
    agilite: run.agilite || 0,
  };
}

// Résumé lisible des buffs actifs (pour le HUD), dans l'ordre force/célérité/armure/or.
export function resumeRun(run) {
  if (!run) return [];
  const out = [];
  if (run.force) out.push({ icone: "💪", texte: `+${run.force}`, tip: `+${run.force} Force in combat` });
  if (run.celerite) out.push({ icone: "⚡", texte: `+${run.celerite}%`, tip: `+${run.celerite}% combat speed` });
  if (run.agilite) out.push({ icone: "⚡", texte: `+${run.agilite}`, tip: `+${run.agilite} Agility in combat` });
  if (run.armure) out.push({ icone: "🛡", texte: `+${run.armure}`, tip: `+${run.armure} armor at combat start` });
  if (run.gold) out.push({ icone: "🪙", texte: `+${run.gold}`, tip: `+${run.gold} gold — paid only if you leave the mine alive` });
  return out;
}
