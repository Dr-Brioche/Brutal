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

export const RECETTES = [
  // Miner's Pick : la pioche « façon Minecraft » — 3 fer en ligne + 2 bois sous le
  // centre. 3 fer + 2 bois.
  {
    resultat: "pioche-de-mineur",
    forme: [
      "FFF",
      ".B.",
      ".B.",
    ],
    legende: { F: "fer", B: "bois" },
  },
];
