// Loots de PROFONDEUR (buffs de « run ») régénérés par
// outils/importer_profondeur.py depuis le classeur Excel
// (onglets « Profondeurs » = table, « Profondeurs-chances » = probabilités).
// NE PAS éditer le bloc auto à la main — passer par l'Excel.

// <<PROFONDEUR-AUTO>>
export const LOOTS_PROFONDEUR = [
  { id: "pierre-force", nom: "Strength Stone", effet: "force", icone: "#d9542a", valeurs: { normale: 1, rare: 2, epique: 3 } },
  { id: "tresor-gold", nom: "Gold Hoard", effet: "gold", icone: "#e0b64e", valeurs: { normale: 100, rare: 200, epique: 500 } },
  { id: "pierre-celerite", nom: "Agility Stone", effet: "agilite", icone: "#5fb0e8", valeurs: { normale: 1, rare: 2, epique: 4 } },
  { id: "plaque-renforcement", nom: "Reinforcement Plate", effet: "armure", icone: "#9cd3ff", valeurs: { normale: 10, rare: 20, epique: 50 } },
  { id: "portail-profondeur", nom: "Depth Portal", effet: "porte", icone: "#5fd08a", valeurs: { normale: 1, rare: 1, epique: 1 } },
  { id: "poussiere-rubis", nom: "Ruby Dust", effet: "soin", icone: "#e0555f", valeurs: { normale: 20, rare: 40, epique: 80 } },
];

// Chance de tirer chaque rareté à CHAQUE choix (somme = 1).
export const CHANCES_RARETE_PROFONDEUR = {
  normale: 0.7,
  rare: 0.25,
  epique: 0.05,
};
// <<FIN-PROFONDEUR-AUTO>>
