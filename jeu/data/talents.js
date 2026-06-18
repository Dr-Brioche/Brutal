// L'arbre de talents : les NŒUDS (contenu pur). Chacun donne un bonus CHIFFRÉ
// au héros (vie, Chaleur, vitesse, pioche…). On les débloque avec des points de
// talent (gagnés en montant de niveau). L'équipement, lui, donne les CARTES.
//
// Champs d'un nœud :
//   id      : identifiant interne
//   nom     : nom affiché
//   x, y    : position dans la grille de l'écran (colonne, ligne)
//   cout    : points de talent pour le débloquer
//   requis  : ids des nœuds prérequis (tous doivent être débloqués)
//   rangMax : (optionnel) nombre de fois qu'on peut le prendre (défaut 1)
//   effet   : bonus appliqué, ex. { pvMax: 10 } ou { chaleurSeuil: 1 }
//
// Effets reconnus : pvMax, vitesse (déplacement), chaleurSeuil, chaleurMax,
// chaleurDepart, chaleurRecharge, pioche (cartes piochées par tour),
// agilite (vitesse d'attaque), evasion (% de rencontres en moins).

export const TALENTS = {
  racine:  { id: "racine",  nom: "Dwarf's Resolve", x: 2, y: 0, cout: 1, requis: [],         effet: { pvMax: 5 } },

  forge1:  { id: "forge1",  nom: "Stoked Coals",    x: 1, y: 1, cout: 1, requis: ["racine"],  effet: { chaleurSeuil: 1 } },
  corps1:  { id: "corps1",  nom: "Thick Hide",      x: 2, y: 1, cout: 1, requis: ["racine"],  effet: { pvMax: 10 } },
  esprit1: { id: "esprit1", nom: "Quick Wit",       x: 3, y: 1, cout: 1, requis: ["racine"],  effet: { pioche: 1 } },

  forge2:  { id: "forge2",  nom: "Deep Reserves",   x: 0, y: 2, cout: 1, requis: ["forge1"],  effet: { chaleurMax: 2 } },
  forge3:  { id: "forge3",  nom: "Ready Forge",     x: 1, y: 2, cout: 1, requis: ["forge1"],  effet: { chaleurDepart: 1 } },
  corps2:  { id: "corps2",  nom: "Ironheart",       x: 2, y: 2, cout: 1, requis: ["corps1"],  effet: { pvMax: 15 } },
  corps3:  { id: "corps3",  nom: "Light Step",      x: 3, y: 2, cout: 1, requis: ["corps1"],  effet: { vitesse: 30 } },
  esprit2: { id: "esprit2", nom: "Bellows Lungs",   x: 4, y: 2, cout: 1, requis: ["esprit1"], effet: { chaleurRecharge: 1 } },

  forge4:  { id: "forge4",  nom: "Molten Veins",    x: 0, y: 3, cout: 1, requis: ["forge2"],  effet: { chaleurMax: 2 } },
  // Branche forge : le nain mineur connaît les galeries et évite les bestioles.
  evasion1: {
    id: "evasion1", nom: "Tunnel Sense", x: 1, y: 3, cout: 1, requis: ["forge3"],
    effet: { evasion: 35 },
    description: "Hostile tiles stay quieter: -35% chance of random encounters.",
  },
  agile1:  { id: "agile1",  nom: "Fleet Strikes",   x: 3, y: 3, cout: 1, requis: ["corps3"],  effet: { agilite: 5 } },

  // Talent LÉGENDAIRE : nécessite toute la branche Forge ET la branche Agilité.
  maitrise1: {
    id: "maitrise1", nom: "Ancestral Mastery",
    x: 2, y: 4, cout: 3,
    requis: ["forge4", "agile1"],
    legendaire: true,
    effet: { maitrise: 1, slots: 3 },
    description: "Unlock Ancestral Mastery — master cards by playing them 200 times, then add up to 3 to your deck permanently.",
  },

  // Prolonge la Maîtrise : deux emplacements de plus (5 au total).
  maitrise2: {
    id: "maitrise2", nom: "Ancestral Legacy",
    x: 1, y: 4, cout: 2,
    requis: ["maitrise1"],
    legendaire: true,
    effet: { slots: 2 },
    description: "Two more Ancestral Mastery slots (5 total) to carry even more mastered cards.",
  },

  // Talent LÉGENDAIRE : branche Combat — dual-wield deux armes à une main.
  ambidextrie: {
    id: "ambidextrie", nom: "Ambidexterity",
    x: 4, y: 4, cout: 3,
    requis: ["agile1"],
    legendaire: true,
    effet: { ambidextrie: 1 },
    description: "Wield a one-handed weapon in each hand — both weapons' cards are added to your deck.",
  },

  // Talent LÉGENDAIRE : branche Combat — manier les armes à deux mains.
  // Même prérequis qu'Ambidextrie (agile1) : les deux styles avancés forkent
  // depuis Fleet Strikes. Sans ce talent, les armes mains:2 sont trop lourdes.
  deuxMains: {
    id: "deuxMains", nom: "Giant's Grip",
    x: 3, y: 4, cout: 3,
    requis: ["agile1"],
    legendaire: true,
    effet: { deuxMains: 1 },
    description: "Wield massive two-handed weapons (greataxes, greatswords) — too heavy to equip without it.",
  },
};

// Taille de la grille (pour dimensionner l'écran).
export const TALENT_GRILLE = { cols: 5, lignes: 5 };

export function talentDef(id) {
  return TALENTS[id] ?? null;
}

// Libellés lisibles des effets (pour la description d'un nœud).
const NOM_EFFET = {
  pvMax: "Max HP",
  vitesse: "Move speed",
  chaleurSeuil: "Forge Heat threshold",
  chaleurMax: "Forge Heat cap",
  chaleurDepart: "Start energy",
  chaleurRecharge: "Heat / turn",
  pioche: "Cards drawn / turn",
  agilite: "Attack speed",
  evasion: "Fewer encounters",
  maitrise: "Ancestral Mastery",
  slots: "Mastery slots",
  ambidextrie: "Ambidexterity",
  deuxMains: "Two-handed weapons",
};

// Décrit l'effet d'un nœud, ex. "+10 Max HP".
export function descEffet(effet) {
  return Object.entries(effet ?? {})
    .map(([k, v]) => `${v >= 0 ? "+" : ""}${v} ${NOM_EFFET[k] ?? k}`)
    .join(", ");
}
