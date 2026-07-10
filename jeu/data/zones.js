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

// `monstres` : les IDS de monstres qui peuvent surgir dans la zone (cf.
// data/ennemis.js). La composition d'un groupe (taille + types) est tirée par
// composerGroupe(). Une zone sans `monstres` est sûre (aucune rencontre).

// ----- La ville de Brütàl (cité naine, sûre) -------------------------------
export const CITY = {
  nom: "Brütàl — the City",
  musique: "ambiance-city",
  depart: { colonne: 37, ligne: 14 },
  // Aucun `monstres` : la ville est un havre, pas de combat.
  // Murs en `H` (pierre taillée grise claire) — distincts de la roche brute `#`
  // des mines. Les `##` intérieurs sont des bâtiments/blocs décoratifs.
  plan: [
    "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
    "H..........................................H",
    "H..........................................H",
    "H..........................................H",
    "H.........HH........HH........HH...........H",
    "H.........HH........HH........HH...........H",
    "H..........................................H",
    "H..........................................H",
    "H..........................................H",
    "H..............HH...........HH.............H",
    "H..............HH...........HH.............H",
    "H..........................................H",
    "H..........................................H",
    "H.........................................PH",
    "H..........................................H",
    "H..........................................H",
    "H..........................................H",
    "H...............HH.........HH..............H",
    "H...............HH.........HH..............H",
    "H..........................................H",
    "H..........................................H",
    "H.........HH........HH........HH...........H",
    "H.........HH........HH........HH...........H",
    "H..........................................H",
    "H..........................................H",
    "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
  ],
  portails: [
    { colonne: 42, ligne: 13, vers: "eastern-under-tunnels", entree: { colonne: 2, ligne: 13 } },
  ],
};

// ----- Eastern Under-tunnels — souterrains à l'est de Brütàl (dangers) ------
export const EASTERN_UNDER_TUNNELS = {
  nom: "Eastern Under-tunnels",
  musique: "ambiance-eastern-under-tunnels", // ambiance d'exploration (pool aléatoire)
  depart: { colonne: 2, ligne: 13 },
  // Le repaire des gobelins : les 3 variantes (chaman "range" → groupes de 3+)
  // + l'ogre masqué (brute de niveau 3, pic de difficulté).
  monstres: ["gobelin", "gobelin-vif", "gobelin-chaman", "ogre-masque"],
  niveauMobs: [1, 3], // fourchette de niveau des monstres de la zone (affichée au HUD)
  plan: [
    "############################################",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,##,,,,,,,,,,,,,,,,##,,,,,,,,,,,,,,,#",
    "#,,,,,,,##,,,,,,,,,,,,,,,,##,,,,,,,,,,,,##,#",
    "#,,,,,,,,,,,,,,,##,,,,,,,,,,,,,,,,,,,,,,##,#",
    "#,,,,,,,,,,,,,,,##,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,##,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,##,,,,,,,,##,,,,##,,,,,,,#",
    "#,,,,,,,,,##,,,,,,##,,,,,,,,##,,,,,,,,,,,,,#",
    "#,,,,,,,,,##,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#P,,,,M,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,##,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,##,,,,,,,,#",
    "#,,,,,##,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,##,,,#",
    "#,,,,,##,,,,,,,,,,,,,,##,,,,,,,,,,,,,,##,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,##,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,##,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,##,,,,,,,,,,,,,,##,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,##,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
    "############################################",
  ],
  portails: [
    { colonne: 1, ligne: 13, vers: "city", entree: { colonne: 41, ligne: 13 } },
  ],
};

// Toutes les zones, accessibles par leur id (utilisé par les portails)
export const ZONES = {
  city: CITY,
  "eastern-under-tunnels": EASTERN_UNDER_TUNNELS,
};
