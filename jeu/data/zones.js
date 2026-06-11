// Les zones du jeu : chaque zone est un PLAN dessiné en caractères.
// Une ligne de texte = une rangée de tuiles de 32x32 pixels.
//
//   #  mur / roche (bloque le passage)
//   .  sol de la ville (dallage, aucune rencontre)
//   ,  sol des souterrains (roche brute — les monstres peuvent attaquer)
//   M  entrée de mine (point d'intérêt, plus tard : la Profondeur)
//   P  porte / passage entre deux zones
//
// `portails` relie chaque porte 'P' à sa destination :
//   { colonne, ligne } = la case de la porte
//   vers   = l'id de la zone d'arrivée (voir ZONES en bas)
//   entree = la case où le héros réapparaît dans la zone d'arrivée
//
// (Chaque ligne d'un plan doit garder exactement la même longueur.)

// ----- La ville de Brütàl (cité naine, sûre) -------------------------------
export const VILLE = {
  nom: "Brütàl — the City",
  depart: { colonne: 6, ligne: 8 },
  plan: [
    "##############################",
    "#............................#",
    "#...####..........####.......#",
    "#...####..........####.......#",
    "#............................#",
    "#............................#",
    "#............................#",
    "#............................#",
    "#...........................P#",
    "#............................#",
    "#............................#",
    "#.....####..........####.....#",
    "#.....####..........####.....#",
    "#............................#",
    "#............................#",
    "##############################",
  ],
  portails: [
    { colonne: 28, ligne: 8, vers: "souterrains", entree: { colonne: 2, ligne: 8 } },
  ],
};

// ----- Les souterrains autour de Brütàl (exploration, dangers) -------------
export const SOUTERRAINS = {
  nom: "The Under-tunnels",
  depart: { colonne: 2, ligne: 8 },
  plan: [
    "##############################",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,####,,,,,,,,,####,,,,,,#",
    "#,,,,,####,,,,,,,,,####,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,##,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,##,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#P,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,####,,,,,,,,,,,,,####,,,#",
    "#,,,,####,,,,,,,,,,,,,####,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,M,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "##############################",
  ],
  portails: [
    { colonne: 1, ligne: 8, vers: "ville", entree: { colonne: 27, ligne: 8 } },
  ],
};

// Toutes les zones, accessibles par leur id (utilisé par les portails)
export const ZONES = {
  ville: VILLE,
  souterrains: SOUTERRAINS,
};
