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
  "gobelin-vif": { nom: "Goblin Skirmisher", niveau: 1, famille: "gobelin", pv: 16, attaque: 2, xp: 8, vitesse: 11, attaqueHits: 2, actions: [] },
  "gobelin": { nom: "Cave Goblin", niveau: 1, famille: "gobelin", pv: 24, attaque: 5, xp: 6, vitesse: 6, actions: [] },
  "gobelin-chaman": { nom: "Goblin Shaman", niveau: 2, famille: "gobelin", pv: 20, attaque: 4, xp: 20, vitesse: 7, actions: [{ type: "soigner", valeur: 10, poids: 50 }, { type: "haste-allie", valeur: 2, poids: 30 }, { type: "attaque", valeur: 2, poids: 20 }] },
  "orc-rodeur": { nom: "Orc Rogue", niveau: 3, famille: "orc", pv: 40, attaque: 6, xp: 22, vitesse: 15, attaqueHits: 2, actions: [] },
  "orc-chamane": { nom: "Orc Shaman", niveau: 4, famille: "orc", pv: 45, attaque: 6, xp: 36, vitesse: 7, actions: [{ type: "soigner", valeur: 12, poids: 45 }, { type: "haste-allie", valeur: 2, poids: 30 }, { type: "attaque", valeur: 6, poids: 25 }] },
  "orc-guerriere": { nom: "Orc Warmaiden", niveau: 4, famille: "orc", pv: 60, attaque: 16, xp: 34, vitesse: 9, actions: [] },
  "orc-guerrier": { nom: "Orc Warrior", niveau: 4, famille: "orc", pv: 75, attaque: 12, xp: 30, vitesse: 8, actions: [] },
  "orc-brute": { nom: "Orc Berserker", niveau: 5, famille: "orc", pv: 95, attaque: 20, xp: 44, vitesse: 6, actions: [], grand: true },
  "blob-jaune": { nom: "Ochre Slime", niveau: 3, famille: "blob", pv: 50, attaque: 8, xp: 24, vitesse: 4, actions: [] },
  "blob-vert": { nom: "Green Slime", niveau: 3, famille: "blob", pv: 55, attaque: 8, xp: 24, vitesse: 4, actions: [] },
  "blob-bleu": { nom: "Azure Slime", niveau: 4, famille: "blob", pv: 65, attaque: 10, xp: 30, vitesse: 4, actions: [] },
  "blob-rouge": { nom: "Crimson Slime", niveau: 4, famille: "blob", pv: 80, attaque: 10, xp: 30, vitesse: 4, actions: [] },
  "molosse": { nom: "Dire Hound", niveau: 3, famille: "animal", pv: 40, attaque: 10, xp: 22, vitesse: 16, actions: [] },
  "ogre-masque": { nom: "Masked Ogre", niveau: 3, famille: "animal", pv: 80, attaque: 30, xp: 60, vitesse: 5, actions: [], grand: true },
  "molosse-sombre": { nom: "Shadow Hound", niveau: 4, famille: "animal", pv: 42, attaque: 11, xp: 26, vitesse: 17, actions: [] },
  "molosse-feu": { nom: "Ember Hound", niveau: 4, famille: "animal", pv: 45, attaque: 12, xp: 28, vitesse: 15, actions: [] },
  "bear": { nom: "Cave Bear", niveau: 4, famille: "animal", pv: 90, attaque: 14, xp: 32, vitesse: 8, actions: [] },
  "bones-bear": { nom: "Bonehide Bear", niveau: 5, famille: "animal", pv: 100, attaque: 16, xp: 44, vitesse: 9, actions: [] },
  "armor-bear": { nom: "Armored War-Bear", niveau: 6, famille: "animal", pv: 150, attaque: 20, xp: 60, vitesse: 6, actions: [], grand: true },
  "warrior-mushroom1": { nom: "Toadstool Lancer", niveau: 3, famille: "mushroom", pv: 50, attaque: 8, xp: 22, vitesse: 8, actions: [] },
  "mage-mushroom": { nom: "Myconid Sage", niveau: 4, famille: "mushroom", pv: 40, attaque: 5, xp: 34, vitesse: 7, actions: [{ type: "soigner", valeur: 12, poids: 45 }, { type: "haste-allie", valeur: 2, poids: 30 }, { type: "attaque", valeur: 5, poids: 25 }] },
  "white-katana-mushroom": { nom: "Myconid Ronin", niveau: 4, famille: "mushroom", pv: 45, attaque: 7, xp: 30, vitesse: 18, attaqueHits: 2, actions: [] },
  "warrior-mushroom2": { nom: "Fungal Knight", niveau: 4, famille: "mushroom", pv: 85, attaque: 11, xp: 30, vitesse: 7, actions: [] },
  "black-mushroom-specialist": { nom: "Deathcap Reaper", niveau: 5, famille: "mushroom", pv: 90, attaque: 18, xp: 44, vitesse: 9, actions: [] },
  "king-mushroom": { nom: "Mushroom King", niveau: 6, famille: "mushroom", pv: 140, attaque: 16, xp: 70, vitesse: 6, actions: [{ type: "soigner", valeur: 18, poids: 40 }, { type: "haste-allie", valeur: 2, poids: 30 }, { type: "attaque", valeur: 16, poids: 30 }], grand: true },
  "lapin-stage1": { nom: "White Rabbit", niveau: 7, famille: "lapin", pv: 1, attaque: 0, xp: 0, vitesse: 13, actions: [] },
  "lapin-stage2": { nom: "Feral Hare", niveau: 7, famille: "lapin", pv: 55, attaque: 9, xp: 0, vitesse: 20, attaqueHits: 2, actions: [] },
  "lapin-stage3": { nom: "Bloodfang Horror", niveau: 10, famille: "lapin", pv: 150, attaque: 17, xp: 130, vitesse: 26, attaqueHits: 2, actions: [] },
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
    // Escarmoucheur : frappe DEUX fois par tour (2 × attaque) et empoisonne à chaque
    // coup (poisonParCoup) — 2 hits × 1 = 2 poison. Ces champs restent ici (pas dans le
    // bloc auto de l'Excel) : ils survivent aux ré-imports de stats.
    attaqueHits: 2,
    poisonParCoup: 1,
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
    portrait: { sx: 63, sy: 5, sw: 110, sh: 110 }, // la tête casquée, centrée (file des tours)
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

  // --- Nouveaux monstres de PROFONDEUR (orcs, blobs, molosses) — 16/07/2026.
  // Stats de PREMIER JET (à équilibrer via l'Excel) ; portraits à recadrer finement.
  {
    id: "orc-rodeur",
    nom: "Orc Rogue",
    niveau: 3,
    famille: "orc",
    pv: 40,
    attaque: 6,
    xp: 22,
    vitesse: 15,
    affix: "melee",
    attaqueHits: 2,
    planche: "images/ennemis/orc-rodeur.png",
    portrait: { sx: 39, sy: 10, sw: 143, sh: 143 }, // premier jet (à recadrer)
    sprite: { caseL: 222, caseH: 260, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "orc-guerrier",
    nom: "Orc Warrior",
    niveau: 4,
    famille: "orc",
    pv: 75,
    attaque: 12,
    xp: 30,
    vitesse: 8,
    affix: "melee",
    planche: "images/ennemis/orc-guerrier.png",
    portrait: { sx: 46, sy: 10, sw: 143, sh: 143 }, // premier jet (à recadrer)
    sprite: { caseL: 235, caseH: 260, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "orc-guerriere",
    nom: "Orc Warmaiden",
    niveau: 4,
    famille: "orc",
    pv: 60,
    attaque: 16,
    xp: 34,
    vitesse: 9,
    affix: "melee",
    planche: "images/ennemis/orc-guerriere.png",
    portrait: { sx: 54, sy: 10, sw: 143, sh: 143 }, // premier jet (à recadrer)
    sprite: { caseL: 252, caseH: 260, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "orc-brute",
    nom: "Orc Berserker",
    niveau: 5,
    famille: "orc",
    pv: 95,
    attaque: 20,
    xp: 44,
    vitesse: 6,
    affix: "melee",
    grand: true,
    planche: "images/ennemis/orc-brute.png",
    portrait: { sx: 36, sy: 10, sw: 143, sh: 143 }, // premier jet (à recadrer)
    sprite: { caseL: 215, caseH: 260, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "orc-chamane",
    nom: "Orc Shaman",
    niveau: 4,
    famille: "orc",
    pv: 45,
    attaque: 6,
    xp: 36,
    vitesse: 7,
    affix: "range",
    planche: "images/ennemis/orc-chamane.png",
    portrait: { sx: 60, sy: 10, sw: 139, sh: 139 }, // premier jet (à recadrer)
    sprite: { caseL: 260, caseH: 252, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    actions: [{ type: "soigner", valeur: 12, poids: 45 }, { type: "haste-allie", valeur: 2, poids: 30 }, { type: "attaque", valeur: 6, poids: 25 }],
    butin: { objets: [] },
  },
  {
    id: "blob-vert",
    nom: "Green Slime",
    niveau: 3,
    famille: "blob",
    pv: 55,
    attaque: 8,
    xp: 24,
    vitesse: 4,
    affix: "melee",
    poisonParCoup: 2,
    planche: "images/ennemis/blob-vert.png",
    portrait: { sx: 80, sy: 7, sw: 100, sh: 100 }, // premier jet (à recadrer)
    sprite: { caseL: 260, caseH: 181, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "blob-jaune",
    nom: "Ochre Slime",
    niveau: 3,
    famille: "blob",
    pv: 50,
    attaque: 8,
    xp: 24,
    vitesse: 4,
    affix: "melee",
    poisonParCoup: 3,
    planche: "images/ennemis/blob-jaune.png",
    portrait: { sx: 74, sy: 8, sw: 112, sh: 112 }, // premier jet (à recadrer)
    sprite: { caseL: 260, caseH: 203, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "blob-rouge",
    nom: "Crimson Slime",
    niveau: 4,
    famille: "blob",
    pv: 80,
    attaque: 10,
    xp: 30,
    vitesse: 4,
    affix: "melee",
    planche: "images/ennemis/blob-rouge.png",
    portrait: { sx: 75, sy: 8, sw: 109, sh: 109 }, // premier jet (à recadrer)
    sprite: { caseL: 260, caseH: 199, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "blob-bleu",
    nom: "Azure Slime",
    niveau: 4,
    famille: "blob",
    pv: 65,
    attaque: 10,
    xp: 30,
    vitesse: 4,
    affix: "melee",
    planche: "images/ennemis/blob-bleu.png",
    portrait: { sx: 71, sy: 9, sw: 118, sh: 118 }, // premier jet (à recadrer)
    sprite: { caseL: 260, caseH: 214, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "molosse",
    nom: "Dire Hound",
    niveau: 3,
    famille: "animal",
    pv: 40,
    attaque: 10,
    xp: 22,
    vitesse: 16,
    affix: "melee",
    planche: "images/ennemis/molosse.png",
    portrait: { sx: 87, sy: 6, sw: 86, sh: 86 }, // premier jet (à recadrer)
    sprite: { caseL: 260, caseH: 156, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "molosse-feu",
    nom: "Ember Hound",
    niveau: 4,
    famille: "animal",
    pv: 45,
    attaque: 12,
    xp: 28,
    vitesse: 15,
    affix: "melee",
    planche: "images/ennemis/molosse-feu.png",
    portrait: { sx: 81, sy: 7, sw: 97, sh: 97 }, // premier jet (à recadrer)
    sprite: { caseL: 260, caseH: 177, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "molosse-sombre",
    nom: "Shadow Hound",
    niveau: 4,
    famille: "animal",
    pv: 42,
    attaque: 11,
    xp: 26,
    vitesse: 17,
    affix: "melee",
    planche: "images/ennemis/molosse-sombre.png",
    portrait: { sx: 80, sy: 7, sw: 100, sh: 100 }, // premier jet (à recadrer)
    sprite: { caseL: 260, caseH: 182, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },

  // --- Les OURS (famille « animal », lâchent du cuir) — 23/07/2026. Même clan de
  // spawn que les molosses (« meute ») : ils apparaissent avec eux. Bruisers lents
  // et TRÈS résistants qui frappent fort. Stats de PREMIER JET (à équilibrer).
  {
    id: "bear",
    nom: "Cave Bear",
    niveau: 4,
    famille: "animal",
    pv: 90,
    attaque: 14,
    xp: 32,
    vitesse: 8,
    affix: "melee",
    planche: "images/ennemis/bear.png",
    portrait: { sx: 16, sy: 4, sw: 132, sh: 132 }, // premier jet (à recadrer)
    sprite: { caseL: 314, caseH: 200, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "bones-bear",
    nom: "Bonehide Bear",
    niveau: 5,
    famille: "animal",
    pv: 100,
    attaque: 16,
    xp: 44,
    vitesse: 9,
    affix: "melee",
    planche: "images/ennemis/bones-bear.png",
    portrait: { sx: 14, sy: 4, sw: 121, sh: 121 }, // premier jet (à recadrer)
    sprite: { caseL: 288, caseH: 200, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "armor-bear",
    nom: "Armored War-Bear",
    niveau: 6,
    famille: "animal",
    pv: 150,
    attaque: 20,
    xp: 60,
    vitesse: 6,
    affix: "melee",
    grand: true, // ours de guerre bardé : occupe 2 places, gros pic de difficulté
    planche: "images/ennemis/armor-bear.png",
    portrait: { sx: 18, sy: 4, sw: 150, sh: 150 }, // premier jet (à recadrer)
    sprite: { caseL: 356, caseH: 220, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },

  // --- Nouvelle famille : les CHAMPIGNONS (« mushroom ») — 23/07/2026.
  // Clan homogène (ils n'apparaissent qu'entre eux, cf. clanMonstre). Un petit
  // peuple guerrier : lanciers, chevaliers, ronin bicéphale, faucheur, sage
  // (soigneur à distance) et leur Roi (boss). Stats de PREMIER JET (à équilibrer).
  {
    id: "warrior-mushroom1",
    nom: "Toadstool Lancer",
    niveau: 3,
    famille: "mushroom",
    pv: 50,
    attaque: 8,
    xp: 22,
    vitesse: 8,
    affix: "melee",
    planche: "images/ennemis/warrior-mushroom1.png",
    portrait: { sx: 11, sy: 4, sw: 96, sh: 96 }, // premier jet (à recadrer)
    sprite: { caseL: 229, caseH: 210, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "warrior-mushroom2",
    nom: "Fungal Knight",
    niveau: 4,
    famille: "mushroom",
    pv: 85,
    attaque: 11,
    xp: 30,
    vitesse: 7,
    affix: "melee",
    planche: "images/ennemis/warrior-mushroom2.png",
    portrait: { sx: 14, sy: 4, sw: 117, sh: 117 }, // premier jet (à recadrer)
    sprite: { caseL: 278, caseH: 210, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "white-katana-mushroom",
    nom: "Myconid Ronin",
    niveau: 4,
    famille: "mushroom",
    pv: 45,
    attaque: 7,
    xp: 30,
    vitesse: 18,
    affix: "melee",
    attaqueHits: 2, // deux katanas : frappe deux fois par tour
    planche: "images/ennemis/white-katana-mushroom.png",
    portrait: { sx: 9, sy: 4, sw: 74, sh: 74 }, // premier jet (à recadrer)
    sprite: { caseL: 177, caseH: 215, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "black-mushroom-specialist",
    nom: "Deathcap Reaper",
    niveau: 5,
    famille: "mushroom",
    pv: 90,
    attaque: 18,
    xp: 44,
    vitesse: 9,
    affix: "melee",
    planche: "images/ennemis/black-mushroom-specialist.png",
    portrait: { sx: 11, sy: 4, sw: 94, sh: 94 }, // premier jet (à recadrer)
    sprite: { caseL: 225, caseH: 225, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "mage-mushroom",
    nom: "Myconid Sage",
    niveau: 4,
    famille: "mushroom",
    pv: 40,
    attaque: 5,
    xp: 34,
    vitesse: 7,
    affix: "range", // caster : uniquement dans les groupes de 3+
    planche: "images/ennemis/mage-mushroom.png",
    portrait: { sx: 10, sy: 5, sw: 87, sh: 87 }, // premier jet (à recadrer)
    sprite: { caseL: 208, caseH: 235, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    actions: [{ type: "soigner", valeur: 12, poids: 45 }, { type: "haste-allie", valeur: 2, poids: 30 }, { type: "attaque", valeur: 5, poids: 25 }],
    butin: { objets: [] },
  },
  {
    id: "king-mushroom",
    nom: "Mushroom King",
    niveau: 6,
    famille: "mushroom",
    pv: 140,
    attaque: 16,
    xp: 70,
    vitesse: 6,
    affix: "range", // le Roi lance des sorts depuis l'arrière
    grand: true,     // boss : occupe 2 places, bien plus gros
    planche: "images/ennemis/king-mushroom.png",
    portrait: { sx: 12, sy: 5, sw: 102, sh: 102 }, // premier jet (à recadrer)
    sprite: { caseL: 244, caseH: 265, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    actions: [{ type: "soigner", valeur: 18, poids: 40 }, { type: "haste-allie", valeur: 2, poids: 30 }, { type: "attaque", valeur: 16, poids: 30 }],
    butin: { objets: [] },
  },

  // --- Le LAPIN BLANC : monstre SPÉCIAL et rare (niveau 7). Il apparaît TOUJOURS
  // seul ou entre lapins (jamais mêlé à d'autres créatures — spawn dédié dans
  // principal.js). Il commence GENTIL (stade 1, 1 PV, ne fait aucun mal). Le tuer
  // ne gagne PAS le combat : il ÉVOLUE (flash blanc) au stade suivant, plus fort et
  // AGRESSIF. Seule la mort du stade 3 (redoutable) donne la victoire — et un gros
  // pactole d'or + une chance infime de « Ring of Luck ». — 23/07/2026.
  // Le champ `evolution` = l'id du stade suivant (géré dans systems/combat.js).
  {
    id: "lapin-stage1",
    nom: "White Rabbit",
    niveau: 7,
    famille: "lapin",
    pv: 1,              // 1 PV : un seul coup le fait « évoluer »
    attaque: 0,         // stade GENTIL : il ne frappe pas
    xp: 0,              // aucune récompense tant qu'il n'est pas au stade final
    vitesse: 13,
    affix: "melee",
    stade: 1,                  // stade d'évolution (pilote la difficulté de FUITE)
    tailleRel: 0.667,          // affiché 1/3 plus petit (mignon petit lapin)
    evolution: "lapin-stage2", // le tuer le transforme (au lieu de mourir)
    planche: "images/ennemis/lapin-stage1.png",
    portrait: { sx: 8, sy: 3, sw: 67, sh: 67 },
    sprite: { caseL: 160, caseH: 150, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "lapin-stage2",
    nom: "Feral Hare",
    niveau: 7,
    famille: "lapin",
    pv: 55,
    attaque: 9,
    xp: 0,
    vitesse: 20,        // devenu vif : attaque rapide
    affix: "melee",
    attaqueHits: 2,     // deux coups de griffes par tour
    stade: 2,
    tailleRel: 0.667,   // affiché 1/3 plus petit
    evolution: "lapin-stage3",
    planche: "images/ennemis/lapin-stage2.png",
    portrait: { sx: 10, sy: 4, sw: 83, sh: 83 },
    sprite: { caseL: 198, caseH: 185, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    butin: { objets: [] },
  },
  {
    id: "lapin-stage3",
    nom: "Bloodfang Horror",
    niveau: 10,          // niveau de LOOT relevé : gros pactole d'or (cf. butin.js)
    famille: "lapin",
    pv: 150,
    attaque: 17,
    xp: 130,             // grosse récompense pour l'avoir mené au bout
    vitesse: 26,         // encore plus rapide au stade final
    affix: "melee",
    attaqueHits: 2,
    stade: 3,            // dernier stade : fuite quasi impossible
    tailleRel: 1.25,     // affiché 1/4 plus grand (il domine encore plus le héros)
    // (pas d'`evolution` : ce stade meurt pour de vrai → victoire + butin)
    planche: "images/ennemis/lapin-stage3.png",
    portrait: { sx: 10, sy: 5, sw: 84, sh: 84 },
    sprite: { caseL: 201, caseH: 270, statique: true, anims: { idle: { frames: [0], ips: 1, boucle: true }, attaque: { frames: [0], ips: 1, boucle: false }, touche: { frames: [0], ips: 1, boucle: false }, ko: { frames: [0], ips: 1, boucle: false } } },
    // Chance INFIME de lâcher le « Ring of Luck » (item rare) + son gros or de niveau 10.
    butin: { objets: [{ id: "ring-of-luck", chance: 0.02 }] },
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
// CLAN de spawn d'un monstre : un groupe est HOMOGÈNE par clan. Les blobs entre eux,
// les molosses entre eux ; gobelins, ogres et orcs partagent le clan « goblinoïde »
// (ils peuvent donc se mélanger). — décision Brioche 16/07/2026.
function clanMonstre(d) {
  if (d.famille === "blob") return "blob";
  if (d.famille === "mushroom") return "mushroom"; // les champignons entre eux
  if (d.famille === "lapin") return "lapin";       // les lapins entre eux (spawn dédié)
  // La MEUTE : molosses (« hyènes ») + ours partagent le même clan → ils apparaissent
  // ensemble (une meute de bêtes sauvages, l'ours en gros membre).
  if (typeof d.id === "string" && (d.id.startsWith("molosse") || d.id.includes("bear"))) return "hound";
  return "goblinoide"; // gobelins, ogre, orcs
}

export function composerGroupe(monstreIds, opts = {}) {
  let defs = (monstreIds ?? []).map(ennemiParId).filter(Boolean);
  if (defs.length === 0) return [];
  // On tire d'abord UN clan (via un monstre pondéré par niveau) et on ne garde que
  // les monstres de ce clan → pas de mélange blobs/gobelins/molosses dans un groupe.
  const niveauMinPool = Math.min(...defs.map((d) => d.niveau ?? 1));
  const clanChoisi = clanMonstre(tirerMonstrePondere(defs, niveauMinPool, GRAND_RARETE));
  defs = defs.filter((d) => clanMonstre(d) === clanChoisi);
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

