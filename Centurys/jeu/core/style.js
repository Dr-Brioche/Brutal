// ============================================================
//  STYLE COMMUN AU CANVAS
//  Coins arrondis par défaut : jamais de rectangle à angles
//  vifs pour un élément d'interface. Police centralisée : pour
//  changer la police de TOUT le jeu, on ne touche qu'ici.
// ============================================================

export const RAYON = 8;
export const POLICE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export function police(taille, gras = true) {
  return (gras ? 'bold ' : '') + Math.round(taille) + 'px ' + POLICE;
}

// Trace un rectangle à coins arrondis (à remplir ou à contourer ensuite).
export function cheminArrondi(ctx, x, y, l, h, r = RAYON) {
  const rr = Math.max(0, Math.min(r, l / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + l - rr, y);
  ctx.quadraticCurveTo(x + l, y, x + l, y + rr);
  ctx.lineTo(x + l, y + h - rr);
  ctx.quadraticCurveTo(x + l, y + h, x + l - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Petite jauge de vie au-dessus d'une unité.
export function jauge(ctx, x, y, l, h, ratio, couleur, fond = 'rgba(0,0,0,0.55)') {
  cheminArrondi(ctx, x, y, l, h, h / 2);
  ctx.fillStyle = fond; ctx.fill();
  const p = Math.max(0, Math.min(1, ratio));
  if (p > 0) {
    cheminArrondi(ctx, x + 1, y + 1, Math.max(h - 2, (l - 2) * p), h - 2, (h - 2) / 2);
    ctx.fillStyle = couleur; ctx.fill();
  }
}

// Texte avec un liseré noir, lisible sur n'importe quel fond.
export function texteContour(ctx, texte, x, y, taille, couleur = '#fff', align = 'center') {
  ctx.font = police(taille);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, taille / 5);
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.lineJoin = 'round';
  ctx.strokeText(texte, x, y);
  ctx.fillStyle = couleur;
  ctx.fillText(texte, x, y);
}
