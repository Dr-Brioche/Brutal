// ============================================================
//  RÉGLAGES GÉNÉRAUX — tous les chiffres d'équilibrage global.
//  C'est LE fichier à ouvrir pour rendre le jeu plus rapide,
//  plus dur ou plus riche. Les chiffres des unités, eux,
//  vivent dans ages.js.
// ============================================================

export const R = {
  // --- Taille logique de l'image (tout est dessiné là-dedans,
  //     puis mis à l'échelle pour remplir l'écran).
  largeur: 1280,
  hauteur: 720,

  // --- Le terrain
  solY: 545,               // hauteur de la ligne de sol (les pieds des unités)
  chateauJoueurX: 118,     // centre du château du joueur (à gauche)
  chateauEnnemiX: 1162,    // centre du château ennemi (à droite)
  chateauLargeur: 124,
  chateauHauteur: 186,
  pvChateau: 1600,         // points de vie d'un château

  // --- L'économie
  orDepart: 220,           // or au début de la partie
  revenuBase: 3.0,         // or par seconde, niveau 0
  revenuPas: 1.6,          // or par seconde gagné à chaque niveau
  revenuCout: 80,          // prix du 1er niveau de revenu
  revenuMult: 1.42,        // le prix est multiplié par ça à chaque niveau
  revenuMax: 12,           // niveau maximum

  // --- La file d'entraînement
  fileMax: 5,              // nombre d'unités qu'on peut mettre en attente

  // --- Le combat
  ecart: 8,                // espace laissé entre deux alliés qui se suivent
  degatsChateauMult: 1,    // multiplicateur de dégâts contre un château
  soinEvolution: 0.12,     // le château se répare de 12 % quand on change d'âge

  // --- L'adversaire (ordinateur)
  ia: {
    reflexion: 0.7,        // secondes entre deux décisions
    facile:    { revenu: 0.75, agressivite: 0.7 },
    normal:    { revenu: 1.0,  agressivite: 1.0 },
    difficile: { revenu: 1.35, agressivite: 1.3 },
  },
};

// Prix du prochain niveau de revenu pour un camp donné.
export function coutRevenu(camp) {
  if (camp.revenuNiveau >= R.revenuMax) return Infinity;
  return Math.round(R.revenuCout * Math.pow(R.revenuMult, camp.revenuNiveau));
}

// Or par seconde d'un camp.
export function revenuDe(camp) {
  return (R.revenuBase + camp.revenuNiveau * R.revenuPas) * (camp.bonusRevenu || 1);
}
