// LA BANQUE DE BRÜTÀL — données (contenu pur, pas de logique).
//
// Deux produits :
//   1) LE COFFRE-FORT : on y dépose de l'or, il rapporte un rendement SÛR et
//      modeste, chaque JOUR DE JEU. Aucun risque.
//   2) LES SOCIÉTÉS : on investit dans des entreprises naines. Meilleur rendement
//      possible, MAIS risque de baisse, de krach (perte partielle) ou de faillite
//      (perte totale). Le rendement est ALÉATOIRE chaque jour ; chaque société a
//      son propre couple rendement/risque.
//
// Tous les taux sont PAR JOUR DE JEU (cf. numeroJour, systems/temps.js). Ils sont
// appliqués à l'ouverture de la banque, pour chaque jour écoulé depuis la dernière
// visite (cf. systems/banque.js).

// Rendement quotidien SÛR du coffre-fort (0,2 %/jour, comme demandé).
export const RENDEMENT_COFFRE = 0.002;

// LES SOCIÉTÉS. Réglages par jour de jeu :
//   rendementMoyen : gain moyen espéré (peut être « mangé » par la volatilité) ;
//   volatilite     : amplitude du tirage aléatoire (± autour du rendement moyen) ;
//   probaKrach     : proba/jour d'un KRACH (chute brutale) ;
//   pertesKrach    : fraction du capital perdue lors d'un krach ;
//   probaFaillite  : proba/jour de FAILLITE (on perd TOUT le capital de la société).
// Trois profils : prudent, équilibré, spéculatif.
export const SOCIETES = [
  {
    id: "fonderies-ferrok",
    nom: "Fonderies de Ferrok",
    secteur: "Métallurgie",
    risque: 1, // 1=prudent, 2=équilibré, 3=spéculatif (pour l'affichage)
    // Espérance ≈ +0,3 %/j (mieux que le coffre), risque faible.
    rendementMoyen: 0.005, volatilite: 0.006,
    probaKrach: 0.010, pertesKrach: 0.15, probaFaillite: 0.0005,
  },
  {
    id: "miniere-brumgal",
    nom: "Société minière de Brumgal",
    secteur: "Extraction minière",
    risque: 2,
    // Espérance ≈ +0,65 %/j, secousses nettes, krach/faillite occasionnels.
    rendementMoyen: 0.013, volatilite: 0.015,
    probaKrach: 0.020, pertesKrach: 0.25, probaFaillite: 0.0015,
  },
  {
    id: "comptoir-onyx",
    nom: "Comptoir des gemmes d'Onyx",
    secteur: "Négoce de gemmes",
    risque: 3,
    // Espérance ≈ +1 %/j mais grosse volatilité et faillites réelles.
    rendementMoyen: 0.026, volatilite: 0.035,
    probaKrach: 0.035, pertesKrach: 0.35, probaFaillite: 0.004,
  },
  {
    id: "deepx",
    nom: "DeepX",
    secteur: "Forage abyssal",
    risque: 4, // EXTRÊME (au-delà des 3 autres) : rendement énorme, danger énorme.
    // Espérance élevée (~+1,3 %/j) mais volatilité folle, gros krachs ET faillites
    // fréquentes (≈ 30 % de tout perdre sur 30 jours). Le gros pari.
    rendementMoyen: 0.060, volatilite: 0.090,
    probaKrach: 0.070, pertesKrach: 0.50, probaFaillite: 0.012,
  },
];

// TALENT « Secret d'investisseur » : augmente les gains ET diminue les risques.
// Multiplicateurs appliqués aux réglages ci-dessus quand le talent est pris.
export const BONUS_TALENT = {
  rendementMoyen: 1.5,  // +50 % de rendement moyen
  volatilite:     0.7,  // −30 % de volatilité
  probaKrach:     0.5,  // −50 % de proba de krach
  pertesKrach:    0.75, // −25 % de pertes en cas de krach
  probaFaillite:  0.4,  // −60 % de proba de faillite
};
