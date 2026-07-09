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
    theme: zone.theme ?? null, // thème d'étage de mine (cristal/glace/lave) — recolore le rendu
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
      dessinerTuile(ctx, carte, c, l);
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

// ---- Rendu texturé « au pinceau » -------------------------------------------
//
// Pas de spritesheet : on PEINT chaque case au canvas, mais de façon riche et
// consciente des VOISINS (autotiling « procédural »). Deux principes :
//  - Roche (`#`) : texture crayeuse + bords ÉCLAIRÉS (côté sol au-dessus/à
//    gauche, lumière venant du haut-gauche) et OMBRÉS (côté sol en bas/à droite).
//  - Sol de caverne (`,`) : grain déterministe + OMBRE DOUCE (ambient occlusion)
//    le long des bords/coins qui touchent la roche → le sol paraît creusé, la
//    roche « projette » son ombre.
// TOUT est DÉTERMINISTE (le hasard dépend de la position de la case, pas du
// temps) : une case garde toujours le même aspect, aucun scintillement. Le jour
// où de vraies tuiles pixel art arrivent, on remplace ce pinceau par des images
// AVEC la même logique de voisinage — le reste du jeu ne bouge pas.

// Nombre pseudo-aléatoire STABLE dérivé de (c, l, graine) — 0..1.
function alea(c, l, graine = 0) {
  let h = (c * 374761393 + l * 668265263 + graine * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// Le voisin (dc, dl) est-il de la roche (solide) ? Hors carte = roche.
function solideEn(carte, c, l) { return estSolide(tuile(carte, c, l)); }

// Ombre douce (ambient occlusion) sur 3 bandes dégressives depuis un bord.
// `mult` accentue/atténue : lumière venant du HAUT → un mur AU-DESSUS projette
// une ombre plus marquée vers le bas que les côtés ; le bas est presque nul.
const BANDES_AO = [[3, 0.30], [3, 0.15], [3, 0.06]];
function ombreCote(ctx, x, y, cote, mult = 1) {
  let off = 0;
  for (const [ep, a] of BANDES_AO) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, a * mult).toFixed(3)})`;
    if (cote === "haut")   ctx.fillRect(x, y + off, TUILE, ep);
    else if (cote === "bas")    ctx.fillRect(x, y + TUILE - off - ep, TUILE, ep);
    else if (cote === "gauche") ctx.fillRect(x + off, y, ep, TUILE);
    else if (cote === "droite") ctx.fillRect(x + TUILE - off - ep, y, ep, TUILE);
    off += ep;
  }
}

function dessinerRoche(ctx, carte, c, l, x, y, k) {
  ctx.fillStyle = k.fond;
  ctx.fillRect(x, y, TUILE, TUILE);
  // Texture crayeuse : quelques taches sombres/claires posées par le hasard STABLE.
  for (let i = 0; i < 6; i++) {
    const rx = x + Math.floor(alea(c, l, i * 3 + 1) * (TUILE - 7));
    const ry = y + Math.floor(alea(c, l, i * 3 + 2) * (TUILE - 7));
    const s = 3 + Math.floor(alea(c, l, i * 3 + 3) * 5);
    ctx.fillStyle = alea(c, l, i) < 0.5 ? "rgba(0,0,0,0.16)" : "rgba(255,238,214,0.06)";
    ctx.fillRect(rx, ry, s, s);
  }
  // Crevasse : une fissure sombre sur ~1 bloc sur 6 (verticale, longueur variable).
  if (alea(c, l, 20) < 0.16) {
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    const fx = x + 6 + Math.floor(alea(c, l, 21) * 16);
    const fy = y + 4 + Math.floor(alea(c, l, 22) * 6);
    ctx.fillRect(fx, fy, 2, 8 + Math.floor(alea(c, l, 23) * 9));
  }
  // Bloc plus clair incrusté : ~1 sur 7 (un gros caillou dans la paroi).
  if (alea(c, l, 30) < 0.14) {
    const bx = x + 5 + Math.floor(alea(c, l, 31) * 12);
    const by = y + 5 + Math.floor(alea(c, l, 32) * 12);
    const bw = 7 + Math.floor(alea(c, l, 33) * 6);
    ctx.fillStyle = "rgba(255,238,214,0.07)"; ctx.fillRect(bx, by, bw, bw - 2);
    ctx.fillStyle = "rgba(255,238,214,0.10)"; ctx.fillRect(bx, by, bw, 2); // sommet éclairé
  }
  // Bords selon les voisins : lumière en haut/gauche, ombre en bas/droite.
  if (!solideEn(carte, c, l - 1)) { ctx.fillStyle = "rgba(255,240,214,0.18)"; ctx.fillRect(x, y, TUILE, 3); }
  if (!solideEn(carte, c - 1, l)) { ctx.fillStyle = "rgba(255,240,214,0.10)"; ctx.fillRect(x, y, 2, TUILE); }
  if (!solideEn(carte, c, l + 1)) { ctx.fillStyle = "rgba(0,0,0,0.40)"; ctx.fillRect(x, y + TUILE - 4, TUILE, 4); }
  if (!solideEn(carte, c + 1, l)) { ctx.fillStyle = "rgba(0,0,0,0.24)"; ctx.fillRect(x + TUILE - 2, y, 2, TUILE); }
}

// PIERRE TAILLÉE (murs de ville) — style FORTERESSE NAINE : de GROS blocs
// d'appareil en joints croisés (running bond), joints de mortier CREUSÉS, une
// légère VARIATION DE TEINTE par bloc (clair/sombre + parfois un soupçon de
// chaud/froid) et un CHANFREIN sur les bords (biseau : clair en haut-gauche,
// sombre en bas-droite) → chaque pierre paraît taillée en relief. Le motif est
// calculé en coordonnées MONDE → maçonnerie continue d'une tuile à l'autre.
const P_BW = 28, P_BH = 15; // GROS blocs (px, repère monde)
function dessinerPierreTaillee(ctx, carte, c, l, x, y, k) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, TUILE, TUILE);
  ctx.clip();
  ctx.fillStyle = k.joint; // mortier de fond (les joints = les 2 px laissés autour des blocs)
  ctx.fillRect(x, y, TUILE, TUILE);
  const r0 = Math.floor(y / P_BH) - 1, r1 = Math.floor((y + TUILE - 1) / P_BH) + 1;
  for (let r = r0; r <= r1; r++) {
    const ry = r * P_BH;
    const off = (r & 1) ? (P_BW >> 1) : 0; // rangée décalée d'un demi-bloc
    const cc0 = Math.floor((x - off) / P_BW) - 1;
    const cc1 = Math.floor((x + TUILE - off) / P_BW) + 1;
    for (let cc = cc0; cc <= cc1; cc++) {
      const bx = cc * P_BW + off;
      const fx = bx + 2, fy = ry + 2, fw = P_BW - 4, fh = P_BH - 4; // face (joint 2 px)
      // Base + variation CLAIR/SOMBRE par bloc (légère mais perceptible).
      ctx.fillStyle = k.fond;
      ctx.fillRect(fx, fy, fw, fh);
      const dv = (alea(cc, r, 5) - 0.5) * 0.18; // -0.09 .. +0.09
      ctx.fillStyle = dv >= 0 ? `rgba(255,255,255,${dv.toFixed(3)})` : `rgba(0,0,0,${(-dv).toFixed(3)})`;
      ctx.fillRect(fx, fy, fw, fh);
      // Soupçon de teinte chaude/froide sur quelques pierres (variation de couleur).
      const teinte = alea(cc, r, 9);
      if (teinte > 0.86) { ctx.fillStyle = "rgba(150,120,70,0.06)"; ctx.fillRect(fx, fy, fw, fh); }       // pierre chaude
      else if (teinte < 0.14) { ctx.fillStyle = "rgba(70,95,125,0.05)"; ctx.fillRect(fx, fy, fw, fh); }   // pierre froide
      // CHANFREIN (biseau) : 2 px dégradés — haut+gauche éclairés, bas+droite ombrés.
      ctx.fillStyle = "rgba(255,255,255,0.20)"; ctx.fillRect(fx, fy, fw, 1);
      ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(fx, fy + 1, fw, 1);
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(fx, fy, 1, fh);
      ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fillRect(fx + 1, fy, 1, fh);
      ctx.fillStyle = "rgba(0,0,0,0.30)"; ctx.fillRect(fx, fy + fh - 1, fw, 1);
      ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(fx, fy + fh - 2, fw, 1);
      ctx.fillStyle = "rgba(0,0,0,0.24)"; ctx.fillRect(fx + fw - 1, fy, 1, fh);
      ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(fx + fw - 2, fy, 1, fh);
      // Quelques piqûres de taille discrètes.
      if (alea(cc, r, 6) < 0.4) {
        ctx.fillStyle = "rgba(0,0,0,0.10)";
        ctx.fillRect(fx + 2 + Math.floor(alea(cc, r, 7) * (fw - 4)), fy + 2 + Math.floor(alea(cc, r, 8) * (fh - 4)), 2, 2);
      }
    }
  }
  ctx.restore();
  // Bords selon les voisins (relief là où le mur borde le sol) : lumière haut/gauche.
  if (!solideEn(carte, c, l - 1)) { ctx.fillStyle = "rgba(255,255,255,0.16)"; ctx.fillRect(x, y, TUILE, 2); }
  if (!solideEn(carte, c - 1, l)) { ctx.fillStyle = "rgba(255,255,255,0.09)"; ctx.fillRect(x, y, 2, TUILE); }
  if (!solideEn(carte, c, l + 1)) { ctx.fillStyle = "rgba(0,0,0,0.34)"; ctx.fillRect(x, y + TUILE - 3, TUILE, 3); }
  if (!solideEn(carte, c + 1, l)) { ctx.fillStyle = "rgba(0,0,0,0.20)"; ctx.fillRect(x + TUILE - 2, y, 2, TUILE); }
}

// Petit rocher / caillou de DÉCOR sur le sol (cavernes seulement). Purement visuel,
// non bloquant : au pied des murs (case sol avec roche au-dessus) ou isolé, rare.
function decorSol(ctx, carte, c, l, x, y) {
  if (solideEn(carte, c, l - 1) && alea(c, l, 61) < 0.22) {
    const bx = x + 6 + Math.floor(alea(c, l, 62) * (TUILE - 16));
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(bx - 1, y + 9, 9, 4); // ombre au sol
    ctx.fillStyle = "#3b352d"; ctx.fillRect(bx, y + 3, 7, 9);              // rocher
    ctx.fillStyle = "#544d42"; ctx.fillRect(bx, y + 3, 7, 3);             // sommet éclairé
  } else if (alea(c, l, 70) < 0.05) {
    const px = x + 9 + Math.floor(alea(c, l, 71) * (TUILE - 18));
    const py = y + 11 + Math.floor(alea(c, l, 72) * (TUILE - 18));
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(px, py + 3, 5, 2);
    ctx.fillStyle = "#4a443b"; ctx.fillRect(px, py, 5, 4);
    ctx.fillStyle = "#5c5449"; ctx.fillRect(px, py, 5, 1);
  }
}

function dessinerSol(ctx, carte, c, l, x, y, k) {
  ctx.fillStyle = k.damier[(c + l) % 2];
  ctx.fillRect(x, y, TUILE, TUILE);
  // Grandes plaques de teinte (basse fréquence : par blocs 2×2) → casse la
  // monotonie du damier sans bruit case-par-case.
  const patch = alea(c >> 1, l >> 1, 99);
  if (patch > 0.72) { ctx.fillStyle = "rgba(255,240,220,0.03)"; ctx.fillRect(x, y, TUILE, TUILE); }
  else if (patch < 0.28) { ctx.fillStyle = "rgba(0,0,0,0.10)"; ctx.fillRect(x, y, TUILE, TUILE); }
  // Grain / gravats déterministes (seulement si la tuile en déclare : cavernes).
  if (k.gravats) {
    for (let i = 0; i < 3; i++) {
      if (alea(c, l, i + 11) < 0.55) continue;
      const gx = x + Math.floor(alea(c, l, i + 21) * (TUILE - 4));
      const gy = y + Math.floor(alea(c, l, i + 31) * (TUILE - 4));
      ctx.fillStyle = (k.veine && alea(c, l, i + 41) > 0.72) ? k.veine : k.gravats;
      ctx.fillRect(gx, gy, 2 + Math.floor(alea(c, l, i + 51) * 2), 2);
    }
    decorSol(ctx, carte, c, l, x, y); // rochers/cailloux de décor (cavernes)
  }
  // Ombre DIRECTIONNELLE le long des bords qui touchent la roche (lumière du haut).
  if (solideEn(carte, c, l - 1)) ombreCote(ctx, x, y, "haut", 1.25);   // mur au-dessus : ombre marquée
  if (solideEn(carte, c - 1, l)) ombreCote(ctx, x, y, "gauche", 0.9);
  if (solideEn(carte, c + 1, l)) ombreCote(ctx, x, y, "droite", 0.9);
  if (solideEn(carte, c, l + 1)) ombreCote(ctx, x, y, "bas", 0.5);     // mur en dessous : ombre faible
  // Coins CONCAVES (roche en diagonale, mais les deux côtés sont du sol) :
  // petit renfort d'ombre dans le coin → les recoins de grotte respirent.
  const coin = (dc, dl, cx, cy) => {
    if (solideEn(carte, c + dc, l + dl) && !solideEn(carte, c + dc, l) && !solideEn(carte, c, l + dl)) {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(cx, cy, 5, 5);
    }
  };
  coin(-1, -1, x, y);
  coin(1, -1, x + TUILE - 5, y);
  coin(-1, 1, x, y + TUILE - 5);
  coin(1, 1, x + TUILE - 5, y + TUILE - 5);
}

// ---- Thèmes d'étage de mine (cf. world/mine.js) -----------------------------
// À partir de l'étage 3, un étage peut être à THÈME : on garde le rendu de base
// (roche/sol procédural) et on POSE PAR-DESSUS une teinte + des accents (cristaux,
// givre, lave). Déterministe (alea sur c,l) → aucun scintillement.
const THEMES_MINE = {
  cristal: { teinte: "rgba(120,80,210,0.15)", accent: "#8ad6ff", eclat: "#e8c8ff" },
  glace:   { teinte: "rgba(120,175,225,0.17)", accent: "#eaf6ff", eclat: "#a9dcff" },
  lave:    { teinte: "rgba(205,55,15,0.15)",  accent: "#ff7a1a", eclat: "#ffd24a" },
};

// Petit cristal (losange) qui pointe depuis une paroi / le sol.
function cristal(ctx, x, y, taille, coul, tip) {
  ctx.fillStyle = coul;
  ctx.beginPath();
  ctx.moveTo(x, y - taille); ctx.lineTo(x + taille * 0.45, y); ctx.lineTo(x, y + taille * 0.5);
  ctx.lineTo(x - taille * 0.45, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = tip; ctx.fillRect(x - 1, y - taille, 2, Math.max(2, taille * 0.4)); // arête éclairée
}

// Pose la teinte + les accents du thème sur une case déjà peinte.
function peindreTheme(ctx, carte, c, l, x, y, style) {
  const t = THEMES_MINE[carte.theme];
  if (!t) return;
  // 1) Teinte générale (roche un peu plus dense que le sol).
  ctx.fillStyle = t.teinte;
  ctx.fillRect(x, y, TUILE, TUILE);
  if (style === "mur") ctx.fillRect(x, y, TUILE, TUILE); // 2× sur la roche → plus saturée

  const r = alea(c, l, 71);
  if (carte.theme === "cristal") {
    // Cristaux qui poussent depuis les parois (sur le sol bordant la roche) et amas.
    if (style === "sol" && solideEn(carte, c, l - 1) && r > 0.45) {
      cristal(ctx, x + 8 + alea(c, l, 3) * 16, y + 10, 6 + r * 5, t.accent, t.eclat);
    } else if (style === "sol" && r > 0.9) {
      cristal(ctx, x + 6 + alea(c, l, 5) * 20, y + 18, 4 + r * 3, t.accent, t.eclat);
    } else if (style === "mur" && r > 0.8) {
      ctx.fillStyle = t.accent; ctx.globalAlpha = 0.5;
      ctx.fillRect(x + 6 + r * 14, y + 8 + alea(c, l, 9) * 14, 3, 3); ctx.globalAlpha = 1;
    }
  } else if (carte.theme === "glace") {
    // Givre : traits clairs sur la roche, léger vernis + micro-fissures sur le sol.
    if (style === "mur" && r > 0.5) {
      ctx.strokeStyle = t.accent; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 4, y + 6 + r * 18); ctx.lineTo(x + 4 + r * 20, y + 4);
      ctx.stroke(); ctx.globalAlpha = 1;
    } else if (style === "sol" && r > 0.7) {
      ctx.fillStyle = t.eclat; ctx.globalAlpha = 0.18;
      ctx.fillRect(x + 3, y + 3, TUILE - 6, TUILE - 6); ctx.globalAlpha = 1;
    }
  } else if (carte.theme === "lave") {
    // Rivières/fissures de lave incandescente sur le sol + roche chauffée au pied.
    if (style === "sol" && r > 0.55) {
      const gx = x + 2 + alea(c, l, 2) * 6;
      ctx.fillStyle = t.accent; ctx.globalAlpha = 0.85;
      ctx.fillRect(gx, y + 4, 3 + r * 3, TUILE - 8);                 // coulée verticale
      ctx.fillStyle = t.eclat; ctx.fillRect(gx + 1, y + 4, 1, TUILE - 8); // cœur brillant
      ctx.globalAlpha = 1;
      if (r > 0.85) { ctx.fillStyle = t.accent; ctx.fillRect(x + 12, y + 10 + r * 8, TUILE - 18, 3); } // veine horizontale
    } else if (style === "mur" && r > 0.7) {
      ctx.fillStyle = t.accent; ctx.globalAlpha = 0.16;
      ctx.fillRect(x, y + TUILE - 8, TUILE, 8); ctx.globalAlpha = 1; // lueur chaude au pied du mur
    }
  }
}

// Peint UNE tuile d'après sa définition (style + couleurs) et ses voisins.
function dessinerTuile(ctx, carte, c, l) {
  const def = tuileDef(tuile(carte, c, l));
  const x = c * TUILE, y = l * TUILE;
  const k = def.couleurs;

  if (def.style === "mur") { dessinerRoche(ctx, carte, c, l, x, y, k); peindreTheme(ctx, carte, c, l, x, y, "mur"); return; }
  if (def.style === "pierre-taillee") { dessinerPierreTaillee(ctx, carte, c, l, x, y, k); return; }

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

  dessinerSol(ctx, carte, c, l, x, y, k); // style "sol"
  peindreTheme(ctx, carte, c, l, x, y, "sol");
}
