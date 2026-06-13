// Catalogue des ITEMS : armes, armures, bijoux, sacs… tout ce qui se loote,
// se range dans l'inventaire et s'équipe. (Contenu pur, comme les cartes.)
//
// Champs d'un item :
//   id        : identifiant interne
//   nom       : nom affiché (anglais)
//   categorie : détermine sur quel SLOT il s'équipe (voir SLOT_PAR_CATEGORIE)
//   rarete    : "commun" | "rare" | "epique" | "legendaire" (couleur + drop)
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

export const RARETES = {
  commun:     { nom: "Common",    couleur: "#9aa0a6" },
  rare:       { nom: "Rare",      couleur: "#4a90d9" },
  epique:     { nom: "Epic",      couleur: "#9b59b6" },
  legendaire: { nom: "Legendary", couleur: "#e08a1e" },
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
  "hache-rouillee": {
    id: "hache-rouillee", nom: "Rusty Axe", categorie: "arme", rarete: "commun",
    taille: { l: 1, h: 2 }, icone: "#9a6b3a",
    planche: "images/armes/hache.png", degats: 5, mains: 1, cartes: ["coup-de-hache"],
  },
  "marteau-de-forge": {
    id: "marteau-de-forge", nom: "Forge Hammer", categorie: "arme", rarete: "commun",
    taille: { l: 1, h: 2 }, icone: "#8a8f98",
    planche: "images/armes/marteau.png", degats: 4, mains: 1, cartes: ["ecrasement"],
  },
  "pioche-de-mineur": {
    id: "pioche-de-mineur", nom: "Miner's Pick", categorie: "arme", rarete: "commun",
    taille: { l: 1, h: 2 }, icone: "#7d7a72",
    planche: "images/armes/pioche.png", degats: 3, mains: 1, cartes: ["coup-de-pioche"],
  },
  // Croc de basilic : arme à poison (pas encore de sprite). Injecte « Venom Stab ».
  "croc-de-basilic": {
    id: "croc-de-basilic", nom: "Basilisk Fang", categorie: "arme", rarete: "rare",
    taille: { l: 1, h: 2 }, icone: "#4f7a3a",
    degats: 4, mains: 1, cartes: ["coup-venimeux"],
  },
  // Marteau de lave : arme de feu (pas encore de sprite). Injecte « Lava Hammer ».
  "marteau-de-lave": {
    id: "marteau-de-lave", nom: "Magma Hammer", categorie: "arme", rarete: "epique",
    taille: { l: 1, h: 2 }, icone: "#c0431e",
    degats: 6, mains: 1, cartes: ["coup-de-lave"],
  },

  // ---- Armures (changent le skin du nain) ----
  "tenue-de-voyageur": {
    id: "tenue-de-voyageur", nom: "Traveler's Garb", categorie: "armure", rarete: "commun",
    taille: { l: 2, h: 2 }, icone: "#6a5a44",
    planche: "images/heros/nain.png", defense: 0,
  },
  "plate-onyx": {
    id: "plate-onyx", nom: "Onyx Guard Plate", categorie: "armure", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#3b4250",
    planche: "images/heros/nain-onyx.png", defense: 5,
  },
  "maille-de-forge": {
    id: "maille-de-forge", nom: "Forgemaster's Mail", categorie: "armure", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#7a4a2a",
    planche: "images/heros/nain-forge.png", defense: 3,
  },

  // ---- Bijoux & divers (donnent des CARTES, ou une utilité comme le sac) ----
  // Bague de sang : injecte « Bloodletting » (saignement qui soigne le héros).
  "bague-de-sang": {
    id: "bague-de-sang", nom: "Blood Ring", categorie: "bague", rarete: "rare",
    taille: { l: 1, h: 1 }, icone: "#7a1f2b", cartes: ["coup-de-sang"],
  },
  // Gants de mineur : slot « gant » libre ; recevront des cartes plus tard.
  "gants-de-mineur": {
    id: "gants-de-mineur", nom: "Miner's Gloves", categorie: "gant", rarete: "commun",
    taille: { l: 2, h: 1 }, icone: "#7a6a4a",
  },
  "sac-en-cuir": {
    id: "sac-en-cuir", nom: "Leather Pouch", categorie: "sac", rarete: "commun",
    taille: { l: 2, h: 2 }, icone: "#6b4a2b", rangsBonus: 2,
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
const PRIX_VENTE = { commun: 2, rare: 6, epique: 15, legendaire: 40 };
export function prixVente(id) {
  const it = ITEMS[id];
  return it ? (PRIX_VENTE[it.rarete] ?? 1) : 0;
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
