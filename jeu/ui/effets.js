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

let minuterieMessage = null;

// Affiche un court message en bas de l'écran, qui disparaît tout seul.
export function afficherMessage(texte, duree = 2200) {
  const boite = document.getElementById("message-zone");
  boite.textContent = texte;
  boite.classList.add("visible");
  clearTimeout(minuterieMessage);
  minuterieMessage = setTimeout(() => boite.classList.remove("visible"), duree);
}
