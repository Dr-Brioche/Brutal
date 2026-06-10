// Petits effets d'interface : messages furtifs (et bientôt le flash de combat).

let minuterieMessage = null;

// Affiche un court message en bas de l'écran, qui disparaît tout seul.
export function afficherMessage(texte, duree = 2200) {
  const boite = document.getElementById("message-zone");
  boite.textContent = texte;
  boite.classList.add("visible");
  clearTimeout(minuterieMessage);
  minuterieMessage = setTimeout(() => boite.classList.remove("visible"), duree);
}
