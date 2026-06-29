// Générateur de MINES procédurales (cf. docs/mines.md).
//
// Produit un objet « zone » compatible avec creerCarte() (jeu/world/carte.js) :
// on ne touche PAS au moteur, on lui fabrique juste un plan au hasard au lieu de
// le lire dans data/zones.js.
//
// Phase 1 (squelette) : des SALLES (zones aérées) reliées par des GALERIES en L
// (couloirs) — pas un chemin tout droit, on doit explorer. Connexité GARANTIE :
// chaque salle est reliée à la précédente, donc tout est atteignable. La salle
// d'entrée contient la SORTIE (porte `P`) qui ramène au monde ; le héros y
// réapparaît juste à côté. Veines, rareté et décor viendront aux phases suivantes.
//
// Tuiles : `#` roche (mur), `,` sol de galerie (active les rencontres), `P` sortie.

// Profil par défaut d'une mine. L'appelant complète notamment `retour` (où ramène
// la sortie) et plus tard la rareté / les tables de la zone de profondeur.
const PROFIL_DEFAUT = {
  nom: "The Depths",
  largeur: 44,
  hauteur: 28,
  nbSalles: 8,
  tailleSalleMin: 4,
  tailleSalleMax: 9,
  monstres: ["gobelin", "gobelin-vif", "gobelin-chaman"],
  // Où ramène la sortie (id de zone + case d'arrivée). Rempli par l'appelant ;
  // valeur de repli neutre au cas où.
  retour: { vers: "city", entree: { colonne: 2, ligne: 2 } },
};

function entier(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

// Génère une mine VALIDE (connexe). Plusieurs tentatives au cas où un tirage
// échoue (trop peu de salles / non connexe) ; en dernier recours on force.
export function genererMine(profil = {}) {
  const cfg = { ...PROFIL_DEFAUT, ...profil };
  for (let essai = 0; essai < 40; essai++) {
    const mine = construire(cfg, false);
    if (mine) return mine;
  }
  return construire(cfg, true); // garde-fou (ne devrait jamais servir)
}

function construire(cfg, forcer) {
  const W = cfg.largeur, H = cfg.hauteur;

  // 1. Tout en roche.
  const g = Array.from({ length: H }, () => Array(W).fill("#"));

  // 2. Placer des salles non chevauchantes (marge de roche autour, bord intact).
  const salles = [];
  let tentatives = 0;
  while (salles.length < cfg.nbSalles && tentatives < 300) {
    tentatives++;
    const w = entier(cfg.tailleSalleMin, cfg.tailleSalleMax);
    const h = entier(cfg.tailleSalleMin, cfg.tailleSalleMax);
    const x = entier(2, W - w - 2);
    const y = entier(2, H - h - 2);
    const salle = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) };
    if (salles.some((s) => chevauche(s, salle, 1))) continue;
    salles.push(salle);
    creuserRect(g, salle);
  }
  if (salles.length < 2) return forcer ? finaliser(g, salles, cfg) : null;

  // 3. Relier chaque salle à la précédente (galerie en L) → connexité garantie.
  for (let i = 1; i < salles.length; i++) creuserGalerie(g, salles[i - 1], salles[i]);
  // Quelques boucles supplémentaires : rend l'exploration moins linéaire.
  for (let k = 0; k < 2 && salles.length > 2; k++) {
    creuserGalerie(g, salles[entier(0, salles.length - 1)], salles[entier(0, salles.length - 1)]);
  }

  // 4. Vérif défensive : tout le sol doit être atteignable depuis la 1re salle.
  if (!forcer && !toutConnexe(g, salles[0], W, H)) return null;

  return finaliser(g, salles, cfg);
}

// --- Outils de creusement ---------------------------------------------------

function chevauche(a, b, marge) {
  return a.x - marge < b.x + b.w && a.x + a.w + marge > b.x &&
         a.y - marge < b.y + b.h && a.y + a.h + marge > b.y;
}
function creuserRect(g, s) {
  for (let j = s.y; j < s.y + s.h; j++)
    for (let i = s.x; i < s.x + s.w; i++) g[j][i] = ",";
}
function creuserH(g, y, x1, x2) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) if (g[y]?.[x] !== undefined) g[y][x] = ",";
}
function creuserV(g, x, y1, y2) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) if (g[y]?.[x] !== undefined) g[y][x] = ",";
}
// Galerie en L entre les centres de deux salles (sens horizontal/vertical tiré
// au hasard → le couloir coude différemment selon les cas).
function creuserGalerie(g, a, b) {
  if (Math.random() < 0.5) { creuserH(g, a.cy, a.cx, b.cx); creuserV(g, b.cx, a.cy, b.cy); }
  else                     { creuserV(g, a.cx, a.cy, b.cy); creuserH(g, b.cy, a.cx, b.cx); }
}

// Remplissage par diffusion (BFS) depuis le centre de la 1re salle : toutes les
// cases sol `,` doivent être atteintes.
function toutConnexe(g, depart, W, H) {
  const vu = Array.from({ length: H }, () => Array(W).fill(false));
  const pile = [[depart.cx, depart.cy]];
  vu[depart.cy][depart.cx] = true;
  let atteint = 1, total = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === ",") total++;
  while (pile.length) {
    const [x, y] = pile.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && !vu[ny][nx] && g[ny][nx] === ",") {
        vu[ny][nx] = true; atteint++; pile.push([nx, ny]);
      }
    }
  }
  return atteint === total;
}

// --- Finalisation : sortie, départ, format zone -----------------------------

function finaliser(g, salles, cfg) {
  const entree = salles[0];
  const px = entree.cx, py = entree.cy; // case de la SORTIE (porte de retour au monde)
  g[py][px] = "P";
  // Départ : une case sol adjacente à la porte, dans la salle d'entrée.
  let dCol = px, dLig = py + 1;
  if (g[dLig]?.[dCol] !== ",") { dCol = px + 1; dLig = py; }
  return {
    nom: cfg.nom,
    estMine: true, // marqueur : on est dans une mine (sauvegarde interdite, etc.)
    plan: g.map((row) => row.join("")),
    depart: { colonne: dCol, ligne: dLig },
    portails: [{ colonne: px, ligne: py, vers: cfg.retour.vers, entree: cfg.retour.entree }],
    monstres: cfg.monstres,
  };
}
