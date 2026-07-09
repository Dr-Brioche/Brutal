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
};

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
