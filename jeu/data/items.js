// Catalogue des ITEMS : armes, armures, bijoux, sacs… tout ce qui se loote,
// se range dans l'inventaire et s'équipe. (Contenu pur, comme les cartes.)

import { CARTES } from "./cartes.js";
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
//   cartes    : arme → cartes injectées dans le deck
//   mains     : arme → 1 (une main) ou 2 (deux mains, occupe les 2 slots d'arme)
//   defense   : armure
//   stats     : bonus divers (ex. { chaleurMax: 1 }) — appliqués plus tard
//   rangsBonus: sac → rangées d'inventaire ajoutées

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
    degats: 4, mains: 1, cartes: ["coup-venimeux"], stats: { poison: 4 },
  },
  // Marteau de lave : arme de feu (pas encore de sprite). Injecte « Lava Hammer ».
  // Monte le seuil de surchauffe (4/8) et offre +1 d'énergie de départ.
  "marteau-de-lave": {
    id: "marteau-de-lave", nom: "Magma Hammer", categorie: "arme", rarete: "epique",
    taille: { l: 1, h: 2 }, icone: "#c0431e",
    degats: 6, mains: 1, cartes: ["coup-de-lave"],
    stats: { feu: 4, chaleurSeuil: 1, chaleurDepart: 1 },
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

  // ---- Bijoux & divers (effets de stats : pour l'instant cosmétiques) ----
  "anneau-de-braise": {
    id: "anneau-de-braise", nom: "Ember Ring", categorie: "bague", rarete: "rare",
    taille: { l: 1, h: 1 }, icone: "#d9603a", stats: { chaleurSeuil: 1 },
  },
  "gants-de-mineur": {
    id: "gants-de-mineur", nom: "Miner's Gloves", categorie: "gant", rarete: "commun",
    taille: { l: 2, h: 1 }, icone: "#7a6a4a", stats: {},
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

// Noms lisibles (anglais) pour les bulles d'info.
const NOM_STAT = {
  chaleurSeuil: "Forge Heat threshold",
  chaleurMax: "Forge Heat cap",
  chaleurDepart: "Start energy",
  chaleurRecharge: "Heat / turn",
  poison: "Poison",
  feu: "Burning",
  force: "Strength", agilite: "Agility", foi: "Faith", esprit: "Wit",
};
const NOM_CATEGORIE = {
  arme: "Weapon", bouclier: "Shield", armure: "Armor", gant: "Gloves",
  botte: "Boots", collier: "Amulet", bague: "Ring", sac: "Bag",
};

// Libellé court de catégorie (« Ring », « Weapon »…) pour l'en-tête d'une bulle.
export function categorieLisible(id) {
  const d = ITEMS[id];
  return d ? (NOM_CATEGORIE[d.categorie] ?? d.categorie) : "";
}

// Les effets d'un item en lignes de texte prêtes à afficher (ATK, DEF, stats,
// cartes injectées dans le deck…). Vide si l'objet n'apporte rien de chiffré.
export function statsLisibles(id) {
  const d = ITEMS[id];
  if (!d) return [];
  const lignes = [];
  if (d.degats != null) lignes.push(`+${d.degats} ATK`);
  if (d.defense != null) lignes.push(`+${d.defense} DEF`);
  if (d.mains === 2) lignes.push("Two-handed");
  if (d.rangsBonus) lignes.push(`+${d.rangsBonus} bag rows`);
  if (d.stats) {
    for (const [k, v] of Object.entries(d.stats)) {
      lignes.push(`${v >= 0 ? "+" : ""}${v} ${NOM_STAT[k] ?? k}`);
    }
  }
  if (d.cartes?.length) {
    lignes.push(`Cards: ${d.cartes.map((c) => CARTES[c]?.nom ?? c).join(", ")}`);
  }
  return lignes;
}
