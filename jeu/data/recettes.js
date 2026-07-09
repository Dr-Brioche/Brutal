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
  {
    resultat: "armure-cuir",
    forme: [
      "WFW",
      "WWW",
    ],
    legende: { W: "bois", F: "fer" },
  },
  {
    resultat: "gilet-rembourre",
    forme: [
      "WWW",
      "WWW",
    ],
    legende: { W: "bois" },
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
      "WWW",
      "WFW",
    ],
    legende: { W: "bois", F: "fer" },
  },
  {
    resultat: "tenue-de-voyageur",
    forme: [
      "CWC",
      "WWW",
    ],
    legende: { C: "cuivre", W: "bois" },
  },
  {
    resultat: "plaque-de-fer",
    forme: [
      "FFF",
      "FAF",
      "FFF",
    ],
    legende: { F: "fer", A: "argent" },
  },
  {
    resultat: "armure-cloutee",
    forme: [
      "SFS",
      "FFF",
      "SFS",
    ],
    legende: { S: "pierre-taillee", F: "fer" },
  },
  {
    resultat: "peau-berserk",
    forme: [
      "RWR",
      "WAW",
    ],
    legende: { R: "rubis", W: "bois", A: "argent" },
  },
  {
    resultat: "armure-stone-age",
    forme: [
      "SSS",
      "SAS",
    ],
    legende: { S: "pierre-taillee", A: "argent" },
  },
  {
    resultat: "plate-croise",
    forme: [
      "OTO",
      "TTT",
      "OTO",
    ],
    legende: { O: "or", T: "titane" },
  },
  {
    resultat: "plate-sang",
    forme: [
      "RTR",
      "TTT",
      "RTR",
    ],
    legende: { R: "rubis", T: "titane" },
  },
  {
    resultat: "maille-de-forge",
    forme: [
      "TKT",
      "KOK",
      "TKT",
    ],
    legende: { T: "titane", K: "charbon", O: "or" },
  },
  {
    resultat: "plate-onyx",
    forme: [
      "XIX",
      "IXI",
      "XIX",
    ],
    legende: { X: "onyx", I: "mithril" },
  },
  {
    resultat: "bottes-usees",
    forme: [
      "W.",
      "WW",
    ],
    legende: { W: "bois" },
  },
  {
    resultat: "bottes-cuir",
    forme: [
      "W.",
      "W.",
      "WW",
    ],
    legende: { W: "bois" },
  },
  {
    resultat: "bottes-voyage",
    forme: [
      "C.",
      "WW",
    ],
    legende: { C: "cuivre", W: "bois" },
  },
  {
    resultat: "sandales",
    forme: [
      "WW",
    ],
    legende: { W: "bois" },
  },
  {
    resultat: "bottes-rapides",
    forme: [
      "E.",
      "AA",
    ],
    legende: { E: "emeraude", A: "argent" },
  },
  {
    resultat: "bottes-pierre",
    forme: [
      "S.",
      "SA",
    ],
    legende: { S: "pierre-taillee", A: "argent" },
  },
  {
    resultat: "bottes-braise",
    forme: [
      "R.",
      "AK",
    ],
    legende: { R: "rubis", A: "argent", K: "charbon" },
  },
  {
    resultat: "bottes-stone-age",
    forme: [
      "SS",
      "S.",
    ],
    legende: { S: "pierre-taillee" },
  },
  {
    resultat: "bottes-vives",
    forme: [
      "AE",
      "A.",
    ],
    legende: { A: "argent", E: "emeraude" },
  },
  {
    resultat: "bottes-de-maille",
    forme: [
      "TT",
      "T.",
      "A.",
    ],
    legende: { T: "titane", A: "argent" },
  },
  {
    resultat: "bottes-croise",
    forme: [
      "OT",
      "T.",
      "T.",
    ],
    legende: { O: "or", T: "titane" },
  },
  {
    resultat: "bottes-sang",
    forme: [
      "RT",
      "T.",
      "T.",
    ],
    legende: { R: "rubis", T: "titane" },
  },
  {
    resultat: "bottes-onyx",
    forme: [
      "XI",
      "X.",
      "I.",
    ],
    legende: { X: "onyx", I: "mithril" },
  },
  {
    resultat: "gants-tissu",
    forme: [
      "WW",
      ".W",
    ],
    legende: { W: "bois" },
  },
  {
    resultat: "gants-travail",
    forme: [
      "WF",
      "F.",
    ],
    legende: { W: "bois", F: "fer" },
  },
  {
    resultat: "gants-cuir",
    forme: [
      "FW",
      ".W",
    ],
    legende: { F: "fer", W: "bois" },
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
      ".W",
    ],
    legende: { F: "fer", W: "bois" },
  },
  {
    resultat: "gants-voleur",
    forme: [
      "AA",
      "A.",
    ],
    legende: { A: "argent" },
  },
  {
    resultat: "gantelets",
    forme: [
      "AF",
      "FF",
    ],
    legende: { A: "argent", F: "fer" },
  },
  {
    resultat: "gants-venin",
    forme: [
      "EA",
      "A.",
    ],
    legende: { E: "emeraude", A: "argent" },
  },
  {
    resultat: "gants-stone-age",
    forme: [
      "SS",
      "SS",
    ],
    legende: { S: "pierre-taillee" },
  },
  {
    resultat: "gants-chance",
    forme: [
      "OA",
      ".A",
    ],
    legende: { O: "or", A: "argent" },
  },
  {
    resultat: "gants-de-maille",
    forme: [
      "TT",
      "A.",
    ],
    legende: { T: "titane", A: "argent" },
  },
  {
    resultat: "gants-croise",
    forme: [
      "OT",
      "TT",
    ],
    legende: { O: "or", T: "titane" },
  },
  {
    resultat: "gants-sang",
    forme: [
      "RT",
      "TT",
    ],
    legende: { R: "rubis", T: "titane" },
  },
  {
    resultat: "gants-onyx",
    forme: [
      "XX",
      "I.",
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
      "FA",
      "A.",
    ],
    legende: { F: "fer", A: "argent" },
  },
  {
    resultat: "bague-de-sang",
    forme: [
      "RA",
      "A.",
    ],
    legende: { R: "rubis", A: "argent" },
  },
  {
    resultat: "anneau-de-givre",
    forme: [
      "A",
      "L",
      "A",
    ],
    legende: { A: "argent", L: "lapis" },
  },
  {
    resultat: "anneau-toxique",
    forme: [
      "A",
      "E",
      "A",
    ],
    legende: { A: "argent", E: "emeraude" },
  },
  {
    resultat: "anneau-puissance",
    forme: [
      "TA",
      "A.",
    ],
    legende: { T: "titane", A: "argent" },
  },
  {
    resultat: "sceau-givre",
    forme: [
      "AL",
      ".A",
    ],
    legende: { A: "argent", L: "lapis" },
  },
  {
    resultat: "anneau-soif-sang",
    forme: [
      "AR",
      ".A",
    ],
    legende: { A: "argent", R: "rubis" },
  },
  {
    resultat: "anneau-forge",
    forme: [
      "OA",
      "K.",
    ],
    legende: { O: "or", A: "argent", K: "charbon" },
  },
  {
    resultat: "anneau-de-givre-parfait",
    forme: [
      "LO",
      "OL",
    ],
    legende: { L: "lapis", O: "or" },
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
      "AAA",
      ".L.",
    ],
    legende: { A: "argent", L: "lapis" },
  },
  {
    resultat: "collier-concentration",
    forme: [
      "AA",
      ".Y",
    ],
    legende: { A: "argent", Y: "amethyste" },
  },
  {
    resultat: "pendentif-vampire",
    forme: [
      "A",
      "R",
      "A",
    ],
    legende: { A: "argent", R: "rubis" },
  },
  {
    resultat: "collier-de-saphir",
    forme: [
      "APA",
    ],
    legende: { A: "argent", P: "saphir" },
  },
  {
    resultat: "collier-de-saphir-fin",
    forme: [
      "POP",
    ],
    legende: { P: "saphir", O: "or" },
  },
  {
    resultat: "collier-de-saphir-parfait",
    forme: [
      "PDP",
      ".P.",
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
      "FF",
      "AA",
      "FF",
    ],
    legende: { F: "fer", A: "argent" },
  },
  {
    resultat: "grimoire-flammes",
    forme: [
      "WR",
      "RW",
    ],
    legende: { W: "bois", R: "rubis" },
  },
  {
    resultat: "sceptre-commandement",
    forme: [
      "O",
      "A",
      "A",
    ],
    legende: { O: "or", A: "argent" },
  },
  {
    resultat: "bouclier-protecteur",
    forme: [
      "LA",
      "AA",
      "AL",
    ],
    legende: { L: "lapis", A: "argent" },
  },
  {
    resultat: "grimoire-puissance",
    forme: [
      "YW",
      "WY",
    ],
    legende: { Y: "amethyste", W: "bois" },
  },
  {
    resultat: "bouclier-tour",
    forme: [
      "TT",
      "TT",
      "AA",
    ],
    legende: { T: "titane", A: "argent" },
  },
];
// <<FIN-RECETTES-AUTO>>
