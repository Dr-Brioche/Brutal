// Bibliothèque des ennemis (contenu pur : juste les stats).
//
// Un ennemi n'a qu'un rôle de COMBAT (sur la carte, les monstres sont
// invisibles — cf. concept.md « Monstres invisibles sur la carte »).
// Le dessin (placeholder pour l'instant) est géré par l'écran de combat.
//
// Champs : id, nom (anglais), pv (points de vie), attaque (dégâts par tour).

export const ENNEMIS = [
  {
    id: "gobelin",
    nom: "Cave Goblin",
    pv: 24,
    attaque: 6,
  },
];

// Renvoie un ennemi par son id (ou le premier de la liste par défaut).
export function ennemiParId(id) {
  return ENNEMIS.find((e) => e.id === id) ?? ENNEMIS[0];
}
