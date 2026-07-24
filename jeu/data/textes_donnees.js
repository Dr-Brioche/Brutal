// ═══════════════════════════════════════════════════════════════════════════
// TRADUCTIONS DES DONNÉES (noms & descriptions des objets, cartes, talents,
// monstres, raretés…). Fusionné dans TEXTES (data/textes.js) et appliqué sur les
// données par systems/i18n_donnees.js.
//
// Convention de clés :
//   "mob.<id>"            nom d'un monstre
//   "item.<id>"           nom d'un objet          · "item.<id>.desc" sa description
//   "carte.<id>"          nom d'une carte         · "carte.<id>.desc" son texte
//   "talent.<id>"         nom d'un talent         · "talent.<id>.desc" sa description
//   "rarete.<id>"         nom d'une rareté
//   "branche.<id>"        nom d'une branche de talents
//
// On n'écrit QUE le français : l'anglais d'origine (déjà dans les data) sert de
// repli automatique (cf. tr() dans systems/langue.js). Traduction progressive.
// ═══════════════════════════════════════════════════════════════════════════

export const TEXTES_DONNEES = {
  // ---- Monstres ----
  "mob.gobelin":                   { fr: "Gobelin des cavernes" },
  "mob.gobelin-vif":               { fr: "Gobelin escarmoucheur" },
  "mob.gobelin-chaman":            { fr: "Chaman gobelin" },
  "mob.ogre-masque":               { fr: "Ogre masqué" },
  "mob.orc-rodeur":                { fr: "Orc rôdeur" },
  "mob.orc-guerrier":              { fr: "Guerrier orc" },
  "mob.orc-guerriere":             { fr: "Guerrière orc" },
  "mob.orc-brute":                 { fr: "Berserker orc" },
  "mob.orc-chamane":               { fr: "Chaman orc" },
  "mob.blob-vert":                 { fr: "Limon vert" },
  "mob.blob-jaune":                { fr: "Limon ocre" },
  "mob.blob-rouge":                { fr: "Limon carmin" },
  "mob.blob-bleu":                 { fr: "Limon azur" },
  "mob.molosse":                   { fr: "Molosse féroce" },
  "mob.molosse-feu":               { fr: "Molosse de braise" },
  "mob.molosse-sombre":            { fr: "Molosse d'ombre" },
  "mob.bear":                      { fr: "Ours des cavernes" },
  "mob.bones-bear":                { fr: "Ours d'ossements" },
  "mob.armor-bear":                { fr: "Ours de guerre blindé" },
  "mob.warrior-mushroom1":         { fr: "Lancier champignon" },
  "mob.warrior-mushroom2":         { fr: "Chevalier fongique" },
  "mob.white-katana-mushroom":     { fr: "Ronin myconide" },
  "mob.black-mushroom-specialist": { fr: "Faucheur amanite" },
  "mob.mage-mushroom":             { fr: "Sage myconide" },
  "mob.king-mushroom":             { fr: "Roi champignon" },
  "mob.lapin-stage1":              { fr: "Lapin blanc" },
  "mob.lapin-stage2":              { fr: "Lièvre enragé" },
  "mob.lapin-stage3":              { fr: "Horreur croc-sanglant" },
  "mob.tour-de-siege-gobeline":    { fr: "Tour de siège gobeline" },
  "mob.gobelin-kaboom":            { fr: "Gobelin Kaboum" },
  "mob.gobelin-de-siege":          { fr: "Gobelin de siège" },
  "mob.gobelin-de-siege-etandart": { fr: "Porte-étendard de siège" },
  "mob.gobelin-blinde":            { fr: "Gobelin blindé" },
  "mob.gobelin-sans-blindage1":    { fr: "Gobelin à masse" },
  "mob.gobelin-sans-blindage2":    { fr: "Gobelin à bouclier" },
};
