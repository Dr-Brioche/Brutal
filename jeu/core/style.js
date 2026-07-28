// ─────────────────────────────────────────────────────────────────────────────
// STYLE VISUEL CENTRAL — la « forme » de l'interface, au même titre que core/texte.js
// centralise la police.
//
// ┌─ RÈGLE ────────────────────────────────────────────────────────────────────┐
// │ Toute fenêtre / cadre / zone de texte a des COINS ARRONDIS par défaut.      │
// │  • CSS (fenêtres, menus, bulles…) : border-radius: var(--rayon)             │
// │    (variable définie dans index.html, = RAYON px).                          │
// │  • Canvas (barres, badges…)       : cheminArrondi(ctx, x, y, w, h) puis      │
// │    fill()/stroke() — JAMAIS un fillRect nu pour un élément d'interface.      │
// └────────────────────────────────────────────────────────────────────────────┘

// Rayon d'arrondi par défaut (px, repère logique). Le changer ici arrondit tout.
export const RAYON = 6;

// Trace le chemin d'un rectangle à coins arrondis (sans remplir : à suivre d'un
// ctx.fill() ou ctx.stroke()). Le rayon est bridé à la moitié des côtés pour un
// élément fin → devient une « pilule » (demi-cercles aux extrémités).
export function cheminArrondi(ctx, x, y, w, h, r = RAYON) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Pas de la GRILLE du sac (inventaire et coffre), en pixels. La valeur vit dans
// le CSS (`--case-inv`, index.html) parce que c'est LUI qui dessine le
// quadrillage ; le JS, lui, s'en sert pour placer les objets dedans. Les lire
// au même endroit garantit qu'ils ne peuvent plus se décaler l'un de l'autre.
// Repli à 38 si la variable manque (page de test sans le CSS du jeu).
export function tailleCaseInventaire() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--case-inv");
  return parseInt(v, 10) || 38;
}
