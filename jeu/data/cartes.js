// Catalogue des cartes de combat (contenu pur, sans logique).
//
// Chaque carte décrit SES EFFETS de façon déclarative ; c'est le moteur de
// combat (jeu/systems/combat.js) qui les applique. Ajouter une carte = ajouter
// une entrée ici. Les noms/textes sont en anglais (langue du jeu).
//
// Champs d'une carte :
//   id     : identifiant interne (référencé par les armes, le deck…)
//   nom    : nom affiché sur la carte
//   cout   : Chaleur de Forge dépensée pour la jouer (0 = gratuite)
//   type   : "attaque" ou "defense" (sert juste à la couleur de la carte)
//   texte  : description affichée au joueur
//   image  : (optionnel) PNG illustrant TOUTE la carte. S'il est présent, on
//            n'affiche par-dessus que le COÛT (un chiffre, pour qu'il puisse
//            changer si un effet le réduit). Sans image : rectangle + texte.
//            Ranger les illustrations dans images/cartes/ (nommées comme l'id).
//   effets : liste d'effets appliqués dans l'ordre, chacun { type, valeur }
//            - "degats" : retire `valeur` PV à l'ennemi
//            - "pierre" : ajoute `valeur` de défense "Pierre" au héros
//            - "poison" : ajoute `valeur` de Poison à l'ennemi (dégâts/tour qui
//                         baissent de 1 par tour, ignorent la Pierre)

export const CARTES = {
  // ---- Deck de base commun : cartes à 0 Chaleur, mais FAIBLES --------------
  // Elles évitent les tours vides quand la Chaleur est basse (+1/tour seulement).
  // Les cartes fortes, elles, coûtent de la Chaleur et viennent de l'équipement.
  "coup-faible": {
    id: "coup-faible",
    nom: "Tap",
    cout: 0,
    type: "attaque",
    texte: "Deal 3 damage.",
    effets: [{ type: "degats", valeur: 3 }],
  },
  "garde-faible": {
    id: "garde-faible",
    nom: "Brace",
    cout: 0,
    type: "defense",
    texte: "Gain 3 Stone.",
    effets: [{ type: "pierre", valeur: 3 }],
  },

  // ---- Cartes plus fortes : elles COÛTENT de la Chaleur --------------------
  // « Strike » et « Guard » sont prêtes à être données par l'équipement plus
  // tard (armure, runes, gemmes…) — le deck est le miroir de l'équipement.
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

  // ---- Cartes signature d'arme (une par arme) -----------------------------
  // Équiper l'arme injecte sa carte dans le deck (voir jeu/data/armes.js).

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

  // Croc de basilic : morsure venimeuse → un peu de dégâts + du Poison qui
  // ronge l'ennemi sur la durée.
  "coup-venimeux": {
    id: "coup-venimeux",
    nom: "Venom Stab",
    cout: 1,
    type: "attaque",
    texte: "Deal 4 damage. Apply 4 Poison.",
    effets: [{ type: "degats", valeur: 4 }, { type: "poison", valeur: 4 }],
  },
};
