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

import { MINERAIS, tirerMinerai } from "../data/items.js";

// Profil par défaut d'une mine. L'appelant complète notamment `retour` (où ramène
// la sortie) et plus tard la rareté / les tables de la zone de profondeur.
const PROFIL_DEFAUT = {
  nom: "The Depths",
  largeur: 44,
  hauteur: 28,
  nbSalles: 8,
  tailleSalleMin: 4,
  tailleSalleMax: 9,
  niveau: 1,                  // PROFONDEUR (étage) : pilote la rareté des minerais
  materiaux: MINERAIS,        // table de drop de la zone (surchargeable par grotte)
  nbVeines: [3, 6],           // nombre de veines posées dans les salles d'exploration
  monstres: ["gobelin", "gobelin-vif", "gobelin-chaman"],
  // Taux de rencontre PROPRE à la mine (×, relatif au taux normal). Bas pour
  // laisser explorer/miner ; montera avec la profondeur. Réglable par profil.
  tauxRencontre: 0.3,
  // Assets (fonds + musique de combat) : id d'une zone réelle ; et ambiance
  // d'exploration de la mine. Remplis par l'appelant (la zone d'origine en Phase 1).
  assetZone: "city",
  musique: null,
  // Où ramène la sortie (id de zone + case d'arrivée). Rempli par l'appelant ;
  // valeur de repli neutre au cas où.
  retour: { vers: "city", entree: { colonne: 2, ligne: 2 } },
};

function entier(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

// Chance (%) de trouver un passage vers l'ÉTAGE SUIVANT, selon la profondeur (1..10),
// puis 1 % plancher au-delà (ne descend jamais à 0). Réglable.
const CHANCE_DESCENTE = [70, 50, 40, 30, 20, 10, 5, 3, 2, 1];
export function chanceDescente(niveau) { return CHANCE_DESCENTE[niveau - 1] ?? 1; }

// Fourchette de NIVEAU des monstres selon l'étage : 1→1-3, 2→2-5, 3→4-6, 4→6-7,
// 5→7-8 ; au-delà de l'étage 5, +1 sur min ET max par étage. Réglable.
const NIVEAU_MOBS = { 1: [1, 3], 2: [2, 5], 3: [4, 6], 4: [6, 7], 5: [7, 8] };
export function niveauMobsEtage(niveau) {
  return NIVEAU_MOBS[niveau] ?? [niveau + 2, niveau + 3];
}

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

  // Cases SOL des salles d'EXPLORATION (pas la salle d'entrée) : sert au passage
  // de descente et au méga-gisement.
  const solExplo = [];
  for (let i = 1; i < salles.length; i++) {
    const s = salles[i];
    for (let y = s.y; y < s.y + s.h; y++)
      for (let x = s.x; x < s.x + s.w; x++)
        if (g[y][x] === ",") solExplo.push([x, y]);
  }

  // PAROIS minables : les minerais classiques s'incrustent dans la ROCHE (`#`)
  // qui borde le sol d'exploration. Le héros se tient sur le sol DEVANT la paroi
  // et mine le mur (la case reste solide, la veine n'est qu'un décor par-dessus).
  const paroiSet = new Set(), parois = [];
  for (const [x, y] of solExplo) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (g[ny]?.[nx] === "#") {
        const cle = nx + "," + ny;
        if (!paroiSet.has(cle)) { paroiSet.add(cle); parois.push([nx, ny]); }
      }
    }
  }
  melanger(parois);
  const nb = entier(cfg.nbVeines[0], cfg.nbVeines[1]);
  const veines = [];
  for (let i = 0; i < nb && i < parois.length; i++) {
    const [x, y] = parois[i];
    veines.push({ col: x, lig: y, type: tirerMinerai(cfg.niveau, cfg.materiaux), coups: entier(2, 5) });
  }

  // MÉGA-GISEMENT (rare) : un gros filon au CENTRE d'une salle d'exploration. C'est
  // un PILIER de roche (la case devient solide → il N'EST PAS traversable) ; on le
  // mine depuis le sol autour, comme une grosse paroi. Beaucoup de coups, minerai un
  // cran plus riche. ~1 mine sur 5. On n'autorise le pilier que si le centre est
  // entouré de sol des 4 côtés → on peut toujours en faire le tour (connexité OK).
  let megaTile = null;
  if (salles.length > 1 && Math.random() < 0.2) {
    const s = salles[entier(1, salles.length - 1)];
    const cx = s.cx, cy = s.cy;
    const entoure = g[cy]?.[cx] === "," &&
      [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => g[cy + dy]?.[cx + dx] === ",");
    if (entoure) {
      g[cy][cx] = "#"; // pilier de roche : bloque le passage (mine-able tout autour)
      veines.push({ col: cx, lig: cy, type: tirerMinerai(cfg.niveau + 1, cfg.materiaux), coups: entier(8, 12), mega: true });
      megaTile = [cx, cy];
    }
  }

  // Passage de descente vers l'étage suivant : présent selon la chance de l'étage.
  // Posé sur une case sol d'exploration LIBRE (pas sur le méga-gisement), tuile `>`.
  if (Math.random() * 100 < chanceDescente(cfg.niveau)) {
    const libres = solExplo.filter(([x, y]) => !(megaTile && x === megaTile[0] && y === megaTile[1]));
    if (libres.length) {
      const [x, y] = libres[entier(0, libres.length - 1)];
      g[y][x] = ">";
    }
  }

  return {
    nom: cfg.nom,
    estMine: true,            // marqueur : on est dans une mine (sauvegarde interdite…)
    niveau: cfg.niveau,       // PROFONDEUR (étage) courante
    niveauMobs: niveauMobsEtage(cfg.niveau), // fourchette de niveau des monstres
    retour: cfg.retour,       // {vers, entree} du MONDE — propagé en descendant
    materiaux: cfg.materiaux, // table de drop de la grotte — propagée en descendant
    tauxRencontre: cfg.tauxRencontre,
    assetZone: cfg.assetZone,
    musique: cfg.musique ?? null,
    monstres: cfg.monstres,
    plan: g.map((row) => row.join("")),
    depart: { colonne: dCol, ligne: dLig },
    portails: [{ colonne: px, ligne: py, vers: cfg.retour.vers, entree: cfg.retour.entree }],
    veines,
  };
}

// Mélange un tableau en place (Fisher-Yates).
function melanger(t) {
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
}
