// Bibliothèque des PNJ (personnages non-joueurs de la ville, contenu pur).
//
// Comme les ennemis : stats/planche + comment lire la planche.
// Les PNJ vivent sur la CARTE (échelle réduite, comme le héros), pas en combat.
//
//   planche : la planche générée par outils/importer_fanatique.py
//   sprite  : caseL/caseH + animations (frames, vitesse, boucle)

export const FANATIQUE = {
  id: "fanatique",
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
// pour essayer le stuff. Placeholder visuel : on réutilise le sprite du
// fanatique en attendant un vrai sprite de marchand.
export const MARCHAND = {
  id: "marchand",
  planche: FANATIQUE.planche,
  sprite: FANATIQUE.sprite,
};
