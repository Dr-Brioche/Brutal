// Bibliothèque des PNJ (personnages non-joueurs de la ville, contenu pur).
//
// Comme les ennemis : stats/planche + comment lire la planche.
// Les PNJ vivent sur la CARTE (échelle réduite, comme le héros), pas en combat.
//
//   planche : la planche générée par outils/importer_<pnj>.py
//   sprite  : caseL/caseH + `regard` (frame par direction) + animations
//
// RÈGLE ABSOLUE DES PNJ : quand le héros s'approche pour parler, le PNJ se
// tourne vers lui (bas/haut/gauche/droite). Chaque planche fournit donc 4 frames
// « debout » de regard, listées dans `sprite.regard`. Tout nouveau PNJ DOIT en
// avoir (cf. le pipeline d'import : lignes face / dos / profil gauche / profil droit).

export const FANATIQUE = {
  id: "fanatique",
  nom: "Luc l'hérétique",
  planche: "images/pnj/fanatique.png",
  sprite: {
    caseL: 104,
    caseH: 88,
    // Frame « debout » vers laquelle il se tourne selon d'où on l'aborde.
    regard: { bas: 0, gauche: 8, droite: 12, haut: 16 },
    anims: {
      repos:        { frames: [0], ips: 1, boucle: true },                    // debout, immobile
      passive:      { frames: [0, 1, 2, 3, 4, 5, 6, 7], ips: 6, boucle: false }, // il prie (mains jointes)
      marcheGauche: { frames: [8, 9, 10, 11],    ips: 8, boucle: true },
      marcheDroite: { frames: [12, 13, 14, 15],  ips: 8, boucle: true },
    },
  },
  // Il prie de temps en temps — seulement à l'arrêt (jamais en marchant).
  passif: { anim: "passive", min: 4, max: 9 },
  pauseBout: 3.2, // longue pause aux extrémités du trajet : le temps de prier
};

// Marchand de TEST : permet de récupérer toutes les armes/armures gratuitement
// pour essayer le stuff. Sprite propre (nain qui fait tourner une pièce). Il est
// STATIONNAIRE : de face par défaut, mais il se tourne vers le héros quand on lui
// parle (regard 4 directions). Le reste du temps il joue de temps en temps son
// animation passive de face (cf. `passif`), sinon il reste sur la frame de repos (0).
export const MARCHAND = {
  id: "marchand",
  nom: "Renaud",
  planche: "images/pnj/marchand.png",
  sprite: {
    caseL: 104,
    caseH: 88,
    regard: { bas: 0, gauche: 7, droite: 8, haut: 9 },
    anims: {
      repos:   { frames: [0], ips: 1, boucle: true },                 // debout, immobile
      passive: { frames: [0, 1, 2, 3, 4, 5, 6], ips: 7, boucle: false }, // pouce levé, pièce brandie
    },
  },
  // Toutes les `min`–`max` secondes (aléatoire), il joue UNE fois l'animation passive.
  passif: { anim: "passive", min: 5, max: 10 },
};

// Forgeron de la ville : stationnaire, de face. Il tape au marteau (pipe qui fume)
// de temps en temps. Lui parler ouvre la FORGE (nouvel arc de gameplay). Comme le
// marchand, il se tourne vers le héros quand on l'aborde (regard 4 directions).
export const FORGERON = {
  id: "forgeron",
  nom: "Ferran",
  planche: "images/pnj/forgeron.png",
  sprite: {
    caseL: 104,
    caseH: 88,
    regard: { bas: 0, gauche: 8, droite: 9, haut: 10 },
    anims: {
      repos:   { frames: [0], ips: 1, boucle: true },
      passive: { frames: [0, 1, 2, 3, 4, 5, 6, 7], ips: 9, boucle: false }, // coups de marteau
    },
  },
  passif: { anim: "passive", min: 3, max: 7 }, // il forge régulièrement
};
