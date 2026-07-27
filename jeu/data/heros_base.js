// STATS DE BASE DU HÉROS (sans aucun bonus d'équipement ni talent).
//
// ⚠ ÉDITABLES DANS L'EXCEL — docs/BRUTAL-items-et-cartes.xlsx, onglet « Héros ».
// Le bloc ci-dessous est RÉGÉNÉRÉ par outils/importer_heros.py : ne pas l'éditer
// à la main. Ces chiffres sont la SOURCE des constantes de base utilisées par
// systems/talents.js, systems/combat.js et entities/heros.js.
//
// Clés :
//   pv             : vie de base
//   vitesseMarche  : vitesse de déplacement en exploration (pixels/seconde)
//   vitesseCombat  : vitesse d'initiative (ATB) en combat
//   chaleurDepart  : Chaleur de forge au début d'un combat
//   chaleurRecharge: Chaleur regagnée à chaque tour
//   chaleurSeuil   : seuil de surchauffe
//   chaleurMax     : Chaleur maximale
//   mainMax        : nombre maximum de cartes en main
// <<HEROS-AUTO>>
export const STATS_HEROS_BASE = {
  pv: 50,
  vitesseMarche: 160,
  vitesseCombat: 100,
  chaleurDepart: 1,
  chaleurRecharge: 1,
  chaleurSeuil: 3,
  chaleurMax: 8,
  mainMax: 8,
};
// <<FIN-HEROS-AUTO>>
