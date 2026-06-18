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
//            - "sang"   : ajoute `valeur` de Saignement à l'ennemi (comme le poison,
//                         mais le sang absorbé SOIGNE le héros à chaque tick)
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

  // Hache : la plus brutale → un gros coup unique.
  "coup-de-hache": {
    id: "coup-de-hache",
    nom: "Rusty Cleave",
    cout: 2,
    type: "attaque",
    texte: "Deal 12 damage.",
    effets: [{ type: "degats", valeur: 12 }],
  },

  // Marteau de forge : frappe + renforce → dégâts ET un peu de Pierre.
  "ecrasement": {
    id: "ecrasement",
    nom: "Forge Smash",
    cout: 2,
    type: "attaque",
    texte: "Deal 8 damage. Gain 3 Stone.",
    effets: [{ type: "degats", valeur: 8 }, { type: "pierre", valeur: 3 }],
  },

  // Pioche de mineur : deux coups acharnés (thème « creuser »).
  "coup-de-pioche": {
    id: "coup-de-pioche",
    nom: "Pickaxe Jab",
    cout: 1,
    type: "attaque",
    texte: "Deal 3 damage twice.",
    effets: [{ type: "degats", valeur: 3 }, { type: "degats", valeur: 3 }],
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

  // Marteau de lave : un coup lourd + de l'Enflammé (feu dans le temps, prévu
  // pour se propager aux ennemis adjacents quand les combats seront à plusieurs).
  "coup-de-lave": {
    id: "coup-de-lave",
    nom: "Lava Hammer",
    cout: 2,
    type: "attaque",
    texte: "Deal 5 damage. Apply 4 Burning.",
    effets: [{ type: "degats", valeur: 5 }, { type: "feu", valeur: 4 }],
  },

  // Bouclier-tour : 2 cartes de Pierre (blocage) + 1 carte qui étourdit.
  "mur-bouclier": {
    id: "mur-bouclier",
    nom: "Shield Wall",
    cout: 1,
    type: "defense",
    texte: "Gain 5 Stone.",
    effets: [{ type: "pierre", valeur: 5 }],
  },
  "coup-de-bouclier": {
    id: "coup-de-bouclier",
    nom: "Shield Bash",
    cout: 2,
    type: "attaque",
    texte: "Deal 3 damage. Stun the enemy for 2 turns.",
    effets: [{ type: "degats", valeur: 3 }, { type: "stun", valeur: 2 }],
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
    texte: "Deal 2 damage. Chill: -30% speed for 3 turns.",
    effets: [{ type: "degats", valeur: 2 }, { type: "lenteur", valeur: 3 }],
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

  // Bague de sang : saignement qui te SOIGNE à chaque tick (vol de vie lent).
  "coup-de-sang": {
    id: "coup-de-sang",
    nom: "Bloodletting",
    cout: 1,
    type: "attaque",
    texte: "Deal 2 damage. Apply 2 Bleed (heals you each tick).",
    effets: [{ type: "degats", valeur: 2 }, { type: "sang", valeur: 2 }],
  },

  // ---- Battle Axe cards -------------------------------------------------------

  // Coup de pommeau : assomme brièvement (dégâts + stun 1 tour).
  "coup-de-pommeau": {
    id: "coup-de-pommeau",
    nom: "Pommel Strike",
    cout: 1,
    type: "attaque",
    texte: "Deal 4 damage. Stun the target for 1 turn.",
    effets: [{ type: "degats", valeur: 4 }, { type: "stun", valeur: 1 }],
  },

  // Giant Swing : grand arc → frappe TOUS les ennemis (AOE).
  "giant-swing": {
    id: "giant-swing",
    nom: "Giant Swing",
    cout: 3,
    type: "attaque",
    aoe: true,
    texte: "Deal 9 damage to ALL enemies.",
    effets: [{ type: "degats", valeur: 9 }],
  },

  // Couper en deux : coup lourd ; si la cible meurt, les dégâts rebondissent sur l'ennemi suivant.
  "couper-en-deux": {
    id: "couper-en-deux",
    nom: "Cleave",
    cout: 2,
    type: "attaque",
    texte: "Deal 12 damage. If the target dies, deal 12 damage to the next enemy.",
    effets: [{ type: "degats", valeur: 12 }, { type: "rebond", valeur: 12 }],
  },

  // ---- Forgemaster's Mail (armure) : 1re armure qui DONNE des cartes ----------

  // Mail Armor : bloc de Pierre fiable, peu cher (build défensif/tank).
  "mail-armor": {
    id: "mail-armor",
    nom: "Mail Armor",
    cout: 1,
    type: "defense",
    texte: "Gain 5 Stone.",
    effets: [{ type: "pierre", valeur: 5 }],
  },

  // Trempe : vide toute la Chaleur et la fige en Pierre (×4). Gratuite, mais ne
  // vaut que si la forge est chaude → récompense de jouer en surchauffe, et fait
  // retomber la surchauffe d'un coup. Passerelle d'identité naine : Chaleur → Pierre.
  "trempe": {
    id: "trempe",
    nom: "Quench",
    cout: 0,
    type: "defense",
    texte: "Spend all Forge Heat. Gain 4 Stone per Heat spent.",
    effets: [{ type: "trempe", valeur: 4 }],
  },

  // ---- Onyx Guard Plate (armure) : build « brûlure / dragon » -----------------
  // 3× Onyx Armor (gros bloc de Pierre) + 1× Dragon's Blaze (détonateur de feu) +
  // 2× Onyx Breath (pose du feu en masse). Combo : empiler le Feu (Souffle), puis
  // le faire exploser d'un coup (Embrasement) — burst AOE qui récompense la mise en place.

  // Onyx Armor : gros mur de Pierre (build tank lourd).
  "onyx-armor": {
    id: "onyx-armor",
    nom: "Onyx Armor",
    cout: 2,
    type: "defense",
    texte: "Gain 15 Stone.",
    effets: [{ type: "pierre", valeur: 15 }],
  },

  // Onyx Breath : souffle ardent → 8 Feu sur TOUS les ennemis (mise en place du combo).
  "souffle-onyx": {
    id: "souffle-onyx",
    nom: "Onyx Breath",
    cout: 4,
    type: "attaque",
    aoe: true,
    texte: "Apply 8 Burning to ALL enemies.",
    effets: [{ type: "feu", valeur: 8 }],
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

  // Onyx Radiance : pose un peu de Feu sur TOUS les ennemis (amorce du combo brûlure).
  "onyx-radiance": {
    id: "onyx-radiance",
    nom: "Onyx Radiance",
    cout: 1,
    type: "attaque",
    aoe: true,
    texte: "Apply 2 Burning to ALL enemies.",
    effets: [{ type: "feu", valeur: 2 }],
  },

  // Onyx Slash : coup lourd (12 dégâts + 4 Feu) qui ÉCLABOUSSE l'ennemi derrière
  // la cible avec la MOITIÉ (6 dégâts + 2 Feu), qu'il survive ou non.
  "onyx-slash": {
    id: "onyx-slash",
    nom: "Onyx Slash",
    cout: 2,
    type: "attaque",
    texte: "Deal 12 damage and 4 Burning. The enemy behind takes half (6 damage, 2 Burning).",
    effets: [
      { type: "degats", valeur: 12 },
      { type: "feu", valeur: 4 },
      { type: "eclaboussure", degats: 6, feu: 2 },
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
    texte: "Spend all Forge Heat. Apply 3 Burning per Heat spent to ALL enemies.",
    effets: [{ type: "rejet-chaleur", valeur: 3 }],
  },

  // ---- Onyx Glove (gants) : build feu « brûlure dispersée » -------------------

  // Burning Hand : défausse toute la main et envoie 3 Feu par carte défaussée à
  // un ennemi AU HASARD (peut frapper plusieurs fois le même). Gratuite : à jouer
  // en dernier dans le tour pour transformer une main inutile en brûlure.
  "main-brulante": {
    id: "main-brulante",
    nom: "Burning Hand",
    cout: 0,
    type: "attaque",
    texte: "Discard your hand. For each card discarded, apply 3 Burning to a random enemy.",
    effets: [{ type: "defausse-brulante", valeur: 3 }],
  },

  // Onyx Fist : coup mixte défense + feu — 5 Pierre, 2 dégâts et 1 Feu sur la cible.
  "poing-onyx": {
    id: "poing-onyx",
    nom: "Onyx Fist",
    cout: 1,
    type: "attaque",
    texte: "Gain 5 Stone. Deal 2 damage and apply 1 Burning.",
    effets: [{ type: "pierre", valeur: 5 }, { type: "degats", valeur: 2 }, { type: "feu", valeur: 1 }],
  },
};
