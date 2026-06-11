// Les rencontres aléatoires : des monstres invisibles rôdent sur les tuiles
// dangereuses (celles marquées `rencontre` dans le catalogue jeu/data/tuiles.js).
// À chaque NOUVELLE tuile dangereuse traversée, une chance de déclencher un
// combat (flash d'écran façon FF9).
//
import { estRencontre } from "../data/tuiles.js";

// ----- Réglages (équilibrage) ---------------------------------------------
// La sensation de jeu se règle presque entièrement avec ces deux valeurs :
const PAS_DE_GRACE = 6;       // tuiles tranquilles après un combat (ou au départ)
const CHANCE_PAR_PAS = 0.08;  // 8 % de risque à chaque nouvelle tuile sauvage
// ---------------------------------------------------------------------------

export function creerRencontres() {
  return {
    derniereTuile: null,     // pour ne compter qu'une fois chaque tuile
    grace: PAS_DE_GRACE,     // pas encore de danger au début
  };
}

// À appeler à chaque image. Renvoie true si une rencontre se déclenche.
export function avancerRencontres(etat, tuile) {
  const cle = tuile.colonne + "," + tuile.ligne;
  if (cle === etat.derniereTuile) return false; // toujours sur la même tuile
  etat.derniereTuile = cle;

  if (!estRencontre(tuile.caractere)) return false; // tuile sûre (ville, porte…)

  if (etat.grace > 0) {
    etat.grace--;
    return false;
  }

  if (Math.random() < CHANCE_PAR_PAS) {
    etat.grace = PAS_DE_GRACE; // période tranquille avant le prochain danger
    return true;
  }
  return false;
}
