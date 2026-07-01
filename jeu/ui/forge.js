// LA FORGE — espace plein écran d'un nouvel arc de gameplay (le crafting).
//
// Pour l'instant : un placeholder. On l'ouvre en parlant au forgeron (Ferran) et
// on choisit « Forger ». Échap ou le bouton ✕ ferme et rend la main au jeu.
//
// L'API imite celle du combat : ouvrirForge(surFermer) / fermerForge() / forgeActive().
// `surFermer` (optionnel) est rappelé à la fermeture → principal.js y remet enPause=false.

let overlay = null;
let boutonFermer = null;
let actif = false;
let surFermerActif = null;

export function installerForge() {
  overlay = document.getElementById("forge");
  boutonFermer = document.getElementById("forge-fermer");
  boutonFermer.addEventListener("click", fermerForge);
}

export function ouvrirForge(surFermer = null) {
  if (actif) return;
  actif = true;
  surFermerActif = surFermer;
  overlay.hidden = false;
  // Capture + stopPropagation : Échap ferme la FORGE (et n'ouvre pas le menu pause).
  window.addEventListener("keydown", surTouche, true);
}

function surTouche(e) {
  if (e.code === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    fermerForge();
  }
}

export function fermerForge() {
  if (!actif) return;
  actif = false;
  overlay.hidden = true;
  window.removeEventListener("keydown", surTouche, true);
  const cb = surFermerActif;
  surFermerActif = null;
  if (cb) cb();
}

export function forgeActive() {
  return actif;
}
