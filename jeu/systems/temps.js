// LE CYCLE JOUR / NUIT de Brütàl — logique pure, aucune UI ici.
//
// Le temps de la cité avance sur l'horloge de JEU ACTIF (exploration + combat),
// la même que le marché et les bâtiments : les menus et écrans la figent.
// (Seule exception : l'écran bâtiment, cf. principal.js.)
//
// Décision Brioche (07/07/2026) :
//   - une JOURNÉE  = 1 h    de jeu actif (3600 s)
//   - une NUIT     = 30 min de jeu actif (1800 s)
//   → un cycle complet = 1 h 30 (5400 s).
//
// LA VENTE AUX ENCHÈRES a lieu à la TOMBÉE DU SOIR (fin de journée), une fois
// par cycle. Il faut être là UN PEU AVANT : les inscriptions (ticket d'entrée)
// ouvrent en fin d'après-midi et ferment quand la cloche sonne. Raté = tant pis,
// prochaine vente au cycle suivant.

// ----- Réglages --------------------------------------------------------------

export const DUREE_JOUR = 3600;   // s de jeu actif
export const DUREE_NUIT = 1800;   // s de jeu actif
export const DUREE_CYCLE = DUREE_JOUR + DUREE_NUIT;

// Fenêtre d'INSCRIPTION à l'enchère : les X dernières secondes de la journée
// (le commissaire vend les tickets), puis la cloche sonne à la tombée du soir.
export const FENETRE_INSCRIPTION = 600; // 10 min de jeu avant la cloche

// ----- État ------------------------------------------------------------------

export function creerTemps() {
  return {
    total: 0, // s de jeu actif cumulées depuis le début de la partie
  };
}

// Avance le temps de `dt` s de JEU ACTIF. Renvoie les événements de bascule
// de ce tick, pour que l'UI annonce le moment :
//   { type: "soir" }  → la journée se termine (cloche des enchères !)
//   { type: "aube" }  → la nuit se termine (un nouveau jour commence)
export function tickTemps(temps, dt) {
  const evts = [];
  const avant = temps.total;
  temps.total += dt;
  const cycleAvant = Math.floor(avant / DUREE_CYCLE);
  const cycleApres = Math.floor(temps.total / DUREE_CYCLE);
  // Bascule jour→nuit : on franchit la borne DUREE_JOUR à l'intérieur d'un cycle.
  const posAvant = avant - cycleAvant * DUREE_CYCLE;
  const posApres = temps.total - cycleApres * DUREE_CYCLE;
  if (cycleApres > cycleAvant) {
    // On a changé de cycle : une aube est passée (et peut-être un soir avant elle).
    if (posAvant < DUREE_JOUR) evts.push({ type: "soir" });
    evts.push({ type: "aube" });
    if (posApres >= DUREE_JOUR) evts.push({ type: "soir" });
  } else if (posAvant < DUREE_JOUR && posApres >= DUREE_JOUR) {
    evts.push({ type: "soir" });
  }
  return evts;
}

// ----- Lectures ----------------------------------------------------------------

// Position dans le cycle courant (0 .. DUREE_CYCLE).
export function positionCycle(temps) {
  return temps.total % DUREE_CYCLE;
}

// Numéro du jour courant (jour 1 = premier cycle).
export function numeroJour(temps) {
  return Math.floor(temps.total / DUREE_CYCLE) + 1;
}

// "jour" ou "nuit".
export function phase(temps) {
  return positionCycle(temps) < DUREE_JOUR ? "jour" : "nuit";
}

// Secondes de jeu actif avant la prochaine tombée du soir (= la prochaine cloche).
export function tempsAvantSoir(temps) {
  const pos = positionCycle(temps);
  return pos < DUREE_JOUR ? DUREE_JOUR - pos : DUREE_CYCLE - pos + DUREE_JOUR;
}

// Sommes-nous dans la fenêtre d'inscription (fin d'après-midi) ?
export function enFenetreInscription(temps) {
  const pos = positionCycle(temps);
  return pos >= DUREE_JOUR - FENETRE_INSCRIPTION && pos < DUREE_JOUR;
}

// ----- Sauvegarde ----------------------------------------------------------------

export function etatTemps(temps) {
  return { total: temps.total };
}

export function chargerTemps(temps, etat) {
  temps.total = Number.isFinite(etat?.total) && etat.total >= 0 ? etat.total : 0;
}
