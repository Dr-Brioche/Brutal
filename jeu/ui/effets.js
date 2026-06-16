// Petits effets d'interface : messages furtifs et flash de combat.

// Le flash façon FF9 : l'écran clignote en blanc. Renvoie une promesse
// résolue à la fin de l'animation (pour enchaîner sur l'écran de combat).
export function flashCombat() {
  const voile = document.getElementById("flash");
  voile.classList.remove("actif");
  void voile.offsetWidth; // redémarre l'animation CSS à zéro
  voile.classList.add("actif");
  return new Promise((resoudre) => setTimeout(resoudre, 700));
}

// Fondu au noir pour les transitions de zone. Règle l'opacité du voile noir
// (0 = transparent, 1 = noir plein) et renvoie une promesse résolue à la fin
// du fondu — pour enchaîner : await fondu(1) … changer de zone … await fondu(0).
export function fondu(opacite, duree = 220) {
  const voile = document.getElementById("fondu");
  voile.style.transition = `opacity ${duree}ms ease`;
  voile.style.opacity = String(opacite);
  return new Promise((resoudre) => setTimeout(resoudre, duree));
}

// Alerte « vie basse » : un liseré rouge pulse autour de l'écran quand les PV
// passent sous le seuil. `ratio` = pv / pvMax (0..1). Appelée chaque image,
// aussi bien en exploration qu'en combat (chacun fournit sa source de PV).
const SEUIL_VIE_BASSE = 0.10;
export function alerteVie(ratio) {
  const voile = document.getElementById("vignette-vie");
  if (voile) voile.classList.toggle("actif", ratio > 0 && ratio < SEUIL_VIE_BASSE);
}

let minuterieMessage = null;

// Affiche un court message en bas de l'écran, qui disparaît tout seul.
export function afficherMessage(texte, duree = 2200) {
  const boite = document.getElementById("message-zone");
  boite.textContent = texte;
  boite.classList.add("visible");
  clearTimeout(minuterieMessage);
  minuterieMessage = setTimeout(() => boite.classList.remove("visible"), duree);
}

// Toast centré, style identique au message « retour en ville » de la Maîtrise.
let minuterieToast = null;
export function montrerToast(texte, duree = 2600) {
  document.querySelectorAll(".maitrise-toast").forEach((t) => t.remove());
  clearTimeout(minuterieToast);
  const toast = document.createElement("div");
  toast.className = "maitrise-toast";
  toast.textContent = texte;
  document.body.append(toast);
  minuterieToast = setTimeout(() => toast.remove(), duree);
}
