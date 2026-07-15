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

// VALEUR DE RÉFÉRENCE des objets — fixée à la MAIN dans le classeur Excel (onglet
// « Valeurs »), régénérée dans data/valeurs.js par outils/importer_valeurs.py.
// Cf. valeurEstimee() / prixVente() plus bas.
import { VALEUR_OBJET } from "./valeurs.js";
import { multQualite, RECETTES } from "./recettes.js";

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
  outil: "outil",   // pioche & co (slot dédié, sert au minage en mine)
  // (pas de "ressource" ici : les minerais ne s'équipent pas → equiper() renvoie false)
};

// Les minerais « de base » (ids d'items "ressource") — tirés par défaut dans les mines.
// Tous les minerais, du plus commun au plus rare (cf. ITEMS plus bas).
export const MINERAIS = [
  "pierre-taillee", "charbon", "cuivre", "fer", "argent", "or",
  "malachite", "lapis", "amethyste", "titane", "emeraude", "rubis",
  "saphir", "diamant", "mithril", "onyx", "pierre-solaire",
];

// Rang favorisé à une profondeur donnée : monte ~+0,9 / étage.
function cibleRang(profondeur) { return 1 + (profondeur - 1) * 0.9; }

// De combien le rang favorisé peut dépasser celui d'un minerai avant qu'il
// DISPARAISSE de la mine. Sans ça, les minerais communs (pierre, charbon…)
// restaient possibles à l'infini → liste ingérable en profondeur. Avec cette
// fenêtre, les premiers minerais s'effacent après quelques étages : à FENETRE=4,
// la pierre taillée (rang 1) disparaît vers l'étage 6, le fer (rang 4) vers le 9,
// les gemmes (rang 7-9) tiennent jusqu'aux étages 13-15. Réglable.
const FENETRE_MINERAI = 4;

// Minerais réellement trouvables à une profondeur : bornés EN BAS par `profMin`
// (déjà introduit) ET EN HAUT par la fenêtre (pas trop « dépassé » en rareté).
// Filet de sécurité : si tout est filtré (fond très profond), on garde au moins
// les minerais du plus haut rang disponible → la mine n'est jamais vide.
export function minerauxDisponibles(profondeur, ids = MINERAIS) {
  const cible = cibleRang(profondeur);
  const base = ids.map(itemDef).filter((m) => m && (m.profMin ?? 1) <= profondeur);
  let dispo = base.filter((m) => (m.rang ?? 1) >= cible - FENETRE_MINERAI);
  if (!dispo.length && base.length) {
    const maxRang = Math.max(...base.map((m) => m.rang ?? 1));
    dispo = base.filter((m) => (m.rang ?? 1) >= maxRang - 1);
  }
  return dispo;
}

// Minerai EMBLÉMATIQUE de chaque grotte à thème : il a une chance BONUS d'apparaître
// dans sa grotte (à condition d'être déjà trouvable à cette profondeur). Le rubis
// aime la lave (grotte de feu), le diamant le cristal, le lapis-lazuli la glace,
// et le titane la mine inondée.
const MINERAI_THEME = { lave: "rubis", cristal: "diamant", glace: "lapis", inondee: "titane" };
const BONUS_THEME = 0.15; // +15 points de probabilité au minerai emblématique

// Probabilités (poids normalisés) des minerais disponibles à une profondeur.
// Applique le bonus de grotte à thème s'il y a lieu. Renvoie [{ def, p }].
function probasMinerais(profondeur, ids, theme) {
  const dispo = minerauxDisponibles(profondeur, ids);
  if (!dispo.length) return [];
  const cible = cibleRang(profondeur);
  const poids = dispo.map((m) => 1 / (1 + Math.abs((m.rang ?? 1) - cible)) ** 1.6);
  const total = poids.reduce((s, w) => s + w, 0) || 1;
  let prob = poids.map((w) => w / total);
  // Bonus de grotte à thème : +BONUS_THEME au minerai emblématique s'il est trouvable
  // ici ; les autres sont réduits proportionnellement pour garder une somme de 1.
  const favori = theme && MINERAI_THEME[theme];
  if (favori) {
    const j = dispo.findIndex((m) => m.id === favori);
    if (j >= 0 && prob[j] < 1) {
      const cibleP = Math.min(1, prob[j] + BONUS_THEME);
      const reste = 1 - prob[j];
      const facteur = reste > 0 ? (1 - cibleP) / reste : 0;
      prob = prob.map((p, k) => (k === j ? cibleP : p * facteur));
    }
  }
  return dispo.map((def, i) => ({ def, p: prob[i] }));
}

// Tire le minerai d'une veine selon la PROFONDEUR. Chaque minerai apparaît dans sa
// FENÊTRE de profondeur (cf. minerauxDisponibles) ; à l'intérieur, plus le rang est
// proche du rang favorisé (≈ profondeur), plus il est probable. `ids` = table de
// drop de la zone. `theme` = grotte à thème (bonus au minerai emblématique).
export function tirerMinerai(profondeur, ids = MINERAIS, theme = null) {
  const probas = probasMinerais(profondeur, ids, theme);
  if (!probas.length) return ids[0];
  let r = Math.random();
  for (const { def, p } of probas) { r -= p; if (r <= 0) return def.id; }
  return probas[probas.length - 1].def.id;
}

// Distribution des minerais à une profondeur : [{ id, pct }] trié du plus probable
// au moins probable (pour l'indicateur HUD « minerais trouvables à l'étage »).
// `pct` = chance qu'une veine donnée soit ce minerai (pas une garantie de présence).
// `theme` : reflète aussi le bonus de grotte pour que le HUD colle au vrai tirage.
export function distributionMinerais(profondeur, ids = MINERAIS, theme = null) {
  return probasMinerais(profondeur, ids, theme)
    .map(({ def, p }) => ({ id: def.id, pct: Math.round(p * 100) }))
    .filter((e) => e.pct >= 1)            // on n'affiche pas le bruit < 1 %
    .sort((a, b) => b.pct - a.pct);
}

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
  // ---- Outils (slot "outil") : pas de cartes, ils servent HORS combat ----
  // Pioche de base : permet de MINER les veines des mines (cf. docs/mines.md).
  "pioche-basique": {
    id: "pioche-basique", nom: "Basic Pickaxe", categorie: "outil", rarete: "commun",
    taille: { l: 1, h: 2 }, icone: "#9aa0a6",
    minage: 1, // rendement de minage (1 minerai/coup ; de meilleurs outils plus tard)
  },
  // ---- Ressources (minerais) : objets de sac, EMPILABLES (pile 10), NON équipables.
  // Se rangent/déplacent comme tout objet ; aucun slot d'équipement.
  // `famille` (pierre/metal/gemme) · `rang` (rareté croissante 1→12) · `profMin`
  // (profondeur de mine minimale d'apparition). Servent à la génération des veines.
  "pierre-taillee": { id: "pierre-taillee", nom: "Cut Stone",    categorie: "ressource", famille: "pierre", rang: 1,  profMin: 1,  rarete: "commun",   taille: { l: 1, h: 1 }, icone: "#8a857c", empilable: true, pileMax: 10 },
  "charbon":        { id: "charbon",        nom: "Coal",         categorie: "ressource", famille: "pierre", rang: 2,  profMin: 1,  rarete: "commun",   taille: { l: 1, h: 1 }, icone: "#3a3a42", empilable: true, pileMax: 10 },
  "cuivre":         { id: "cuivre",         nom: "Copper",       categorie: "ressource", famille: "metal",  rang: 3,  profMin: 1,  rarete: "commun",   taille: { l: 1, h: 1 }, icone: "#c0703a", empilable: true, pileMax: 10 },
  "fer":            { id: "fer",            nom: "Iron",         categorie: "ressource", famille: "metal",  rang: 4,  profMin: 1,  rarete: "commun",   taille: { l: 1, h: 1 }, icone: "#b9b2a6", empilable: true, pileMax: 10 },
  "argent":         { id: "argent",         nom: "Silver",       categorie: "ressource", famille: "metal",  rang: 5,  profMin: 2,  rarete: "uncommon", taille: { l: 1, h: 1 }, icone: "#cdd2d6", empilable: true, pileMax: 10 },
  "or":             { id: "or",             nom: "Gold",         categorie: "ressource", famille: "metal",  rang: 6,  profMin: 3,  rarete: "uncommon", taille: { l: 1, h: 1 }, icone: "#e8c54f", empilable: true, pileMax: 10 },
  "malachite":      { id: "malachite",      nom: "Malachite",    categorie: "ressource", famille: "gemme",  rang: 7,  profMin: 4,  rarete: "rare",     taille: { l: 1, h: 1 }, icone: "#2fa86a", empilable: true, pileMax: 10 },
  "lapis":          { id: "lapis",          nom: "Lapis Lazuli", categorie: "ressource", famille: "gemme",  rang: 7,  profMin: 4,  rarete: "rare",     taille: { l: 1, h: 1 }, icone: "#2a4bbf", empilable: true, pileMax: 10 },
  "amethyste":      { id: "amethyste",      nom: "Amethyst",     categorie: "ressource", famille: "gemme",  rang: 7,  profMin: 4,  rarete: "rare",     taille: { l: 1, h: 1 }, icone: "#9a5fd0", empilable: true, pileMax: 10 },
  "titane":         { id: "titane",         nom: "Titanium",     categorie: "ressource", famille: "metal",  rang: 8,  profMin: 5,  rarete: "rare",     taille: { l: 1, h: 1 }, icone: "#8fa0ad", empilable: true, pileMax: 10 },
  "emeraude":       { id: "emeraude",       nom: "Emerald",      categorie: "ressource", famille: "gemme",  rang: 9,  profMin: 6,  rarete: "rare",     taille: { l: 1, h: 1 }, icone: "#18a558", empilable: true, pileMax: 10 },
  "rubis":          { id: "rubis",          nom: "Ruby",         categorie: "ressource", famille: "gemme",  rang: 9,  profMin: 6,  rarete: "rare",     taille: { l: 1, h: 1 }, icone: "#d12f4a", empilable: true, pileMax: 10 },
  "saphir":         { id: "saphir",         nom: "Sapphire",     categorie: "ressource", famille: "gemme",  rang: 10, profMin: 7,  rarete: "epique",   taille: { l: 1, h: 1 }, icone: "#2f6fd1", empilable: true, pileMax: 10 },
  "diamant":        { id: "diamant",        nom: "Diamond",      categorie: "ressource", famille: "gemme",  rang: 11, profMin: 8,  rarete: "epique",   taille: { l: 1, h: 1 }, icone: "#bfe6f0", empilable: true, pileMax: 10 },
  "mithril":        { id: "mithril",        nom: "Mithril",      categorie: "ressource", famille: "metal",  rang: 11, profMin: 8,  rarete: "epique",   taille: { l: 1, h: 1 }, icone: "#acc6d4", empilable: true, pileMax: 10 },
  "onyx":           { id: "onyx",           nom: "Onyx",         categorie: "ressource", famille: "gemme",  rang: 12, profMin: 10, rarete: "epique",   taille: { l: 1, h: 1 }, icone: "#1a1a22", empilable: true, pileMax: 10 },
  // Sunstone : la gemme de LUMIÈRE — pendant clair de l'Onyx. La plus rare lueur
  // du fond de mine (là où les nains ne voient jamais le soleil). Cœur des armes/
  // armures qui jouent sur la LUMIÈRE (soin, gloire, saint). Épique, gemme.
  "pierre-solaire": { id: "pierre-solaire", nom: "Sunstone",     categorie: "ressource", famille: "gemme",  rang: 12, profMin: 10, rarete: "epique",   taille: { l: 1, h: 1 }, icone: "#f6e6a0", empilable: true, pileMax: 10 },
  // Bois : ressource de CRAFT — ce n'est PAS un minerai (absent de MINERAIS → ne se
  // mine pas). Lâché par les monstres pour l'instant (cf. tirerButin dans ennemis.js).
  // Sert à forger (ex. Miner's Pick = 3 fer + 2 bois). Empilable comme les minerais.
  "bois":           { id: "bois",           nom: "Wood",         categorie: "ressource", famille: "bois",   rarete: "commun",   prixBase: 5, taille: { l: 1, h: 1 }, icone: "#7a5230", empilable: true, pileMax: 10 },
  // Cuir : ressource de CRAFT lâchée par les mobs `famille: "animal"` (cf.
  // data/butin.js). Comme le bois, hors MINERAIS (jamais dans les veines).
  // TROIS PALIERS de qualité (commun → uncommon → rare) pour bois ET cuir, à
  // utiliser dans les recettes/butins selon la rareté de l'objet.
  "cuir":           { id: "cuir",           nom: "Leather",         categorie: "ressource", famille: "cuir", rarete: "commun",   prixBase: 7,   taille: { l: 1, h: 1 }, icone: "#8a5a34", empilable: true, pileMax: 10 },
  "cuir-epais":     { id: "cuir-epais",     nom: "Thick Leather",   categorie: "ressource", famille: "cuir", rarete: "uncommon", prixBase: 40,  taille: { l: 1, h: 1 }, icone: "#6a4020", empilable: true, pileMax: 10 },
  "cuir-etrange":   { id: "cuir-etrange",   nom: "Strange Leather", categorie: "ressource", famille: "cuir", rarete: "rare",     prixBase: 130, taille: { l: 1, h: 1 }, icone: "#7a5a86", empilable: true, pileMax: 10 },
  "bois-sombre":    { id: "bois-sombre",    nom: "Dark Wood",       categorie: "ressource", famille: "bois", rarete: "uncommon", prixBase: 35,  taille: { l: 1, h: 1 }, icone: "#4a3520", empilable: true, pileMax: 10 },
  "bois-enchante":  { id: "bois-enchante",  nom: "Enchanted Wood",  categorie: "ressource", famille: "bois", rarete: "rare",     prixBase: 120, taille: { l: 1, h: 1 }, icone: "#4a8a7a", empilable: true, pileMax: 10 },

  // ---- Trésors : objets RARES qui NE S'ÉQUIPENT PAS et NE SERVENT À RIEN, sinon
  // à être REVENDUS. La catégorie "tresor" n'est dans AUCUN slot (SLOT_PAR_CATEGORIE)
  // → equiper() les refuse ; le menu d'inventaire ne propose donc que Sell/Discard.
  // Leur valeur suit la table par rareté (data/valeurs.js, éditable dans le
  // classeur) comme tout objet vendable — ils se revendent (marchand/HV) à
  // −20/−30 % de cette valeur. Non empilables (pièce unique). Butin à venir.
  "idole-doree":    { id: "idole-doree",    nom: "Gilded Idol",     categorie: "tresor", rarete: "rare", taille: { l: 2, h: 2 }, icone: "#e8c54f" },
  "calice-cristal": { id: "calice-cristal", nom: "Crystal Chalice", categorie: "tresor", rarete: "rare", taille: { l: 1, h: 2 }, icone: "#bfe6f0" },
  "chevaliere-ancienne": { id: "chevaliere-ancienne", nom: "Ancient Signet", categorie: "tresor", rarete: "rare", taille: { l: 1, h: 1 }, icone: "#c8862f" },
  // ARNAQUES D'ENCHÈRE : rareté "rare" comme les autres trésors, mais marquées
  // `camelote: true` → prix TRUQUÉS, hors table de valeurs (cf. systems/encheres.js
  // pour l'enchère). `valeurVente` fixe leur revente RÉELLE au marchand/HV :
  // 1 000 🪙 = 10 % de la valeur d'un vrai rare (10 000) — « ça ne vaut presque
  // rien » face au prix payé à l'enchère. L'indice est dans le nom.
  "caillou-flottant": { id: "caillou-flottant", nom: "Floating Pebble", categorie: "tresor", rarete: "rare", camelote: true, valeurVente: 1000, taille: { l: 1, h: 1 }, icone: "#a8b0b8" },
  "remede-vieillesse": { id: "remede-vieillesse", nom: "Elixir of Youth", categorie: "tresor", rarete: "rare", camelote: true, valeurVente: 1000, taille: { l: 1, h: 1 }, icone: "#d97ab0" },

  // ---- Parchemins de craft : objets qu'on OUVRE (« Read ») pour DÉCOUVRIR une
  // recette + un texte de lore. Catégorie "parchemin" hors de tout slot → non
  // équipable ; le menu d'inventaire propose « Read » (+ Discard). Champs :
  //   revele : id du RÉSULTAT dont on montre la recette (cf. data/recettes.js)
  //   lore   : petit texte d'ambiance sur l'objet fabriqué
  //   illustration : (optionnel) image du parchemin, dessinée plus tard
  "parchemin-pioche": {
    id: "parchemin-pioche", nom: "Recipe: Miner's Pick", categorie: "parchemin",
    rarete: "commun", taille: { l: 1, h: 2 }, icone: "#c9b079",
    revele: "pioche-de-mineur",
    lore: "The first tool any dwarfling forges. Three bars of honest iron laid " +
      "flat, two shafts of surface-wood beneath — simple as stone, stubborn as the " +
      "mountain. Master this, and the veins of the Deep will not stay hidden long.",
    // illustration: "images/parchemins/pioche.webp",  // dessin à venir
  },

  // Croc de basilic : arme à poison (moteur de stacks). 6× Venom Stab + 2× Poison
  // Dance (AOE) + 1× Weakness Exploitation + 1× Explosion Of Poison (détonateur répétable).
  "croc-de-basilic": {
    id: "croc-de-basilic", nom: "Basilisk Fang", categorie: "arme", rarete: "rare",
    taille: { l: 1, h: 2 }, icone: "#4f7a3a",
    degats: 4, mains: 1, sousType: "dague",
    // Combo : si UNE AUTRE dague est équipée en off-hand → +5 Force permanente au combat.
    comboArme: { type: "dagueOffhand", forcePerm: 5, texte: "Twin fang: +5 permanent Strength if another dagger is in your off-hand." },
    cartes: ["coup-venimeux", "coup-venimeux", "coup-venimeux", "coup-venimeux", "coup-venimeux", "coup-venimeux", "danse-empoisonnee", "danse-empoisonnee", "exploitation-faiblesses", "explosion-poison"],
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

  // ---- Nouvelles armes à DEUX MAINS (sans off-hand → plus de cartes, valeurs ~1.5×) ----
  // Claymore (Uncommon) : build Force qui monte + multi-coups (7 cartes).
  "epee-large": {
    id: "epee-large", nom: "Claymore", categorie: "arme", rarete: "uncommon", revueArmes2H: true,
    taille: { l: 1, h: 3 }, icone: "#aeb4bc", degats: 7, mains: 2,
    cartes: ["taillade-large", "taillade-large", "volee-d-acier", "volee-d-acier", "elan-du-guerrier", "frappe-decisive", "prendre-l-avance"],
  },
  // Halberd (Uncommon) : allonge (transperce + AOE) + contrôle (gel) + saignement (8 cartes).
  "hallebarde": {
    id: "hallebarde", nom: "Halberd", categorie: "arme", rarete: "uncommon", revueArmes2H: true,
    taille: { l: 1, h: 3 }, icone: "#9a8f7a", degats: 6, mains: 2,
    cartes: ["estoc", "estoc", "ouvrir-les-plaies", "balayage-large", "balayage-large", "coup-de-croc", "coup-de-croc", "position-de-garde"],
  },
  // Siege Maul (Rare) : tank Pierre → la Pierre devient dégâts et contrôle (7 cartes).
  "marteau-de-siege": {
    id: "marteau-de-siege", nom: "Siege Maul", categorie: "arme", rarete: "rare", revueArmes2H: true,
    taille: { l: 1, h: 3 }, icone: "#787870", degats: 9, mains: 2,
    pierreParTour: 2, // passif : +2 Pierre au début de chaque tour tant qu'elle est équipée
    cartes: ["rempart", "rempart", "frappe-sismique", "frappe-sismique", "frappe-de-roche", "frappe-de-roche", "tremblement"],
  },
  // Great Scythe (Epic) : saignement de masse + exécution + récolte d'âmes (8 cartes).
  "grande-faux": {
    id: "grande-faux", nom: "Great Scythe", categorie: "arme", rarete: "epique", revueArmes2H: true,
    taille: { l: 1, h: 3 }, icone: "#5a6a5a", degats: 8, mains: 2,
    cartes: ["faux-sinistre", "faux-sinistre", "faux-sinistre", "arc-de-faux", "arc-de-faux", "sentence-de-mort", "moisson", "fauche-d-ames"],
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
  // 2× Onyx Breath + 1× All Should Be Fire. Donne 36 Pierre de départ.
  "plate-onyx": {
    id: "plate-onyx", nom: "Onyx Guard Plate", categorie: "armure", rarete: "epique",
    taille: { l: 2, h: 2 }, icone: "#3b4250",
    planche: "images/heros/nain-onyx.png",
    armureDepart: 36,
    pierreParTour: 10, // passif : +10 Pierre au début de chaque tour
    cartes: ["onyx-armor", "onyx-armor", "onyx-armor", "embrasement-dragon", "souffle-onyx", "souffle-onyx", "tout-en-feu"],
  },
  // Maille de forge : armure tank. 3× Mail Armor (Pierre/ennemi) + 1× Quench
  // (Chaleur → Pierre ×10) + 2× Heavy Armor (gros bloc). Donne 22 Pierre de départ.
  "maille-de-forge": {
    id: "maille-de-forge", nom: "Forgemaster's Mail", categorie: "armure", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#7a4a2a",
    planche: "images/heros/nain-forge.png",
    armureDepart: 22,
    pierreParTour: 5, // passif : +5 Pierre au début de chaque tour
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
  // de l'énergie). Build tempo/mobilité. Bonus passif : +15% célérité, +3 move speed.
  "bottes-vives": {
    id: "bottes-vives", nom: "Swift Boots", categorie: "botte", rarete: "uncommon",
    taille: { l: 2, h: 1 }, icone: "#3a7a5a",
    agilite: 7, vitesseDeplPct: 20,
    cartes: ["celerite-vive", "celerite-vive", "celerite-vive", "second-souffle"],
  },
  // Bottes d'onyx : pièce du set Onyx. 1× Burning Run + 1× Flaming Kick +
  // 2× Fire Boost (feu héros → énergie) + 2× Boost (relance d'énergie). Build feu.
  // Bonus passif : +18 Agility, +50% move speed.
  "bottes-onyx": {
    id: "bottes-onyx", nom: "Onyx Boots", categorie: "botte", rarete: "epique",
    taille: { l: 2, h: 1 }, icone: "#2b2433",
    agilite: 18, vitesseDeplPct: 50,
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
  // Bonus passif : +20% célérité, +5 move speed.
  "bottes-de-maille": {
    id: "bottes-de-maille", nom: "Mail Boots", categorie: "botte", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#8a8f98",
    agilite: 10, vitesseDeplPct: 15,
    cartes: ["celerite-vive", "celerite-vive", "avantage-maille", "boost", "boost"],
  },

  // ---- Chevalier Croisé : set LUMIÈRE — Confusion + soutien (soin/purif) ------
  // Crusader Plate (torse) : 1× Heavy Armor + 3× Armor of light + 1× Blinding
  // Flash + 1× Holy light. +30 Pierre de départ. Skin provisoire = nain de base.
  "plate-croise": {
    id: "plate-croise", nom: "Crusader Plate", categorie: "armure", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#e8d9a0",
    planche: "images/heros/nain.png",
    armureDepart: 30,
    pierreParTour: 6, // passif : +6 Pierre au début de chaque tour
    cartes: ["armure-lourde", "armure-de-lumiere", "armure-de-lumiere", "armure-de-lumiere", "eclair-aveuglant", "lumiere-sacree"],
  },
  // Crusader Gauntlets (gants) : 2× Master's Hand + 1× Halo Burst + 2× Lay on Hands.
  "gants-croise": {
    id: "gants-croise", nom: "Crusader Gauntlets", categorie: "gant", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#e8d9a0",
    cartes: ["main-de-maitre", "main-de-maitre", "eclat-de-halo", "imposition-des-mains", "imposition-des-mains"],
  },
  // Crusader Greaves (bottes) : 1× Quicken + 2× Kick of light + 2× Boost.
  // Bonus passif : +20% célérité, +5 move speed.
  "bottes-croise": {
    id: "bottes-croise", nom: "Crusader Greaves", categorie: "botte", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#e8d9a0",
    agilite: 12, vitesseDeplPct: 25,
    cartes: ["celerite-vive", "coup-de-lumiere", "coup-de-lumiere", "boost", "boost"],
  },

  // ---- Set de Sang : build SAIGNEMENT rare (à coupler à une arme à saignement)
  // Blood Plate (torse) : 2× Heavy Armor + 2× Sanguine Guard + 1× Bloodbath +
  // 1× Drink blood. +20 Pierre de départ. Skin provisoire = nain de base.
  "plate-sang": {
    id: "plate-sang", nom: "Blood Plate", categorie: "armure", rarete: "rare",
    taille: { l: 2, h: 2 }, icone: "#7a1320",
    planche: "images/heros/nain.png",
    armureDepart: 20,
    pierreParTour: 4, // passif : +4 Pierre au début de chaque tour
    cartes: ["armure-lourde", "armure-lourde", "garde-sanguine", "garde-sanguine", "bain-de-sang", "boire-le-sang"],
  },
  // Blood Gauntlets (gants) : 2× Open Veins + 2× Contagion + 1× Blood Absorption.
  "gants-sang": {
    id: "gants-sang", nom: "Blood Gauntlets", categorie: "gant", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#7a1320",
    cartes: ["ouvrir-les-veines", "ouvrir-les-veines", "contagion", "contagion", "absorption-de-sang"],
  },
  // Blood Greaves (bottes) : 1× Blood Slide + 2× Blood Rush + 1× Quicken + 1× Boost.
  // Bonus passif : +20% célérité, +5 move speed.
  "bottes-sang": {
    id: "bottes-sang", nom: "Blood Greaves", categorie: "botte", rarete: "rare",
    taille: { l: 2, h: 1 }, icone: "#7a1320",
    agilite: 12, vitesseDeplPct: 25,
    cartes: ["glissade-sur-sang", "ruee-de-sang", "ruee-de-sang", "celerite-vive", "boost"],
  },

  // ============================================================================
  // ITEMS GÉNÉRIQUES (commons / uncommons) — `nouveau: true` = surligné dans l'Excel.
  // Rangés par archétype pour que les COMBINAISONS créent des métas (poison, feu,
  // gel, saignement, Force, bloc/Stone Fist, énergie, tempo/pioche, sustain/régen).
  // ============================================================================

  // ---- Armes — une main : COMMONS (15) ---------------------------------------
  "epee-courte": { id: "epee-courte", nom: "Short Sword", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#b8bcc4", mains: 1, cartes: ["taillade", "taillade", "frappe", "frappe", "frappe"] },
  "gourdin": { id: "gourdin", nom: "Wooden Club", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#7a5a3a", mains: 1, cartes: ["coup-lourd", "frappe", "frappe", "frappe", "garde"] },
  "lance": { id: "lance", nom: "Spear", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#9a8a6a", mains: 1, cartes: ["taillade", "frappe", "frappe", "transpercement", "transpercement"] },
  "hachette": { id: "hachette", nom: "Hatchet", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#8a7a5a", mains: 1, cartes: ["double-frappe", "double-frappe", "frappe", "frappe"] },
  "masse": { id: "masse", nom: "Mace", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#9aa0a6", mains: 1, cartes: ["coup-lourd", "coup-lourd", "garde", "garde", "fracas"] },
  "dague-rouillee": { id: "dague-rouillee", nom: "Rusty Dagger", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#6a7a4a", mains: 1, sousType: "dague", cartes: ["dard-empoisonne", "dard-empoisonne", "frappe", "frappe"] },
  "couteau-serpent": { id: "couteau-serpent", nom: "Serpent Knife", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#5a7a3a", mains: 1, sousType: "dague", cartes: ["dard-empoisonne", "dard-empoisonne", "dard-empoisonne", "taillade"] },
  "pic-de-glace": { id: "pic-de-glace", nom: "Ice Pick", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#7fb0d9", mains: 1, cartes: ["eclat-de-glace", "eclat-de-glace", "frappe", "frappe"] },
  "torche": { id: "torche", nom: "Torch", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#d97a2c", mains: 1, cartes: ["braise", "braise", "frappe", "frappe"] },
  "couteau-dentele": { id: "couteau-dentele", nom: "Serrated Knife", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#a05a5a", mains: 1, cartes: ["entaille", "entaille", "frappe", "frappe"] },
  "couperet": { id: "couperet", nom: "Cleaver", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#9a6a6a", mains: 1, cartes: ["entaille", "coup-lourd", "frappe", "frappe"] },
  "epee-entrainement": { id: "epee-entrainement", nom: "Training Sword", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#a8a090", mains: 1, cartes: ["flexion", "frappe", "frappe", "frappe"] },
  "marteau-de-pierre": { id: "marteau-de-pierre", nom: "Stone Hammer", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#8a8a82", mains: 1, cartes: ["choc-de-pierre", "mur-de-fer", "mur-de-fer", "grande-frappe", "grande-frappe"] },
  "baton": { id: "baton", nom: "Quarterstaff", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#9a8a72", mains: 1, cartes: ["frappe", "frappe", "garde", "garde", "mains-vives"] },
  "fourche": { id: "fourche", nom: "Pitchfork", categorie: "arme", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#8a8a6a", mains: 1, cartes: ["transpercement", "transpercement", "entaille", "garde"] },

  // ---- Armes — une main : UNCOMMONS (10) — 1 signature chacune ----------------
  "dague-venin": { id: "dague-venin", nom: "Venomfang Dagger", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#4f8a3a", mains: 1, sousType: "dague", cartes: ["crachat-venimeux", "dard-empoisonne", "dard-empoisonne", "taillade"] },
  "lame-de-givre": { id: "lame-de-givre", nom: "Frostbrand", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#5aa6e0", mains: 1, cartes: ["brise-glace", "eclat-de-glace", "eclat-de-glace", "taillade"] },
  "lame-de-braise": { id: "lame-de-braise", nom: "Emberblade", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#e0681e", mains: 1, cartes: ["entaille-ardente", "braise", "braise", "taillade"] },
  "hache-faucheuse": { id: "hache-faucheuse", nom: "Reaver Axe", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#a04a4a", mains: 1, cartes: ["dechirure", "entaille", "entaille", "taillade"] },
  "hache-berserk": { id: "hache-berserk", nom: "Berserker Axe", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#b8431e", mains: 1, cartes: ["coup-imprudent", "coup-imprudent", "flexion", "taillade", "grande-frappe"] },
  "marteau-guerre": { id: "marteau-guerre", nom: "Warhammer", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#82827a", mains: 1, cartes: ["seisme", "grand-fracas", "mur-de-fer", "mur-de-fer", "grande-frappe"] },
  "dagues-jumelles": { id: "dagues-jumelles", nom: "Twin Daggers", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#b0b4bc", mains: 1, sousType: "dague",
    // Combo jumelle : si la MÊME Twin Dagger est équipée en off-hand → +3 Force permanente.
    comboArme: { type: "memeArme", forcePerm: 3, texte: "Twin combo: +3 permanent Strength if the same Twin Daggers are in your off-hand." },
    cartes: ["volee", "volee", "double-frappe", "grande-frappe", "grande-frappe"] },
  "lame-bourreau": { id: "lame-bourreau", nom: "Executioner's Blade", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#6a4a5a", mains: 1, cartes: ["execution", "execution", "coup-lourd", "taillade", "grande-frappe"] },
  "baguette-cristal": { id: "baguette-cristal", nom: "Crystal Wand", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#7a6ad9", mains: 1, cartes: ["eclair-arcanique", "eclair-arcanique", "etincelle", "grande-frappe"] },
  "fleau-cloute": { id: "fleau-cloute", nom: "Spiked Flail", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#8a5a5a", mains: 1, cartes: ["tourbillon", "tourbillon", "entaille", "grande-frappe", "grande-frappe"] },

  // ---- Armures : COMMONS (4) + UNCOMMONS (3) ---------------------------------
  "armure-cuir": { id: "armure-cuir", nom: "Leather Armor", categorie: "armure", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#7a5a3a", planche: "images/heros/nain.png", armureDepart: 6, cartes: ["garde", "garde", "mur-de-fer"] },
  "gilet-rembourre": { id: "gilet-rembourre", nom: "Padded Vest", categorie: "armure", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#8a7a5a", planche: "images/heros/nain.png", armureDepart: 6, cartes: ["armure-legere", "armure-legere", "mouvement-degage", "flexion"] },
  "cotte-mailles": { id: "cotte-mailles", nom: "Chainmail", categorie: "armure", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#9aa0a6", planche: "images/heros/nain.png", armureDepart: 8, cartes: ["armure-legere", "armure-legere", "armure-legere", "armure-standard"] },
  "armure-peau": { id: "armure-peau", nom: "Hide Armor", categorie: "armure", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#8a6a4a", planche: "images/heros/nain.png", armureDepart: 6, cartes: ["garde", "regeneration"] },
  "plaque-de-fer": { id: "plaque-de-fer", nom: "Basic Iron Plate", categorie: "armure", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#a8aeb8", planche: "images/heros/nain.png", armureDepart: 15, cartes: ["fortification", "armure-standard", "armure-standard", "rebond"] },
  "armure-cloutee": { id: "armure-cloutee", nom: "Spiked Armor", categorie: "armure", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#7a7a72", planche: "images/heros/nain.png", armureDepart: 10, cartes: ["armure-standard", "armure-standard", "armure-standard", "rebond"],
    passifPropre: { declencheur: "frappeMelee", texte: "When hit by a melee attack, the attacker takes 2 damage.", effets: [{ type: "degats", valeur: 2 }] } },
  "peau-berserk": { id: "peau-berserk", nom: "Berserker Hide", categorie: "armure", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#9a5a3a", planche: "images/heros/nain.png", armureDepart: 4, cartes: ["rage-sanguine", "armure-standard", "inarretable", "mouvement-degage"] },

  // ---- Bottes : COMMONS (4) + UNCOMMONS (3) ----------------------------------
  "bottes-usees": { id: "bottes-usees", nom: "Worn Boots", categorie: "botte", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#7a6a52", agilite: 1, vitesseDeplPct: 5, cartes: ["acceleration"] },
  "bottes-cuir": { id: "bottes-cuir", nom: "Leather Boots", categorie: "botte", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#8a6a4a", agilite: 3, vitesseDeplPct: 10, cartes: ["acceleration", "acceleration"] },
  "bottes-voyage": { id: "bottes-voyage", nom: "Traveler Boots", categorie: "botte", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#9a8a6a", agilite: 3, vitesseDeplPct: 15, cartes: ["acceleration", "longue-course"] },
  "sandales": { id: "sandales", nom: "Sandals", categorie: "botte", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#b0a888", agilite: 2, vitesseDeplPct: 8, cartes: ["acceleration", "vent-frais"] },
  "bottes-rapides": { id: "bottes-rapides", nom: "Swift Striders", categorie: "botte", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#4a9d72", agilite: 8, vitesseDeplPct: 30, cartes: ["ruee", "celerite-vive"] },
  "bottes-pierre": { id: "bottes-pierre", nom: "Stonetread Boots", categorie: "botte", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#82827a", agilite: 4, vitesseDeplPct: 8, cartes: ["choc-de-pierre", "garde"] },
  "bottes-braise": { id: "bottes-braise", nom: "Ember Striders", categorie: "botte", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#d9681e", agilite: 6, vitesseDeplPct: 15, cartes: ["braise", "celerite-vive"] },

  // ---- Gants : COMMONS (4) + UNCOMMONS (3) -----------------------------------
  "gants-tissu": { id: "gants-tissu", nom: "Cloth Gloves", categorie: "gant", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#9a8a7a", cartes: ["mains-vives", "mains-vives"] },
  "gants-travail": { id: "gants-travail", nom: "Work Gloves", categorie: "gant", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#8a7a5a", cartes: ["main-de-maitre", "frappe"] },
  "gants-cuir": { id: "gants-cuir", nom: "Leather Gloves", categorie: "gant", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#7a5a3a", cartes: ["mains-vives", "garde"] },
  "gants-cloutes": { id: "gants-cloutes", nom: "Studded Gloves", categorie: "gant", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#8a7a72", cartes: ["frappe", "entaille"] },
  "gants-voleur": { id: "gants-voleur", nom: "Thief's Gloves", categorie: "gant", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#4a7a6a", cartes: ["tour-de-main", "donne-moi-ca"] },
  "gantelets": { id: "gantelets", nom: "Gauntlets", categorie: "gant", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#9aa0a6", cartes: ["coup-de-force", "garde"] },
  "gants-venin": { id: "gants-venin", nom: "Venom Gloves", categorie: "gant", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#4f8a3a", cartes: ["enduit-toxique", "dard-empoisonne"] },

  // ---- Bagues : COMMONS (10) + UNCOMMONS (5) ---------------------------------
  "anneau-de-fer": { id: "anneau-de-fer", nom: "Iron Ring", categorie: "bague", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#9aa0a6", cartes: ["mur-de-fer", "mur-de-fer"] },
  "anneau-etincelle": { id: "anneau-etincelle", nom: "Spark Ring", categorie: "bague", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#3a86d9", cartes: ["etincelle", "etincelle"] },
  "anneau-venin": { id: "anneau-venin", nom: "Venom Ring", categorie: "bague", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#5a8a3a", cartes: ["dard-empoisonne", "dard-empoisonne"] },
  "anneau-braise": { id: "anneau-braise", nom: "Ember Ring", categorie: "bague", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#d97a2c", cartes: ["braise", "braise"] },
  "anneau-frimas": { id: "anneau-frimas", nom: "Frost Band", categorie: "bague", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#7fb0d9", cartes: ["eclat-de-glace", "eclat-de-glace"] },
  "anneau-saignant": { id: "anneau-saignant", nom: "Bleeding Ring", categorie: "bague", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#a05a5a", cartes: ["entaille", "entaille"] },
  "anneau-force": { id: "anneau-force", nom: "Power Ring", categorie: "bague", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#c8843a", cartes: ["flexion", "flexion"] },
  "anneau-pierre": { id: "anneau-pierre", nom: "Stone Ring", categorie: "bague", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#82827a", cartes: ["mur-de-fer", "mur-de-fer"] },
  "anneau-agile": { id: "anneau-agile", nom: "Nimble Ring", categorie: "bague", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#4a9d72", cartes: ["mains-vives", "mains-vives"] },
  "anneau-vigueur": { id: "anneau-vigueur", nom: "Vigor Ring", categorie: "bague", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#5a9d5a", cartes: ["regeneration", "garde"] },
  "anneau-toxique": { id: "anneau-toxique", nom: "Toxic Ring", categorie: "bague", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#4f8a2a", cartes: ["nuee-toxique", "dard-empoisonne"] },
  "anneau-puissance": { id: "anneau-puissance", nom: "Ring of Might", categorie: "bague", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#d98a2c", cartes: ["galvanisation", "flexion"] },
  "sceau-givre": { id: "sceau-givre", nom: "Frost Signet", categorie: "bague", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#5aa6e0", cartes: ["nova-de-givre", "eclat-de-glace"] },
  "anneau-soif-sang": { id: "anneau-soif-sang", nom: "Bloodthirst Ring", categorie: "bague", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#b0434a", cartes: ["soif-de-sang", "entaille"] },
  "anneau-forge": { id: "anneau-forge", nom: "Forge Ring", categorie: "bague", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#d96a1e", cartes: ["surcharge", "etincelle"] },

  // ---- Colliers : COMMONS (5) + UNCOMMONS (3) --------------------------------
  "collier-cuivre": { id: "collier-cuivre", nom: "Copper Amulet", categorie: "collier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#b87a3a", cartes: ["etincelle"] },
  "pendentif-quartz": { id: "pendentif-quartz", nom: "Quartz Pendant", categorie: "collier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#c8c8d0", cartes: ["etincelle", "mains-vives"] },
  "charme-os": { id: "charme-os", nom: "Bone Charm", categorie: "collier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#c8c0a8", cartes: ["entaille", "enduit-toxique"] },
  "pendentif-chaud": { id: "pendentif-chaud", nom: "Spark Pendant", categorie: "collier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#d98a4a", cartes: ["braise", "etincelle"] },
  "porte-bonheur": { id: "porte-bonheur", nom: "Lucky Charm", categorie: "collier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#5a9d5a", cartes: ["mains-vives", "des-1"] },
  "pendentif-energie": { id: "pendentif-energie", nom: "Energizing Pendant", categorie: "collier", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#3a86d9", cartes: ["boost", "etincelle"] },
  "collier-concentration": { id: "collier-concentration", nom: "Amulet of Focus", categorie: "collier", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#4a7ad9", cartes: ["concentration", "mains-vives"] },
  "pendentif-vampire": { id: "pendentif-vampire", nom: "Vampiric Pendant", categorie: "collier", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 1 }, icone: "#8a3a4a", cartes: ["drain", "entaille"] },

  // ---- Main seconde / Off-hand (boucliers, grimoires, sceptres, torches) ------
  // COMMONS (7) — cartes de base partagées, plutôt défense / utilité / caster.
  "bouclier-bois": { id: "bouclier-bois", nom: "Wooden Shield", categorie: "bouclier", rarete: "commun", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#7a5a3a", cartes: ["garde", "garde", "mur-de-fer"] },
  "targe": { id: "targe", nom: "Buckler", categorie: "bouclier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#9aa0a6", cartes: ["garde", "mains-vives"] },
  "grimoire": { id: "grimoire", nom: "Spellbook", categorie: "bouclier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#3a5ad9", cartes: ["etincelle", "mains-vives"] },
  "fanal": { id: "fanal", nom: "Hand Torch", categorie: "bouclier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#d97a2c", cartes: ["braise", "braise", "flamme-vive"] },
  "sceptre-apprenti": { id: "sceptre-apprenti", nom: "Apprentice Scepter", categorie: "bouclier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 3 }, icone: "#b8a23a", cartes: ["flexion", "etincelle"] },
  "grimoire-soin": { id: "grimoire-soin", nom: "Healing Book", categorie: "bouclier", rarete: "commun", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#5a9d5a", cartes: ["regeneration", "regeneration", "mains-vives"] },
  "bouclier-renforce": { id: "bouclier-renforce", nom: "Reinforced Shield", categorie: "bouclier", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#82827a", cartes: ["mur-de-fer", "mur-de-fer", "mur-de-fer", "mur-bouclier"] },

  // UNCOMMONS (4) — 1 signature chacun.
  "grimoire-flammes": { id: "grimoire-flammes", nom: "Grimoire of Flames", categorie: "bouclier", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#e0681e", cartes: ["boule-de-feu", "braise", "braise"] },
  "sceptre-commandement": { id: "sceptre-commandement", nom: "Scepter of Command", categorie: "bouclier", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 3 }, icone: "#d9a82c", cartes: ["ralliement", "flexion"] },
  "bouclier-protecteur": { id: "bouclier-protecteur", nom: "Warding Shield", categorie: "bouclier", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#4a7a9d", cartes: ["egide", "mur-de-fer", "garde"],
    passifPropre: { declencheur: "frappeMelee", texte: "When hit by a melee attack, the attacker takes 2 damage.", effets: [{ type: "degats", valeur: 2 }] } },
  "grimoire-puissance": { id: "grimoire-puissance", nom: "Tome of Power", categorie: "bouclier", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#7a3ad9", cartes: ["vague-arcanique", "etincelle", "mains-vives"] },

  // ---- NOUVEAUX ITEMS (révision Excel juin) ----------------------------------
  // Holy sword : arme de soutien (soin + dissipation). 1× Regenerate + 1× Healing
  // Cleave + 1× Glory Strike + 2× Slash.
  "epee-sacree": { id: "epee-sacree", nom: "Holy Sword", categorie: "arme", rarete: "uncommon", nouveau: true,
    taille: { l: 1, h: 2 }, icone: "#e6d98a", degats: 6, mains: 1,
    cartes: ["regeneration", "fauchage-soin", "frappe-de-gloire", "taillade", "taillade"] },

  // ---- Set STONE AGE : torse + gants + bottes ; build « empiler des cartes pierre » -
  // Bonus de set : tous les 10 cartes pierre jouées, stun de TOUS les ennemis 1 tour.
  "armure-stone-age": { id: "armure-stone-age", nom: "Stone Armor", categorie: "armure", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 2 }, icone: "#82827a", planche: "images/heros/nain.png", armureDepart: 12,
    cartes: ["caillou", "caillou", "caillou", "caillou", "caillou", "caillou", "tas-de-pierres", "tas-de-pierres", "tas-de-pierres", "coagulation-pierre"] },
  "gants-stone-age": { id: "gants-stone-age", nom: "Stone Glove", categorie: "gant", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#82827a",
    cartes: ["caillou", "caillou", "caillou", "tas-de-pierres", "vente-de-cailloux"] },
  "bottes-stone-age": { id: "bottes-stone-age", nom: "Stone Boots", categorie: "botte", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#82827a", agilite: 3, vitesseDeplPct: 6,
    cartes: ["caillou", "caillou", "caillou", "tas-de-pierres", "fonte-de-pierres"] },

  // Lucky glove : gants « hasard » (énergie aléatoire + pioche filtrée).
  "gants-chance": { id: "gants-chance", nom: "Lucky Glove", categorie: "gant", rarete: "uncommon", nouveau: true,
    taille: { l: 2, h: 1 }, icone: "#5ad98a",
    cartes: ["des-1", "des-2", "pioche-chanceuse"] },
};

// ─── PARCHEMINS DE RECETTE (auto-générés) ─────────────────────────────────────
// UN parchemin par recette : le LIRE apprend la recette (cf. ui/parchemin.js +
// systems/bibliotheque.js). Générés à partir de RECETTES pour rester TOUJOURS
// synchro : ajouter une recette crée son parchemin sans rien toucher d'autre.
// Ils apparaissent tout seuls dans l'onglet « Scrolls » du marchand
// (menuCategorie liste tout objet categorie:"parchemin"). Valeur par rareté.
const VALEUR_PARCHEMIN = { commun: 20, uncommon: 60, rare: 180, epique: 600, legendaire: 1800 };
// Résultats DÉJÀ couverts par un parchemin FAIT MAIN (ex. parchemin-pioche, avec
// son lore soigné) : on ne les regénère pas (pas de doublon, on garde le fait main).
const dejaRevele = new Set(
  Object.values(ITEMS).filter((it) => it.categorie === "parchemin").map((it) => it.revele),
);
for (const r of RECETTES) {
  const res = ITEMS[r.resultat];
  if (!res) continue;                          // recette sans objet connu → on saute
  if (dejaRevele.has(r.resultat)) continue;    // déjà un parchemin fait main pour ce résultat
  const id = "parchemin-" + r.resultat;
  if (ITEMS[id]) continue;                      // sécurité : id déjà pris
  const rarete = res.rarete ?? "commun";
  const valeur = VALEUR_PARCHEMIN[rarete] ?? 20;
  ITEMS[id] = {
    id,
    nom: `Recipe: ${res.nom}`,
    categorie: "parchemin",
    rarete,
    taille: { l: 1, h: 1 },
    icone: "#c9a24a",                           // parchemin (tan doré) — vraie icône plus tard
    revele: r.resultat,                          // ce que le parchemin enseigne (→ ouvrirParchemin)
    lore: `Aged forging instructions for the ${res.nom}. Read it to learn the recipe.`,
    valeur,
    valeurVente: Math.max(1, Math.round(valeur * 0.4)),
  };
}

export function itemDef(id) {
  return ITEMS[id] ?? null;
}

// Couleur de rareté d'un item (pour la bordure de son icône).
export function couleurRarete(id) {
  const it = ITEMS[id];
  return (it && RARETES[it.rarete]?.couleur) || "#9aa0a6";
}

// VALEUR & PRIX — modèle (décision Brioche 09/07/2026) :
//   • VALEUR de référence = ce que vaut l'objet (≈ prix d'achat / « trouvé chez
//     un marchand »). Elle est FIXÉE OBJET PAR OBJET dans le classeur Excel
//     (onglet « Valeurs » → data/valeurs.js), semée autour d'une cible par
//     rareté (VALEUR_RARETE) avec ± 20 % pour que deux objets diffèrent, puis
//     ajustable à la main.
//   • Le PRIX DE VENTE (le joueur VEND) vaut TOUJOURS moins que la valeur :
//     −25 % au marchand (`MARGE_MARCHAND`), −10 à −20 % à l'HV (le patient
//     gagne un peu plus, cf. systems/marche.js). Aux ENCHÈRES la règle ne
//     s'applique pas : c'est la Luck qui décide (cf. systems/encheres.js).
const VALEUR_RARETE = { commun: 400, uncommon: 2000, rare: 10000, epique: 80000, legendaire: 250000 };
const MARGE_MARCHAND = 0.75; // le marchand paie 75 % de la valeur (−25 %)

// Valeur de RÉFÉRENCE de base (SANS qualité). `valeurVente` (fixé main :
// arnaques) court-circuite tout ; sinon la table Excel ; sinon la cible de la
// rareté (secours).
function valeurBase(id) {
  const it = ITEMS[id];
  if (!it) return 0;
  if (it.valeurVente != null) return it.valeurVente;
  return VALEUR_OBJET[id] ?? VALEUR_RARETE[it.rarete] ?? 1;
}

// Valeur de référence d'un EXEMPLAIRE : base × bonus de qualité de forge (un
// objet forgé Artisan/Master/Exceptional vaut +15/+30/+60 %, cf. multQualite).
// `qualite` optionnel : un objet looté (normale/absent) → ×1.
export function valeurEstimee(id, qualite = null) {
  return Math.round(valeurBase(id) * multQualite(qualite));
}

// Prix de revente au MARCHAND (or). `valeurVente` = prix fixé main (arnaques :
// on récupère pile ça, × qualité). Sinon valeur × marge marchand × qualité.
export function prixVente(id, qualite = null) {
  const it = ITEMS[id];
  if (!it) return 0;
  const base = it.valeurVente != null ? it.valeurVente : valeurBase(id) * MARGE_MARCHAND;
  return Math.max(1, Math.round(base * multQualite(qualite)));
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
      texte: "When hit by a melee attack, the attacker has a 50% chance to be Dazzled (1 Confusion).",
      effets: [{ type: "confusion", valeur: 1, proba: 0.5 }],
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
  // Set Stone Age : build « pierre ». Le bonus récompense d'empiler les cartes
  // pierre — à chaque palier de 10 cartes pierre jouées, tout le monde est figé.
  stoneAge: {
    id: "stoneAge",
    nom: "Stone Age Set",
    pieces: ["armure-stone-age", "gants-stone-age", "bottes-stone-age"], // torse + gants + bottes
    bonus: {
      declencheur: "paliersPierre",
      texte: "Every 10 Stone cards played in a combat, stun ALL enemies for 1 turn.",
      effets: [{ type: "stun", valeur: 1 }],
    },
  },
};

// Les bonus de set ACTIFS pour un équipement donné : ceux dont TOUTES les pièces
// sont équipées. `slots` = inv.slots ({ armure, gant, botte, ... }).
export function setsActifs(slots) {
  const equipes = new Set(Object.values(slots || {}).filter(Boolean));
  return Object.values(SETS).filter((s) => s.pieces.every((id) => equipes.has(id)));
}

// Combo d'arme ACTIF (Force permanente au combat) selon les deux mains équipées.
// L'arme principale (arme1) porte un `comboArme` { type, forcePerm, texte } :
//   - "memeArme"     : la MÊME arme est aussi en off-hand (ex. Twin Daggers, +3).
//   - "dagueOffhand" : une dague (sousType "dague") est en off-hand (ex. Basilisk Fang, +5).
// Renvoie le comboArme (avec son bonus + texte) s'il est actif, sinon null.
export function comboArmeActif(slots) {
  const a1 = ITEMS[slots?.arme1];
  const a2 = ITEMS[slots?.arme2];
  const combo = a1?.comboArme;
  if (!combo) return null;
  if (combo.type === "memeArme" && slots.arme1 === slots.arme2) return combo;
  if (combo.type === "dagueOffhand" && a2?.sousType === "dague") return combo;
  return null;
}

// Le set auquel appartient un item (ou null) — pour l'afficher dans sa bulle / le
// catalogue. Un item peut n'appartenir à aucun set.
export function setDeItem(id) {
  return Object.values(SETS).find((s) => s.pieces.includes(id)) ?? null;
}

// Noms lisibles (anglais) pour les bulles d'info.
const NOM_CATEGORIE = {
  arme: "Weapon", bouclier: "Off-hand", armure: "Armor", gant: "Gloves",
  botte: "Boots", collier: "Amulet", bague: "Ring", sac: "Bag",
  ressource: "Resource", tresor: "Valuable", parchemin: "Scroll",
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
// Bonus PASSIFS chiffrés d'un objet (le « stat bonus » permanent tant qu'il est
// équipé) : Pierre au combat / par tour, Agilité, Vitesse de déplacement, passif
// spécial. Partagé par l'infobulle ET l'écran de butin, pour qu'on voie tout de
// suite ce qu'apporte une pièce (ex. des bottes) avant de la ramasser/équiper.
export function bonusPassifs(id) {
  const d = ITEMS[id];
  if (!d) return [];
  const l = [];
  if (d.armureDepart) l.push(`+${d.armureDepart} Stone at combat start`);
  if (d.pierreParTour) l.push(`+${d.pierreParTour} Stone each turn`);
  if (d.agilite) l.push(`+${d.agilite} Agility`);
  if (d.vitesseDeplPct) l.push(`+${d.vitesseDeplPct}% Move Speed`);
  if (d.passifPropre) l.push(d.passifPropre.texte);
  return l;
}

export function statsLisibles(id) {
  const d = ITEMS[id];
  if (!d) return [];
  const lignes = [];
  if (d.categorie === "tresor") lignes.push("A valuable — no use but to sell for gold.");
  if (d.categorie === "parchemin") lignes.push("A recipe scroll — right-click to Read it.");
  if (d.mains === 2) lignes.push("Two-handed");
  if (d.rangsBonus) lignes.push(`+${d.rangsBonus} bag rows`);
  lignes.push(...bonusPassifs(id)); // bonus passifs chiffrés (Pierre, Agilité, Vitesse…)
  return lignes;
}
