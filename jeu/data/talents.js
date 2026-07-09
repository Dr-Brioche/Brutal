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

// L'arbre est organisé en TROIS BRANCHES distinctes (décision Brioche 09/07/2026),
// chacune sur sa (ses) colonne(s) — cf. `branche` sur chaque nœud et `BRANCHES` :
//   • FORGE (col 0-1)    : la Chaleur de Forge (énergie de combat, thème forge) +
//                          l'artisanat (qualité au craft).
//   • COMBAT (col 2-3)   : corps (PV), vitesse/agilité, pioche, armes légendaires.
//   • COMMERCE (col 4)   : sac, exploration efficace, accès aux enchères.
// La `racine` est le TRONC commun (haut, centre) : point d'entrée des 3 branches.
export const BRANCHES = {
  forge:    { nom: "Forge",    cols: [0, 1], couleur: "#e0842a", icone: "⚒" },
  combat:   { nom: "Combat",   cols: [2, 3], couleur: "#d0574a", icone: "⚔" },
  commerce: { nom: "Commerce", cols: [4, 4], couleur: "#4a9d72", icone: "🪙" },
};

export const TALENTS = {
  racine:  { id: "racine",  nom: "Dwarf's Resolve", branche: "tronc", x: 2, y: 0, cout: 1, requis: [], effet: { pvMax: 5 } },

  // ---- BRANCHE FORGE (col 0-1) : Chaleur de Forge + artisanat ----------------
  forge1:  { id: "forge1",  nom: "Stoked Coals",  branche: "forge", x: 0, y: 1, cout: 1, requis: ["racine"], effet: { chaleurSeuil: 1 } },
  forge3:  { id: "forge3",  nom: "Ready Forge",   branche: "forge", x: 1, y: 1, cout: 1, requis: ["racine"], effet: { chaleurDepart: 1 } },
  forge2:  { id: "forge2",  nom: "Deep Reserves", branche: "forge", x: 0, y: 2, cout: 1, requis: ["forge1"], effet: { chaleurMax: 2 } },
  esprit2: { id: "esprit2", nom: "Bellows Lungs", branche: "forge", x: 1, y: 2, cout: 1, requis: ["forge3"], effet: { chaleurRecharge: 1 } },
  forge4:  { id: "forge4",  nom: "Molten Veins",  branche: "forge", x: 0, y: 3, cout: 1, requis: ["forge2"], effet: { chaleurMax: 2 } },
  // Maîtrise d'artisan → la barre du mini-jeu de forge défile plus LENTEMENT
  // (plus facile d'atteindre Master/Exceptional). 3 rangs, −15 % de vitesse chacun.
  artisanat: {
    id: "artisanat", nom: "Master Craftsman", branche: "forge",
    x: 1, y: 3, cout: 1, rangMax: 3, requis: ["forge3"],
    effet: { artisanat: 1 },
    description: "Craft mastery: the forge quality bar sweeps 15% slower per rank (3 ranks) — landing high quality gets easier, above all on rare and epic gear.",
  },

  // ---- BRANCHE COMBAT (col 2-3) : corps, vitesse, pioche, armes --------------
  corps1:  { id: "corps1",  nom: "Thick Hide",   branche: "combat", x: 2, y: 1, cout: 1, requis: ["racine"], effet: { pvMax: 10 } },
  esprit1: { id: "esprit1", nom: "Quick Wit",    branche: "combat", x: 3, y: 1, cout: 1, requis: ["racine"], effet: { pioche: 1 } },
  corps2:  { id: "corps2",  nom: "Ironheart",    branche: "combat", x: 2, y: 2, cout: 1, requis: ["corps1"], effet: { pvMax: 15 } },
  corps3:  { id: "corps3",  nom: "Light Step",   branche: "combat", x: 3, y: 2, cout: 1, requis: ["corps1"], effet: { vitesse: 30 } },
  agile1:  { id: "agile1",  nom: "Fleet Strikes", branche: "combat", x: 3, y: 3, cout: 1, requis: ["corps3"], effet: { agilite: 5 } },

  // Légendaires combat (armes avancées) — forkent depuis Fleet Strikes.
  deuxMains: {
    id: "deuxMains", nom: "Giant's Grip", branche: "combat",
    x: 2, y: 4, cout: 3, requis: ["agile1"], legendaire: true,
    effet: { deuxMains: 1 },
    description: "Wield massive two-handed weapons (greataxes, greatswords) — too heavy to equip without it.",
  },
  ambidextrie: {
    id: "ambidextrie", nom: "Ambidexterity", branche: "combat",
    x: 3, y: 4, cout: 3, requis: ["agile1"], legendaire: true,
    effet: { ambidextrie: 1 },
    description: "Wield a one-handed weapon in each hand — both weapons' cards are added to your deck.",
  },
  // Légendaire hybride : demande le bout de la branche FORGE (Molten Veins) ET
  // du combat (Fleet Strikes) — d'où sa place en bas, entre les deux.
  maitrise1: {
    id: "maitrise1", nom: "Ancestral Mastery", branche: "combat",
    x: 2, y: 5, cout: 3, requis: ["forge4", "agile1"], legendaire: true,
    effet: { maitrise: 1, slots: 3 },
    description: "Unlock Ancestral Mastery — master cards by playing them 200 times, then add up to 3 to your deck permanently.",
  },
  maitrise2: {
    id: "maitrise2", nom: "Ancestral Legacy", branche: "combat",
    x: 3, y: 5, cout: 2, requis: ["maitrise1"], legendaire: true,
    effet: { slots: 2 },
    description: "Two more Ancestral Mastery slots (5 total) to carry even more mastered cards.",
  },

  // ---- BRANCHE COMMERCE (col 4) : sac, exploration, enchères -----------------
  sacBonus: {
    id: "sacBonus", nom: "Extra Pouch", branche: "commerce",
    x: 4, y: 1, cout: 1, requis: ["racine"],
    effet: { sacSecondaire: 1 },
    description: "Unlock a second bag slot — equip two bags at once for more carrying capacity.",
  },
  // Le nain mineur connaît les galeries → moins de rencontres = plus de temps à
  // miner/farmer (efficacité économique).
  evasion1: {
    id: "evasion1", nom: "Tunnel Sense", branche: "commerce",
    x: 4, y: 2, cout: 1, requis: ["sacBonus"],
    effet: { evasion: 35 },
    description: "Hostile tiles stay quieter: -35% chance of random encounters.",
  },
  // Titre de noblesse : la clé des VENTES AUX ENCHÈRES du soir (fin de branche).
  noblesse: {
    id: "noblesse", nom: "Title of Nobility", branche: "commerce",
    x: 4, y: 3, cout: 2, requis: ["evasion1"],
    effet: { noblesse: 1 },
    description: "A minor title of Brütàl nobility — grants entry to the exclusive evening auctions (entry ticket still required).",
  },

  // ⚠ TODO EXPORT FINAL : talent de TEST à RETIRER avant le build Steam.
  // Gratuit, ON/OFF (toggle), désactivé par défaut : annule TOUTE rencontre.
  noRencontre: {
    id: "noRencontre", nom: "No Encounters (TEST)", branche: "test",
    x: 0, y: 5, cout: 0, requis: [],
    toggle: true, test: true,
    effet: { sansRencontre: 1 },
    description: "TEST ONLY — toggle to cancel all monster encounters (free, off by default).",
  },
};

// Taille de la grille (pour dimensionner l'écran) : 5 colonnes, 6 rangées.
export const TALENT_GRILLE = { cols: 5, lignes: 6 };

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
  sansRencontre: "Cancel all encounters (TEST)",
  sacSecondaire: "Second bag slot",
  noblesse: "Auction access",
  maitrise: "Ancestral Mastery",
  slots: "Mastery slots",
  ambidextrie: "Ambidexterity",
  deuxMains: "Two-handed weapons",
  artisanat: "Slower forge bar",
};

// Décrit l'effet d'un nœud, ex. "+10 Max HP".
export function descEffet(effet) {
  return Object.entries(effet ?? {})
    .map(([k, v]) => `${v >= 0 ? "+" : ""}${v} ${NOM_EFFET[k] ?? k}`)
    .join(", ");
}
