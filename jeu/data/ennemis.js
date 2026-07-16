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

// ⚠ STATS ÉDITABLES DANS L'EXCEL — docs/BRUTAL-items-et-cartes.xlsx, onglet
// « Monstres ». Le bloc ci-dessous est RÉGÉNÉRÉ par outils/importer_monstres.py :
// ne pas l'éditer à la main. Il REMPLACE (source de vérité) les chiffres écrits
// plus bas dans ENNEMIS — ceux-ci ne servent que de valeurs de secours si un
// monstre venait à manquer dans l'Excel. Pour régler pv/attaque/xp/vitesse/actions,
// passe par l'Excel puis relance l'importer.
// <<MONSTRES-AUTO>>
const STATS_MONSTRES = {
  "gobelin": { nom: "Cave Goblin", niveau: 1, famille: "gobelin", pv: 24, attaque: 4, xp: 6, vitesse: 10, actions: [] },
  "gobelin-vif": { nom: "Goblin Skirmisher", niveau: 1, famille: "gobelin", pv: 16, attaque: 3, xp: 7, vitesse: 18, actions: [] },
  "gobelin-chaman": { nom: "Goblin Shaman", niveau: 1, famille: "gobelin", pv: 14, attaque: 2, xp: 12, vitesse: 7, actions: [{ type: "soigner", valeur: 10, poids: 50 }, { type: "haste-allie", valeur: 2, poids: 30 }, { type: "attaque", valeur: 2, poids: 20 }] },
  "ogre-masque": { nom: "Masked Ogre", niveau: 3, famille: "animal", pv: 58, attaque: 9, xp: 24, vitesse: 6, actions: [], grand: true },
};
// <<FIN-MONSTRES-AUTO>>

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
    // Illustration fournie (fond vert détouré par outils/preparer_skin.py).
    // Rendue vivante par le CODE (image fixe + effets), en lisse.
    planche: "images/ennemis/gobelin.png",
    portrait: { sx: 20, sy: 2, sw: 62, sh: 62 }, // la tête centrée (file des tours)
    tailleRel: 0.8, // rétréci d'1/5 : il paraissait un peu grand parmi les gobelins
    sprite: {
      caseL: 133,
      caseH: 140,   // petite créature
      statique: true,  // une seule image (frame 0) ; animation 100 % par le code
      anims: {
        idle:    { frames: [0], ips: 1, boucle: true },
        attaque: { frames: [0], ips: 1, boucle: false },
        touche:  { frames: [0], ips: 1, boucle: false },
        ko:      { frames: [0], ips: 1, boucle: false },
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
    // Skin DÉDIÉ : illustration fournie (fond vert détouré par preparer_skin.py).
    // Rendue vivante par le CODE (image fixe + effets) — encapuchonné, deux dagues.
    planche: "images/ennemis/gobelin-vif.png",
    portrait: { sx: 8, sy: 3, sw: 64, sh: 64 }, // la tête encapuchonnée (file des tours)
    sprite: {
      caseL: 152,
      caseH: 128,   // calé sur la TÊTE (même visage que les autres gobelins)
      statique: true,  // une seule image (frame 0) ; animation 100 % par le code
      anims: {
        idle:    { frames: [0], ips: 1, boucle: true },
        attaque: { frames: [0], ips: 1, boucle: false },
        touche:  { frames: [0], ips: 1, boucle: false },
        ko:      { frames: [0], ips: 1, boucle: false },
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
    // Skin DÉDIÉ : illustration fournie (fond vert détouré par preparer_skin.py).
    // Vrai « lanceur de sorts » : bâton à crâne, robe sombre. Rendu lisse.
    planche: "images/ennemis/gobelin-chaman.png",
    portrait: { sx: 34, sy: 14, sw: 66, sh: 66 }, // la tête (centrée : visage + oreille + capuche)
    sprite: {
      caseL: 153,
      caseH: 224,   // calé sur la TÊTE (même visage) ; le grand bâton dépasse au-dessus
      statique: true,  // une seule image (frame 0) ; animation 100 % par le code
      anims: {
        idle:    { frames: [0], ips: 1, boucle: true },
        attaque: { frames: [0], ips: 1, boucle: false },
        touche:  { frames: [0], ips: 1, boucle: false },
        ko:      { frames: [0], ips: 1, boucle: false },
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
  // Ogre : brute de niveau 3. Lent mais TRÈS résistant et frappe fort (gourdin
  // clouté). Affix "melee" : toujours à l'avant. Un vrai pic de difficulté.
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
    // Illustration fournie (fond vert détouré par preparer_skin.py). Rendu lisse.
    planche: "images/ennemis/ogre.png",
    portrait: { sx: 12, sy: 6, sw: 103, sh: 103 }, // la tête casquée (file des tours)
    sprite: {
      caseL: 245,
      caseH: 280,        // GRAND monstre (grand: true) : occupe 2 places, bien plus gros
      statique: true,    // une seule image (frame 0) ; animation 100 % par le code
      anims: {
        idle:    { frames: [0], ips: 1, boucle: true },
        attaque: { frames: [0], ips: 1, boucle: false },
        touche:  { frames: [0], ips: 1, boucle: false },
        ko:      { frames: [0], ips: 1, boucle: false },
      },
    },
    butin: {
      objets: [
        { id: "anneau-force", chance: 0.12 }, // rare : sa massue a de la poigne (Power Ring)
      ],
    },
  },
];

// Applique les stats de l'Excel (onglet « Monstres ») PAR-DESSUS les valeurs de
// secours définies ci-dessus : l'Excel est la source de vérité pour l'équilibrage.
if (typeof STATS_MONSTRES !== "undefined") {
  for (const e of ENNEMIS) {
    const s = STATS_MONSTRES[e.id];
    if (s) Object.assign(e, s);
  }
}

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
// dans les groupes de 3 ou plus. Sinon, on tire parmi les types de la zone,
// PONDÉRÉ PAR NIVEAU : dans une zone à fourchette (ex. lvl 1-3), les monstres plus
// FAIBLES sortent plus souvent que les plus forts.

// Chaque niveau AU-DESSUS du plus bas de la zone divise la fréquence par ce facteur
// (2 = « un niveau de plus ⇒ ~2× plus rare »). Régler ici pour toutes les zones.
const FACTEUR_NIVEAU = 2;
// Les monstres GRANDS (occupent 2 places, cf. `grand: true`) apparaissent en plus
// RAREMENT dans les PETITS groupes : leur poids est multiplié par ce facteur
// (0,5 = 2× moins souvent), EN PLUS de la pondération par niveau.
const GRAND_RARETE = 0.5;
// … mais dans les GROS groupes (taille > GROS_GROUPE emplacements), on veut plutôt
// FAVORISER un grand ennemi : son poids est alors multiplié par ce bonus (au lieu du
// malus ci-dessus). Un seul réglage pour tous les grands monstres.
const GROS_GROUPE = 3;         // au-delà de 3 places, le groupe est « gros »
const GRAND_BONUS_GROS = 3.0;  // poids du grand dans un gros groupe (favorisé)

// Tire UN monstre du pool, pondéré par niveau (plus bas = plus probable) et par le
// facteur « grand » (`grandFacteur` : malus dans un petit groupe, bonus dans un gros).
function tirerMonstrePondere(pool, niveauMin, grandFacteur = GRAND_RARETE, rng = Math.random) {
  const poids = pool.map((d) =>
    (1 / Math.pow(FACTEUR_NIVEAU, (d.niveau ?? 1) - niveauMin)) * (d.grand ? grandFacteur : 1));
  let r = rng() * poids.reduce((s, w) => s + w, 0);
  for (let i = 0; i < pool.length; i++) { r -= poids[i]; if (r < 0) return pool[i]; }
  return pool[pool.length - 1];
}

// Nombre d'EMPLACEMENTS occupés par un monstre (grand = 2, normal = 1).
export function placesMonstre(def) { return def?.grand ? 2 : 1; }

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
// La taille tirée est un nombre d'EMPLACEMENTS (1 à 5). On remplit ces emplacements :
//   - un monstre normal prend 1 place, un GRAND en prend 2 ;
//   - un grand ne peut sortir que s'il reste ≥ 2 places libres ;
//   - range seulement si la taille ≥ 3 emplacements ;
//   - tirage PONDÉRÉ par niveau (faible = fréquent) et par la rareté « grand ».
// `opts.distribution` permet à une zone d'imposer sa propre courbe de tailles.
export function composerGroupe(monstreIds, opts = {}) {
  const defs = (monstreIds ?? []).map(ennemiParId).filter(Boolean);
  if (defs.length === 0) return [];
  const melee = defs.filter((d) => d.affix !== "range");
  const niveauMin = Math.min(...defs.map((d) => d.niveau ?? 1)); // réf. de la fourchette
  const taille = tirerTaille(opts.distribution ?? DISTRIBUTION_GROUPE); // EN EMPLACEMENTS
  // En groupe de 1-2 places : que du melee (règle range inchangée).
  const poolBase = taille >= 3 ? defs : (melee.length ? melee : defs);
  // GROS groupe (> 3 places) → on FAVORISE l'apparition d'un grand ennemi ; petit
  // groupe → malus habituel. (cf. GRAND_BONUS_GROS / GRAND_RARETE)
  const grandFacteur = taille > GROS_GROUPE ? GRAND_BONUS_GROS : GRAND_RARETE;
  const groupe = [];
  let libres = taille;
  while (libres > 0) {
    // Un grand n'est éligible que s'il reste ≥ 2 places.
    let pool = poolBase.filter((d) => !d.grand || libres >= 2);
    if (!pool.length) pool = poolBase.filter((d) => !d.grand); // dernière place : que du normal
    if (!pool.length) break; // (cas extrême zone 100 % grand + 1 place : on laisse la place vide)
    const pick = tirerMonstrePondere(pool, niveauMin, grandFacteur);
    groupe.push(pick);
    libres -= placesMonstre(pick);
  }
  // Tri stable melee d'abord, range à la fin (positionnement visuel du combat).
  groupe.sort((a, b) => (a.affix === "range" ? 1 : 0) - (b.affix === "range" ? 1 : 0));
  return groupe;
}

