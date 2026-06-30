// Le moteur de carte : transforme un plan en caractères (jeu/data/zones.js)
// en monde jouable — collisions, points d'intérêt, dessin des tuiles.
// Ce que SIGNIFIE et à quoi RESSEMBLE chaque tuile est décrit dans le
// catalogue jeu/data/tuiles.js (ce moteur ne fait que l'appliquer).

import { tuileDef, estSolide } from "../data/tuiles.js";

export const TUILE = 32; // taille d'une tuile en pixels

// Prépare une zone : dimensions, position de départ du héros en pixels…
export function creerCarte(zone) {
  const lignes = zone.plan;
  const largeur = lignes[0].length;
  const hauteur = lignes.length;
  // Brouillard de guerre : dans les MINES, on ne voit qu'autour de soi. Une grille
  // `vu` (tout caché au départ) se découvre au fil de l'exploration. Hors mine
  // (`vu` = null), tout est visible → aucun coût.
  const brouillard = Boolean(zone.estMine);
  return {
    nom: zone.nom,
    lignes,
    largeur,
    hauteur,
    largeurPx: largeur * TUILE,
    hauteurPx: hauteur * TUILE,
    // Position du sprite (64x64) pour que les PIEDS du héros
    // soient centrés sur la tuile de départ
    departX: zone.depart.colonne * TUILE - 16,
    departY: zone.depart.ligne * TUILE - 38,
    brouillard,
    vu: brouillard ? Array.from({ length: hauteur }, () => Array(largeur).fill(false)) : null,
  };
}

// Découvre les cases dans un rayon (en cases) autour d'un point — appelé au fil
// des pas du héros. Sans brouillard (`vu` null), ne fait rien.
export function revelerAutour(carte, colonne, ligne, rayon) {
  if (!carte.vu) return;
  const r2 = rayon * rayon;
  for (let dy = -rayon; dy <= rayon; dy++) {
    for (let dx = -rayon; dx <= rayon; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const c = colonne + dx, l = ligne + dy;
      if (c >= 0 && l >= 0 && c < carte.largeur && l < carte.hauteur) carte.vu[l][c] = true;
    }
  }
}

// Une case est-elle visible ? (toujours vrai hors brouillard.)
export function estVu(carte, colonne, ligne) {
  if (!carte.vu) return true;
  return Boolean(carte.vu[ligne]?.[colonne]);
}

export function tuile(carte, colonne, ligne) {
  if (colonne < 0 || ligne < 0 || colonne >= carte.largeur || ligne >= carte.hauteur) {
    return "#"; // hors de la carte = mur
  }
  return carte.lignes[ligne][colonne];
}

// Un rectangle (en pixels) ne touche-t-il aucun mur ?
// Le rectangle fait moins d'une tuile : vérifier ses 4 coins suffit.
export function rectangleLibre(carte, x, y, largeur, hauteur) {
  const points = [
    [x, y], [x + largeur - 1, y],
    [x, y + hauteur - 1], [x + largeur - 1, y + hauteur - 1],
  ];
  return points.every(
    ([px, py]) => !estSolide(tuile(carte, Math.floor(px / TUILE), Math.floor(py / TUILE)))
  );
}

// La "boîte des pieds" du héros : on ne collisionne que le bas du sprite,
// pour que sa tête puisse passer devant les murs (rendu naturel en vue de haut).
export function piedsLibres(carte, x, y) {
  return rectangleLibre(carte, x + 16, y + 46, 32, 16);
}

// La tuile sous les pieds du héros (pour les rencontres, points d'intérêt…)
export function tuileSousLesPieds(carte, heros) {
  const colonne = Math.floor((heros.x + 32) / TUILE);
  const ligne = Math.floor((heros.y + 54) / TUILE);
  return { colonne, ligne, caractere: tuile(carte, colonne, ligne) };
}

// ---- Dessin -------------------------------------------------------------

// Ne dessine que les tuiles visibles par la caméra. Chaque tuile est peinte
// selon sa définition (jeu/data/tuiles.js) — le jour où `couleurs` devient une
// planche d'images, seul dessinerTuile() change, pas le reste.
export function dessinerCarte(ctx, carte, camera, largeurVue, hauteurVue) {
  const c0 = Math.max(0, Math.floor(camera.x / TUILE));
  const l0 = Math.max(0, Math.floor(camera.y / TUILE));
  const c1 = Math.min(carte.largeur - 1, Math.ceil((camera.x + largeurVue) / TUILE));
  const l1 = Math.min(carte.hauteur - 1, Math.ceil((camera.y + hauteurVue) / TUILE));

  for (let l = l0; l <= l1; l++) {
    for (let c = c0; c <= c1; c++) {
      dessinerTuile(ctx, tuileDef(tuile(carte, c, l)), c * TUILE, l * TUILE, c, l);
    }
  }
}

// Brouillard de guerre LISSE. On peint un masque basse résolution (1 px = 1 case)
// dans un canvas à part — chaque case reçoit une opacité de noir : 255 = inexploré,
// 0 = en pleine lumière (près du héros), et un dégradé entre les deux pour les zones
// explorées hors de la vue proche. On étire ensuite ce masque sur la carte AVEC le
// lissage du canvas → les bords deviennent de vrais dégradés, plus de gros pixels.
//
// `ctxFog` est un contexte 2D d'un canvas de taille largeur×hauteur (cases), fourni
// et conservé par l'appelant (principal.js). `heroCol/heroLig` = case du héros.
const DIM_MEMOIRE = 0.5; // assombrissement des zones explorées hors de la lampe (0..1)
const R_CLAIR = 2.2;     // rayon (cases) en pleine lumière autour du héros
const R_FONDU = 5.2;     // rayon (cases) où l'on atteint l'assombrissement « mémoire »

export function peindreMasqueBrouillard(ctxFog, carte, heroCol, heroLig) {
  const W = carte.largeur, H = carte.hauteur;
  const img = ctxFog.createImageData(W, H);
  const data = img.data;
  for (let l = 0; l < H; l++) {
    for (let c = 0; c < W; c++) {
      const i = (l * W + c) * 4;
      let alpha;
      if (!carte.vu[l][c]) {
        alpha = 255; // inexploré : noir
      } else {
        const d = Math.hypot(c - heroCol, l - heroLig);
        let k; // 0 = pleine lumière, 1 = sombre « mémoire »
        if (d <= R_CLAIR) k = 0;
        else if (d >= R_FONDU) k = 1;
        else k = (d - R_CLAIR) / (R_FONDU - R_CLAIR);
        alpha = Math.round(k * DIM_MEMOIRE * 255);
      }
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = alpha;
    }
  }
  ctxFog.putImageData(img, 0, 0);
}

// Peint UNE tuile « au feutre » d'après sa définition (style + couleurs).
function dessinerTuile(ctx, def, x, y, c, l) {
  const k = def.couleurs;

  if (def.style === "mur") {
    ctx.fillStyle = k.fond;
    ctx.fillRect(x, y, TUILE, TUILE);
    ctx.fillStyle = k.joint; // joints entre les blocs de pierre
    ctx.fillRect(x, y + TUILE - 2, TUILE, 2);
    ctx.fillRect(x + TUILE - 2, y, 2, TUILE);
    return;
  }

  if (def.style === "porte") {
    ctx.fillStyle = k.fond;
    ctx.fillRect(x, y, TUILE, TUILE);
    ctx.fillStyle = k.cadre;
    ctx.fillRect(x, y, TUILE, 6);              // linteau
    ctx.fillRect(x, y, 6, TUILE);              // montant gauche
    ctx.fillRect(x + TUILE - 6, y, 6, TUILE);  // montant droit
    ctx.fillStyle = k.lueur;
    ctx.fillRect(x + 10, y + TUILE - 9, TUILE - 20, 6); // lueur au seuil
    return;
  }

  if (def.style === "mine") {
    ctx.fillStyle = k.fond;
    ctx.fillRect(x, y, TUILE, TUILE);
    ctx.fillStyle = k.cadre;
    ctx.fillRect(x, y, TUILE, 4);
    ctx.fillRect(x, y, 4, TUILE);
    ctx.fillRect(x + TUILE - 4, y, 4, TUILE);
    return;
  }

  // style "sol" : damier discret + détails optionnels (gravats, veine)
  ctx.fillStyle = k.damier[(c + l) % 2];
  ctx.fillRect(x, y, TUILE, TUILE);
  if (k.gravats) {
    const motif = (c * 7 + l * 13) % 9;
    if (motif === 0) {
      ctx.fillStyle = k.gravats;
      ctx.fillRect(x + 12, y + 18, 5, 3);
      ctx.fillRect(x + 21, y + 9, 3, 3);
    } else if (motif === 4 && k.veine) {
      ctx.fillStyle = k.veine;
      ctx.fillRect(x + 22, y + 21, 3, 3);
    }
  }
}
