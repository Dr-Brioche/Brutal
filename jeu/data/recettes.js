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
// Les 3 tailles de marqueur du mini-jeu mappent sur artisan / maitre / exceptionnel.
// (nom + couleur seulement ; le bonus de Force dépend de la RARETÉ → FORCE_QUALITE.)
export const QUALITES = {
  normale:      { nom: "Normal",       couleur: "#9aa0a6" },
  artisan:      { nom: "Artisan",      couleur: "#8fce7a" }, // marqueur GRAND
  maitre:       { nom: "Master",       couleur: "#5fb0e8" }, // marqueur MOYEN
  exceptionnel: { nom: "Exceptional",  couleur: "#e0b64e" }, // marqueur PETIT
};

// BONUS DE FORCE selon la RARETÉ de l'objet forgé × la qualité obtenue (décision
// Brioche 09/07/2026) : plus l'objet est rare, plus une belle forge paie. Les
// trois colonnes = les trois marqueurs (Artisan / Master / Exceptional).
// (Common non précisé par Brioche → pallier doux sous uncommon, à ajuster ici.)
export const FORCE_QUALITE = {
  commun:     { artisan: 1,  maitre: 1,  exceptionnel: 2 },
  uncommon:   { artisan: 1,  maitre: 2,  exceptionnel: 3 },
  rare:       { artisan: 2,  maitre: 3,  exceptionnel: 5 },
  epique:     { artisan: 5,  maitre: 8,  exceptionnel: 10 },
  legendaire: { artisan: 10, maitre: 15, exceptionnel: 20 },
};

// Bonus de Force d'un objet forgé (0 si looté / normale / rareté inconnue).
export function forceQualite(rarete, qualite) {
  return FORCE_QUALITE[rarete]?.[qualite] ?? 0;
}

// CARBURANT DE FORGE (décision Brioche 09/07/2026) : pour forger, il faut NOURRIR
// le feu avec du CHARBON et/ou du BOIS dans une case auxiliaire. Le besoin monte
// avec la RARETÉ de l'objet. Exprimé en unités de CHARBON (ÉDITABLE ici).
export const CARBURANT_REQUIS = {
  commun: 5, uncommon: 15, rare: 40, epique: 100, legendaire: 250,
};
// Efficacité de feu d'une ressource, en unités de charbon : 1 charbon = 2 bois.
export const VALEUR_CARBURANT = { charbon: 1, bois: 0.5 };

// Carburant (en charbon) requis pour forger un objet de cette rareté.
export function carburantRequis(rarete) {
  return CARBURANT_REQUIS[rarete] ?? 0;
}
// Valeur de feu d'une ressource (0 si elle ne brûle pas).
export function valeurCarburant(id) {
  return VALEUR_CARBURANT[id] ?? 0;
}

// BONUS DE VALEUR d'un objet forgé (décision Brioche 09/07/2026) : une belle
// forge vaut plus cher PARTOUT (marchand, HV, enchère). Multiplicateur appliqué
// à la valeur de base — Artisan +15 %, Master +30 %, Exceptional +60 %.
// (Un objet LOOTÉ = normale = ×1, aucun bonus.)
export const MULT_QUALITE = {
  normale: 1, artisan: 1.15, maitre: 1.30, exceptionnel: 1.60,
};
export function multQualite(qualite) {
  return MULT_QUALITE[qualite] ?? 1;
}

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
      "AAAA",
      "AKKA",
      "..B.",
      "..B.",
    ],
    legende: { A: "argent", K: "charbon", B: "bois-sombre" },
  },
  {
    resultat: "epee-large",
    forme: [
      ".A.",
      ".A.",
      "AOA",
      ".B.",
      ".B.",
    ],
    legende: { A: "argent", O: "or", B: "bois-sombre" },
  },
  {
    resultat: "hallebarde",
    forme: [
      "AA.",
      "ALA",
      "..B",
      "..B",
      "..B",
    ],
    legende: { A: "argent", L: "lapis", B: "bois-sombre" },
  },
  {
    resultat: "dague-venin",
    forme: [
      ".E",
      "AA",
      "A.",
      "B.",
    ],
    legende: { A: "argent", E: "emeraude", B: "bois-sombre" },
  },
  {
    resultat: "lame-de-givre",
    forme: [
      ".L.",
      "AOA",
      ".A.",
      ".B.",
    ],
    legende: { A: "argent", L: "lapis", O: "or", B: "bois-sombre" },
  },
  {
    resultat: "lame-de-braise",
    forme: [
      "R.R",
      ".R.",
      ".A.",
      ".B.",
    ],
    legende: { A: "argent", R: "rubis", B: "bois-sombre" },
  },
  {
    resultat: "hache-faucheuse",
    forme: [
      "AAR",
      "A.A",
      "..B",
      "..B",
    ],
    legende: { A: "argent", R: "rubis", B: "bois-sombre" },
  },
  {
    resultat: "hache-berserk",
    forme: [
      "RAA",
      "AA.",
      "..B",
      "..B",
    ],
    legende: { A: "argent", R: "rubis", B: "bois-sombre" },
  },
  {
    resultat: "marteau-guerre",
    forme: [
      "SAS",
      "AAA",
      "..B",
      "..B",
    ],
    legende: { A: "argent", S: "pierre-taillee", B: "bois-sombre" },
  },
  {
    resultat: "dagues-jumelles",
    forme: [
      "A.A",
      "A.A",
      "A.A",
      "B.B",
    ],
    legende: { A: "argent", B: "bois-sombre" },
  },
  {
    resultat: "lame-bourreau",
    forme: [
      "AMA",
      "AAA",
      ".A.",
      ".B.",
    ],
    legende: { A: "argent", M: "amethyste", B: "bois-sombre" },
  },
  {
    resultat: "baguette-cristal",
    forme: [
      ".M",
      "OA",
      ".A",
      ".B",
    ],
    legende: { A: "argent", O: "or", M: "amethyste", B: "bois-sombre" },
  },
  {
    resultat: "fleau-cloute",
    forme: [
      "SA",
      "AS",
      "B.",
      "B.",
    ],
    legende: { A: "argent", S: "pierre-taillee", B: "bois-sombre" },
  },
  {
    resultat: "marteau-de-pierre",
    forme: [
      "SSS",
      "S.S",
      ".B.",
      ".B.",
    ],
    legende: { S: "pierre-taillee", A: "argent", B: "bois-sombre" },
  },
  {
    resultat: "epee-sacree",
    forme: [
      ".O.",
      "AOA",
      "AOA",
      ".B.",
    ],
    legende: { A: "argent", O: "or", B: "bois-sombre" },
  },
  {
    resultat: "croc-de-basilic",
    forme: [
      "...E",
      "..EK",
      ".EK.",
      "AK..",
    ],
    legende: { E: "emeraude", K: "malachite", A: "argent" },
  },
  {
    resultat: "hache-de-guerre",
    forme: [
      "TTT..",
      "TTTN.",
      ".T.N.",
      "...N.",
      "...N.",
    ],
    legende: { T: "titane", N: "bois-enchante" },
  },
  {
    resultat: "marteau-de-siege",
    forme: [
      "STTTS",
      ".TTT.",
      "..N..",
      "..N..",
    ],
    legende: { S: "pierre-taillee", T: "titane", N: "bois-enchante" },
  },
  {
    resultat: "marteau-de-lave",
    forme: [
      "KRRRK",
      "RIIIR",
      "..N..",
      "..N..",
      "..N..",
    ],
    legende: { K: "charbon", R: "rubis", I: "mithril", N: "bois-enchante" },
  },
  {
    resultat: "epee-onyx",
    forme: [
      "..X..",
      "..X..",
      "IXXXI",
      "..T..",
      "..I..",
    ],
    legende: { X: "onyx", I: "mithril", T: "titane" },
  },
  {
    resultat: "grande-faux",
    forme: [
      "XXXXR",
      "I....",
      "I.N..",
      "..N..",
      "..N..",
    ],
    legende: { X: "onyx", R: "rubis", I: "mithril", N: "bois-enchante" },
  },
  {
    resultat: "armure-cuir",
    forme: [
      "HFH",
      "HHH",
    ],
    legende: { H: "cuir", F: "fer" },
  },
  {
    resultat: "gilet-rembourre",
    forme: [
      "HHH",
      "HHH",
    ],
    legende: { H: "cuir" },
  },
  {
    resultat: "cotte-mailles",
    forme: [
      "FFF",
      "FFF",
    ],
    legende: { F: "fer" },
  },
  {
    resultat: "armure-peau",
    forme: [
      "HHH",
      "HFH",
    ],
    legende: { H: "cuir", F: "fer" },
  },
  {
    resultat: "tenue-de-voyageur",
    forme: [
      "CHC",
      "HHH",
    ],
    legende: { C: "cuivre", H: "cuir" },
  },
  {
    resultat: "plaque-de-fer",
    forme: [
      "F.F",
      "FFF",
      "FFF",
      ".A.",
    ],
    legende: { F: "fer", A: "argent" },
  },
  {
    resultat: "armure-cloutee",
    forme: [
      "SFS",
      "F.F",
      "SFS",
      ".F.",
    ],
    legende: { F: "fer", S: "pierre-taillee" },
  },
  {
    resultat: "peau-berserk",
    forme: [
      "RCR",
      "CCC",
      ".A.",
    ],
    legende: { R: "rubis", C: "cuir-epais", A: "argent" },
  },
  {
    resultat: "armure-stone-age",
    forme: [
      "SSS",
      "S.S",
      ".A.",
    ],
    legende: { S: "pierre-taillee", A: "argent" },
  },
  {
    resultat: "plate-croise",
    forme: [
      "T.G.T",
      ".GGG.",
      "T.G.T",
      ".TTT.",
    ],
    legende: { T: "titane", G: "or" },
  },
  {
    resultat: "plate-sang",
    forme: [
      ".TTT.",
      "TR.RT",
      "TRRRT",
      "..T..",
    ],
    legende: { T: "titane", R: "rubis" },
  },
  {
    resultat: "maille-de-forge",
    forme: [
      "T.T.T",
      "CTGTC",
      "T.T.T",
      ".CTC.",
    ],
    legende: { T: "titane", C: "charbon", G: "or" },
  },
  {
    resultat: "plate-onyx",
    forme: [
      "X...X",
      "XIIIX",
      "XIIIX",
      ".XIX.",
      "..X..",
    ],
    legende: { X: "onyx", I: "mithril" },
  },
  {
    resultat: "bottes-usees",
    forme: [
      "H.",
      "HH",
    ],
    legende: { H: "cuir" },
  },
  {
    resultat: "bottes-cuir",
    forme: [
      "H.",
      "H.",
      "HH",
    ],
    legende: { H: "cuir" },
  },
  {
    resultat: "bottes-voyage",
    forme: [
      "C.",
      "HH",
    ],
    legende: { C: "cuivre", H: "cuir" },
  },
  {
    resultat: "sandales",
    forme: [
      "HH",
    ],
    legende: { H: "cuir" },
  },
  {
    resultat: "bottes-rapides",
    forme: [
      "EAE",
      "A.A",
      "...",
    ],
    legende: { A: "argent", E: "emeraude" },
  },
  {
    resultat: "bottes-pierre",
    forme: [
      "S.S",
      "SAS",
      "S.S",
    ],
    legende: { S: "pierre-taillee", A: "argent" },
  },
  {
    resultat: "bottes-braise",
    forme: [
      "R.R",
      ".A.",
      "KKK",
    ],
    legende: { R: "rubis", A: "argent", K: "charbon" },
  },
  {
    resultat: "bottes-stone-age",
    forme: [
      "SSS",
      "SSS",
      "S.S",
    ],
    legende: { S: "pierre-taillee" },
  },
  {
    resultat: "bottes-vives",
    forme: [
      ".E.",
      "AAA",
      "A.A",
    ],
    legende: { A: "argent", E: "emeraude" },
  },
  {
    resultat: "bottes-de-maille",
    forme: [
      "T..T",
      "T..T",
      "A..A",
      "TTTT",
    ],
    legende: { T: "titane", A: "argent" },
  },
  {
    resultat: "bottes-croise",
    forme: [
      "T..T",
      "G..G",
      "T..T",
      "T..T",
      "TTTT",
    ],
    legende: { T: "titane", G: "or" },
  },
  {
    resultat: "bottes-sang",
    forme: [
      "T...T",
      "TR.RT",
      "T...T",
      "TT.TT",
    ],
    legende: { T: "titane", R: "rubis" },
  },
  {
    resultat: "bottes-onyx",
    forme: [
      "X...X",
      "X...X",
      "XI.IX",
      "XX.XX",
      "XX.XX",
    ],
    legende: { X: "onyx", I: "mithril" },
  },
  {
    resultat: "gants-tissu",
    forme: [
      "HH",
      ".H",
    ],
    legende: { H: "cuir" },
  },
  {
    resultat: "gants-travail",
    forme: [
      "HF",
      "F.",
    ],
    legende: { H: "cuir", F: "fer" },
  },
  {
    resultat: "gants-cuir",
    forme: [
      "FH",
      ".H",
    ],
    legende: { F: "fer", H: "cuir" },
  },
  {
    resultat: "gants-cloutes",
    forme: [
      "FF",
      "K.",
    ],
    legende: { F: "fer", K: "charbon" },
  },
  {
    resultat: "gants-de-mineur",
    forme: [
      "FF",
      ".H",
    ],
    legende: { F: "fer", H: "cuir" },
  },
  {
    resultat: "gants-voleur",
    forme: [
      "A.A",
      "AAA",
      "..A",
    ],
    legende: { A: "argent" },
  },
  {
    resultat: "gantelets",
    forme: [
      "F.F",
      "FAF",
      ".F.",
    ],
    legende: { F: "fer", A: "argent" },
  },
  {
    resultat: "gants-venin",
    forme: [
      "EAE",
      ".A.",
      "A.A",
    ],
    legende: { A: "argent", E: "emeraude" },
  },
  {
    resultat: "gants-stone-age",
    forme: [
      "SSS",
      "S.S",
      "S.S",
    ],
    legende: { S: "pierre-taillee" },
  },
  {
    resultat: "gants-chance",
    forme: [
      "O.O",
      "...",
      "A.A",
    ],
    legende: { A: "argent", O: "or" },
  },
  {
    resultat: "gants-de-maille",
    forme: [
      "T.T.T",
      ".TTT.",
      ".TAT.",
      "..T..",
    ],
    legende: { T: "titane", A: "argent" },
  },
  {
    resultat: "gants-croise",
    forme: [
      "G.G.G",
      ".TTT.",
      "..G..",
      "..T..",
    ],
    legende: { T: "titane", G: "or" },
  },
  {
    resultat: "gants-sang",
    forme: [
      "T.T.T",
      "TRRRT",
      ".TTT.",
      "..R..",
    ],
    legende: { T: "titane", R: "rubis" },
  },
  {
    resultat: "gants-onyx",
    forme: [
      "X.X.X",
      "XIXIX",
      "XIIIX",
      ".XXX.",
      "..X..",
    ],
    legende: { X: "onyx", I: "mithril" },
  },
  {
    resultat: "anneau-etincelle",
    forme: [
      "CL",
    ],
    legende: { C: "cuivre", L: "lapis" },
  },
  {
    resultat: "anneau-venin",
    forme: [
      "EC",
    ],
    legende: { E: "emeraude", C: "cuivre" },
  },
  {
    resultat: "anneau-braise",
    forme: [
      "C",
      "R",
    ],
    legende: { C: "cuivre", R: "rubis" },
  },
  {
    resultat: "anneau-frimas",
    forme: [
      "L",
      "C",
    ],
    legende: { L: "lapis", C: "cuivre" },
  },
  {
    resultat: "anneau-saignant",
    forme: [
      "RC",
    ],
    legende: { R: "rubis", C: "cuivre" },
  },
  {
    resultat: "anneau-force",
    forme: [
      "CF",
    ],
    legende: { C: "cuivre", F: "fer" },
  },
  {
    resultat: "anneau-pierre",
    forme: [
      "SC",
    ],
    legende: { S: "pierre-taillee", C: "cuivre" },
  },
  {
    resultat: "anneau-agile",
    forme: [
      "C",
      "E",
    ],
    legende: { C: "cuivre", E: "emeraude" },
  },
  {
    resultat: "anneau-vigueur",
    forme: [
      "MC",
    ],
    legende: { M: "malachite", C: "cuivre" },
  },
  {
    resultat: "anneau-de-fer",
    forme: [
      ".F.",
      "F.F",
      ".A.",
    ],
    legende: { F: "fer", A: "argent" },
  },
  {
    resultat: "bague-de-sang",
    forme: [
      ".R.",
      "A.A",
      "R..",
    ],
    legende: { R: "rubis", A: "argent" },
  },
  {
    resultat: "anneau-de-givre",
    forme: [
      "L..",
      ".A.",
      "..A",
    ],
    legende: { L: "lapis", A: "argent" },
  },
  {
    resultat: "anneau-toxique",
    forme: [
      "..E",
      ".A.",
      "A..",
    ],
    legende: { E: "emeraude", A: "argent" },
  },
  {
    resultat: "anneau-puissance",
    forme: [
      ".T.",
      "A.A",
      "...",
    ],
    legende: { T: "titane", A: "argent" },
  },
  {
    resultat: "sceau-givre",
    forme: [
      "L.L",
      ".A.",
      "...",
    ],
    legende: { L: "lapis", A: "argent" },
  },
  {
    resultat: "anneau-soif-sang",
    forme: [
      "A.A",
      "...",
      ".R.",
    ],
    legende: { R: "rubis", A: "argent" },
  },
  {
    resultat: "anneau-forge",
    forme: [
      ".O.",
      ".A.",
      "K..",
    ],
    legende: { O: "or", A: "argent", K: "charbon" },
  },
  {
    resultat: "anneau-de-givre-parfait",
    forme: [
      ".GG.",
      "L..L",
      "L..L",
      ".GG.",
    ],
    legende: { G: "or", L: "lapis" },
  },
  {
    resultat: "collier-cuivre",
    forme: [
      "CCC",
      ".L.",
    ],
    legende: { C: "cuivre", L: "lapis" },
  },
  {
    resultat: "pendentif-quartz",
    forme: [
      "CC",
      ".S",
    ],
    legende: { C: "cuivre", S: "pierre-taillee" },
  },
  {
    resultat: "charme-os",
    forme: [
      "CC",
      "K.",
    ],
    legende: { C: "cuivre", K: "charbon" },
  },
  {
    resultat: "pendentif-chaud",
    forme: [
      "C",
      "C",
      "R",
    ],
    legende: { C: "cuivre", R: "rubis" },
  },
  {
    resultat: "porte-bonheur",
    forme: [
      "COC",
    ],
    legende: { C: "cuivre", O: "or" },
  },
  {
    resultat: "pendentif-energie",
    forme: [
      "A.A",
      ".A.",
      ".L.",
    ],
    legende: { A: "argent", L: "lapis" },
  },
  {
    resultat: "collier-concentration",
    forme: [
      "A.A",
      "...",
      "M..",
    ],
    legende: { A: "argent", M: "amethyste" },
  },
  {
    resultat: "pendentif-vampire",
    forme: [
      ".A.",
      "A.A",
      "R.R",
    ],
    legende: { A: "argent", R: "rubis" },
  },
  {
    resultat: "collier-de-saphir",
    forme: [
      "..A",
      ".A.",
      "P.P",
    ],
    legende: { A: "argent", P: "saphir" },
  },
  {
    resultat: "collier-de-saphir-fin",
    forme: [
      "P...P",
      ".P.P.",
      "..G..",
      ".P.P.",
    ],
    legende: { P: "saphir", G: "or" },
  },
  {
    resultat: "collier-de-saphir-parfait",
    forme: [
      "PP.PP",
      "P...P",
      ".P.P.",
      "..D..",
      "..P..",
    ],
    legende: { P: "saphir", D: "diamant" },
  },
  {
    resultat: "bouclier-bois",
    forme: [
      "WW",
      "FF",
      "WW",
    ],
    legende: { W: "bois", F: "fer" },
  },
  {
    resultat: "targe",
    forme: [
      "CF",
      "FC",
    ],
    legende: { C: "cuivre", F: "fer" },
  },
  {
    resultat: "grimoire",
    forme: [
      "WW",
      "WL",
    ],
    legende: { W: "bois", L: "lapis" },
  },
  {
    resultat: "fanal",
    forme: [
      "K",
      "F",
      "W",
    ],
    legende: { K: "charbon", F: "fer", W: "bois" },
  },
  {
    resultat: "sceptre-apprenti",
    forme: [
      "C",
      "W",
      "W",
    ],
    legende: { C: "cuivre", W: "bois" },
  },
  {
    resultat: "grimoire-soin",
    forme: [
      "WW",
      "MW",
    ],
    legende: { W: "bois", M: "malachite" },
  },
  {
    resultat: "bouclier-renforce",
    forme: [
      "FAF",
      "F.F",
      "F.F",
      "FAF",
    ],
    legende: { F: "fer", A: "argent" },
  },
  {
    resultat: "grimoire-flammes",
    forme: [
      "BRB",
      "RRR",
      "BRB",
    ],
    legende: { B: "bois-sombre", R: "rubis" },
  },
  {
    resultat: "sceptre-commandement",
    forme: [
      ".O.",
      ".A.",
      ".A.",
    ],
    legende: { O: "or", A: "argent" },
  },
  {
    resultat: "bouclier-protecteur",
    forme: [
      "LAL",
      "A.A",
      "LAL",
    ],
    legende: { L: "lapis", A: "argent" },
  },
  {
    resultat: "grimoire-puissance",
    forme: [
      "M.M",
      "MBM",
      "BMB",
    ],
    legende: { M: "amethyste", B: "bois-sombre" },
  },
  {
    resultat: "bouclier-tour",
    forme: [
      "TTTT",
      "TAAT",
      "TAAT",
      "TTTT",
      ".TT.",
    ],
    legende: { T: "titane", A: "argent" },
  },
];
// <<FIN-RECETTES-AUTO>>
