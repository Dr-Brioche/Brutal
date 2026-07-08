// Recettes de la FORGE + qualités de forge. Tout le contenu « craft » vit ici
// (données pures) pour rester bien rangé dans son coin.
//
// Une recette suit le principe MINECRAFT : c'est la FORME qui compte (positions
// RELATIVES des ingrédients), pas l'emplacement absolu sur la table 5×5.
//   forme    : lignes de caractères ('.' = case vide, autre = clé de légende)
//   legende  : clé → id d'ingrédient (cf. jeu/data/items.js)
//   resultat : id de l'objet fabriqué (cf. ITEMS)
//
// RECETTES CACHÉES : on ne les montre JAMAIS au joueur — il les découvre (des
// indices en jeu guideront vers les objets rares). L'aperçu du résultat n'apparaît
// que lorsque le bon motif est posé sur la table (cf. systems/craft.js + ui/forge.js).

// Qualité de FORGE — un axe SÉPARÉ de la rareté. Un objet FORGÉ en gagne une selon
// la réussite du mini-jeu de forge ; un objet LOOTÉ est « normale » (aucun bonus).
// `force` = bonus de Force accordé à l'arme forgée (cf. la qualité en combat).
// Les 3 tailles de marqueur du mini-jeu mappent sur artisan / maitre / exceptionnel.
export const QUALITES = {
  normale:      { nom: "Normal",       force: 0, couleur: "#9aa0a6" },
  artisan:      { nom: "Artisan",      force: 1, couleur: "#8fce7a" }, // marqueur GRAND  → +1
  maitre:       { nom: "Master",       force: 2, couleur: "#5fb0e8" }, // marqueur MOYEN  → +2
  exceptionnel: { nom: "Exceptional",  force: 3, couleur: "#e0b64e" }, // marqueur PETIT  → +3
};

// <<RECETTES-AUTO>>
// Bloc GÉNÉRÉ automatiquement par outils/importer_recettes.py — NE PAS
// éditer à la main : modifier l'onglet « Recettes » du classeur Excel puis
// relancer le script. (La SOURCE, c'est le classeur.)
export const RECETTES = [
  {
    resultat: "epee-courte",
    forme: [
      ".F.",
      "CFC",
      ".W.",
    ],
    legende: { F: "fer", C: "cuivre", W: "bois" },
  },
  {
    resultat: "gourdin",
    forme: [
      "WW",
      "WW",
      ".W",
    ],
    legende: { W: "bois" },
  },
  {
    resultat: "lance",
    forme: [
      "F",
      "W",
      "W",
      "W",
    ],
    legende: { F: "fer", W: "bois" },
  },
  {
    resultat: "hachette",
    forme: [
      "FF",
      "FW",
      ".W",
    ],
    legende: { F: "fer", W: "bois" },
  },
  {
    resultat: "masse",
    forme: [
      "SFS",
      ".W.",
      ".W.",
    ],
    legende: { S: "pierre-taillee", F: "fer", W: "bois" },
  },
  {
    resultat: "dague-rouillee",
    forme: [
      "F",
      "F",
      "W",
    ],
    legende: { F: "fer", W: "bois" },
  },
  {
    resultat: "couteau-serpent",
    forme: [
      ".F",
      "F.",
      "W.",
    ],
    legende: { F: "fer", W: "bois" },
  },
  {
    resultat: "pic-de-glace",
    forme: [
      "FCF",
      ".W.",
    ],
    legende: { F: "fer", C: "cuivre", W: "bois" },
  },
  {
    resultat: "torche",
    forme: [
      "K",
      "W",
      "W",
    ],
    legende: { K: "charbon", W: "bois" },
  },
  {
    resultat: "couteau-dentele",
    forme: [
      "FC",
      "CF",
      ".W",
    ],
    legende: { F: "fer", C: "cuivre", W: "bois" },
  },
  {
    resultat: "couperet",
    forme: [
      "FF",
      "FF",
      ".W",
    ],
    legende: { F: "fer", W: "bois" },
  },
  {
    resultat: "epee-entrainement",
    forme: [
      ".W.",
      "CWC",
      ".W.",
    ],
    legende: { W: "bois", C: "cuivre" },
  },
  {
    resultat: "baton",
    forme: [
      "W",
      "W",
      "W",
      "W",
    ],
    legende: { W: "bois" },
  },
  {
    resultat: "fourche",
    forme: [
      "FCF",
      ".F.",
      ".W.",
    ],
    legende: { F: "fer", C: "cuivre", W: "bois" },
  },
  {
    resultat: "hache-rouillee",
    forme: [
      "FF",
      "FF",
      ".W",
      ".W",
    ],
    legende: { F: "fer", W: "bois" },
  },
  {
    resultat: "pioche-de-mineur",
    forme: [
      "FFF",
      ".W.",
      ".W.",
    ],
    legende: { F: "fer", W: "bois" },
  },
  {
    resultat: "marteau-de-forge",
    forme: [
      "AKA",
      "AAA",
      ".W.",
    ],
    legende: { A: "argent", K: "charbon", W: "bois" },
  },
  {
    resultat: "epee-large",
    forme: [
      ".A.",
      ".A.",
      ".A.",
      "OAO",
      ".W.",
    ],
    legende: { A: "argent", O: "or", W: "bois" },
  },
  {
    resultat: "hallebarde",
    forme: [
      "AL",
      "AA",
      "A.",
      "W.",
      "W.",
    ],
    legende: { A: "argent", L: "lapis", W: "bois" },
  },
  {
    resultat: "dague-venin",
    forme: [
      "E",
      "A",
      "A",
      "W",
    ],
    legende: { E: "emeraude", A: "argent", W: "bois" },
  },
  {
    resultat: "lame-de-givre",
    forme: [
      ".L.",
      ".A.",
      "OAO",
      ".W.",
    ],
    legende: { L: "lapis", A: "argent", O: "or", W: "bois" },
  },
  {
    resultat: "lame-de-braise",
    forme: [
      "R.R",
      ".A.",
      ".A.",
      ".W.",
    ],
    legende: { R: "rubis", A: "argent", W: "bois" },
  },
  {
    resultat: "hache-faucheuse",
    forme: [
      "RAA",
      ".AA",
      ".W.",
    ],
    legende: { R: "rubis", A: "argent", W: "bois" },
  },
  {
    resultat: "hache-berserk",
    forme: [
      "AAR",
      "AA.",
      ".W.",
      ".W.",
    ],
    legende: { A: "argent", R: "rubis", W: "bois" },
  },
  {
    resultat: "marteau-guerre",
    forme: [
      "SAS",
      "AAA",
      ".W.",
    ],
    legende: { S: "pierre-taillee", A: "argent", W: "bois" },
  },
  {
    resultat: "dagues-jumelles",
    forme: [
      "A.A",
      "A.A",
      "W.W",
    ],
    legende: { A: "argent", W: "bois" },
  },
  {
    resultat: "lame-bourreau",
    forme: [
      ".Y.",
      "AAA",
      ".A.",
      ".W.",
    ],
    legende: { Y: "amethyste", A: "argent", W: "bois" },
  },
  {
    resultat: "baguette-cristal",
    forme: [
      "OY",
      ".A",
      ".W",
    ],
    legende: { O: "or", Y: "amethyste", A: "argent", W: "bois" },
  },
  {
    resultat: "fleau-cloute",
    forme: [
      "SA",
      "AS",
      ".W",
      ".W",
    ],
    legende: { S: "pierre-taillee", A: "argent", W: "bois" },
  },
  {
    resultat: "marteau-de-pierre",
    forme: [
      "SAS",
      "SSS",
      ".W.",
    ],
    legende: { S: "pierre-taillee", A: "argent", W: "bois" },
  },
  {
    resultat: "epee-sacree",
    forme: [
      ".O.",
      "AOA",
      ".O.",
      ".W.",
    ],
    legende: { O: "or", A: "argent", W: "bois" },
  },
  {
    resultat: "croc-de-basilic",
    forme: [
      ".E",
      "ME",
      ".M",
      ".A",
    ],
    legende: { E: "emeraude", M: "malachite", A: "argent" },
  },
  {
    resultat: "hache-de-guerre",
    forme: [
      ".TT",
      "TTT",
      "TT.",
      ".F.",
      ".F.",
    ],
    legende: { T: "titane", F: "fer" },
  },
  {
    resultat: "marteau-de-siege",
    forme: [
      "TTT",
      "TST",
      ".F.",
      ".F.",
    ],
    legende: { T: "titane", S: "pierre-taillee", F: "fer" },
  },
  {
    resultat: "marteau-de-lave",
    forme: [
      "KRK",
      "RIR",
      ".W.",
    ],
    legende: { K: "charbon", R: "rubis", I: "mithril", W: "bois" },
  },
  {
    resultat: "epee-onyx",
    forme: [
      ".X.",
      ".X.",
      "IXI",
      ".X.",
      ".T.",
    ],
    legende: { X: "onyx", I: "mithril", T: "titane" },
  },
  {
    resultat: "grande-faux",
    forme: [
      "XXR",
      "I..",
      "I..",
      "I..",
      "W..",
    ],
    legende: { X: "onyx", R: "rubis", I: "mithril", W: "bois" },
  },
];
// <<FIN-RECETTES-AUTO>>
