// Bibliothèque des PNJ (personnages non-joueurs de la ville, contenu pur).
//
// Comme les ennemis : stats/planche + comment lire la planche.
// Les PNJ vivent sur la CARTE (échelle réduite, comme le héros), pas en combat.
//
//   planche : la planche générée par outils/importer_fanatique.py
//   sprite  : caseL/caseH + animations (frames, vitesse, boucle)

export const FANATIQUE = {
  id: "fanatique",
  nom: "Luc l'hérétique",
  planche: "images/pnj/fanatique.png",
  sprite: {
    caseL: 55,
    caseH: 72,
    anims: {
      repos:        { frames: [0, 1, 2, 3, 4],   ips: 5, boucle: true },
      marcheGauche: { frames: [8, 9, 10, 11],    ips: 8, boucle: true },
      marcheDroite: { frames: [12, 13, 14, 15],  ips: 8, boucle: true },
      // discussion (5-7) gardée pour un futur système de dialogue
    },
  },
};

// Marchand de TEST : permet de récupérer toutes les armes/armures gratuitement
// pour essayer le stuff. Sprite propre (nain de face qui fait tourner une pièce).
// Il est STATIONNAIRE et regarde toujours devant : une seule ligne d'animation
// (« passive »), jouée UNE fois de temps en temps (cf. `passif`) — le reste du
// temps il reste sur la frame de repos (0). Grille : bande horizontale de 8 cases.
export const MARCHAND = {
  id: "marchand",
  nom: "Renaud",
  planche: "images/pnj/marchand.png",
  sprite: {
    caseL: 101,
    caseH: 88,
    anims: {
      repos:   { frames: [0], ips: 1, boucle: true },                 // debout, immobile
      passive: { frames: [0, 1, 2, 3, 4, 5, 6, 7], ips: 8, boucle: false }, // lance/rattrape la pièce
    },
  },
  // Toutes les `min`–`max` secondes (aléatoire), il joue UNE fois l'animation passive.
  passif: { anim: "passive", min: 5, max: 10 },
};
