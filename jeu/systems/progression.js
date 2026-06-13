// La progression du héros : XP gagnée en combat → niveaux → points de talent.
//
// Séparation de design (décidée le 13/06/2026) : l'ÉQUIPEMENT définit les CARTES
// (le deck), l'ARBRE DE TALENTS définit les CHIFFRES (vie, Chaleur, vitesse…).
// On gagne des points de talent en montant de niveau, et le niveau monte avec
// l'XP des ennemis vaincus.

const XP_BASE = 15;   // XP pour passer du niveau 1 au niveau 2
const XP_PAS = 10;    // +10 d'XP requis à chaque niveau suivant

// XP nécessaire pour passer DU niveau `niveau` au suivant.
export function xpPourNiveau(niveau) {
  return XP_BASE + (Math.max(1, niveau) - 1) * XP_PAS;
}

// Ajoute `montant` d'XP au héros et gère les montées de niveau (1 point de
// talent par niveau gagné). Renvoie le nombre de niveaux gagnés.
export function gagnerXp(heros, montant) {
  heros.xp += Math.max(0, Math.floor(montant) || 0);
  let niveaux = 0;
  while (heros.xp >= xpPourNiveau(heros.niveau)) {
    heros.xp -= xpPourNiveau(heros.niveau);
    heros.niveau += 1;
    heros.pointsTalent += 1;
    niveaux += 1;
  }
  return niveaux;
}
