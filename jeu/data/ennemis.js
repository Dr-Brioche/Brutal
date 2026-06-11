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
//   butin  : ce qui tombe à la mort
//     or     : [min, max] pièces d'or
//     objets : [{ id, chance }] — `chance` (0..1) = rareté du drop

export const ENNEMIS = [
  {
    id: "gobelin",
    nom: "Cave Goblin",
    pv: 24,
    attaque: 6,
    planche: "images/ennemis/gobelin.png",
    sprite: {
      caseL: 204,
      caseH: 150,
      anims: {
        idle:    { frames: [0, 1, 2, 3, 4, 5, 6, 7], ips: 8,  boucle: true },
        attaque: { frames: [8, 9, 10],              ips: 10, boucle: false },
        touche:  { frames: [11, 12],                ips: 12, boucle: false },
        ko:      { frames: [11, 12, 13],            ips: 8,  boucle: false },
      },
    },
    butin: {
      or: [2, 3],
      objets: [
        { id: "pioche-de-mineur", chance: 0.45 }, // assez courant
        { id: "anneau-de-braise", chance: 0.08 }, // rare
      ],
    },
  },
];

// Renvoie un ennemi par son id (ou le premier de la liste par défaut).
export function ennemiParId(id) {
  return ENNEMIS.find((e) => e.id === id) ?? ENNEMIS[0];
}

// Tire le butin d'un ennemi : renvoie { or, objets: [ids] }.
export function tirerButin(ennemi) {
  const b = ennemi.butin;
  if (!b) return { or: 0, objets: [] };
  const [min, max] = b.or ?? [0, 0];
  const or = min + Math.floor(Math.random() * (max - min + 1));
  const objets = (b.objets ?? [])
    .filter((o) => Math.random() < o.chance)
    .map((o) => o.id);
  return { or, objets };
}

