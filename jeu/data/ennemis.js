// Bibliothèque des ennemis (contenu pur : stats + planche de combat).
//
// Un ennemi n'a qu'un rôle de COMBAT (sur la carte, les monstres sont
// invisibles — cf. concept.md « Monstres invisibles sur la carte »).
//
// Champs :
//   id, nom (anglais), pv, attaque (dégâts par tour), xp (donnée à la mort)
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
    attaque: 4,
    xp: 6,            // XP donnée au héros à sa mort
    vitesse: 10,      // vitesse d'initiative (ATB) ; héros de base = 10
    affix: "melee",   // position visuelle : avant-plan
    planche: "images/ennemis/gobelin.png",
    // Portrait = zone de la TÊTE dans la planche (frame 0), pour la file des tours.
    // (Valeurs à ajuster à l'œil si la tête n'est pas bien cadrée.)
    portrait: { sx: 54, sy: 4, sw: 96, sh: 96 },
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
        { id: "bague-de-sang", chance: 0.08 },    // rare (donne la carte Bloodletting)
      ],
    },
  },
  // Gobelin véloce : fragile mais TRÈS rapide → il peut jouer 2× contre un héros
  // lent. Réutilise le sprite/portrait du gobelin.
  {
    id: "gobelin-vif",
    nom: "Goblin Skirmisher",
    pv: 16,
    attaque: 3,
    xp: 7,
    vitesse: 18,
    affix: "melee",   // position visuelle : avant-plan
    planche: "images/ennemis/gobelin.png",
    // Même planche que le gobelin : on le distingue par une TEINTE (filtre canvas)
    // plus froide et claire → lecture immédiate « celui-là est le rapide ».
    teinte: "hue-rotate(65deg) saturate(1.35) brightness(1.18)",
    portrait: { sx: 54, sy: 4, sw: 96, sh: 96 },
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
      or: [2, 4],
      objets: [
        { id: "bottes-vives", chance: 0.10 }, // rare (donne la carte Quicken)
      ],
    },
  },
  // Gobelin chaman rouge : healer/caster. Affix "range" → toujours à l'arrière.
  // Apparaît uniquement dans les groupes de 3+ (max 1 par groupe).
  // Actions pondérées : soigner un allié blessé (prioritaire), célérité de groupe, ou attaque.
  {
    id: "gobelin-chaman",
    nom: "Goblin Shaman",
    pv: 14,
    attaque: 2,
    xp: 12,
    vitesse: 7,       // lent : compense sa capacité à accélérer ses alliés
    affix: "range",   // position visuelle : arrière-plan
    // Teinte rouge sang : immédiatement reconnaissable comme cible prioritaire.
    teinte: "hue-rotate(320deg) saturate(1.6) brightness(0.9)",
    planche: "images/ennemis/gobelin.png",
    portrait: { sx: 54, sy: 4, sw: 96, sh: 96 },
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
    // Actions pondérées : tirée aléatoirement selon le champ `poids`.
    actions: [
      { type: "soigner",     valeur: 10, poids: 50 }, // soigne l'allié le plus blessé
      { type: "haste-allie", valeur: 2,  poids: 30 }, // célérité 2 tours à tous les alliés
      { type: "attaque",     valeur: 2,  poids: 20 }, // attaque directe (rare)
    ],
    butin: {
      or: [3, 6],
      objets: [],
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

