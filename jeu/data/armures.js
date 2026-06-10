// Bibliothèque des sets d'armure : les stats + le sprite complet du héros.
//
// Règle du concept : une armure est un SET complet qui change le skin
// global du nain (pas pièce par pièce). Chaque set = une planche entière.
// Valeurs provisoires : l'équilibrage viendra avec le pilier combat.

export const ARMURES = [
  {
    id: "tenue-de-voyageur",
    nom: "Traveler's Garb",
    defense: 0,
    planche: "images/heros/nain.png",
  },
  {
    id: "plate-onyx",
    nom: "Onyx Guard Plate",     // clin d'œil à la faction Onyx-Guardians
    defense: 5,
    planche: "images/heros/nain-onyx.png",
  },
  {
    id: "maille-de-forge",
    nom: "Forgemaster's Mail",   // clin d'œil à la faction Rune-Awakener
    defense: 3,
    planche: "images/heros/nain-forge.png",
  },
];
