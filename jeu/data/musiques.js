// Bibliothèque des MUSIQUES DE COMBAT, rangées par zone.
//
// PRINCIPE — même logique que les FONDS de combat (data/fonds.js) : chaque zone
// de la carte (data/zones.js) est liée à une ou plusieurs musiques. À chaque
// combat, on en tire UNE au hasard dans la liste de la zone, pour casser la
// répétition sonore sans rien changer au gameplay. Pendant la baston, c'est
// cette musique qui tourne ; à la fin du combat, on revient à l'ambiance
// d'exploration de la zone (ou au silence si elle n'en a pas).
//
// AJOUTER une musique : déposer le .mp3 dans sons/combat/<zone>/ puis ajouter
// son chemin ci-dessous.
//
// STRUCTURE : sons/combat/<zone>/<numéro>.mp3
//   → un sous-dossier par zone (mêmes noms que les fonds / les zones),
//     fichiers numérotés 1.mp3, 2.mp3, 3.mp3…

export const MUSIQUES_COMBAT = {
  // Eastern Under-tunnels — le repaire des gobelins à l'est de Brütàl.
  // (clé entre guillemets : le tiret interdit la forme nue eastern-under-tunnels)
  "eastern-under-tunnels": [
    "sons/combat/eastern-under-tunnels/1.mp3",
    // "sons/combat/eastern-under-tunnels/2.mp3",
    // "sons/combat/eastern-under-tunnels/3.mp3",
  ],
};

// Tire une musique au hasard pour la zone donnée. Renvoie null si la zone n'a
// (encore) aucune musique de combat → le jeu garde alors l'ambiance en cours.
export function musiqueCombat(zoneId) {
  const liste = MUSIQUES_COMBAT[zoneId];
  if (!liste || liste.length === 0) return null;
  return liste[Math.floor(Math.random() * liste.length)];
}

// Précharge en arrière-plan TOUTES les musiques de combat d'une zone, pour
// qu'elles soient déjà en cache du navigateur quand un combat démarre (un .mp3
// pèse quelques Mo : on évite ainsi le délai au premier combat). À appeler en
// ENTRANT dans la zone — le joueur explore quelques secondes avant la première
// rencontre, largement de quoi télécharger. Sans effet si la zone n'a pas de
// musique ; chaque fichier n'est demandé qu'une seule fois.
const dejaPrecharges = new Map(); // chemin → Audio (garde une réf → reste en cache)
export function prechargerMusiquesCombat(zoneId) {
  const liste = MUSIQUES_COMBAT[zoneId];
  if (!liste) return;
  for (const chemin of liste) {
    if (dejaPrecharges.has(chemin)) continue;
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = chemin; // déclenche le téléchargement + la mise en cache
    dejaPrecharges.set(chemin, audio);
  }
}
