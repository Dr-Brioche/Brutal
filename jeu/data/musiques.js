// Bibliothèque des MUSIQUES DE COMBAT.
//
// DESIGN (révisé 29/06/2026) : une PLAYLIST COMMUNE à TOUS les combats. À chaque
// baston, on en tire UNE au hasard dans cette playlist — plus de lien avec la zone
// d'exploration (on évite ainsi de composer mille playlists). Pendant le combat
// c'est cette musique qui tourne ; à la fin, on revient à l'ambiance d'exploration
// de la zone (ou au silence si elle n'en a pas).
//
// SURCHARGE possible : une zone précise (boss, lieu spécial) peut remplacer la
// playlist commune par la sienne via MUSIQUES_COMBAT_ZONE (vide pour l'instant).
//
// RANGEMENT : sons/combat/commun/<numéro>.mp3 pour la playlist commune ;
//             sons/combat/<zone>/<numéro>.mp3 pour une éventuelle surcharge de zone.
//
// AJOUTER une musique commune : déposer le .mp3 dans sons/combat/commun/ (1.mp3,
// 2.mp3…) puis ajouter sa ligne dans MUSIQUES_COMBAT_DEFAUT ci-dessous.

// Playlist par DÉFAUT : jouée dans TOUS les combats (sauf surcharge de zone).
export const MUSIQUES_COMBAT_DEFAUT = [
  "sons/combat/commun/1.mp3",
  "sons/combat/commun/2.mp3",
  "sons/combat/commun/3.mp3",
  "sons/combat/commun/4.mp3",
  "sons/combat/commun/5.mp3",
  "sons/combat/commun/6.mp3",
  "sons/combat/commun/7.mp3",
];

// Surcharges PAR ZONE (boss, lieu spécial). Si la zone figure ici, SA liste
// remplace la playlist commune ; sinon on utilise MUSIQUES_COMBAT_DEFAUT.
// Ex. : "arene-du-boss": ["sons/combat/arene-du-boss/1.mp3"],
export const MUSIQUES_COMBAT_ZONE = {};

// Liste effective pour une zone : sa surcharge si elle existe, sinon la commune.
function listePourZone(zoneId) {
  return MUSIQUES_COMBAT_ZONE[zoneId] ?? MUSIQUES_COMBAT_DEFAUT;
}

// Tire une musique au hasard pour la zone donnée. Renvoie null si la liste est
// vide → le jeu garde alors l'ambiance en cours.
export function musiqueCombat(zoneId) {
  const liste = listePourZone(zoneId);
  if (!liste || liste.length === 0) return null;
  return liste[Math.floor(Math.random() * liste.length)];
}

// Précharge en arrière-plan les musiques de combat utiles pour la zone, pour
// qu'elles soient déjà en cache du navigateur quand un combat démarre (un .mp3
// pèse quelques Mo : on évite ainsi le délai au premier combat). À appeler en
// ENTRANT dans la zone — le joueur explore quelques secondes avant la première
// rencontre, largement de quoi télécharger. Chaque fichier n'est demandé qu'une
// seule fois (la playlist commune n'est donc téléchargée qu'au tout premier combat).
const dejaPrecharges = new Map(); // chemin → Audio (garde une réf → reste en cache)
export function prechargerMusiquesCombat(zoneId) {
  const liste = listePourZone(zoneId);
  if (!liste) return;
  for (const chemin of liste) {
    if (dejaPrecharges.has(chemin)) continue;
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = chemin; // déclenche le téléchargement + la mise en cache
    dejaPrecharges.set(chemin, audio);
  }
}
