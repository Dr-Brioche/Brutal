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
//   style     : COMMENT la peindre AU CODE, quand il n'y a pas d'image
//               (interprété par jeu/world/carte.js) — c'est le filet de sécurité.
//   couleurs  : la palette utilisée par le style
//   planche   : chemin d'une PLANCHE D'AUTOTUILAGE (images/tuiles/…). Si le
//               fichier existe, il REMPLACE la peinture au code et les bordures
//               se raccordent toutes seules ; s'il manque, on repeint comme
//               avant. On peut donc remplacer les tuiles UNE PAR UNE, sans
//               jamais casser l'affichage. Format : voir jeu/world/tileset.js
//               et images/tuiles/LISEZMOI.md.
//   groupe    : quelles tuiles se FONDENT ensemble. Deux cases du même groupe se
//               collent sans bordure ; sinon la bordure est dessinée entre elles.
//               Par défaut = l'`id`. Le groupe "*" est NEUTRE : il ne coupe
//               jamais une bordure (portes, entrées de mine : elles ont déjà
//               leur propre cadre, un liseré autour ferait tache).
//   variantes : true = la planche fournit une 2ᵉ version du remplissage (case en
//               haut à droite), tirée au hasard pour casser la répétition.

export const TUILES = {
  "#": {
    id: "mur", nom: "Stone wall", solide: true,
    // Pas encore de `planche` : la roche peinte au code est calculée en
    // coordonnées MONDE, donc jamais répétitive — une planche ferait moins
    // bien tant qu'elle n'est pas dessinée à la main. Le jour où elle existe :
    // ajouter `planche: "images/tuiles/mur.png"` ici, rien d'autre à toucher.
    // Toute la pierre solide partage le groupe "roche" : deux murs voisins se
    // collent sans liseré, même de sortes différentes — et surtout le mur du
    // BORD de carte ne se dessine pas une bordure vers le vide.
    groupe: "roche",
    // ROCHE BRUTE (mines / souterrains) : pierre naine chaude (grise-brune). Le
    // rendu (jeu/world/carte.js) ajoute texture crayeuse + crevasses + bords
    // éclairés/ombrés selon les voisins.
    style: "mur", couleurs: { fond: "#4a453d", joint: "#2a251f" },
  },
  "H": {
    id: "mur-taille", nom: "Cut stone wall", solide: true,
    groupe: "roche",   // idem : maçonnerie peinte au code, continue d'une case à l'autre
    // PIERRE TAILLÉE grise claire (murs de la VILLE) : blocs d'appareil réguliers
    // (façon maçonnerie), joints de mortier, biseau taillé. Distincte de la roche
    // brute des mines. `fond` = face du bloc, `joint` = mortier (entre les blocs).
    style: "pierre-taillee", couleurs: { fond: "#9ba0a6", joint: "#585c62" },
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
    id: "porte", nom: "Gate", solide: false, porte: true, groupe: "*",
    style: "porte", couleurs: { fond: "#1a120c", cadre: "#7a6f60", lueur: "#b9692e" },
  },
  "M": {
    id: "mine", nom: "Mine entrance", solide: false, groupe: "*",
    // Marcher dessus descend dans une mine générée (cf. principal.js / world/mine.js).
    style: "mine", couleurs: { fond: "#0b0907", cadre: "#5a4632" },
  },
  ">": {
    id: "descente", nom: "Passage down", solide: false, groupe: "*",
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
// Le groupe d'autotuilage d'une case (par défaut son id).
export function groupeDe(caractere) {
  const d = tuileDef(caractere);
  return d.groupe ?? d.id;
}
// Deux cases se fondent-elles l'une dans l'autre (pas de bordure entre elles) ?
export function memeGroupe(a, b) {
  const ga = groupeDe(a), gb = groupeDe(b);
  return ga === "*" || gb === "*" || ga === gb;
}

export function estSolide(caractere) { return tuileDef(caractere).solide === true; }
export function estRencontre(caractere) { return tuileDef(caractere).rencontre === true; }
export function estPorte(caractere) { return tuileDef(caractere).porte === true; }
