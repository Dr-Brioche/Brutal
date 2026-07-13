// Bibliothèque des ennemis (contenu pur : stats + planche de combat).
//
// Un ennemi n'a qu'un rôle de COMBAT (sur la carte, les monstres sont
// invisibles — cf. concept.md « Monstres invisibles sur la carte »).
//
// Champs :
//   id, nom (anglais), pv, attaque (dégâts par tour), xp (donnée à la mort)
//   niveau  : NIVEAU du monstre → détermine l'OR lâché (cf. data/butin.js)
//   famille : TYPE du monstre → détermine ses drops de ressources (cf. butin.js,
//             ex. "gobelin" → bois). Un mob sans famille ne lâche que son `butin`.
//   planche : la planche de sprites de combat (générée par outils/importer_*.py)
//   sprite  : comment lire la planche
//     caseL, caseH : taille d'une case (px)
//     anims : pour chaque état, les frames à jouer, la vitesse (ips = images/s)
//             et si l'animation boucle.
//   butin  : drops SPÉCIFIQUES à ce mob, EN PLUS de l'or (par niveau) et des
//            ressources (par famille) :
//     objets : [{ id, chance }] — `chance` (0..1) = rareté du drop (ex. une bague)

import { tirerOr, tirerButinFamille } from "./butin.js";

export const ENNEMIS = [
  {
    id: "gobelin",
    nom: "Cave Goblin",
    niveau: 1,        // niveau LIÉ AU SKIN (pas de scaling : stats fixes par type)
    famille: "gobelin",
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
      statique: true, // DÉMO « image fixe + effets » : on n'utilise que la frame 0,
                      // toute l'animation (respiration, bond, flash, mort) est faite
                      // par le CODE (cf. dessinerEnnemiStatique dans ui/combat.js).
      anims: {
        idle:    { frames: [0, 1, 2, 3, 4, 5, 6, 7], ips: 8,  boucle: true },
        attaque: { frames: [8, 9, 10],              ips: 10, boucle: false },
        touche:  { frames: [11, 12],                ips: 12, boucle: false },
        ko:      { frames: [11, 12, 13],            ips: 8,  boucle: false },
      },
    },
    butin: {
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
    niveau: 1,
    famille: "gobelin",
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
      statique: true, // DÉMO « image fixe + effets » : on n'utilise que la frame 0,
                      // toute l'animation (respiration, bond, flash, mort) est faite
                      // par le CODE (cf. dessinerEnnemiStatique dans ui/combat.js).
      anims: {
        idle:    { frames: [0, 1, 2, 3, 4, 5, 6, 7], ips: 8,  boucle: true },
        attaque: { frames: [8, 9, 10],              ips: 10, boucle: false },
        touche:  { frames: [11, 12],                ips: 12, boucle: false },
        ko:      { frames: [11, 12, 13],            ips: 8,  boucle: false },
      },
    },
    butin: {
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
    niveau: 1,
    famille: "gobelin",
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
      statique: true, // DÉMO « image fixe + effets » : on n'utilise que la frame 0,
                      // toute l'animation (respiration, bond, flash, mort) est faite
                      // par le CODE (cf. dessinerEnnemiStatique dans ui/combat.js).
      anims: {
        idle:    { frames: [0, 1, 2, 3, 4, 5, 6, 7], ips: 8,  boucle: true },
        attaque: { frames: [8, 9, 10],              ips: 10, boucle: false },
        touche:  { frames: [11, 12],                ips: 12, boucle: false },
        ko:      { frames: [11, 12, 13],            ips: 8,  boucle: false },
      },
    },
    // Actions pondérées : tirée aléatoirement selon le champ `poids`.
    actions: [
      { type: "soigner",     valeur: 10, poids: 50 }, // soigne l'allié au % le plus bas (cible verrouillée à la préparation)
      { type: "haste-allie", valeur: 2,  poids: 30 }, // célérité 2 tours à tous les alliés
      { type: "attaque",     valeur: 2,  poids: 20 }, // attaque directe (rare)
    ],
    butin: {
      objets: [],
    },
  },
  // Ogre gris au masque de bois : brute de niveau 3. Lent mais TRÈS résistant et
  // frappe fort (gros gourdin). Sprite dessiné main (outils/generer_ogre.py).
  // Affix "melee" : toujours à l'avant. Un vrai pic de difficulté dans la grotte.
  {
    id: "ogre-masque",
    nom: "Masked Ogre",
    niveau: 3,
    famille: "animal",   // lâche du cuir (peau/sangles de l'ogre)
    pv: 58,
    attaque: 9,
    xp: 24,
    vitesse: 6,          // lourd : il joue rarement, mais chaque coup fait mal
    affix: "melee",      // position visuelle : avant-plan
    planche: "images/ennemis/ogre.png",
    // Portrait = le visage masqué (frame 0) pour la file des tours.
    portrait: { sx: 76, sy: 18, sw: 78, sh: 78 },
    sprite: {
      caseL: 192,
      caseH: 180,        // case plus haute que le gobelin (150) → ogre plus GROS
      anims: {
        idle:    { frames: [0, 1, 2, 1], ips: 5,  boucle: true },
        attaque: { frames: [3, 4, 5],    ips: 9,  boucle: false },
        touche:  { frames: [6, 7],       ips: 12, boucle: false },
        ko:      { frames: [6, 7, 8],    ips: 8,  boucle: false },
      },
    },
    butin: {
      objets: [
        { id: "anneau-force", chance: 0.12 }, // rare : sa massue a de la poigne (Power Ring)
      ],
    },
  },
];

// Renvoie un ennemi par son id (ou le premier de la liste par défaut).
export function ennemiParId(id) {
  return ENNEMIS.find((e) => e.id === id) ?? ENNEMIS[0];
}

// Tire le butin d'un ennemi : renvoie { or, objets: [ids] }.
//   • or     = table PAR NIVEAU (data/butin.js).
//   • objets = ressources PAR FAMILLE (butin.js) + drops SPÉCIFIQUES du mob.
export function tirerButin(ennemi) {
  const or = tirerOr(ennemi.niveau);
  const objets = tirerButinFamille(ennemi.famille);
  for (const o of ennemi.butin?.objets ?? []) {
    if (Math.random() < o.chance) objets.push(o.id);
  }
  return { or, objets };
}

// ----- Composition d'un groupe de rencontre -------------------------------
//
// Distribution de la TAILLE du groupe (défaut commun à toutes les zones, sauf
// indication contraire) : index 0 = 1 monstre … index 4 = 5 monstres.
//   1 → 30 %   2 → 30 %   3 → 20 %   4 → 15 %   5 → 5 %
export const DISTRIBUTION_GROUPE = [0.30, 0.30, 0.20, 0.15, 0.05];

// Règle des affixes (cf. concept.md) : les monstres "range" n'apparaissent QUE
// dans les groupes de 3 ou plus. Sinon, tous les types d'une zone ont autant de
// chance de sortir (tirage uniforme, indépendant par emplacement).

// Tire une taille de groupe selon une distribution cumulée.
function tirerTaille(distribution) {
  const r = Math.random();
  let cumul = 0;
  for (let i = 0; i < distribution.length; i++) {
    cumul += distribution[i];
    if (r < cumul) return i + 1;
  }
  return distribution.length;
}

// Compose un groupe d'ennemis pour une rencontre, à partir des IDS de monstres
// d'une zone. Renvoie un tableau de DÉFINITIONS (data), trié melee → range pour
// que les monstres distants soient toujours placés à l'arrière en combat.
//   - taille < 3 : on ne tire que parmi les monstres MELEE de la zone ;
//   - taille ≥ 3 : on tire parmi TOUS les monstres (melee + range), à chances
//     égales → le groupe peut même être composé uniquement de monstres "range".
// `opts.distribution` permet à une zone d'imposer sa propre courbe de tailles.
export function composerGroupe(monstreIds, opts = {}) {
  const defs = (monstreIds ?? []).map(ennemiParId).filter(Boolean);
  if (defs.length === 0) return [];
  const melee = defs.filter((d) => d.affix !== "range");
  const taille = tirerTaille(opts.distribution ?? DISTRIBUTION_GROUPE);
  // En groupe de 1-2 : que du melee. (Repli sur `defs` si la zone n'a aucun
  // melee — cas théorique d'une zone 100 % distance.)
  const pool = taille >= 3 ? defs : (melee.length ? melee : defs);
  const groupe = Array.from({ length: taille }, () =>
    pool[Math.floor(Math.random() * pool.length)]);
  // Tri stable melee d'abord, range à la fin (positionnement visuel du combat).
  groupe.sort((a, b) => (a.affix === "range" ? 1 : 0) - (b.affix === "range" ? 1 : 0));
  return groupe;
}

