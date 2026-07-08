// Catalogue des TUILES : le « dictionnaire » de tous les blocs de décor.
//
// Chaque case d'une carte (jeu/data/zones.js) est un caractère ; ce fichier dit
// ce que ce caractère SIGNIFIE et à quoi il RESSEMBLE. Ajouter une sorte de bloc
// = ajouter une entrée ici (une seule fois), puis l'utiliser dans les plans.
//
// Propriétés d'une tuile :
//   id        : nom interne stable (ex. "sol-caverne"). C'est ICI que vivront
//               tes identifiants type "mur-01", "sol-02"… quand tu auras du
//               pixel art à ranger dans une galerie.
//   nom       : libellé lisible (anglais, langue du jeu)
//   solide    : true = bloque le passage (mur)
//   rencontre : true = un monstre peut surgir sur cette case
//   porte     : true = passage vers une autre zone (voir `portails` dans zones.js)
//   interet   : message affiché en arrivant dessus (point d'intérêt), sinon absent
//   style     : COMMENT la dessiner (interprété par jeu/world/carte.js). Pour
//               l'instant on peint « au feutre » avec `couleurs`. PLUS TARD : on
//               remplacera `couleurs` par une planche d'images (un tileset), sans
//               toucher ni aux cartes ni au reste du code.
//   couleurs  : la palette utilisée par le style

export const TUILES = {
  "#": {
    id: "mur", nom: "Stone wall", solide: true,
    // Pierre naine chaude (grise-brune) : cohérente en ville ET en grotte. Le
    // rendu (jeu/world/carte.js) ajoute texture + bords éclairés/ombrés selon les
    // voisins. `joint` n'est plus dessiné (remplacé par les biseaux) mais gardé
    // pour un usage futur / le style d'origine.
    style: "mur", couleurs: { fond: "#4a453d", joint: "#2a251f" },
  },
  ".": {
    id: "sol-ville", nom: "City floor", solide: false,
    style: "sol", couleurs: { damier: ["#211c18", "#1d1916"] },
  },
  ",": {
    id: "sol-caverne", nom: "Cavern floor", solide: false, rencontre: true,
    style: "sol",
    couleurs: { damier: ["#2a2520", "#241f1b"], gravats: "#3a332b", veine: "#9a6b2f" },
  },
  "P": {
    id: "porte", nom: "Gate", solide: false, porte: true,
    style: "porte", couleurs: { fond: "#1a120c", cadre: "#7a6f60", lueur: "#b9692e" },
  },
  "M": {
    id: "mine", nom: "Mine entrance", solide: false,
    // Marcher dessus descend dans une mine générée (cf. principal.js / world/mine.js).
    style: "mine", couleurs: { fond: "#0b0907", cadre: "#5a4632" },
  },
  ">": {
    id: "descente", nom: "Passage down", solide: false,
    // Passage vers l'ÉTAGE SUIVANT d'une mine (plus profond). Cadre violacé pour le
    // distinguer de l'entrée `M` (brune) et de la sortie `P`.
    style: "mine", couleurs: { fond: "#08070d", cadre: "#3f3a58" },
  },
};

// Hors carte (ou caractère inconnu) = mur plein : on ne sort jamais du monde.
const DEFAUT = TUILES["#"];

export function tuileDef(caractere) {
  return TUILES[caractere] ?? DEFAUT;
}
export function estSolide(caractere) { return tuileDef(caractere).solide === true; }
export function estRencontre(caractere) { return tuileDef(caractere).rencontre === true; }
export function estPorte(caractere) { return tuileDef(caractere).porte === true; }
