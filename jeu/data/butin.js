// BUTIN DE COMBAT — deux tables, faciles à équilibrer (Brioche, 09/07/2026).
//
// 1) L'OR est donné par le NIVEAU du monstre (pas au cas par cas) : tous les
//    mobs du même niveau lâchent la même fourchette de pièces. Pour ajuster
//    l'or du jeu, on touche UNE table (`OR_PAR_NIVEAU`) au lieu de chaque mob.
//
// 2) Les OBJETS/RESSOURCES sont donnés par le TYPE (la « famille ») du monstre :
//    un gobelin lâche du bois, un animal du cuir… Chaque famille a sa petite
//    table (`BUTIN_FAMILLE`). Un mob peut aussi avoir des drops SPÉCIFIques en
//    plus (son champ `butin.objets`, cf. data/ennemis.js) — ex. une bague rare.
//
// (Échelle calée sur les VALEURS d'objets refondues : cf. docs/concept.md
// « Valeur des objets » et « Audit économie ».)

// ----- 1) OR PAR NIVEAU -------------------------------------------------------
//
// niveau → [min, max] pièces lâchées PAR MONSTRE. Croissance géométrique (~×1,4
// par niveau) : au niveau 1 quelques pièces (l'essentiel du gain vient de la
// REVENTE du loot), puis ça monte pour suivre le contenu profond. Éditable
// ligne par ligne. Au-delà du dernier niveau listé → on garde la dernière ligne.
export const OR_PAR_NIVEAU = {
  1:  [15, 25],
  2:  [20, 30],
  3:  [30, 45],
  4:  [40, 65],
  5:  [60, 90],
  6:  [85, 130],
  7:  [120, 180],
  8:  [170, 260],
  9:  [240, 370],
  10: [340, 530],
  11: [480, 750],
  12: [680, 1050],
  13: [970, 1500],
  14: [1350, 2150],
  15: [1950, 3050],
  16: [2750, 4350],
  17: [3950, 6150],
  18: [5600, 8750],
  19: [7950, 12500],
  20: [11500, 17500],
};

const NIVEAUX = Object.keys(OR_PAR_NIVEAU).map(Number).sort((a, b) => a - b);
const NIVEAU_MAX = NIVEAUX[NIVEAUX.length - 1];

// Fourchette d'or pour un niveau (borne sur la table ; niveau ≤ 0 → rien).
export function orPourNiveau(niveau) {
  const n = Math.max(1, Math.min(NIVEAU_MAX, Math.round(niveau || 1)));
  return OR_PAR_NIVEAU[n] ?? OR_PAR_NIVEAU[NIVEAU_MAX];
}

// Tire l'or lâché par UN monstre de ce niveau.
export function tirerOr(niveau, rng = Math.random) {
  const [min, max] = orPourNiveau(niveau);
  return min + Math.floor(rng() * (max - min + 1));
}

// ----- 2) BUTIN PAR FAMILLE (objets / ressources) -----------------------------
//
// famille → liste de drops possibles. Chaque entrée :
//   id     : l'objet/ressource (cf. data/items.js)
//   chance : proba (0..1) de tomber à chaque kill
//   qte    : [min, max] quantité quand ça tombe (défaut [1, 1])
// Pour donner un nouveau butin à un type de mob : une ligne ici, rien d'autre.
export const BUTIN_FAMILLE = {
  // Les gobelins récupèrent du bois de surface (ressource de craft).
  gobelin: [
    { id: "bois", chance: 0.6, qte: [1, 2] },
  ],
  // Gabarit prêt pour de futurs mobs `famille: "animal"` : ils lâcheront du cuir.
  animal: [
    { id: "cuir", chance: 0.6, qte: [1, 2] },
  ],
  // Les KOBOLDS sont des mineurs : ils portent sur eux ce qu'ils viennent
  // d'extraire. Charbon surtout (ils en brûlent pour leurs chandelles), et de la
  // pierre taillée plus rarement.
  kobold: [
    { id: "charbon", chance: 0.5, qte: [1, 2] },
    { id: "pierre-taillee", chance: 0.25, qte: [1, 1] },
  ],
};

// ----- 3) RECETTES LÂCHÉES PAR LES MONSTRES ----------------------------------
//
// DÉCISION BRIOCHE 28/07/2026 : un monstre ne lâche PLUS d'objets tout faits —
// seulement des RECETTES (parchemins), et rarement. Être noyé sous de
// l'équipement inutile ne sert à rien ; une recette, elle, se garde et se forge
// quand on a les matériaux.
//
// La rareté de la recette dépend du NIVEAU du monstre. Un gobelin de niveau 1 ne
// lâchera jamais mieux que du commun ; il faut descendre profond pour espérer du
// rare. Les recettes ÉPIQUES et LÉGENDAIRES ne tombent d'aucun monstre : elles
// sont réservées aux boss et aux futures quêtes.
//
// `chance` = [au premier niveau du palier, au dernier] — la probabilité MONTE
// avec le niveau à l'intérieur d'un palier. `poids` = tirage pondéré entre les
// raretés possibles (2 contre 1 = deux fois plus souvent).
export const RECETTES_PAR_NIVEAU = [
  { jusquA: 5,  chance: [0.02, 0.05], poids: { commun: 1 } },
  { jusquA: 10, chance: [0.05, 0.09], poids: { commun: 2, uncommon: 1 } },
  { jusquA: 99, chance: [0.09, 0.14], poids: { uncommon: 2, rare: 1 } },
];

// Le palier d'un niveau + la chance interpolée à l'intérieur de ce palier.
function palierRecette(niveau) {
  const n = Math.max(1, Math.round(niveau || 1));
  let bas = 1;
  for (const p of RECETTES_PAR_NIVEAU) {
    if (n <= p.jusquA) {
      const haut = Math.min(p.jusquA, 20);        // au-delà de 20 on plafonne
      const t = haut > bas ? (Math.min(n, haut) - bas) / (haut - bas) : 1;
      const [c0, c1] = p.chance;
      return { chance: c0 + (c1 - c0) * t, poids: p.poids };
    }
    bas = p.jusquA + 1;
  }
  return null;
}

// Tire UNE recette pour un monstre de ce niveau, ou null (le cas le plus fréquent).
// `catalogue` = la liste des parchemins disponibles, groupés par rareté ; elle est
// passée par ennemis.js pour éviter que butin.js dépende de tout le catalogue.
export function tirerRecette(niveau, parchemins, rng = Math.random) {
  const p = palierRecette(niveau);
  if (!p || rng() >= p.chance) return null;
  // Tirage pondéré de la RARETÉ, en ignorant celles dont on n'a aucun parchemin.
  const choix = Object.entries(p.poids).filter(([r]) => (parchemins[r] ?? []).length);
  const total = choix.reduce((s, [, w]) => s + w, 0);
  if (!total) return null;
  let tirage = rng() * total;
  for (const [rarete, poids] of choix) {
    tirage -= poids;
    if (tirage < 0) {
      const liste = parchemins[rarete];
      return liste[Math.floor(rng() * liste.length)];
    }
  }
  return null;
}

// Tire le butin d'objets/ressources d'une famille : renvoie une liste d'ids
// (un id répété = plusieurs exemplaires, comme pour une pile).
export function tirerButinFamille(famille, rng = Math.random) {
  const table = BUTIN_FAMILLE[famille] ?? [];
  const ids = [];
  for (const d of table) {
    if (rng() < d.chance) {
      const [min, max] = d.qte ?? [1, 1];
      const n = min + Math.floor(rng() * (max - min + 1));
      for (let i = 0; i < n; i++) ids.push(d.id);
    }
  }
  return ids;
}
