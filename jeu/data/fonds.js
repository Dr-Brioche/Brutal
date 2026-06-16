// Bibliothèque des FONDS de combat, rangés par zone.
//
// PRINCIPE — chaque zone de la carte (data/zones.js) est liée à 2-3 fonds de
// combat. Ils partagent la MÊME dynamique (même cadre 16:9, même ligne de sol
// en bas) mais varient l'AMBIANCE (éclairage, décor) pour casser la répétition
// visuelle sans toucher au gameplay ni au placement des sprites. À chaque
// combat, on en tire un au hasard dans la liste de la zone.
//
// AJOUTER un fond : déposer le PNG dans images/fonds/<zone>/ puis ajouter son
// chemin ci-dessous. Format conseillé : large (~16:9), la rangée de sol vers
// le bas du cadre (calée sous l'interface combat, cf. SOL_FOND dans combat.js).
//
// STRUCTURE : images/fonds/<zone>/<numéro>.png
//   → un sous-dossier par zone, fichiers numérotés 1.png, 2.png, 3.png…

export const FONDS_COMBAT = {
  // Eastern Under-tunnels — souterrains à l'est de Brütàl : repaire des gobelins.
  // (clé entre guillemets : le tiret interdit la forme nue eastern-under-tunnels)
  "eastern-under-tunnels": [
    "images/fonds/eastern-under-tunnels/1.png",
    // "images/fonds/eastern-under-tunnels/2.png",
    // "images/fonds/eastern-under-tunnels/3.png",
  ],
};

// Tire un fond au hasard pour la zone donnée. Renvoie null si la zone n'a pas
// (encore) de bibliothèque → l'écran de combat retombe sur son dégradé de secours.
export function fondCombat(zoneId) {
  const liste = FONDS_COMBAT[zoneId];
  if (!liste || liste.length === 0) return null;
  return liste[Math.floor(Math.random() * liste.length)];
}
