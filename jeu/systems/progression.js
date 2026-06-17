// La progression du héros : XP gagnée en combat → niveaux → points de talent.
//
// Séparation de design (décidée le 13/06/2026) : l'ÉQUIPEMENT définit les CARTES
// (le deck), l'ARBRE DE TALENTS définit les CHIFFRES (vie, Chaleur, vitesse…).
// On gagne des points de talent en montant de niveau, et le niveau monte avec
// l'XP des ennemis vaincus.

// Seuils XP pour passer du niveau N au niveau N+1.
//
// Niveaux 1-3 → montée rapide (mais tjrs plus lente qu'avant) : le joueur
// sent la progression dès les premiers combats.
// Niveau 4+ → croissance exponentielle : chaque level up est un GRAND événement.
//
// Calibrage (~15 XP par combat en Eastern Under-tunnels) :
//   1→2 :   35 XP ≈  2-3 combats
//   2→3 :   80 XP ≈  5-6 combats
//   3→4 :  160 XP ≈  11 combats  (transition)
//   4→5 :  500 XP ≈  33 combats  ← chute drastique (×3)
//   5→6 : 1100 XP ≈  73 combats
//   6→7 : 2200 XP ≈ 147 combats
//   7→8 : 4400 XP ≈ 293 combats
//   8+  : ×2 à chaque niveau suivant
const SEUILS_XP = [35, 80, 160, 500, 1100, 2200, 4400];

// XP nécessaire pour passer DU niveau `niveau` au suivant.
export function xpPourNiveau(niveau) {
  const i = Math.max(1, niveau) - 1; // index 0-based dans la table
  if (i < SEUILS_XP.length) return SEUILS_XP[i];
  // Au-delà de la table : double à chaque niveau.
  return SEUILS_XP[SEUILS_XP.length - 1] * Math.pow(2, i - SEUILS_XP.length + 1);
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
    heros.pv = heros.pvMax; // monter de niveau = soins complets
  }
  return niveaux;
}
