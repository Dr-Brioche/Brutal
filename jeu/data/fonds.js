// Bibliothèque des FONDS de combat, rangés par DÉCOR.
//
// PRINCIPE — chaque combat tire au hasard un fond dans la bonne bibliothèque.
// Tous les fonds partagent la MÊME dynamique (cadre 16:9, ligne de sol en bas,
// ratio ~2.4) mais varient l'AMBIANCE. La bibliothèque choisie dépend du LIEU :
//
//   • Mine à BIOME (glace / lave / cristal / inondée) → SES fonds dédiés, et rien
//     d'autre (cf. FOND_PAR_THEME). Le thème vient de mine.js (cfg.theme).
//   • Mine profonde SANS biome → bibliothèque « profondeur » (décor générique).
//   • Zone de surface (souterrains de l'est…) → sa bibliothèque nommée.
//   • Cité (futurs combats en ville) → bibliothèque « city » (dossier brutal/).
//
// AJOUTER un fond : déposer le JPG dans images/fonds/<dossier>/ puis l'ajouter à
// la liste ci-dessous. Format conseillé : large (~ratio 2.4), sol en bas du cadre,
// JPG < 400 Ko (les PNG lourds ralentissent le 1er combat / gonflent le dépôt).

export const FONDS_COMBAT = {
  // Surface — souterrains à l'est de Brütàl : repaire des gobelins.
  "eastern-under-tunnels": [
    "images/fonds/eastern-under-tunnels/hall-dore.jpg",
    "images/fonds/eastern-under-tunnels/tour-pont.jpg",
    "images/fonds/eastern-under-tunnels/cite-lointaine.jpg",
    "images/fonds/eastern-under-tunnels/ruines-tour.jpg",
  ],
  // Mines PROFONDES sans biome : décor de profondeur générique.
  "profondeur": [
    "images/fonds/profondeur/profondeur-1.jpg",
    "images/fonds/profondeur/profondeur-2.jpg",
    "images/fonds/profondeur/profondeur-3.jpg",
    "images/fonds/profondeur/profondeur-4.jpg",
    "images/fonds/profondeur/profondeur-5.jpg",
    "images/fonds/profondeur/profondeur-6.jpg",
  ],
  // Mines à BIOME : UNIQUEMENT leurs fonds dédiés.
  "mine-glace": [
    "images/fonds/mine-glace/glace-1.jpg",
    "images/fonds/mine-glace/glace-2.jpg",
  ],
  "mine-feu": [
    "images/fonds/mine-feu/feu-1.jpg",
    "images/fonds/mine-feu/feu-2.jpg",
  ],
  "mine-cristal": [
    "images/fonds/mine-cristal/cristal-1.jpg",
  ],
  "mine-inondee": [
    "images/fonds/mine-inondee/inondee-1.jpg",
    "images/fonds/mine-inondee/inondee-2.jpg",
  ],
  // Cité (pas de combats pour l'instant ; prêt si on en ajoute).
  "city": [
    "images/fonds/brutal/brutal-1.jpg",
    "images/fonds/brutal/brutal-2.jpg",
  ],
};

// Thème de mine (mine.js) → bibliothèque de fonds dédiée.
const FOND_PAR_THEME = {
  glace: "mine-glace",
  lave: "mine-feu",
  cristal: "mine-cristal",
  inondee: "mine-inondee",
};

// Clé de bibliothèque pour une zone. `zoneId` = id d'assets (assetZone) ; `zone` =
// l'objet zone courant (porte estMine / theme). Une mine à biome force ses fonds ;
// une mine sans biome prend « profondeur » ; sinon on suit l'id de la zone.
function cleFondsZone(zoneId, zone) {
  if (zone?.estMine) {
    if (zone.theme && FOND_PAR_THEME[zone.theme]) return FOND_PAR_THEME[zone.theme];
    return "profondeur";
  }
  return zoneId;
}

// Tire un fond au hasard pour la zone/mine donnée. Renvoie null si aucune
// bibliothèque → l'écran de combat retombe sur son dégradé de secours.
export function fondCombat(zoneId, zone = null) {
  const liste = FONDS_COMBAT[cleFondsZone(zoneId, zone)];
  if (!liste || liste.length === 0) return null;
  return liste[Math.floor(Math.random() * liste.length)];
}

// Précharge en arrière-plan TOUS les fonds de la bibliothèque courante, pour qu'ils
// soient déjà en cache du navigateur quand un combat démarre — fini le délai au 1er
// combat. À appeler en ENTRANT dans la zone/mine : le joueur explore quelques
// secondes avant la première rencontre, largement de quoi télécharger les images.
const dejaPrecharges = new Map(); // chemin → Image (garde une réf → reste en cache)
export function prechargerFonds(zoneId, zone = null) {
  const liste = FONDS_COMBAT[cleFondsZone(zoneId, zone)];
  if (!liste) return;
  for (const chemin of liste) {
    if (dejaPrecharges.has(chemin)) continue;
    const img = new Image();
    img.src = chemin; // déclenche le téléchargement + la mise en cache
    dejaPrecharges.set(chemin, img);
  }
}
