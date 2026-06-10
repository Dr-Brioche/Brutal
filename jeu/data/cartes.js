// Catalogue des cartes de combat (contenu pur, sans logique).
//
// Chaque carte décrit SES EFFETS de façon déclarative ; c'est le moteur de
// combat (jeu/systems/combat.js) qui les applique. Ajouter une carte = ajouter
// une entrée ici. Les noms/textes sont en anglais (langue du jeu).
//
// Champs d'une carte :
//   id     : identifiant interne (référencé par les armes, le deck…)
//   nom    : nom affiché sur la carte
//   cout   : Chaleur de Forge dépensée pour la jouer
//   type   : "attaque" ou "defense" (sert juste à la couleur de la carte)
//   texte  : description affichée au joueur
//   effets : liste d'effets appliqués dans l'ordre, chacun { type, valeur }
//            - "degats" : retire `valeur` PV à l'ennemi
//            - "pierre" : ajoute `valeur` de défense "Pierre" au héros

export const CARTES = {
  // ---- Deck de base (commun à tous) -------------------------------------
  "frappe": {
    id: "frappe",
    nom: "Strike",
    cout: 1,
    type: "attaque",
    texte: "Deal 6 damage.",
    effets: [{ type: "degats", valeur: 6 }],
  },
  "garde": {
    id: "garde",
    nom: "Guard",
    cout: 1,
    type: "defense",
    texte: "Gain 5 Stone.",
    effets: [{ type: "pierre", valeur: 5 }],
  },

  // ---- Cartes signature d'arme (une par arme) ---------------------------
  // « Le deck est le miroir de l'équipement » : équiper l'arme injecte sa
  // carte dans le deck (voir jeu/data/armes.js, champ `cartes`).

  // Hache : la plus brutale → un gros coup unique.
  "coup-de-hache": {
    id: "coup-de-hache",
    nom: "Rusty Cleave",
    cout: 2,
    type: "attaque",
    texte: "Deal 12 damage.",
    effets: [{ type: "degats", valeur: 12 }],
  },

  // Marteau de forge : frappe + renforce → dégâts ET un peu de Pierre.
  "ecrasement": {
    id: "ecrasement",
    nom: "Forge Smash",
    cout: 2,
    type: "attaque",
    texte: "Deal 8 damage. Gain 3 Stone.",
    effets: [{ type: "degats", valeur: 8 }, { type: "pierre", valeur: 3 }],
  },

  // Pioche de mineur : deux coups acharnés (thème « creuser »).
  "coup-de-pioche": {
    id: "coup-de-pioche",
    nom: "Pickaxe Jab",
    cout: 1,
    type: "attaque",
    texte: "Deal 3 damage twice.",
    effets: [{ type: "degats", valeur: 3 }, { type: "degats", valeur: 3 }],
  },
};
