// AUTOTUILAGE — dessiner un décor dont les BORDURES se raccordent toutes seules,
// à partir d'une planche d'images minuscule.
//
// ── LE PROBLÈME ─────────────────────────────────────────────────────────────
// Une tuile dessinée comme UN seul carré ne sait pas qu'elle est au bord d'un
// chemin. Ou bien tout est plat, ou bien il faut dessiner à la main les 47 cas
// possibles (bord haut, bord haut+gauche, coin, bout de couloir, îlot…).
//
// ── LA SOLUTION : on découpe en QUARTS ──────────────────────────────────────
// Chaque case est peinte en 4 QUARTS (NO, NE, SO, SE). Un quart ne regarde que
// TROIS voisins : celui d'à côté, celui du dessus (ou du dessous), et celui en
// diagonale. Ça ne laisse que CINQ aspects possibles par quart :
//
//     remplissage · bord horizontal · bord vertical · coin sortant · coin rentrant
//
// Ces 5 aspects, dans leurs 4 orientations, tiennent dans SIX carrés dessinés.
// Le code recompose les 47 cas tout seul. C'est le format « autotuile » qu'on
// retrouve dans RPG Maker, Godot, Tiled… — la même planche partout.
//
// ── LA PLANCHE (ce qu'il y a à dessiner) ────────────────────────────────────
// Une image de 2 tuiles de large × 3 de haut. Avec des tuiles de 64 px, ça fait
// 128 × 192 px. (Toute taille marche : le code déduit tout de la largeur, qui
// doit valoir 4 quarts — et la hauteur 6.)
//
//     ┌─────────────┬─────────────┐
//     │ LES 4 COINS │ REMPLISSAGE │   ← rangée 1
//     │  RENTRANTS  │  VARIANTE   │
//     ├─────────────┴─────────────┤
//     │                           │   ← rangées 2-3 : L'ÎLOT
//     │   la matière ENTOURÉE de  │     (2 tuiles × 2 tuiles)
//     │   sa bordure sur ses 4    │
//     │   côtés (un bloc isolé)   │
//     └───────────────────────────┘
//
// L'ÎLOT fournit à lui seul presque tout : ses 4 angles = les coins SORTANTS,
// ses milieux de côté = les 4 bords, son centre = le remplissage. Le seul cas
// qu'il ne contient pas, c'est le coin RENTRANT — l'angle en creux qu'on voit
// quand deux bords se rejoignent dans un recoin ; d'où la case du haut à gauche,
// qui range les 4 coins rentrants comme les 4 quarts d'une tuile.
// La case REMPLISSAGE VARIANTE (haut à droite) est facultative : une seconde
// version du remplissage, tirée au hasard une case sur trois, pour qu'un grand
// sol ne se répète pas. Elle ne sert que si la tuile déclare `variantes: true`
// (jeu/data/tuiles.js) — sinon on ne la lit jamais, elle peut rester vide.
//
// Le fichier `images/tuiles/LISEZMOI.md` redit tout ça côté dessin.

// ---- Les 8 voisins, en bits ------------------------------------------------
// Un « masque » est un nombre qui répond en une fois à : lequel de mes 8 voisins
// est de la MÊME matière que moi ? (cf. masqueVoisins dans world/carte.js)
export const V_N = 1, V_E = 2, V_S = 4, V_O = 8;
export const V_NE = 16, V_SE = 32, V_SO = 64, V_NO = 128;

// Les 4 quadrants d'une case. Pour chacun : quels voisins il regarde, et où
// piocher dans la planche (en QUARTS, repère de la planche : 4 colonnes × 6
// rangées) selon l'aspect à donner.
//
//   h / v / d  : les bits du voisin d'à côté, du dessus-dessous, et de la diagonale
//   plein      : les deux voisins ET la diagonale sont de la même matière
//   bordH      : le voisin d'à côté est pareil, mais pas celui du dessus/dessous
//                → la bordure court à l'horizontale (bord haut ou bas)
//   bordV      : l'inverse → la bordure court à la verticale (bord gauche ou droit)
//   sortant    : aucun des deux → angle saillant
//   rentrant   : les deux, mais pas la diagonale → angle en creux
//   variante   : le même quart, pris dans la case « remplissage variante »
const QUADRANTS = [
  { // NORD-OUEST
    dx: 0, dy: 0, h: V_O, v: V_N, d: V_NO,
    plein: [1, 3], bordH: [1, 2], bordV: [0, 3], sortant: [0, 2],
    rentrant: [0, 0], variante: [2, 0],
  },
  { // NORD-EST
    dx: 1, dy: 0, h: V_E, v: V_N, d: V_NE,
    plein: [2, 3], bordH: [2, 2], bordV: [3, 3], sortant: [3, 2],
    rentrant: [1, 0], variante: [3, 0],
  },
  { // SUD-OUEST
    dx: 0, dy: 1, h: V_O, v: V_S, d: V_SO,
    plein: [1, 4], bordH: [1, 5], bordV: [0, 4], sortant: [0, 5],
    rentrant: [0, 1], variante: [2, 1],
  },
  { // SUD-EST
    dx: 1, dy: 1, h: V_E, v: V_S, d: V_SE,
    plein: [2, 4], bordH: [2, 5], bordV: [3, 4], sortant: [3, 5],
    rentrant: [1, 1], variante: [3, 1],
  },
];

// ---- Chargement des planches ------------------------------------------------
// Une planche n'est utilisable qu'une fois l'image arrivée. Tant qu'elle n'est
// pas là (ou si le fichier n'existe pas), plancheDe() rend `null` et le moteur
// de carte repeint la case au code, comme avant : jamais de trou à l'écran.

const planches = new Map(); // chemin → { img, pret }

export function chargerPlanche(chemin) {
  let e = planches.get(chemin);
  if (e) return e;
  const img = new Image();
  let fini;
  // `promesse` ne sert qu'aux pages de test (attendre avant de capturer) : le
  // jeu, lui, dessine sans attendre et repeint au code tant que rien n'est prêt.
  e = { img, pret: false, promesse: new Promise((r) => { fini = r; }) };
  planches.set(chemin, e);
  img.onload = () => {
    // Garde-fou : une planche mal découpée dessinerait n'importe quoi. Mieux
    // vaut la refuser (retour au rendu peint) que d'afficher de la bouillie.
    if (img.width % 4 === 0 && img.height % 6 === 0
        && img.width / 4 === img.height / 6) {
      e.pret = true;
    } else {
      console.warn(`[tuiles] ${chemin} : la planche doit faire 2 tuiles de large `
        + `× 3 de haut (ici ${img.width}×${img.height}). Ignorée.`);
    }
    fini(e);
  };
  img.onerror = () => fini(e); // fichier absent : on garde le rendu peint au code
  img.src = chemin;
  return e;
}

// Attend que toutes les planches déjà demandées soient arrivées (ou aient
// échoué). Réservé aux pages de test / aux captures.
export function attendreTuiles() {
  return Promise.all([...planches.values()].map((e) => e.promesse));
}

// La planche si elle est prête à être dessinée, sinon null.
export function plancheDe(chemin) {
  const e = planches.get(chemin) ?? chargerPlanche(chemin);
  return e.pret ? e.img : null;
}

// Lance le chargement de toutes les planches déclarées dans le catalogue.
// Appelé au démarrage (principal.js) pour qu'aucune case n'apparaisse « peinte »
// puis « en image » sous les yeux du joueur.
export function prechargerTuiles(tuiles) {
  for (const def of Object.values(tuiles)) if (def.planche) chargerPlanche(def.planche);
}

// ---- Dessin -----------------------------------------------------------------

// Peint UNE case en 4 quarts, d'après le masque de ses voisins.
//   img     : la planche (déjà prête)
//   x, y    : coin haut-gauche de la case, en pixels du monde
//   taille  : la taille d'une case dans le monde (TUILE)
//   masque  : les 8 bits de voisinage (V_N | V_E | …)
//   varier  : true si l'on doit piocher dans la case « remplissage variante »
export function dessinerAutotuile(ctx, img, x, y, taille, masque, varier = false) {
  const Q = img.width / 4;      // un quart, en pixels de la planche
  const q = taille / 2;         // un quart, en pixels du monde
  for (const z of QUADRANTS) {
    const h = (masque & z.h) !== 0, v = (masque & z.v) !== 0, d = (masque & z.d) !== 0;
    let src;
    if (h && v && d) src = varier ? z.variante : z.plein;
    else if (h && v) src = z.rentrant;
    else if (h) src = z.bordH;
    else if (v) src = z.bordV;
    else src = z.sortant;
    ctx.drawImage(
      img, src[0] * Q, src[1] * Q, Q, Q,
      x + z.dx * q, y + z.dy * q, q, q
    );
  }
}
