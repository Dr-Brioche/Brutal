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
//   • FORGE (col 0)     : l'artisanat (qualité au craft). Branche courte pour
//                         l'instant (d'autres talents de forge à venir).
//   • COMBAT (col 1-3)  : la Chaleur de Forge (énergie de combat, col 1) + corps
//                         (PV), vitesse/agilité, pioche, armes légendaires (col 2-3).
//   • COMMERCE (col 4)  : sac, exploration efficace, accès aux enchères.
// La `racine` est le TRONC commun (haut, centre) : point d'entrée des 3 branches.
export const BRANCHES = {
  forge:    { nom: "Forge",    cols: [0, 0], couleur: "#e0842a", icone: "⚒" },
  combat:   { nom: "Combat",   cols: [1, 3], couleur: "#d0574a", icone: "⚔" },
  commerce: { nom: "Commerce", cols: [4, 4], couleur: "#4a9d72", icone: "🪙" },
};

export const TALENTS = {
  racine:  { id: "racine",  nom: "Dwarf's Resolve", branche: "tronc", x: 2, y: 0, cout: 1, requis: [], effet: { pvMax: 5 } },

  // ---- BRANCHE FORGE (col 0) : artisanat (qualité au craft) ------------------
  // Maîtrise d'artisan → la barre du mini-jeu de forge défile plus LENTEMENT
  // (plus facile d'atteindre Master/Exceptional). 3 rangs, −15 % de vitesse chacun.
  artisanat: {
    id: "artisanat", nom: "Master Craftsman", branche: "forge",
    x: 0, y: 1, cout: 1, rangMax: 3, requis: ["racine"],
    effet: { artisanat: 1 },
    description: "Craft mastery: the forge quality bar sweeps 15% slower per rank (3 ranks) — landing high quality gets easier, above all on rare and epic gear.",
  },

  // ---- BRANCHE COMBAT (col 1-3) ---------------------------------------------
  // Chaleur de Forge = ÉNERGIE DE COMBAT (colonne 1, chaîne verticale).
  forge1:  { id: "forge1",  nom: "Stoked Coals",  branche: "combat", x: 1, y: 1, cout: 1, requis: ["racine"], effet: { chaleurSeuil: 1 } },
  forge2:  { id: "forge2",  nom: "Deep Reserves", branche: "combat", x: 1, y: 2, cout: 1, requis: ["forge1"], effet: { chaleurMax: 2 } },
  forge4:  { id: "forge4",  nom: "Molten Veins",  branche: "combat", x: 1, y: 3, cout: 1, requis: ["forge2"], effet: { chaleurMax: 2 } },
  forge3:  { id: "forge3",  nom: "Ready Forge",   branche: "combat", x: 1, y: 4, cout: 1, requis: ["forge4"], effet: { chaleurDepart: 1 } },
  esprit2: { id: "esprit2", nom: "Bellows Lungs", branche: "combat", x: 1, y: 5, cout: 1, requis: ["forge3"], effet: { chaleurRecharge: 1 } },

  // Corps (PV), vitesse, pioche, agilité (colonnes 2-3).
  corps1:  { id: "corps1",  nom: "Thick Hide",   branche: "combat", x: 2, y: 1, cout: 1, requis: ["racine"], effet: { pvMax: 10 } },
  esprit1: { id: "esprit1", nom: "Quick Wit",    branche: "combat", x: 3, y: 1, cout: 1, requis: ["racine"], effet: { pioche: 1 } },
  corps2:  { id: "corps2",  nom: "Ironheart",    branche: "combat", x: 2, y: 2, cout: 1, requis: ["corps1"], effet: { pvMax: 15 } },
  corps3:  { id: "corps3",  nom: "Light Step",   branche: "combat", x: 3, y: 2, cout: 1, requis: ["corps1"], effet: { vitesse: 30 } },
  agile1:  { id: "agile1",  nom: "Fleet Strikes", branche: "combat", x: 2, y: 3, cout: 1, requis: ["corps3"], effet: { agilite: 5 } },

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
  // Licence de consignation : chaque rang permet de DÉPOSER 1 objet de plus à la
  // vente du soir (base 1 → jusqu'à 3 avec les 2 rangs). 2 rangs, 1 point chacun.
  encheresDepot: {
    id: "encheresDepot", nom: "Consignment License", branche: "commerce",
    x: 4, y: 4, cout: 1, rangMax: 2, requis: ["noblesse"],
    effet: { depotEnchere: 1 },
    description: "Consign one more item per rank at the evening auction (2 ranks → up to 3 items at once).",
  },
  // Légendaire commerce : le Collecteur d'impôt. L'OR des bâtiments est encaissé
  // AUTOMATIQUEMENT quand leur coffre est plein (plus de tournée). Les
  // RESSOURCES en nature (bois…) restent à récolter à pied (plafond 3×10=30).
  collecteurImpot: {
    id: "collecteurImpot", nom: "Tax Collector", branche: "commerce",
    x: 4, y: 5, cout: 3, requis: ["encheresDepot"], legendaire: true,
    effet: { collecteurImpot: 1 },
    description: "Buildings' GOLD is banked automatically whenever their treasury fills — no more walking the rounds. Raw materials (wood…) still pile up (cap 3 stacks of 10) and must be fetched on foot.",
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
  depotEnchere: "Auction consignment slot",
  collecteurImpot: "Auto-collect building gold",
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
