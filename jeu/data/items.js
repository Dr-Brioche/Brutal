// Catalogue des ITEMS : armes, armures, bijoux, sacs… tout ce qui se loote,
// se range dans l'inventaire et s'équipe. (Contenu pur, comme les cartes.)
//
// Champs d'un item :
//   id        : identifiant interne
//   nom       : nom affiché (anglais)
//   categorie : détermine sur quel SLOT il s'équipe (voir SLOT_PAR_CATEGORIE)
//   rarete    : "commun" | "uncommon" | "rare" | "epique" | "legendaire" (couleur + drop)
//   taille    : { l, h } empreinte en cases dans l'inventaire (façon Diablo)
//   icone     : couleur du carré placeholder (en attendant de vraies icônes)
//   -- selon la catégorie --
//   planche   : arme (calque) / armure (skin du nain)
//   degats    : arme
//   cartes    : cartes ajoutées au deck — le STUFF DONNE DES CARTES (armes, bagues…)
//   mains     : arme → 1 (une main) ou 2 (deux mains, occupe les 2 slots d'arme)
//   defense   : armure
//   rangsBonus: sac → rangées d'inventaire ajoutées
//
// Le stuff ne donne PAS de stats chiffrées : les CHIFFRES (vie, Chaleur, vitesse…)
// viennent de l'arbre de talents (data/talents.js).

// Raretés, du plus commun au plus précieux. `rang` = ordre (sert à comparer
// « au moins rare » sans coder en dur les noms — cf. rareteAuMoins).
export const RARETES = {
  commun:     { nom: "Common",    couleur: "#9aa0a6", rang: 0 },
  uncommon:   { nom: "Uncommon",  couleur: "#4a9d52", rang: 1 }, // vert
  rare:       { nom: "Rare",      couleur: "#4a90d9", rang: 2 },
  epique:     { nom: "Epic",      couleur: "#9b59b6", rang: 3 },
  legendaire: { nom: "Legendary", couleur: "#e08a1e", rang: 4 },
};

// Sur quel type de slot va chaque catégorie d'item.
export const SLOT_PAR_CATEGORIE = {
  arme: "arme1",
  bouclier: "arme2",
  armure: "armure",
  gant: "gant",
  botte: "botte",
  collier: "collier",
  bague: "bague",   // ira sur la 1re bague libre (bague1..bague5)
  sac: "sac",
};

export const ITEMS = {
  // ---- Armes ----
  // Hache rouillée : arme de départ. 2× Rusty Cleave (balayage) + 3× Strike.
  "hache-rouillee": {
    id: "hache-rouillee", nom: "Rusty Axe", categorie: "arme", rarete: "commun",
    taille: { l: 1, h: 2 }, icone: "#9a6b3a",
    planche: "images/armes/hache.png", degats: 5, mains: 1,
    cartes: ["coup-de-hache", "coup-de-hache", "frappe", "frappe", "frappe"],
  },
  // Marteau de forge : 3× Forge Smash + 2× Strike + 1× Splash Strike (éclaboussure).
  "marteau-de-forge": {
    id: "marteau-de-forge", nom: "Forge Hammer", categorie: "arme", rarete: "uncommon",
    taille: { l: 1, h: 2 }, icone: "#8a8f98",
    planche: "images/armes/marteau.png", degats: 4, mains: 1,
    cartes: ["ecrasement", "ecrasement", "ecrasement", "frappe", "frappe", "eclaboussure-de-frappe"],
  },
  // Pioche de mineur : 2× Pickaxe Jab + 3× Strike.
  "pioche-de-mineur": {
    id: "pioche-de-mineur", nom: "Miner's Pick", categorie: "arme", rarete: "commun",
    taille: { l: 1, h: 2 }, icone: "#7d7a72",
    planche: "images/armes/pioche.png", degats: 3, mains: 1,
    cartes: ["coup-de-pioche", "coup-de-pioche", "frappe", "frappe", "frappe"],
  },
  // Croc de basilic : arme à poison. 3× Venom Stab + 1× Poison Dance (AOE) + 2× Wound Opening.
  "croc-de-basilic": {
    id: "croc-de-basilic", nom: "Basilisk Fang", categorie: "arme", rarete: "rare",
    taille: { l: 1, h: 2 }, icone: "#4f7a3a",
    degats: 4, mains: 1,
    cartes: ["coup-venimeux", "coup-venimeux", "coup-venimeux", "danse-empoisonnee", "ouverture-des-plaies", "ouverture-des-plaies"],
  },
  // Marteau de lave : arme de feu. 3× Lava Hammer + 1× Armor Forging + 1× Dragon's Blaze + 2× Fire Strike.
  "marteau-de-lave": {
    id: "marteau-de-lave", nom: "Magma Hammer", categorie: "arme", rarete: "epique",
    taille: { l: 1, h: 2 }, icone: "#c0431e",
    degats: 6, mains: 1,
    cartes: ["coup-de-lave", "coup-de-lave", "coup-de-lave", "forgeage-d-armure", "embrasement-dragon", "feu-frappe", "feu-frappe"],
  },

  // War Axe : arme deux mains RARE. 2× Pommel Strike + 2× Giant Swing (AOE) + 2× Cleave.
  "hache-de-guerre": {
    id: "hache-de-guerre", nom: "War Axe", categorie: "arme", rarete: "rare",
    taille: { l: 1, h: 3 }, icone: "#8a3a1a",
    planche: "images/armes/hache.png", degats: 8, mains: 2,
    cartes: ["coup-de-pommeau", "coup-de-pommeau", "giant-swing", "giant-swing", "couper-en-deux", "couper-en-deux"],
  },
  // Épée d'onyx : arme deux mains épique, build « feu/brûlure ». 1× Onyx Radiance
  // (amorce AOE) + 2× Onyx Slash (gros coup + éclaboussure) + 2× Heat Rejection
  // (trempe offensive : la Chaleur devient brûlure de masse). Pièce maîtresse du
  // build Onyx aux côtés de la plaque d'onyx.
  "epee-onyx": {
    id: "epee-onyx", nom: "Big Onyx Sword", categorie: "arme", rarete: "epique",
    taille: { l: 1, h: 3 }, icone: "#2b2433", degats: 9, mains: 2,
    cartes: ["onyx-radiance", "onyx-radiance", "onyx-slash", "onyx-slash", "onyx-slash", "rejet-chaleur", "onyx-overheat"],
  },

  // ---- Boucliers (slot off-hand) ----
  // Bouclier-tour : 1× « Shield Wall » (Pierre/blocage) + 2× « Shield Bash » (étourdit
  // l'ennemi 2 tours). Plus offensif/contrôle qu'avant (2 étourdissements).
  "bouclier-tour": {
    id: "bouclier-tour", nom: "Tower Shield", categorie: "bouclier", rarete: "epique",
    taille: { l: 2, h: 2 }, icone: "#5a6b7a",
    cartes: ["mur-bouclier", "coup-de-bouclier", "coup-de-bouclier"],
  },

  // ---- Armures (changent le skin du nain) ----
  "tenue-de-voyageur": {
    id: "tenue-de-voyageur", nom: "Traveler's Garb", categorie: "armure", rarete: "commun",
    taille: { l: 2, h: 2 }, icone: "#6a5a44",
    planche: "images/heros/nain.png", defense: 0,
  },
  // Plaque d'onyx : armure « dragon ». 2× Onyx Armor (gros bloc de Pierre) +
  // 2× Dragon's Blaze (détonateur de feu) + 2× Onyx Breath (pose du feu en masse).
  "plate-onyx": {
    id: "plate-onyx", nom: "Onyx Guard Plate", categorie: "armure", rarete: "epique",
    taille: { l: 2, h: 2 }, icone: "#3b4250",
    planche: "images/heros/nain-onyx.png", defense: 5,
    cartes: ["onyx-armor", "onyx-armor", "embrasement-dragon", "embrasement-dragon", "souffle-onyx", "souffle-onyx"],
  },
  // Maille de forge : 1re ARMURE qui donne des cartes. 3× « Mail Armor » (bloc de
  // Pierre fiable) + 1× « Quench » (trempe : vide la Chaleur en Pierre ×4) → build
  // tank qui récompense de chauffer fort puis de tremper.
  "maille-de-forge": {
    id: "maille-de-forge", nom: "Forgemaster's Mail", categorie: "armure", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#7a4a2a",
    planche: "images/heros/nain-forge.png", defense: 3,
    cartes: ["mail-armor", "mail-armor", "mail-armor", "trempe"],
  },

  // ---- Bijoux & divers (donnent des CARTES, ou une utilité comme le sac) ----
  // Bague de sang : injecte « Bloodletting » (saignement qui soigne le héros).
  "bague-de-sang": {
    id: "bague-de-sang", nom: "Blood Ring", categorie: "bague", rarete: "uncommon",
    taille: { l: 1, h: 1 }, icone: "#7a1f2b", cartes: ["coup-de-sang", "coup-de-sang"],
  },
  // Collier de saphir énergisant : injecte « Sapphire Surge » (régénère l'énergie).
  // Entrée de gamme d'une lignée de 3 (cf. Nice / Perfect plus bas).
  "collier-de-saphir": {
    id: "collier-de-saphir", nom: "Sapphire Amulet", categorie: "collier", rarete: "uncommon",
    taille: { l: 1, h: 1 }, icone: "#2f6fb0", cartes: ["surge-saphir"],
  },
  // Beau collier de saphir : 2× Surge (le double de l'entrée de gamme).
  "collier-de-saphir-fin": {
    id: "collier-de-saphir-fin", nom: "Nice Sapphire Amulet", categorie: "collier", rarete: "rare",
    taille: { l: 1, h: 1 }, icone: "#2f6fb0", cartes: ["surge-saphir", "surge-saphir"],
  },
  // Collier de saphir parfait : 3× Perfect Surge (+3 Chaleur chacune) → grosse
  // relance d'énergie, haut de gamme de la lignée.
  "collier-de-saphir-parfait": {
    id: "collier-de-saphir-parfait", nom: "Perfect Sapphire Amulet", categorie: "collier", rarete: "epique",
    taille: { l: 1, h: 1 }, icone: "#3a86d9", cartes: ["surge-saphir-parfait", "surge-saphir-parfait", "surge-saphir-parfait"],
  },
  // Gants de mineur : 2× « Master's Hand » (pioche 2 cartes) → fluidifie le deck.
  "gants-de-mineur": {
    id: "gants-de-mineur", nom: "Miner's Gloves", categorie: "gant", rarete: "commun",
    taille: { l: 2, h: 1 }, icone: "#7a6a4a", cartes: ["main-de-maitre", "main-de-maitre"],
  },
  // Gants d'onyx : pièce du set Onyx. 2× Burning Hand (défausse → brûlure dispersée)
  // + 2× Onyx Fist (Pierre + feu). Build feu/brûlure.
  "gants-onyx": {
    id: "gants-onyx", nom: "Onyx Glove", categorie: "gant", rarete: "epique",
    taille: { l: 2, h: 1 }, icone: "#2b2433", cartes: ["main-brulante", "main-brulante", "poing-onyx", "poing-onyx"],
  },
  // Bottes vives : injectent « Quicken » (accélère le héros — vitesse d'initiative).
  "bottes-vives": {
    id: "bottes-vives", nom: "Swift Boots", categorie: "botte", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#3a7a5a", cartes: ["celerite-vive", "celerite-vive"],
  },
  // Bottes d'onyx : pièce du set Onyx. 1× Burning Run (hâte selon la Chaleur) +
  // 2× Flaming Kick (déplace la brûlure d'un ennemi vers celui derrière).
  "bottes-onyx": {
    id: "bottes-onyx", nom: "Onyx Boots", categorie: "botte", rarete: "epique",
    taille: { l: 2, h: 1 }, icone: "#2b2433", cartes: ["course-ardente", "coup-de-pied-ardent", "coup-de-pied-ardent"],
  },
  // Anneau de givre : injecte « Frostbite » (ralentit un ennemi).
  "anneau-de-givre": {
    id: "anneau-de-givre", nom: "Frost Ring", categorie: "bague", rarete: "uncommon",
    taille: { l: 1, h: 1 }, icone: "#5aa6d9", cartes: ["givre-lent", "givre-lent"],
  },
  "sac-en-cuir": {
    id: "sac-en-cuir", nom: "Leather Pouch", categorie: "sac", rarete: "commun",
    taille: { l: 2, h: 2 }, icone: "#6b4a2b", rangsBonus: 2,
  },
  // Grande bourse : 1 rangée de plus que la bourse de base (+3 au lieu de +2).
  "grand-sac-en-cuir": {
    id: "grand-sac-en-cuir", nom: "Big Leather Pouch", categorie: "sac", rarete: "uncommon",
    taille: { l: 2, h: 2 }, icone: "#7a5630", rangsBonus: 3,
  },
};

export function itemDef(id) {
  return ITEMS[id] ?? null;
}

// Couleur de rareté d'un item (pour la bordure de son icône).
export function couleurRarete(id) {
  const it = ITEMS[id];
  return (it && RARETES[it.rarete]?.couleur) || "#9aa0a6";
}

// Prix de revente d'un item au marchand (or), selon sa rareté.
const PRIX_VENTE = { commun: 2, uncommon: 4, rare: 6, epique: 15, legendaire: 40 };
export function prixVente(id) {
  const it = ITEMS[id];
  return it ? (PRIX_VENTE[it.rarete] ?? 1) : 0;
}

// True si la rareté de l'item atteint AU MOINS le seuil donné (ex. "rare"). Sert
// aux confirmations de vente/jet : on ne protège que les objets de valeur (rare+),
// jamais les communs ni les uncommon.
export function rareteAuMoins(id, seuilCle) {
  const it = ITEMS[id];
  if (!it) return false;
  return (RARETES[it.rarete]?.rang ?? 0) >= (RARETES[seuilCle]?.rang ?? 0);
}

// ---- Sets d'armure (bonus de panoplie) -------------------------------------
// Un SET d'armure donne un BONUS PASSIF qui s'active SEULEMENT si TOUTES ses
// pièces d'armure sont équipées en même temps (torse + gants + bottes ;
// l'ARME ne compte PAS dans la condition). Le bonus se déclenche sur un
// ÉVÉNEMENT du combat (cf. systems/combat.js → combat.passifs), AU-DESSUS des
// règles normales — c'est ce qui rend la complétion d'un set désirable.
//
// Champs d'un bonus :
//   declencheur : quel événement l'active. Pour l'instant :
//                 "frappeMelee" = quand le héros encaisse une attaque de mêlée.
//   effets      : effets appliqués au déclenchement (même vocabulaire que les
//                 cartes). Pour "frappeMelee", la cible est l'ATTAQUANT.
export const SETS = {
  onyx: {
    id: "onyx",
    nom: "Onyx Set",
    pieces: ["plate-onyx", "gants-onyx", "bottes-onyx"], // torse + gants + bottes
    bonus: {
      declencheur: "frappeMelee",
      texte: "When hit by a melee attack, the attacker takes 3 Burning (no spread).",
      effets: [{ type: "feu", valeur: 3 }],
    },
  },
};

// Les bonus de set ACTIFS pour un équipement donné : ceux dont TOUTES les pièces
// sont équipées. `slots` = inv.slots ({ armure, gant, botte, ... }).
export function setsActifs(slots) {
  const equipes = new Set(Object.values(slots || {}).filter(Boolean));
  return Object.values(SETS).filter((s) => s.pieces.every((id) => equipes.has(id)));
}

// Le set auquel appartient un item (ou null) — pour l'afficher dans sa bulle / le
// catalogue. Un item peut n'appartenir à aucun set.
export function setDeItem(id) {
  return Object.values(SETS).find((s) => s.pieces.includes(id)) ?? null;
}

// Noms lisibles (anglais) pour les bulles d'info.
const NOM_CATEGORIE = {
  arme: "Weapon", bouclier: "Shield", armure: "Armor", gant: "Gloves",
  botte: "Boots", collier: "Amulet", bague: "Ring", sac: "Bag",
};

// Libellé court de catégorie (« Ring », « Weapon »…) pour l'en-tête d'une bulle.
export function categorieLisible(id) {
  const d = ITEMS[id];
  return d ? (NOM_CATEGORIE[d.categorie] ?? d.categorie) : "";
}

// Les infos chiffrées « utiles » d'un item (deux mains, rangées de sac). L'ATK/DEF
// ne sont PLUS affichés : ils ne servaient à rien (le combat est piloté par les
// CARTES, pas par degats/defense). La bulle montre les cartes en VRAI (visuel) —
// voir ui/infobulle.js. Vide si l'objet n'apporte rien de chiffré.
export function statsLisibles(id) {
  const d = ITEMS[id];
  if (!d) return [];
  const lignes = [];
  if (d.mains === 2) lignes.push("Two-handed");
  if (d.rangsBonus) lignes.push(`+${d.rangsBonus} bag rows`);
  return lignes;
}
