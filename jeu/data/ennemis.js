// Bibliothèque des ennemis (contenu pur : stats + planche de combat).
//
// Un ennemi n'a qu'un rôle de COMBAT (sur la carte, les monstres sont
// invisibles — cf. concept.md « Monstres invisibles sur la carte »).
//
// Champs :
//   id, nom (anglais), pv, attaque (dégâts par tour)
//   planche : la planche de sprites de combat (générée par outils/importer_*.py)
//   sprite  : comment lire la planche
//     caseL, caseH : taille d'une case (px)
//     anims : pour chaque état, les frames à jouer, la vitesse (ips = images/s)
//             et si l'animation boucle.

export const ENNEMIS = [
  {
    id: "gobelin",
    nom: "Cave Goblin",
    pv: 24,
    attaque: 6,
    planche: "images/ennemis/gobelin.png",
    sprite: {
      caseL: 209,
      caseH: 150,
      anims: {
        idle:    { frames: [0, 1, 2, 3, 4, 5, 6, 7], ips: 8,  boucle: true },
        attaque: { frames: [8, 9, 10],              ips: 10, boucle: false },
        touche:  { frames: [11, 12],                ips: 12, boucle: false },
        ko:      { frames: [11, 12, 13],            ips: 8,  boucle: false },
      },
    },
  },
];

// Renvoie un ennemi par son id (ou le premier de la liste par défaut).
export function ennemiParId(id) {
  return ENNEMIS.find((e) => e.id === id) ?? ENNEMIS[0];
}
