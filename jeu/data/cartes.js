// Catalogue des cartes de combat (contenu pur, sans logique).
//
// Chaque carte décrit SES EFFETS de façon déclarative ; c'est le moteur de
// combat (jeu/systems/combat.js) qui les applique. Ajouter une carte = ajouter
// une entrée ici. Les noms/textes sont en anglais (langue du jeu).
//
// Champs d'une carte :
//   id     : identifiant interne (référencé par les armes, le deck…)
//   nom    : nom affiché sur la carte
//   cout   : Chaleur de Forge dépensée pour la jouer (0 = gratuite)
//   type   : "attaque", "defense" ou "buff" — sert à la COULEUR de la carte et
//            à son rangement dans la Maîtrise des Ancêtres. "buff" = ne fait ni
//            dégât ni bouclier (ex. hâte sur soi, régénération d'énergie).
//   unique : (optionnel) true = carte « unique » (très puissante). Elle NE peut
//            PAS être maîtrisée (exclue de la Maîtrise des Ancêtres, comme les
//            cartes du deck de base) — pour ne pas rendre le jeu déséquilibré.
//   texte  : description affichée au joueur
//   image  : (optionnel) PNG illustrant TOUTE la carte. S'il est présent, on
//            n'affiche par-dessus que le COÛT (un chiffre, pour qu'il puisse
//            changer si un effet le réduit). Sans image : rectangle + texte.
//            Ranger les illustrations dans images/cartes/ (nommées comme l'id).
//   effets : liste d'effets appliqués dans l'ordre, chacun { type, valeur }
//            - "degats" : retire `valeur` PV à l'ennemi
//            - "pierre" : ajoute `valeur` de défense "Pierre" au héros
//            - "poison" : ajoute `valeur` de Poison à l'ennemi (dégâts/tour qui
//                         baissent de 1 par tour, ignorent la Pierre)
//            - "feu"    : ajoute `valeur` d'Enflammé à l'ennemi (dégâts/tour comme le
//                         poison). À la FIN du tour où une carte pose du Feu, l'ennemi
//                         en répand la moitié (arrondie au sup.) à ses voisins vivants,
//                         une seule fois — pas de réaction en chaîne (cf. propagerFeu)
//            - "embrasement": consomme TOUT le Feu de l'ennemi et le convertit en
//                         dégâts instantanés (× `valeur`). Ex. 5 Feu × 2 = 10 dégâts.
//            - "sang"   : applique `valeur` ticks de Saignement à l'ennemi.
//                         Chaque tick passif = 1 dégât plat + −1 tick.
//                         Frapper un ennemi qui saigne DÉJÀ = DÉTONATION (dégâts
//                         immédiats = ticks restants) puis empilement des nouveaux.
//            - "chaleur": régénère `valeur` d'énergie (Chaleur) — peut dépasser le
//                         seuil et donc faire surchauffer (risque de brûlure)
//            - "trempe" : convertit TOUTE la Chaleur restante en Pierre (×`valeur`
//                         par point), puis la forge refroidit (chaleur → 0)
//            - "stun"   : étourdit l'ennemi `valeur` tours (il saute ses tours).
//                         Cumulable : rejouer en ajoute (les ticks s'additionnent)
//            - "celerite": HÂTE le héros (+30% d'agilité) pendant `valeur` de SES tours
//            - "lenteur" : GÈLE l'ennemi visé (−30% de vitesse) pendant `valeur` de ses tours

export const CARTES = {
  // ---- Deck de base commun : cartes à 0 Chaleur, mais FAIBLES --------------
  // Elles évitent les tours vides quand la Chaleur est basse (+1/tour seulement).
  // Les cartes fortes, elles, coûtent de la Chaleur et viennent de l'équipement.
  "coup-faible": {
    id: "coup-faible",
    nom: "Punch",
    cout: 0,
    type: "attaque",
    texte: "Deal 3 damage.",
    effets: [{ type: "degats", valeur: 3 }],
  },
  "garde-faible": {
    id: "garde-faible",
    nom: "Hand Guard",
    cout: 1,
    type: "defense",
    texte: "Gain 3 Stone.",
    effets: [{ type: "pierre", valeur: 3 }],
  },

  // ---- Cartes plus fortes : elles COÛTENT de la Chaleur --------------------
  // « Strike » et « Guard » sont prêtes à être données par l'équipement plus
  // tard (armure, runes, gemmes…) — le deck est le miroir de l'équipement.
  "frappe": {
    id: "frappe",
    nom: "Strike",
    cout: 1,
    type: "attaque",
    texte: "Deal 6 damage.",
    effets: [{ type: "degats", valeur: 6 }],
  },
  "garde": {
    id: "garde",
    nom: "Guard",
    cout: 1,
    type: "defense",
    texte: "Gain 5 Stone.",
    effets: [{ type: "pierre", valeur: 5 }],
  },

  // ---- Cartes signature d'arme (une par arme) -----------------------------
  // Équiper l'arme injecte sa carte dans le deck (voir jeu/data/armes.js).

  // Hache rouillée : large balayage → frappe la cible ET ses deux voisins directs.
  "coup-de-hache": {
    id: "coup-de-hache",
    nom: "Rusty Cleave",
    cout: 2,
    type: "attaque",
    texte: "Deal 6 damage to the target and 4 damage to each adjacent enemy.",
    effets: [{ type: "degats", valeur: 6 }, { type: "cleave-adjacent", valeur: 4 }],
  },

  // Marteau de forge : frappe + renforce → dégâts ET de la Pierre.
  "ecrasement": {
    id: "ecrasement",
    nom: "Forge Smash",
    cout: 2,
    type: "attaque",
    texte: "Deal 10 damage. Gain 8 Stone.",
    effets: [{ type: "degats", valeur: 10 }, { type: "pierre", valeur: 8 }],
  },

  // Marteau de forge — Éclaboussure de frappe : gros coup ciblé dont les étincelles
  // brûlent parfois (50%) chacun des deux voisins directs.
  "eclaboussure-de-frappe": {
    id: "eclaboussure-de-frappe",
    nom: "Splash Strike",
    cout: 3,
    type: "attaque",
    texte: "Deal 15 damage. Each adjacent enemy has a 50% chance to take 5 Burning.",
    effets: [{ type: "degats", valeur: 15 }, { type: "brulure-adjacent", feu: 5, proba: 0.5 }],
  },

  // Pioche de mineur : deux coups acharnés ; si la cible tombe, un 3e coup part
  // sur un autre ennemi au hasard (le « combo » de la pioche).
  "coup-de-pioche": {
    id: "coup-de-pioche",
    nom: "Pickaxe Jab",
    cout: 1,
    type: "attaque",
    texte: "Deal 3 damage twice. If the target dies, hit a random other enemy for 3.",
    effets: [{ type: "degats", valeur: 3 }, { type: "degats", valeur: 3 }, { type: "coup-de-grace", valeur: 3 }],
  },

  // Croc de basilic : morsure venimeuse → un peu de dégâts + du Poison qui
  // ronge l'ennemi sur la durée.
  "coup-venimeux": {
    id: "coup-venimeux",
    nom: "Venom Stab",
    cout: 1,
    type: "attaque",
    texte: "Deal 4 damage. Apply 4 Poison.",
    effets: [{ type: "degats", valeur: 4 }, { type: "poison", valeur: 4 }],
  },

  // Croc de basilic — Danse empoisonnée : 3 frappes (3 dégâts) sur TOUS les ennemis,
  // + poison à chaque frappe. Combo : un ennemi DÉJÀ empoisonné prend 2 poison/frappe
  // au lieu de 1 (déterminé au début de la carte).
  "danse-empoisonnee": {
    id: "danse-empoisonnee",
    nom: "Poison Dance",
    cout: 3,
    type: "attaque",
    aoe: true,
    texte: "Hit ALL enemies 3 times for 3 damage. Apply 1 Poison per hit (2 if the enemy was already poisoned).",
    effets: [{ type: "danse-poison", hits: 3, degats: 3 }],
  },

  // Croc de basilic — Ouverture des plaies : gros coup unique, DOUBLÉ si la cible
  // porte déjà un malus (poison, feu, saignement, étourdissement, gel).
  "ouverture-des-plaies": {
    id: "ouverture-des-plaies",
    nom: "Wound Opening",
    cout: 2,
    type: "attaque",
    texte: "Deal 18 damage. Doubled if the target has a negative status.",
    effets: [{ type: "degats-execution", valeur: 18 }],
  },

  // Marteau de lave : un coup TRÈS lourd + de l'Enflammé (feu dans le temps qui
  // se propage à la fin du tour aux ennemis adjacents).
  "coup-de-lave": {
    id: "coup-de-lave",
    nom: "Lava Hammer",
    cout: 2,
    type: "attaque",
    texte: "Deal 28 damage. Apply 4 Burning.",
    effets: [{ type: "degats", valeur: 28 }, { type: "feu", valeur: 4 }],
  },

  // Magma Hammer — Fire Strike : frappe simple qui amorce un peu de brûlure.
  "feu-frappe": {
    id: "feu-frappe",
    nom: "Fire Strike",
    cout: 1,
    type: "attaque",
    texte: "Deal 12 damage. Apply 3 Burning.",
    effets: [{ type: "degats", valeur: 12 }, { type: "feu", valeur: 3 }],
  },

  // Magma Hammer — Forgeage d'armure : brûlure de masse (10) sur TOUS. Combo : un
  // ennemi DÉJÀ en feu en reçoit le double (20 de plus), puis toute sa brûlure est
  // consommée et forgée en Pierre pour le héros (1 brûlure = 1 Pierre).
  "forgeage-d-armure": {
    id: "forgeage-d-armure",
    nom: "Armor Forging",
    cout: 4,
    type: "attaque",
    aoe: true,
    texte: "Apply 10 Burning to ALL enemies. Already-burning enemies take double, then their Burning is forged into Stone for you.",
    effets: [{ type: "forgeage", feu: 10 }],
  },

  // Bouclier-tour : 3 cartes de Pierre (blocage) + 2 cartes qui étourdissent + 1 Stacking Shield.
  "mur-bouclier": {
    id: "mur-bouclier",
    nom: "Shield Wall",
    cout: 1,
    type: "defense",
    texte: "Gain 10 Stone.",
    effets: [{ type: "pierre", valeur: 10 }],
  },
  "coup-de-bouclier": {
    id: "coup-de-bouclier",
    nom: "Shield Bash",
    cout: 2,
    type: "attaque",
    texte: "Deal 10 damage. Stun the enemy for 3 turns.",
    effets: [{ type: "degats", valeur: 10 }, { type: "stun", valeur: 3 }],
  },

  // Bottes vives : HÂTE le héros (+30% d'agilité) pendant quelques tours.
  "celerite-vive": {
    id: "celerite-vive",
    nom: "Quicken",
    cout: 1,
    type: "buff", // ni dégât ni bouclier : accélère le héros
    texte: "Haste: +30% attack speed for 3 turns.",
    effets: [{ type: "celerite", valeur: 3 }],
  },
  // Anneau de givre : GÈLE l'ennemi visé (−30% de vitesse) pendant quelques tours.
  "givre-lent": {
    id: "givre-lent",
    nom: "Frostbite",
    cout: 1,
    type: "attaque",
    texte: "Deal 5 damage. Chill: -30% speed for 3 turns.",
    effets: [{ type: "degats", valeur: 5 }, { type: "lenteur", valeur: 3 }],
  },

  // Collier de saphir : régénère de l'énergie (Chaleur). Sans cible, joué sur soi.
  // Attention : pousser au-dessus du seuil fait surchauffer au tour suivant.
  "surge-saphir": {
    id: "surge-saphir",
    nom: "Sapphire Surge",
    cout: 0,
    type: "buff", // ni dégât ni bouclier : régénère juste de l'énergie
    texte: "Gain 2 Forge Heat (energy).",
    effets: [{ type: "chaleur", valeur: 2 }],
  },
  // Saphir parfait : version supérieure de Surge (+3 Chaleur au lieu de +2),
  // pour le haut de gamme de la lignée de colliers.
  "surge-saphir-parfait": {
    id: "surge-saphir-parfait",
    nom: "Perfect Sapphire Surge",
    cout: 0,
    type: "buff",
    texte: "Gain 3 Forge Heat (energy).",
    effets: [{ type: "chaleur", valeur: 3 }],
  },

  // Gants de mineur : « Master's Hand » — pioche 2 cartes (tempo / fluidité du
  // deck). Premier item qui manipule la PIOCHE plutôt que d'infliger un effet.
  "main-de-maitre": {
    id: "main-de-maitre",
    nom: "Master's Hand",
    cout: 1,
    type: "buff", // ni dégât ni bouclier : agit sur la main
    texte: "Draw 2 cards.",
    effets: [{ type: "piocher", valeur: 2 }],
  },

  // Bague de sang : attaque tranchante qui empile le saignement.
  "coup-de-sang": {
    id: "coup-de-sang",
    nom: "Bloodletting",
    cout: 1,
    type: "attaque",
    texte: "Deal 3 damage + current Bleed stacks as bonus damage. Apply 3 Bleed (stacks don't reset).",
    effets: [{ type: "degats", valeur: 3 }, { type: "sang", valeur: 3 }],
  },

  // ---- Battle Axe cards -------------------------------------------------------

  // Coup de pommeau : gros coup qui assomme (dégâts lourds + stun 2 tours).
  "coup-de-pommeau": {
    id: "coup-de-pommeau",
    nom: "Pommel Strike",
    cout: 1,
    type: "attaque",
    texte: "Deal 16 damage. Stun the target for 2 turns.",
    effets: [{ type: "degats", valeur: 16 }, { type: "stun", valeur: 2 }],
  },

  // Giant Swing : grand arc → frappe TOUS les ennemis (AOE) + saignement de masse.
  "giant-swing": {
    id: "giant-swing",
    nom: "Giant Swing",
    cout: 3,
    type: "attaque",
    aoe: true,
    texte: "Deal 16 damage to ALL enemies. Apply 2 Bleed to ALL enemies.",
    effets: [{ type: "degats", valeur: 16 }, { type: "sang", valeur: 2 }],
  },

  // Couper en deux : coup lourd ; si la cible meurt, les dégâts rebondissent sur l'ennemi suivant.
  "couper-en-deux": {
    id: "couper-en-deux",
    nom: "Cleave",
    cout: 2,
    type: "attaque",
    texte: "Deal 20 damage. If the target dies, deal 15 damage to the next enemy.",
    effets: [{ type: "degats", valeur: 20 }, { type: "rebond", valeur: 15 }],
  },

  // ---- Forgemaster's Mail (armure) : 1re armure qui DONNE des cartes ----------

  // Mail Armor : bloc de Pierre qui SCALE avec le nombre d'ennemis encore vivants.
  // Plus il y en a en face, plus la protection est forte — récompense les batailles longues.
  "mail-armor": {
    id: "mail-armor",
    nom: "Mail Armor",
    cout: 1,
    type: "defense",
    texte: "Gain 7 Stone for every enemy still alive.",
    effets: [{ type: "pierre-par-ennemi", valeur: 7 }],
  },

  // Trempe : vide toute la Chaleur et la fige en Pierre (×10). Gratuite, mais ne
  // vaut que si la forge est chaude → récompense de jouer en surchauffe, et fait
  // retomber la surchauffe d'un coup. Passerelle d'identité naine : Chaleur → Pierre.
  "trempe": {
    id: "trempe",
    nom: "Quench",
    cout: 0,
    type: "defense",
    texte: "Spend all Forge Heat. Gain 10 Stone per Heat spent.",
    effets: [{ type: "trempe", valeur: 10 }],
  },

  // ---- Onyx Guard Plate (armure) : build « brûlure / dragon » -----------------
  // 3× Onyx Armor (gros bloc de Pierre) + 1× Dragon's Blaze (détonateur de feu) +
  // 2× Onyx Breath (pose du feu en masse). Combo : empiler le Feu (Souffle), puis
  // le faire exploser d'un coup (Embrasement) — burst AOE qui récompense la mise en place.

  // Onyx Armor : mur de Pierre massif (build tank lourd).
  "onyx-armor": {
    id: "onyx-armor",
    nom: "Onyx Armor",
    cout: 2,
    type: "defense",
    texte: "Gain 30 Stone.",
    effets: [{ type: "pierre", valeur: 30 }],
  },

  // Onyx Breath : souffle ardent → 20 Feu sur TOUS les ennemis (mise en place du combo).
  "souffle-onyx": {
    id: "souffle-onyx",
    nom: "Onyx Breath",
    cout: 3,
    type: "attaque",
    aoe: true,
    texte: "Apply 20 Burning to ALL enemies.",
    effets: [{ type: "feu", valeur: 20 }],
  },

  // Dragon's Blaze : fait DÉTONER tout le Feu en cours → chaque point de Feu
  // devient 2 dégâts instantanés, sur TOUS les ennemis (le feu est consommé).
  "embrasement-dragon": {
    id: "embrasement-dragon",
    nom: "Dragon's Blaze",
    cout: 4,
    type: "attaque",
    aoe: true,
    texte: "Detonate all Burning: deal 2 damage per Burning on ALL enemies.",
    effets: [{ type: "embrasement", valeur: 2 }],
  },

  // ---- Big Onyx Sword (arme 2 mains) : build feu « brûlure » ------------------
  // Onyx Radiance (mise en place AOE), Onyx Slash (gros coup + éclaboussure), et
  // Heat Rejection (trempe offensive : la Chaleur devient de la brûlure de masse).

  // Onyx Radiance : pose du Feu en masse sur TOUS les ennemis (amorce du combo brûlure).
  "onyx-radiance": {
    id: "onyx-radiance",
    nom: "Onyx Radiance",
    cout: 1,
    type: "attaque",
    aoe: true,
    texte: "Apply 8 Burning to ALL enemies.",
    effets: [{ type: "feu", valeur: 8 }],
  },

  // Onyx Slash : coup lourd (26 dégâts + 4 Feu) qui ÉCLABOUSSE l'ennemi derrière
  // la cible avec la MOITIÉ (13 dégâts + 2 Feu), qu'il survive ou non.
  "onyx-slash": {
    id: "onyx-slash",
    nom: "Onyx Slash",
    cout: 2,
    type: "attaque",
    texte: "Deal 26 damage and 4 Burning. The enemy behind takes half (13 damage, 2 Burning).",
    effets: [
      { type: "degats", valeur: 26 },
      { type: "feu", valeur: 4 },
      { type: "eclaboussure", degats: 13, feu: 2 },
    ],
  },

  // Heat Rejection : « trempe offensive ». Dépense TOUTE la Chaleur et la projette
  // en brûlure (×3 par Chaleur) sur TOUS les ennemis. Gratuite, mais ne vaut que
  // si la forge est chaude → récompense de jouer en surchauffe (miroir de Quench).
  "rejet-chaleur": {
    id: "rejet-chaleur",
    nom: "Heat Rejection",
    cout: 0,
    type: "attaque",
    aoe: true,
    texte: "Spend all Forge Heat. Apply 8 Burning per Heat spent to ALL enemies.",
    effets: [{ type: "rejet-chaleur", valeur: 8 }],
  },

  // Big Onyx Sword — Onyx Overheat : grosse relance d'énergie (surchauffe la forge).
  "onyx-overheat": {
    id: "onyx-overheat",
    nom: "Onyx Overheat",
    cout: 0,
    type: "buff", // ni dégât ni bouclier : régénère de l'énergie
    texte: "Gain 5 Forge Heat (energy).",
    effets: [{ type: "chaleur", valeur: 5 }],
  },

  // ---- Onyx Glove (gants) : build feu « brûlure dispersée » -------------------

  // Burning Hand : défausse toute la main et envoie 8 Feu par carte défaussée à
  // un ennemi AU HASARD (peut frapper plusieurs fois le même). Gratuite : à jouer
  // en dernier dans le tour pour transformer une main inutile en brûlure.
  "main-brulante": {
    id: "main-brulante",
    nom: "Burning Hand",
    cout: 0,
    type: "attaque",
    texte: "Discard your hand. For each card discarded, apply 8 Burning to a random enemy.",
    effets: [{ type: "defausse-brulante", valeur: 8 }],
  },

  // Onyx Fist : coup mixte défense + feu — 10 Pierre, 10 dégâts et 3 Feu sur la cible.
  "poing-onyx": {
    id: "poing-onyx",
    nom: "Onyx Fist",
    cout: 1,
    type: "attaque",
    texte: "Gain 10 Stone. Deal 10 damage and apply 3 Burning.",
    effets: [{ type: "pierre", valeur: 10 }, { type: "degats", valeur: 10 }, { type: "feu", valeur: 3 }],
  },

  // ---- Onyx Boots (bottes) : feu + mobilité -----------------------------------

  // Burning Run : hâte proportionnelle à la Chaleur active (1 tour de célérité par
  // Chaleur restante après le coût). Plus la forge est chaude, plus on accélère.
  "course-ardente": {
    id: "course-ardente",
    nom: "Burning Run",
    cout: 2,
    type: "buff", // ni dégât ni bouclier : accélère le héros
    texte: "Haste for as many turns as your current Forge Heat.",
    effets: [{ type: "celerite-chaleur" }],
  },

  // Flaming Kick : déplace TOUTE la brûlure d'un ennemi vers celui situé derrière
  // lui (repositionne le feu pour le concentrer, avant un détonateur par ex.).
  "coup-de-pied-ardent": {
    id: "coup-de-pied-ardent",
    nom: "Flaming Kick",
    cout: 1,
    type: "attaque",
    texte: "Move all Burning from the target to the enemy behind it.",
    effets: [{ type: "transfert-feu" }],
  },

  // ---- Tower Shield (bouclier) : build tank bastion ----------------------------

  // Stacking Shield : double la Pierre actuelle — récompense un build qui capitalise.
  "bouclier-empilant": {
    id: "bouclier-empilant",
    nom: "Stacking Shield",
    cout: 4,
    type: "defense",
    texte: "Double your current Stone.",
    effets: [{ type: "doublerPierre" }],
  },

  // ---- Traveler's Garb (armure) : build mobilité légère -----------------------

  // Light Armor : un peu de Pierre (armure légère, peu chère).
  "armure-legere": {
    id: "armure-legere",
    nom: "Light Armor",
    cout: 1,
    type: "defense",
    texte: "Gain 5 Stone.",
    effets: [{ type: "pierre", valeur: 5 }],
  },

  // Free Movement : élan qui accélère le héros pour les 5 prochains tours.
  "mouvement-degage": {
    id: "mouvement-degage",
    nom: "Free Movement",
    cout: 2,
    type: "buff",
    texte: "Haste for 5 of your turns.",
    effets: [{ type: "celerite", valeur: 5 }],
  },

  // ---- Onyx Guard Plate (armure) : All Should Be Fire -------------------------

  // All Should Be Fire : convertit TOUS les statuts ennemis (positifs et négatifs)
  // en Feu, puis les DOUBLE. Une horde empoisonnée/stun explose en brûlure de masse.
  "tout-en-feu": {
    id: "tout-en-feu",
    nom: "All Should Be Fire",
    cout: 2,
    type: "attaque",
    aoe: true,
    texte: "Convert ALL enemy statuses (positive and negative) to Burning, then double the Burning.",
    effets: [{ type: "tout-en-feu" }],
  },

  // ---- Forgemaster's Mail (armure) : bouclier lourd ---------------------------

  // Heavy Armor : gros bloc de Pierre (build tank solide).
  "armure-lourde": {
    id: "armure-lourde",
    nom: "Heavy Armor",
    cout: 2,
    type: "defense",
    texte: "Gain 20 Stone.",
    effets: [{ type: "pierre", valeur: 20 }],
  },

  // ---- Perfect Frost Ring (bague) : gel en chaîne -----------------------------

  // Frost Cascade : 8 dégâts + 3 Gel. Combo : si la cible était DÉJÀ gelée, le
  // même coup rebondit sur l'ennemi suivant, et ainsi de suite tant que chaque
  // cible touchée était déjà gelée avant (chaîne de gel).
  "gel-cascade": {
    id: "gel-cascade",
    nom: "Frost Cascade",
    cout: 2,
    type: "attaque",
    texte: "Deal 8 damage and apply 3 Chill. If the target was already chilled, cascade the same hit to the next enemy, and so on.",
    effets: [{ type: "gel-cascade", degats: 8, gel: 3 }],
  },

  // ---- Mail Glove (gants) : tempo du build maille -----------------------------

  // Outnumbered : pioche autant de cartes qu'il reste d'ennemis vivants en face.
  "surnombre": {
    id: "surnombre",
    nom: "Outnumbered",
    cout: 2,
    type: "buff",
    texte: "Draw 1 card per living enemy.",
    effets: [{ type: "piocher-par-ennemi" }],
  },

  // Mail Advantage : un peu de Pierre ET un peu de hâte — liant tank/tempo.
  "avantage-maille": {
    id: "avantage-maille",
    nom: "Mail Advantage",
    cout: 1,
    type: "buff",
    texte: "Gain 8 Stone and Haste for 2 turns.",
    effets: [{ type: "pierre", valeur: 8 }, { type: "celerite", valeur: 2 }],
  },

  // ---- Onyx Glove (gants) : recyclage de main ---------------------------------

  // Forge from Ashes : défausse toute la main et REPIOCHE autant de cartes
  // (relance une main bloquée sans la brûler — variante « propre » de Burning Hand).
  "forge-des-cendres": {
    id: "forge-des-cendres",
    nom: "Forge from Ashes",
    cout: 2,
    type: "buff",
    texte: "Discard your hand and draw that many cards.",
    effets: [{ type: "refaire-main" }],
  },

  // ---- Swift Boots (bottes) : conversion vitesse → énergie --------------------

  // Second Wind : échange 5 tours de Hâte contre 3 Chaleur. Sans 5 Hâte, rien.
  "second-souffle": {
    id: "second-souffle",
    nom: "Second Wind",
    cout: 0,
    type: "buff",
    texte: "Trade 5 Haste turns for 3 Forge Heat. No effect below 5 Haste.",
    effets: [{ type: "celerite-vers-energie", cout: 5, gain: 3 }],
  },

  // ---- Onyx Boots (bottes) : conversion feu → énergie + relance ---------------

  // Fire Boost : transforme 4 ticks de Feu du héros en 2 Chaleur. Sans 4 Feu, rien.
  "boost-feu": {
    id: "boost-feu",
    nom: "Fire Boost",
    cout: 1,
    type: "buff",
    texte: "Convert 4 of your own Burning into 2 Forge Heat. No effect below 4 Burning.",
    effets: [{ type: "feu-vers-energie", cout: 4, gain: 2 }],
  },

  // Boost : petite relance d'énergie (surchauffe la forge).
  "boost": {
    id: "boost",
    nom: "Boost",
    cout: 0,
    type: "buff",
    texte: "Gain 3 Forge Heat (energy).",
    effets: [{ type: "chaleur", valeur: 3 }],
  },

  // ---- Set Chevalier Croisé : LUMIÈRE + Confusion (éblouissement) -------------
  // Identité : moins de dégâts bruts que les autres armes, mais beaucoup de
  // CONTRÔLE via la Confusion — l'ennemi ébloui frappe une cible au hasard (héros,
  // un autre ennemi, ou lui-même). Combo redoutable à plusieurs ennemis.

  // Crusader Plate (torse) ----------------------------------------------------
  // Radiant Strike : coup de lumière qui éblouit (dégâts + Confusion).
  "frappe-radiante": {
    id: "frappe-radiante",
    nom: "Radiant Strike",
    cout: 2,
    type: "attaque",
    texte: "Deal 14 damage. Apply 2 Confusion.",
    effets: [{ type: "degats", valeur: 14 }, { type: "confusion", valeur: 2 }],
  },
  // Sacred Ground : mur de Pierre béni (le pan défensif du croisé).
  "terre-sacree": {
    id: "terre-sacree",
    nom: "Sacred Ground",
    cout: 2,
    type: "defense",
    texte: "Gain 18 Stone.",
    effets: [{ type: "pierre", valeur: 18 }],
  },
  // Blinding Flash : éclair aveuglant → Confusion sur TOUS les ennemis (AOE pur contrôle).
  "eclair-aveuglant": {
    id: "eclair-aveuglant",
    nom: "Blinding Flash",
    cout: 3,
    type: "attaque",
    aoe: true,
    texte: "Apply 2 Confusion to ALL enemies.",
    effets: [{ type: "confusion", valeur: 2 }],
  },

  // Crusader Gauntlets (gants) -------------------------------------------------
  // Lumen Jab : petit coup de lumière qui éblouit un peu (entrée de gamme).
  "coup-de-lumiere": {
    id: "coup-de-lumiere",
    nom: "Lumen Jab",
    cout: 1,
    type: "attaque",
    texte: "Deal 8 damage. Apply 1 Confusion.",
    effets: [{ type: "degats", valeur: 8 }, { type: "confusion", valeur: 1 }],
  },
  // Halo Burst : éclat de halo → dégâts de lumière légers sur TOUS les ennemis.
  "eclat-de-halo": {
    id: "eclat-de-halo",
    nom: "Halo Burst",
    cout: 2,
    type: "attaque",
    aoe: true,
    texte: "Deal 6 damage to ALL enemies.",
    effets: [{ type: "degats", valeur: 6 }],
  },

  // Crusader Greaves (bottes) --------------------------------------------------
  // Crusader's Charge : élan du croisé → hâte (mobilité de la lignée lumière).
  "charge-du-croise": {
    id: "charge-du-croise",
    nom: "Crusader's Charge",
    cout: 1,
    type: "buff",
    texte: "Haste: +30% attack speed for 3 turns.",
    effets: [{ type: "celerite", valeur: 3 }],
  },
  // Dazzling Kick : coup éblouissant → dégâts + grosse Confusion (la finisseuse).
  "coup-eblouissant": {
    id: "coup-eblouissant",
    nom: "Dazzling Kick",
    cout: 2,
    type: "attaque",
    texte: "Deal 10 damage. Apply 3 Confusion.",
    effets: [{ type: "degats", valeur: 10 }, { type: "confusion", valeur: 3 }],
  },

  // ---- Set de Sang : moteur SAIGNEMENT (empiler → propager → encaisser → éclater)
  // Combo inter-pièces : on empile le saignement (Plate/Gauntlets), on le COPIE sur
  // les voisins (Contagion), on en tire de la Pierre/énergie (Sanguine Guard / Blood
  // Rush), puis on le fait ÉCLATER (Hemorrhage). Le bonus de set soigne le héros à
  // chaque combo de saignement (vampirisme — l'« item spécifique » du concept).

  // Blood Plate (torse) -------------------------------------------------------
  // Crimson Carve : entaille profonde → dégâts + saignement (l'empileur principal).
  "carve-cramoisi": {
    id: "carve-cramoisi",
    nom: "Crimson Carve",
    cout: 2,
    type: "attaque",
    texte: "Deal 9 damage. Apply 3 Bleed.",
    effets: [{ type: "degats", valeur: 9 }, { type: "sang", valeur: 3 }],
  },
  // Sanguine Guard : armure de sang → Pierre selon le saignement TOTAL sur le champ.
  "garde-sanguine": {
    id: "garde-sanguine",
    nom: "Sanguine Guard",
    cout: 2,
    type: "defense",
    texte: "Gain 1 Stone per Bleed among ALL enemies.",
    effets: [{ type: "pierre-par-sang", valeur: 1 }],
  },
  // Bloodbath : saignement de masse → 4 saignement sur TOUS les ennemis (mise en place).
  "bain-de-sang": {
    id: "bain-de-sang",
    nom: "Bloodbath",
    cout: 3,
    type: "attaque",
    aoe: true,
    texte: "Apply 4 Bleed to ALL enemies.",
    effets: [{ type: "sang", valeur: 4 }],
  },

  // Blood Gauntlets (gants) ---------------------------------------------------
  // Open Veins : petite entaille très saignante (empileur pas cher).
  "ouvrir-les-veines": {
    id: "ouvrir-les-veines",
    nom: "Open Veins",
    cout: 1,
    type: "attaque",
    texte: "Deal 3 damage. Apply 4 Bleed.",
    effets: [{ type: "degats", valeur: 3 }, { type: "sang", valeur: 4 }],
  },
  // Contagion : la plaie de la cible CONTAMINE ses deux voisins (copie son saignement).
  "contagion": {
    id: "contagion",
    nom: "Contagion",
    cout: 2,
    type: "attaque",
    texte: "Deal 5 damage. Both adjacent enemies gain Bleed equal to the target's Bleed.",
    effets: [{ type: "degats", valeur: 5 }, { type: "contagion" }],
  },

  // Blood Greaves (bottes) ----------------------------------------------------
  // Hemorrhage : ouvre toutes les plaies d'un coup → consomme TOUT le saignement de
  // la cible et le convertit en dégâts (×2). Le détonateur/finisher du build.
  "hemorragie": {
    id: "hemorragie",
    nom: "Hemorrhage",
    cout: 2,
    type: "attaque",
    texte: "Consume all the target's Bleed: deal 2 damage per Bleed consumed.",
    effets: [{ type: "hemorragie", valeur: 2 }],
  },
  // Blood Rush : l'ivresse du sang → énergie selon le saignement TOTAL (1 par 5 points).
  "ruee-de-sang": {
    id: "ruee-de-sang",
    nom: "Blood Rush",
    cout: 1,
    type: "buff",
    texte: "Gain 1 Forge Heat per 5 Bleed among ALL enemies.",
    effets: [{ type: "chaleur-par-sang", par: 5 }],
  },
};
