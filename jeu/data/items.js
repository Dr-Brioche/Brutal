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
  // Bouclier-tour : 3× Shield Wall + 2× Shield Bash (stun 3 tours) + 1× Stacking
  // Shield (double la Pierre). Passif : +2 Pierre à chaque frappe de mêlée reçue.
  "bouclier-tour": {
    id: "bouclier-tour", nom: "Tower Shield", categorie: "bouclier", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#5a6b7a",
    cartes: ["mur-bouclier", "mur-bouclier", "mur-bouclier", "coup-de-bouclier", "coup-de-bouclier", "bouclier-empilant"],
    passifPropre: {
      declencheur: "frappeMelee",
      texte: "When hit by a melee attack, gain 2 Stone.",
      effets: [{ type: "pierre", valeur: 2, cible: "heros" }],
    },
  },

  // ---- Armures (changent le skin du nain) ----
  // Tenue de voyageur : armure légère. 3× Light Armor + 1× Free Movement.
  // Donne 8 Pierre de départ au combat.
  "tenue-de-voyageur": {
    id: "tenue-de-voyageur", nom: "Traveler's Garb", categorie: "armure", rarete: "commun",
    taille: { l: 2, h: 2 }, icone: "#6a5a44",
    planche: "images/heros/nain.png",
    armureDepart: 8,
    cartes: ["armure-legere", "armure-legere", "armure-legere", "mouvement-degage"],
  },
  // Plaque d'onyx : armure « dragon ». 3× Onyx Armor + 1× Dragon's Blaze +
  // 2× Onyx Breath + 1× All Should Be Fire. Donne 30 Pierre de départ.
  "plate-onyx": {
    id: "plate-onyx", nom: "Onyx Guard Plate", categorie: "armure", rarete: "epique",
    taille: { l: 2, h: 2 }, icone: "#3b4250",
    planche: "images/heros/nain-onyx.png",
    armureDepart: 30,
    cartes: ["onyx-armor", "onyx-armor", "onyx-armor", "embrasement-dragon", "souffle-onyx", "souffle-onyx", "tout-en-feu"],
  },
  // Maille de forge : armure tank. 3× Mail Armor (Pierre/ennemi) + 1× Quench
  // (Chaleur → Pierre ×10) + 2× Heavy Armor (gros bloc). Donne 22 Pierre de départ.
  "maille-de-forge": {
    id: "maille-de-forge", nom: "Forgemaster's Mail", categorie: "armure", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#7a4a2a",
    planche: "images/heros/nain-forge.png",
    armureDepart: 22,
    cartes: ["mail-armor", "mail-armor", "mail-armor", "trempe", "armure-lourde", "armure-lourde"],
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
  // + 2× Onyx Fist (Pierre + feu) + 2× Forge from Ashes (recycle la main). Build feu.
  "gants-onyx": {
    id: "gants-onyx", nom: "Onyx Glove", categorie: "gant", rarete: "epique",
    taille: { l: 2, h: 1 }, icone: "#2b2433",
    cartes: ["main-brulante", "main-brulante", "poing-onyx", "poing-onyx", "forge-des-cendres", "forge-des-cendres"],
  },
  // Bottes vives : 3× Quicken (hâte) + 1× Second Wind (échange de la hâte contre
  // de l'énergie). Build tempo/mobilité.
  "bottes-vives": {
    id: "bottes-vives", nom: "Swift Boots", categorie: "botte", rarete: "uncommon",
    taille: { l: 2, h: 1 }, icone: "#3a7a5a",
    cartes: ["celerite-vive", "celerite-vive", "celerite-vive", "second-souffle"],
  },
  // Bottes d'onyx : pièce du set Onyx. 1× Burning Run + 1× Flaming Kick +
  // 2× Fire Boost (feu héros → énergie) + 2× Boost (relance d'énergie). Build feu.
  "bottes-onyx": {
    id: "bottes-onyx", nom: "Onyx Boots", categorie: "botte", rarete: "epique",
    taille: { l: 2, h: 1 }, icone: "#2b2433",
    cartes: ["course-ardente", "coup-de-pied-ardent", "boost-feu", "boost-feu", "boost", "boost"],
  },
  // Anneau de givre : injecte « Frostbite » (ralentit un ennemi).
  "anneau-de-givre": {
    id: "anneau-de-givre", nom: "Frost Ring", categorie: "bague", rarete: "uncommon",
    taille: { l: 1, h: 1 }, icone: "#5aa6d9", cartes: ["givre-lent", "givre-lent"],
  },
  // Anneau de givre parfait : 2× Frost Cascade (gel en chaîne). Build gel/contrôle.
  "anneau-de-givre-parfait": {
    id: "anneau-de-givre-parfait", nom: "Perfect Frost Ring", categorie: "bague", rarete: "rare",
    taille: { l: 1, h: 1 }, icone: "#7fc6ff", cartes: ["gel-cascade", "gel-cascade"],
  },

  // ---- Sacs (rangées d'inventaire) — progression 1 / 2 / 3 / 4 / 6 / 10 -------
  "sac-en-cuir": {
    id: "sac-en-cuir", nom: "Leather Pouch", categorie: "sac", rarete: "commun",
    taille: { l: 2, h: 2 }, icone: "#6b4a2b", rangsBonus: 1,
  },
  "grand-sac-en-cuir": {
    id: "grand-sac-en-cuir", nom: "Big Leather Pouch", categorie: "sac", rarete: "uncommon",
    taille: { l: 2, h: 2 }, icone: "#7a5630", rangsBonus: 2,
  },
  // Énorme bourse : +3 rangées.
  "enorme-sac-en-cuir": {
    id: "enorme-sac-en-cuir", nom: "Huge Leather Pouch", categorie: "sac", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#8a6238", rangsBonus: 3,
  },
  // Sac à dos : +4 rangées.
  "sac-a-dos": {
    id: "sac-a-dos", nom: "Backpack", categorie: "sac", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#6a4f33", rangsBonus: 4,
  },
  // Sac sans fond : +6 rangées (épique).
  "sac-sans-fond": {
    id: "sac-sans-fond", nom: "Bottomless Bag", categorie: "sac", rarete: "epique",
    taille: { l: 2, h: 2 }, icone: "#4a3a6a", rangsBonus: 6,
  },
  // Sac de maître mineur : +10 rangées (légendaire).
  "sac-maitre-mineur": {
    id: "sac-maitre-mineur", nom: "Master Miner's Bag", categorie: "sac", rarete: "legendaire",
    taille: { l: 2, h: 2 }, icone: "#c8a13a", rangsBonus: 10,
  },

  // ---- Mail Set (gants + bottes ; le torse est la Forgemaster's Mail) ---------
  // Gants de maille : tempo du build tank. 2× Master's Hand + 2× Outnumbered
  // (pioche selon les ennemis) + 1× Mail Advantage (Pierre + hâte).
  "gants-de-maille": {
    id: "gants-de-maille", nom: "Mail Glove", categorie: "gant", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#8a8f98",
    cartes: ["main-de-maitre", "main-de-maitre", "surnombre", "surnombre", "avantage-maille"],
  },
  // Bottes de maille : 2× Quicken + 1× Mail Advantage + 2× Boost. Tempo/énergie.
  "bottes-de-maille": {
    id: "bottes-de-maille", nom: "Mail Boots", categorie: "botte", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#8a8f98",
    cartes: ["celerite-vive", "celerite-vive", "avantage-maille", "boost", "boost"],
  },

  // ---- Chevalier Croisé : set LUMIÈRE + Confusion (éblouissement) -------------
  // Crusader Plate (torse) : 2× Radiant Strike + 3× Sacred Ground + 1× Blinding
  // Flash. +15 Pierre de départ. Skin provisoire = nain de base (à dessiner).
  "plate-croise": {
    id: "plate-croise", nom: "Crusader Plate", categorie: "armure", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#e8d9a0",
    planche: "images/heros/nain.png",
    armureDepart: 15,
    cartes: ["frappe-radiante", "frappe-radiante", "terre-sacree", "terre-sacree", "terre-sacree", "eclair-aveuglant"],
  },
  // Crusader Gauntlets (gants) : 2× Lumen Jab + 1× Halo Burst.
  "gants-croise": {
    id: "gants-croise", nom: "Crusader Gauntlets", categorie: "gant", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#e8d9a0",
    cartes: ["coup-de-lumiere", "coup-de-lumiere", "eclat-de-halo"],
  },
  // Crusader Greaves (bottes) : 1× Crusader's Charge + 2× Dazzling Kick.
  "bottes-croise": {
    id: "bottes-croise", nom: "Crusader Greaves", categorie: "botte", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#e8d9a0",
    cartes: ["charge-du-croise", "coup-eblouissant", "coup-eblouissant"],
  },

  // ---- Set de Sang : build SAIGNEMENT épique (à coupler à une arme à saignement)
  // Blood Plate (torse) : 3× Crimson Carve + 2× Sanguine Guard + 2× Bloodbath.
  // +20 Pierre de départ. Skin provisoire = nain de base (à dessiner).
  "plate-sang": {
    id: "plate-sang", nom: "Blood Plate", categorie: "armure", rarete: "epique",
    taille: { l: 2, h: 2 }, icone: "#7a1320",
    planche: "images/heros/nain.png",
    armureDepart: 20,
    cartes: ["carve-cramoisi", "carve-cramoisi", "carve-cramoisi", "garde-sanguine", "garde-sanguine", "bain-de-sang", "bain-de-sang"],
  },
  // Blood Gauntlets (gants) : 2× Open Veins + 2× Contagion (empile + propage).
  "gants-sang": {
    id: "gants-sang", nom: "Blood Gauntlets", categorie: "gant", rarete: "epique",
    taille: { l: 2, h: 1 }, icone: "#7a1320",
    cartes: ["ouvrir-les-veines", "ouvrir-les-veines", "contagion", "contagion"],
  },
  // Blood Greaves (bottes) : 2× Hemorrhage + 2× Blood Rush (détone + carburant).
  "bottes-sang": {
    id: "bottes-sang", nom: "Blood Greaves", categorie: "botte", rarete: "epique",
    taille: { l: 2, h: 1 }, icone: "#7a1320",
    cartes: ["hemorragie", "hemorragie", "ruee-de-sang", "ruee-de-sang"],
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
  // Mail Set : bonus DÉFENSIF en début de combat. Plus il y a d'ennemis, plus on
  // entre blindé — synergie avec le build tank (Pierre) de la Forgemaster's Mail.
  mail: {
    id: "mail",
    nom: "Mail Set",
    pieces: ["maille-de-forge", "gants-de-maille", "bottes-de-maille"], // torse + gants + bottes
    bonus: {
      declencheur: "debutCombat",
      texte: "At the start of combat, gain 10 Stone per enemy faced.",
      effets: [{ type: "pierre", valeur: 10, parEnnemi: true }],
    },
  },
  // Chevalier Croisé : bonus de CONTRÔLE (lumière). Frapper le croisé en mêlée,
  // c'est s'exposer à son éclat → l'attaquant est ébloui (Confusion). Complète les
  // cartes de Confusion du set : on punit l'ennemi qui ose s'approcher.
  croise: {
    id: "croise",
    nom: "Crusader Set",
    pieces: ["plate-croise", "gants-croise", "bottes-croise"], // torse + gants + bottes
    bonus: {
      declencheur: "frappeMelee",
      texte: "When hit by a melee attack, the attacker is Dazzled (1 Confusion).",
      effets: [{ type: "confusion", valeur: 1 }],
    },
  },
  // Set de Sang : bonus VAMPIRIQUE. Chaque combo de saignement (frapper un ennemi
  // qui saigne déjà avec une carte de saignement → dégâts bonus) soigne le héros
  // d'AUTANT. Réintroduit le soin par saignement, gated derrière le set complet —
  // l'« item spécifique » que le concept réservait. Récompense directe du moteur sang.
  sang: {
    id: "sang",
    nom: "Blood Set",
    pieces: ["plate-sang", "gants-sang", "bottes-sang"], // torse + gants + bottes
    bonus: {
      declencheur: "saignementCombo",
      texte: "When a Bleed combo deals bonus damage, heal the hero for that amount.",
      effets: [{ type: "soin", ratio: 1 }],
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
  if (d.armureDepart) lignes.push(`+${d.armureDepart} Stone at combat start`);
  if (d.passifPropre) lignes.push(d.passifPropre.texte);
  return lignes;
}
