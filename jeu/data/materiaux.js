// Catalogue des MATÉRIAUX (minerais) — récoltés en minant les veines des mines
// (cf. docs/mines.md). Serviront au farming et au craft.
//
// Stockés dans le « sac à ressources » : inv.materiaux = { id: quantité }.
// Ils s'empilent par paquets de `pileMax` (10 par défaut ; exceptions au cas par
// cas plus tard). `couleur` = teinte de la veine sur la carte et du minerai.

export const MATERIAUX = {
  "fer":     { id: "fer",     nom: "Iron",   couleur: "#b9b2a6", pileMax: 10 },
  "cuivre":  { id: "cuivre",  nom: "Copper", couleur: "#c0703a", pileMax: 10 },
  "charbon": { id: "charbon", nom: "Coal",   couleur: "#3a3a42", pileMax: 10 },
};

// Les minerais « de base » (communs), tirés par défaut dans les mines.
export const MATERIAUX_BASE = ["fer", "cuivre", "charbon"];

export function materiauDef(id) { return MATERIAUX[id] ?? null; }
