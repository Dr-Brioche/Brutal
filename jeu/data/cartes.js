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
//   portee : (optionnel) "range" = sort ou attaque à distance (la Force ne
//            s'applique pas). Absent = "melee" par défaut.
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
//            - "celerite": ajoute `valeur` ticks de HÂTE au héros. Chaque tick = +5%
//                         de vitesse ; les ticks s'écoulent de 1 par tour du héros.
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

  // ---- Cartes de SUPPLÉANCE d'armure : un slot d'armure VIDE pollue le deck -
  // Même logique que Tap/Brace pour les mains : tant qu'on ne porte rien sur le
  // torse / les gants / les bottes, ces cartes FAIBLES s'ajoutent au deck. Elles
  // poussent à remplir CHAQUE emplacement (et donc à combiner l'équipement) au
  // lieu de jouer un deck minuscule autour d'une seule arme.
  "expose": {
    id: "expose",
    nom: "Exposed",
    cout: 0,
    type: "defense",
    texte: "Gain 2 Stone.",
    effets: [{ type: "pierre", valeur: 2 }],
  },
  "mains-nues": {
    id: "mains-nues",
    nom: "Bare Hands",
    cout: 0,
    type: "buff",
    texte: "Discard 1 card, then draw 1.",
    effets: [{ type: "defausser-piocher", valeur: 1 }],
  },
  "pieds-nus": {
    id: "pieds-nus",
    nom: "Bare Foot",
    cout: 1,
    type: "buff",
    texte: "Gain 2 Haste.",
    effets: [{ type: "celerite", valeur: 2 }],
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
    texte: "Deal 6 damage. Apply 4 Poison.",
    effets: [{ type: "degats", valeur: 6 }, { type: "poison", valeur: 4 }],
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

  // Croc de basilic — Explosion Of Poison : DÉTONE le poison de la cible SANS le
  // consommer. Dégâts = doses de poison sur la cible, infligés à la cible ET à ses
  // voisins directs, puis +2 poison à tous. Carte répétable (le poison reste).
  "explosion-poison": {
    id: "explosion-poison",
    nom: "Explosion Of Poison",
    cout: 2,
    type: "attaque",
    portee: "range",
    texte: "Deal damage equal to the target's Poison to it and each adjacent enemy, then apply 2 Poison to them all (Poison is not consumed).",
    effets: [{ type: "explosion-poison", poison: 2 }],
  },

  // Croc de basilic — Weakness Exploitation : gros coup unique, DOUBLÉ si la cible
  // porte déjà un malus (poison, feu, saignement, étourdissement, gel).
  // (Remplace l'ancienne carte « Wound Opening » : même mécanique, 16 dégâts.)
  "exploitation-faiblesses": {
    id: "exploitation-faiblesses",
    nom: "Weakness Exploitation",
    cout: 2,
    type: "attaque",
    texte: "Deal 16 damage. Doubled if the target has a negative status.",
    effets: [{ type: "degats-execution", valeur: 16 }],
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
    portee: "range",
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
    texte: "Deal 8 damage. Stun the enemy for 3 turns.",
    effets: [{ type: "degats", valeur: 8 }, { type: "stun", valeur: 3 }],
  },

  // Bottes vives : HÂTE le héros (+30% d'agilité) pendant quelques tours.
  "celerite-vive": {
    id: "celerite-vive",
    nom: "Quicken",
    cout: 1,
    type: "buff", // ni dégât ni bouclier : accélère le héros
    texte: "Gain 4 Haste.",
    effets: [{ type: "celerite", valeur: 4 }],
  },
  // Anneau de givre : GÈLE l'ennemi visé (−30% de vitesse) pendant quelques tours.
  "givre-lent": {
    id: "givre-lent",
    nom: "Frostbite",
    cout: 1,
    type: "attaque",
    portee: "range",
    texte: "Deal 5 damage. Apply 3 Chill.",
    effets: [{ type: "degats", valeur: 5 }, { type: "lenteur", valeur: 3 }],
  },

  // Collier de saphir : régénère de l'énergie (Chaleur). Sans cible, joué sur soi.
  // Attention : pousser au-dessus du seuil fait surchauffer au tour suivant.
  "surge-saphir": {
    id: "surge-saphir",
    nom: "Sapphire Surge",
    cout: 0,
    type: "buff", // ni dégât ni bouclier : régénère juste de l'énergie
    texte: "Gain 2 Forge Heat.",
    effets: [{ type: "chaleur", valeur: 2 }],
  },
  // Saphir parfait : version supérieure de Surge (+3 Chaleur au lieu de +2),
  // pour le haut de gamme de la lignée de colliers.
  "surge-saphir-parfait": {
    id: "surge-saphir-parfait",
    nom: "Perfect Sapphire Surge",
    cout: 0,
    type: "buff",
    texte: "Gain 3 Forge Heat.",
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
    portee: "range",
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
    texte: "Deal 12 damage. Stun the target for 1 turn.",
    effets: [{ type: "degats", valeur: 12 }, { type: "stun", valeur: 1 }],
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
    cout: 3,
    type: "attaque",
    texte: "Deal 30 damage. If the target dies, deal 15 damage to the next enemy.",
    effets: [{ type: "degats", valeur: 30 }, { type: "rebond", valeur: 15 }],
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
    portee: "range",
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
    portee: "range",
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
    portee: "range",
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
    portee: "range",
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
    texte: "Gain 5 Forge Heat.",
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
    portee: "range",
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
    portee: "range",
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
    texte: "Gain 6 Stone.",
    effets: [{ type: "pierre", valeur: 6 }],
  },

  // Free Movement : élan qui accélère le héros pour les 5 prochains tours.
  "mouvement-degage": {
    id: "mouvement-degage",
    nom: "Free Movement",
    cout: 2,
    type: "buff",
    texte: "Gain 4 Haste.",
    effets: [{ type: "celerite", valeur: 4 }],
  },

  // ---- Onyx Guard Plate (armure) : All Should Be Fire -------------------------

  // All Should Be Fire : convertit TOUS les statuts ennemis (positifs et négatifs)
  // en Feu, puis les DOUBLE. Une horde empoisonnée/stun explose en brûlure de masse.
  "tout-en-feu": {
    id: "tout-en-feu",
    nom: "All Should Be Fire",
    cout: 2,
    type: "attaque",
    portee: "range",
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
    texte: "Gain 22 Stone.",
    effets: [{ type: "pierre", valeur: 22 }],
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
    portee: "range",
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
    texte: "Gain 8 Stone and 2 Haste.",
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
    nom: "Second breath",
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
    texte: "Gain 3 Forge Heat.",
    effets: [{ type: "chaleur", valeur: 3 }],
  },

  // ---- Set Chevalier Croisé : LUMIÈRE — Confusion + soutien ------------------
  // Identité : contrôle par Confusion (éblouissement → l'ennemi frappe au hasard)
  // ET soutien lumineux (soin, purification, Pierre). Peu de dégâts bruts, beaucoup
  // d'utilité. Combo : éblouir en masse, puis amplifier la Confusion (Halo Burst).

  // Radiant Strike : coup de lumière qui éblouit (dégâts + Confusion). Carte libre
  // (plus donnée par une pièce du set pour l'instant, gardée pour un futur item).
  "frappe-radiante": {
    id: "frappe-radiante",
    nom: "Radiant Strike",
    cout: 2,
    type: "attaque",
    texte: "Deal 14 damage. Apply 2 Confusion.",
    effets: [{ type: "degats", valeur: 14 }, { type: "confusion", valeur: 2 }],
  },

  // Crusader Plate (torse) ----------------------------------------------------
  // Armor of light : Pierre + éblouit l'ennemi le plus proche (2 Confusion).
  "armure-de-lumiere": {
    id: "armure-de-lumiere",
    nom: "Armor of light",
    cout: 1,
    type: "defense",
    texte: "Gain 6 Stone. Dazzle the nearest enemy (2 Confusion).",
    effets: [{ type: "pierre", valeur: 6 }, { type: "confusion-proche", valeur: 2 }],
  },
  // Blinding Flash : éclair aveuglant → Confusion sur TOUS les ennemis (AOE).
  "eclair-aveuglant": {
    id: "eclair-aveuglant",
    nom: "Blinding Flash",
    cout: 5,
    type: "attaque",
    portee: "range",
    aoe: true,
    texte: "Apply 2 Confusion to ALL enemies.",
    effets: [{ type: "confusion", valeur: 2 }],
  },
  // Holy light : soin pur (le pan « soutien » du croisé).
  "lumiere-sacree": {
    id: "lumiere-sacree",
    nom: "Holy light",
    cout: 2,
    type: "defense",
    texte: "Heal 30 HP.",
    effets: [{ type: "soin-heros", valeur: 30 }],
  },

  // Crusader Gauntlets (gants) -------------------------------------------------
  // Halo Burst : amplifie la Confusion → +1 Confusion à chaque ennemi DÉJÀ confus.
  "eclat-de-halo": {
    id: "eclat-de-halo",
    nom: "Halo Burst",
    cout: 1,
    type: "attaque",
    portee: "range",
    aoe: true,
    texte: "Apply 1 more Confusion to each already-confused enemy.",
    effets: [{ type: "confusion-si-confus", valeur: 1 }],
  },
  // Lay on Hands : retire un bonus de l'ennemi ciblé ; si réussi, +4 Regen au héros.
  "imposition-des-mains": {
    id: "imposition-des-mains",
    nom: "Lay on Hands",
    cout: 1,
    type: "buff",
    texte: "Remove a random buff from the target. If one was removed, gain 4 Regen.",
    effets: [{ type: "supprimer-bonus", regen: 4 }],
  },

  // Crusader Greaves (bottes) --------------------------------------------------
  // Kick of light : coup de lumière qui éblouit un peu.
  "coup-de-lumiere": {
    id: "coup-de-lumiere",
    nom: "Kick of light",
    cout: 1,
    type: "attaque",
    texte: "Deal 10 damage. Apply 1 Confusion.",
    effets: [{ type: "degats", valeur: 10 }, { type: "confusion", valeur: 1 }],
  },

  // ---- Set de Sang : SACRIFICE → SAIGNEMENT → vampirisme ---------------------
  // On paie en sang (PV ou Pierre) pour empiler du saignement de masse, on le
  // propage/égalise (Contagion), puis on le convertit en soin/Pierre/énergie
  // (Sanguine Guard, Absorption, Blood Rush) ou en contrôle (Blood Slide). Très
  // gros sustain. Le bonus de set soigne en plus à chaque combo de saignement.

  // Blood Plate (torse) -------------------------------------------------------
  // Sanguine Guard : Pierre ET soin proportionnels au saignement TOTAL sur le champ.
  "garde-sanguine": {
    id: "garde-sanguine",
    nom: "Sanguine Guard",
    cout: 1,
    type: "defense",
    texte: "Per Bleed among ALL enemies: gain 3 Stone and heal 2 HP.",
    effets: [{ type: "pierre-par-sang", valeur: 3 }, { type: "soin-par-sang", valeur: 2 }],
  },
  // Bloodbath : le héros perd 10 PV (directs, la Pierre ne protège pas), puis 5 saignement à TOUS.
  "bain-de-sang": {
    id: "bain-de-sang",
    nom: "Bloodbath",
    cout: 3,
    type: "attaque",
    portee: "range",
    aoe: true,
    texte: "Take 10 damage. Apply 5 Bleed to ALL enemies.",
    effets: [{ type: "auto-degats", valeur: 10 }, { type: "sang", valeur: 5 }],
  },
  // Drink blood : sacrifice 20 PV → 10 dégâts + 1 saignement à TOUS ; chaque ennemi
  // TUÉ par ce coup rend 20 PV au héros (cumulable s'il en tue plusieurs).
  "boire-le-sang": {
    id: "boire-le-sang",
    nom: "Drink blood",
    cout: 2,
    type: "attaque",
    aoe: true,
    texte: "Lose 20 HP. Deal 10 damage and 1 Bleed to ALL enemies. Heal 20 HP per enemy killed by this.",
    effets: [{ type: "boire-le-sang", hp: 20, degats: 10, sang: 1, soinMort: 20 }],
  },

  // Blood Gauntlets (gants) ---------------------------------------------------
  // Open Veins : le héros perd 10 PV (directs, la Pierre ne protège pas), applique 4 saignement.
  "ouvrir-les-veines": {
    id: "ouvrir-les-veines",
    nom: "Open Veins",
    cout: 1,
    type: "attaque",
    portee: "range",
    texte: "Take 10 damage. Apply 4 Bleed.",
    effets: [{ type: "auto-degats", valeur: 10 }, { type: "sang", valeur: 4 }],
  },
  // Contagion : les voisins de la cible ÉGALISENT leur saignement sur celui de la cible.
  "contagion": {
    id: "contagion",
    nom: "Contagion",
    cout: 2,
    type: "attaque",
    portee: "range",
    texte: "Both adjacent enemies match the target's Bleed.",
    effets: [{ type: "contagion" }],
  },
  // Blood Absorption : soigne 5 PV par saignement TOTAL, puis efface TOUT le saignement ennemi.
  "absorption-de-sang": {
    id: "absorption-de-sang",
    nom: "Blood Absorption",
    cout: 2,
    type: "buff",
    texte: "Heal 5 HP per Bleed among ALL enemies, then remove all their Bleed.",
    effets: [{ type: "absorption-sang", valeur: 5 }],
  },

  // Blood Greaves (bottes) ----------------------------------------------------
  // Blood Slide : étourdit 2 tours TOUS les ennemis qui portent du saignement.
  "glissade-sur-sang": {
    id: "glissade-sur-sang",
    nom: "Blood Slide",
    cout: 2,
    type: "attaque",
    portee: "range",
    aoe: true,
    texte: "Stun for 2 turns every enemy that has Bleed.",
    effets: [{ type: "stun-si-sang", valeur: 2 }],
  },
  // Blood Rush : l'ivresse du sang → énergie selon le saignement TOTAL (1 par 5 points).
  "ruee-de-sang": {
    id: "ruee-de-sang",
    nom: "Blood Rush",
    cout: 0,
    type: "buff",
    texte: "Gain 1 Forge Heat per 5 Bleed among ALL enemies.",
    effets: [{ type: "chaleur-par-sang", par: 5 }],
  },

  // ============================================================================
  // CARTES GÉNÉRIQUES (commons / uncommons) — `nouveau: true` = surligné dans l'Excel.
  // Beaucoup sont PARTAGÉES par plusieurs items (cartes « de base » d'un archétype) ;
  // les signatures, plus rares, donnent son identité à un item uncommon.
  // ============================================================================

  // ---- Cartes de base PARTAGÉES (réutilisées par de nombreux items) ----------
  // Slash : un cran au-dessus de Strike (l'attaque martiale de référence).
  "taillade": { id: "taillade", nom: "Slash", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 8 damage.", effets: [{ type: "degats", valeur: 8 }] },
  // Heavy Blow : gros coup unique, un peu plus cher.
  "coup-lourd": { id: "coup-lourd", nom: "Heavy Blow", cout: 2, type: "attaque", nouveau: true,
    texte: "Deal 12 damage.", effets: [{ type: "degats", valeur: 12 }] },
  // Double Strike : deux petits coups (synergie avec la Force : +Force À CHAQUE coup).
  "double-frappe": { id: "double-frappe", nom: "Double Strike", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 4 damage twice.", effets: [{ type: "degats", valeur: 4 }, { type: "degats", valeur: 4 }] },
  // Gash : entaille saignante de base (alimente le build saignement).
  "entaille": { id: "entaille", nom: "Gash", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 5 damage. Apply 2 Bleed.", effets: [{ type: "degats", valeur: 5 }, { type: "sang", valeur: 2 }] },
  // Poison Dart : pique empoisonnée de base (alimente le build poison).
  "dard-empoisonne": { id: "dard-empoisonne", nom: "Poison Dart", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 3 damage. Apply 4 Poison.", effets: [{ type: "degats", valeur: 3 }, { type: "poison", valeur: 4 }] },
  // Ice Shard : éclat de glace de base (ralentit — alimente le build gel).
  "eclat-de-glace": { id: "eclat-de-glace", nom: "Ice Shard", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 5 damage. Apply 2 Chill.", effets: [{ type: "degats", valeur: 5 }, { type: "lenteur", valeur: 2 }] },
  // Ember : braise de base (pose un peu de feu — alimente le build feu/Onyx).
  "braise": { id: "braise", nom: "Ember", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 4 damage. Apply 2 Burning.", effets: [{ type: "degats", valeur: 4 }, { type: "feu", valeur: 2 }] },
  // Iron Wall : bloc de Pierre de base, plus solide que Guard.
  "mur-de-fer": { id: "mur-de-fer", nom: "Iron Wall", cout: 1, type: "defense", nouveau: true,
    texte: "Gain 8 Stone.", effets: [{ type: "pierre", valeur: 8 }] },
  // Spark : petite relance d'énergie de base.
  "etincelle": { id: "etincelle", nom: "Spark", cout: 0, type: "buff", nouveau: true,
    texte: "Gain 1 Forge Heat.", effets: [{ type: "chaleur", valeur: 1 }] },
  // Nimble Hands : pioche 1 carte (tempo de base, gratuite).
  "mains-vives": { id: "mains-vives", nom: "Nimble Hands", cout: 0, type: "buff", nouveau: true,
    texte: "Draw 1 card. Gain Stone equal to twice its cost.", effets: [{ type: "piocher-pierre", valeur: 1, mult: 2 }] },
  // Flex : gagne 2 Force temporaire (+N aux dégâts de chaque coup, décroît de 1 par tour du héros).
  "flexion": { id: "flexion", nom: "Flex", cout: 1, type: "buff", nouveau: true,
    texte: "Gain 2 Strength.", effets: [{ type: "force", valeur: 2 }] },
  // Stone Fist : inflige des dégâts égaux à ta Pierre actuelle (sans la consommer).
  "choc-de-pierre": { id: "choc-de-pierre", nom: "Stone Fist", cout: 3, type: "attaque", nouveau: true,
    texte: "Deal damage equal to your current Stone.", effets: [{ type: "pierre-vers-degats", valeur: 1 }] },
  // Regenerate : gagne 3 Régénération (soigne 3 PV au début de chacun de tes tours).
  "regeneration": { id: "regeneration", nom: "Regenerate", cout: 1, type: "buff", nouveau: true,
    texte: "Gain 3 Regen.", effets: [{ type: "regen", valeur: 3 }] },

  // ---- Signatures d'ARMES uncommon -------------------------------------------
  // Venom Spit : grosse dose de poison (Venomfang Dagger).
  "crachat-venimeux": { id: "crachat-venimeux", nom: "Venom Spit", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 5 damage. Apply 5 Poison.", effets: [{ type: "degats", valeur: 5 }, { type: "poison", valeur: 5 }] },
  // Shatter : dégâts DOUBLÉS de bonus si la cible est gelée (Frostbrand).
  "brise-glace": { id: "brise-glace", nom: "Shatter", cout: 2, type: "attaque", nouveau: true,
    texte: "Deal 8 damage, +5 more if the target is Chilled.", effets: [{ type: "degats-si-gel", valeur: 8, bonus: 5 }] },
  // Flame Slash : coup enflammé (Emberblade) — alimente le combo brûlure.
  "entaille-ardente": { id: "entaille-ardente", nom: "Flame Slash", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 6 damage. Apply 3 Burning.", effets: [{ type: "degats", valeur: 6 }, { type: "feu", valeur: 3 }] },
  // Rend : entaille saignante plus profonde (Reaver Axe).
  "dechirure": { id: "dechirure", nom: "Rend", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 6 damage. Apply 4 Bleed.", effets: [{ type: "degats", valeur: 6 }, { type: "sang", valeur: 4 }] },
  // Reckless Swing : très gros coup, mais le héros se blesse (Berserker Axe).
  "coup-imprudent": { id: "coup-imprudent", nom: "Reckless Swing", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 14 damage. Lose 4 HP.", effets: [{ type: "degats", valeur: 14 }, { type: "auto-degats", valeur: 4 }] },
  // Power Strike : frappe qui renforce (dégâts + Force) — pilier du build Force.
  "coup-de-force": { id: "coup-de-force", nom: "Power Strike", cout: 2, type: "attaque", nouveau: true,
    texte: "Deal 14 damage. Gain 3 Strength.", effets: [{ type: "degats", valeur: 14 }, { type: "force", valeur: 3 }] },
  // Earthshatter : Stone Fist qui rend aussi un peu de Pierre (Warhammer).
  "seisme": { id: "seisme", nom: "Earthshatter", cout: 3, type: "attaque", nouveau: true,
    texte: "Deal damage equal to your Stone, then gain 8 Stone.", effets: [{ type: "pierre-vers-degats", valeur: 1 }, { type: "pierre", valeur: 8 }] },
  // Flurry : trois coups rapides (Twin Daggers) — multi-hit, énorme avec la Force.
  "volee": { id: "volee", nom: "Flurry", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 3 damage three times.", effets: [{ type: "degats", valeur: 3 }, { type: "degats", valeur: 3 }, { type: "degats", valeur: 3 }] },
  // Execute : achève une cible sous 50% de PV (dégâts doublés) — Executioner's Blade.
  "execution": { id: "execution", nom: "Execute", cout: 2, type: "attaque", nouveau: true,
    texte: "Deal 10 damage. Doubled if the target is below 50% HP.", effets: [{ type: "degats-si-faible", valeur: 10, seuil: 0.5 }] },
  // Whirl : moulinet AOE qui saigne (Spiked Flail).
  "tourbillon": { id: "tourbillon", nom: "Whirl", cout: 2, type: "attaque", aoe: true, nouveau: true,
    texte: "Deal 6 damage and apply 2 Bleed to ALL enemies.", effets: [{ type: "degats", valeur: 6 }, { type: "sang", valeur: 2 }] },
  // Arcane Bolt : éclair qui rend un peu d'énergie (Crystal Wand).
  "eclair-arcanique": { id: "eclair-arcanique", nom: "Arcane Bolt", cout: 1, type: "attaque", portee: "range", nouveau: true,
    texte: "Deal 6 damage. Gain 2 Forge Heat.", effets: [{ type: "degats", valeur: 6 }, { type: "chaleur", valeur: 2 }] },

  // ---- Signatures d'ARMURE / BOTTES / GANTS uncommon -------------------------
  // Fortify : gros bloc de Pierre (Iron Plate).
  "fortification": { id: "fortification", nom: "Fortify", cout: 2, type: "defense", nouveau: true,
    texte: "Gain 18 Stone.", effets: [{ type: "pierre", valeur: 18 }] },
  // Bloodrage : gagne beaucoup de Force d'un coup (Berserker Hide).
  "rage-sanguine": { id: "rage-sanguine", nom: "Rage", cout: 1, type: "buff", nouveau: true,
    texte: "Gain 4 Strength.", effets: [{ type: "force", valeur: 4 }] },
  // Dash : hâte + pioche (Swift Striders).
  "ruee": { id: "ruee", nom: "Dash", cout: 1, type: "buff", nouveau: true,
    texte: "Gain 3 Haste. Draw 1 card.", effets: [{ type: "celerite", valeur: 3 }, { type: "piocher", valeur: 1 }] },
  // Sleight : grosse pioche + un peu d'énergie (Thief's Gloves) — moteur « cycle ».
  "tour-de-main": { id: "tour-de-main", nom: "Sleight", cout: 1, type: "buff", nouveau: true,
    texte: "Draw 2 cards. Gain 1 Forge Heat.", effets: [{ type: "piocher", valeur: 2 }, { type: "chaleur", valeur: 1 }] },
  // Poison Coat : empoisonne TOUS les ennemis (Venom Gloves) — AOE poison.
  "enduit-toxique": { id: "enduit-toxique", nom: "Poison Coat", cout: 1, type: "attaque", portee: "range", aoe: true, nouveau: true,
    texte: "Apply 2 Poison to ALL enemies.", effets: [{ type: "poison", valeur: 2 }] },

  // ---- Signatures de BAGUES / COLLIERS uncommon ------------------------------
  // Venom Nova : poison de masse (Toxic Ring).
  "nuee-toxique": { id: "nuee-toxique", nom: "Venom Nova", cout: 2, type: "attaque", portee: "range", aoe: true, nouveau: true,
    texte: "Apply 6 Poison to ALL enemies.", effets: [{ type: "poison", valeur: 6 }] },
  // Empower : gros gain de Force (Ring of Might).
  "galvanisation": { id: "galvanisation", nom: "Empower", cout: 1, type: "buff", nouveau: true,
    texte: "Gain 3 Strength.", effets: [{ type: "force", valeur: 3 }] },
  // Frost Nova : gel de masse (Frost Signet).
  "nova-de-givre": { id: "nova-de-givre", nom: "Frost Nova", cout: 2, type: "attaque", portee: "range", aoe: true, nouveau: true,
    texte: "Apply 3 Chill to ALL enemies.", effets: [{ type: "lenteur", valeur: 3 }] },
  // Bloodthirst : saignement qui soigne le héros (Bloodthirst Ring).
  "soif-de-sang": { id: "soif-de-sang", nom: "Bloodthirst", cout: 1, type: "attaque", portee: "range", nouveau: true,
    texte: "Deal 5 damage, apply 3 Bleed, and heal 3 HP.", effets: [{ type: "degats", valeur: 5 }, { type: "sang", valeur: 3 }, { type: "soin-heros", valeur: 3 }] },
  // Overclock : grosse relance d'énergie (Forge Ring).
  "surcharge": { id: "surcharge", nom: "Overclock", cout: 1, type: "buff", nouveau: true,
    texte: "Gain 4 Forge Heat.", effets: [{ type: "chaleur", valeur: 4 }] },
  // Focus : pioche + énergie (Amulet of Focus).
  "concentration": { id: "concentration", nom: "Focus", cout: 1, type: "buff", nouveau: true,
    texte: "Draw 1 card. Gain 2 Forge Heat.", effets: [{ type: "piocher", valeur: 1 }, { type: "chaleur", valeur: 2 }] },
  // Drain : vol de vie (Vampiric Pendant).
  "drain": { id: "drain", nom: "Drain", cout: 1, type: "attaque", nouveau: true,
    texte: "Consume the target's Bleed: heal that many HP. Gain 1 Forge Heat.", effets: [{ type: "drain-sang", energie: 1 }] },

  // ---- Signatures de MAIN SECONDE (off-hand : boucliers, grimoires, sceptres) -
  // Fireball : sort de zone enflammé (Grimoire of Flames).
  "boule-de-feu": { id: "boule-de-feu", nom: "Fireball", cout: 2, type: "attaque", portee: "range", aoe: true, nouveau: true,
    texte: "Deal 5 damage and apply 3 Burning to ALL enemies.", effets: [{ type: "degats", valeur: 5 }, { type: "feu", valeur: 3 }] },
  // Rally : commandement qui renforce et fait piocher (Scepter of Command).
  "ralliement": { id: "ralliement", nom: "Rally", cout: 1, type: "buff", nouveau: true,
    texte: "Gain 4 Strength. Draw 2 cards.", effets: [{ type: "force", valeur: 4 }, { type: "piocher", valeur: 2 }] },
  // Aegis : gros bloc défensif + régénération (Warding Shield).
  "egide": { id: "egide", nom: "Aegis", cout: 2, type: "defense", nouveau: true,
    texte: "Gain 12 Stone and 3 Regen.", effets: [{ type: "pierre", valeur: 12 }, { type: "regen", valeur: 3 }] },
  // Arcane Surge : décharge de zone qui rend de l'énergie (Tome of Power).
  "vague-arcanique": { id: "vague-arcanique", nom: "Arcane Surge", cout: 2, type: "attaque", portee: "range", aoe: true, nouveau: true,
    texte: "Deal 4 damage to ALL enemies. Gain 2 Forge Heat.", effets: [{ type: "degats", valeur: 4 }, { type: "chaleur", valeur: 2 }] },

  // ============================================================================
  // NOUVELLES CARTES (révision Excel juin) — effets déjà existants
  // ============================================================================

  // Pierce : frappe la cible ET l'ennemi juste derrière (perforation).
  "transpercement": { id: "transpercement", nom: "Pierce", cout: 2, type: "attaque", nouveau: true,
    texte: "Deal 7 damage to the target and the enemy behind it.",
    effets: [{ type: "degats", valeur: 7 }, { type: "eclaboussure", degats: 7 }] },
  // Smash : gros coup unique, simple et lourd.
  "fracas": { id: "fracas", nom: "Smash", cout: 3, type: "attaque", nouveau: true,
    texte: "Deal 20 damage.", effets: [{ type: "degats", valeur: 20 }] },
  // Big Strike : frappe renforcée, un cran au-dessus de Slash.
  "grande-frappe": { id: "grande-frappe", nom: "Big Strike", cout: 1, type: "attaque", nouveau: true,
    texte: "Deal 9 damage.", effets: [{ type: "degats", valeur: 9 }] },
  // Big Smash : Smash plus efficient (même dégâts pour 1 Chaleur de moins).
  "grand-fracas": { id: "grand-fracas", nom: "Big Smash", cout: 2, type: "attaque", nouveau: true,
    texte: "Deal 20 damage.", effets: [{ type: "degats", valeur: 20 }] },
  // Bright Flame : sort qui éblouit la cible (Confusion).
  "flamme-vive": { id: "flamme-vive", nom: "Bright Flame", cout: 2, type: "attaque", portee: "range", nouveau: true,
    texte: "Apply 2 Confusion to the target.", effets: [{ type: "confusion", valeur: 2 }] },
  // Standard Armor : bloc de Pierre standard (un peu plus que Light Armor).
  "armure-standard": { id: "armure-standard", nom: "Standard Armor", cout: 1, type: "defense", nouveau: true,
    texte: "Gain 9 Stone.", effets: [{ type: "pierre", valeur: 9 }] },
  // Acceleration : petit gain de Hâte, gratuit en tempo.
  "acceleration": { id: "acceleration", nom: "Acceleration", cout: 1, type: "buff", nouveau: true,
    texte: "Gain 2 Haste.", effets: [{ type: "celerite", valeur: 2 }] },
  // Glory Strike : frappe sacrée qui dissipe un bonus ennemi ; si réussi, +4 Regen.
  "frappe-de-gloire": { id: "frappe-de-gloire", nom: "Glory Strike", cout: 2, type: "attaque", nouveau: true,
    texte: "Deal 12 damage. Remove a random buff from the target; if one was removed, gain 4 Regen.",
    effets: [{ type: "degats", valeur: 12 }, { type: "supprimer-bonus", regen: 4 }] },

  // ---- Nouvelles cartes (2/2) : nouveaux types d'effets simples ----
  // Fresh Wind : éteint une partie de la brûlure du héros.
  "vent-frais": { id: "vent-frais", nom: "Fresh Wind", cout: 1, type: "buff", nouveau: true,
    texte: "Remove 3 Burning from yourself.", effets: [{ type: "retirer-feu-hero", valeur: 3 }] },
  // Healing Cleave : balayage soignant (dégâts AOE + soin par cible touchée).
  "fauchage-soin": { id: "fauchage-soin", nom: "Healing Cleave", cout: 2, type: "attaque", aoe: true, nouveau: true,
    texte: "Deal 6 damage to ALL enemies. Heal 4 HP per enemy hit.",
    effets: [{ type: "degats-soin-cible", degats: 6, soin: 4 }] },
  // Roll 1 Dice : énergie aléatoire (0 à 3).
  "des-1": { id: "des-1", nom: "Roll 1 Dice", cout: 1, type: "buff", nouveau: true,
    texte: "Gain 0 to 3 Forge Heat at random.", effets: [{ type: "chaleur-aleatoire", min: 0, max: 3 }] },
  // Roll 2 Dice : énergie aléatoire (1 à 5).
  "des-2": { id: "des-2", nom: "Roll 2 Dice", cout: 2, type: "buff", nouveau: true,
    texte: "Gain 1 to 5 Forge Heat at random.", effets: [{ type: "chaleur-aleatoire", min: 1, max: 5 }] },
  // Lucky Draw : pioche 3 cartes, ne garde que les bon marché (coût < 3).
  "pioche-chanceuse": { id: "pioche-chanceuse", nom: "Lucky Draw", cout: 1, type: "buff", nouveau: true,
    texte: "Draw 3 cards. Keep those costing less than 3 Forge Heat, discard the rest.",
    effets: [{ type: "pioche-filtre", valeur: 3, coutMax: 3 }] },
  // Gimme That (donne moi ça) : vole un bonus de l'ennemi ciblé et se l'applique.
  "donne-moi-ca": { id: "donne-moi-ca", nom: "Gimme That", cout: 2, type: "buff", nouveau: true,
    texte: "Steal a random buff from the target enemy and apply it to yourself.",
    effets: [{ type: "voler-bonus" }] },

  // ---- Nouvelles cartes (3/3) : nouveaux statuts du héros ----
  // Long Run : Hâte qui se régénère à chaque tour (cumulable en rejouant la carte).
  "longue-course": { id: "longue-course", nom: "Long Run", cout: 3, type: "buff", nouveau: true,
    texte: "Each of your turns: gain 1 Haste.",
    effets: [{ type: "celerite-par-tour", valeur: 1 }] },
  // Rebound : Riposte — renvoie à l'attaquant les dégâts de mêlée qu'il inflige.
  "rebond": { id: "rebond", nom: "Rebound", cout: 2, type: "defense", nouveau: true,
    texte: "Gain 4 Riposte.",
    effets: [{ type: "riposte", valeur: 4 }] },
  // Unstoppable (Innaretable) : prend un tour supplémentaire juste après celui-ci.
  "inarretable": { id: "inarretable", nom: "Unstoppable", cout: 3, type: "buff", nouveau: true,
    texte: "Take an extra turn right after this one.",
    effets: [{ type: "tour-bonus", valeur: 1 }] },

  // ---- Set STONE AGE : empiler des cartes « pierre », puis encaisser le combo ----
  // Stone et Many Stone donnent de la Pierre ET comptent (1 et 3) dans cartesPierre.
  // Coagulation / Pebble Sale / Melt Stones lisent ce compteur pour récompenser
  // d'avoir joué beaucoup de cartes pierre dans le combat.
  "caillou": { id: "caillou", nom: "Stone", cout: 1, type: "defense", nouveau: true,
    texte: "Gain 7 Stone.",
    effets: [{ type: "pierre", valeur: 7 }, { type: "compteur-pierre", valeur: 1 }] },
  "tas-de-pierres": { id: "tas-de-pierres", nom: "Many Stone", cout: 3, type: "defense", nouveau: true,
    texte: "Gain 23 Stone. Counts as three Stone cards for Stone Age combos.",
    effets: [{ type: "pierre", valeur: 23 }, { type: "compteur-pierre", valeur: 3 }] },
  "coagulation-pierre": { id: "coagulation-pierre", nom: "Stone Coagulation", cout: 2, type: "defense", nouveau: true,
    texte: "Gain 1 Stone for each Stone card played this combat (Many Stone counts as 3).",
    effets: [{ type: "pierre-par-compteur", valeur: 1 }] },
  "vente-de-cailloux": { id: "vente-de-cailloux", nom: "Pebble Sale", cout: 2, type: "buff", nouveau: true,
    texte: "Draw 1 card per 6 Stone cards played this combat (min 1, max 6).",
    effets: [{ type: "piocher-par-compteur", div: 6, min: 1, max: 6 }] },
  "fonte-de-pierres": { id: "fonte-de-pierres", nom: "Melt Stones", cout: 0, type: "buff", nouveau: true,
    texte: "Gain 1 Forge Heat per 8 Stone cards played this combat (min 1, max 6).",
    effets: [{ type: "chaleur-par-compteur", div: 8, min: 1, max: 6 }] },

  // ============================================================================
  // ARMES À DEUX MAINS (nouvelles) — pas d'off-hand, donc plus de cartes et des
  // valeurs ~1.5× les armes à une main. Chaque arme a son COMBO. `revueArmes2H`
  // marque ces ajouts pour relecture (surlignés dans l'Excel).
  // ============================================================================

  // ---- Claymore (Uncommon) : Force qui monte + multi-coups ----
  // Combo : empiler la Force (Momentum) → Steel Flurry frappe 3× (Force par coup)
  // → Decisive Strike DOUBLE si la Force est haute.
  "taillade-large": { id: "taillade-large", nom: "Wide Slash", cout: 1, type: "attaque", revueArmes2H: true,
    texte: "Deal 14 damage to the target and 6 to each adjacent enemy.",
    effets: [{ type: "degats", valeur: 14 }, { type: "cleave-adjacent", valeur: 6 }] },
  "volee-d-acier": { id: "volee-d-acier", nom: "Steel Flurry", cout: 1, type: "attaque", revueArmes2H: true,
    texte: "Deal 5 damage three times.",
    effets: [{ type: "degats", valeur: 5 }, { type: "degats", valeur: 5 }, { type: "degats", valeur: 5 }] },
  "elan-du-guerrier": { id: "elan-du-guerrier", nom: "Warrior's Momentum", cout: 1, type: "buff", revueArmes2H: true,
    texte: "Gain 3 Strength. Draw 1 card.",
    effets: [{ type: "force", valeur: 3 }, { type: "piocher", valeur: 1 }] },
  "frappe-decisive": { id: "frappe-decisive", nom: "Decisive Strike", cout: 2, type: "attaque", revueArmes2H: true,
    texte: "Deal 18 damage. Doubled if you have 6+ Strength.",
    effets: [{ type: "degats-si-force", valeur: 18, seuil: 6 }] },

  // ---- Halberd (Uncommon) : allonge (transperce) + contrôle (gel) ----
  // Combo : Hooking Strike gèle → Pike Thrust transperce la cible ET celui derrière
  // → Wide Sweep nettoie la rangée. Tank léger avec Bracing Stance.
  "estoc": { id: "estoc", nom: "Pike Thrust", cout: 1, type: "attaque", revueArmes2H: true,
    texte: "Deal 12 damage to the target and the enemy behind it.",
    effets: [{ type: "degats", valeur: 12 }, { type: "eclaboussure", degats: 12 }] },
  "balayage-large": { id: "balayage-large", nom: "Wide Sweep", cout: 2, type: "attaque", aoe: true, revueArmes2H: true,
    texte: "Deal 8 damage to ALL enemies. Apply 2 Bleed to ALL enemies.",
    effets: [{ type: "degats", valeur: 8 }, { type: "sang", valeur: 2 }] },
  "coup-de-croc": { id: "coup-de-croc", nom: "Hooking Strike", cout: 1, type: "attaque", revueArmes2H: true,
    texte: "Deal 10 damage. Apply 2 Chill.",
    effets: [{ type: "degats", valeur: 10 }, { type: "lenteur", valeur: 2 }] },
  "position-de-garde": { id: "position-de-garde", nom: "Bracing Stance", cout: 1, type: "defense", revueArmes2H: true,
    texte: "Gain 12 Stone.",
    effets: [{ type: "pierre", valeur: 12 }] },

  // ---- Siege Maul (Rare) : tank Pierre → la Pierre devient dégâts et contrôle ----
  // Combo : empiler la Pierre (Bulwark, Stonestrike) → Stonestrike frappe = ta Pierre
  // → Tremor étourdit TOUTE la rangée si ta Pierre ≥ 20.
  "rempart": { id: "rempart", nom: "Bulwark", cout: 1, type: "defense", revueArmes2H: true,
    texte: "Gain 12 Stone.",
    effets: [{ type: "pierre", valeur: 12 }] },
  "frappe-sismique": { id: "frappe-sismique", nom: "Seismic Slam", cout: 4, type: "attaque", revueArmes2H: true,
    texte: "Deal 40 damage. Stun the target for 2 turns.",
    effets: [{ type: "degats", valeur: 40 }, { type: "stun", valeur: 2 }] },
  "frappe-de-roche": { id: "frappe-de-roche", nom: "Stonestrike", cout: 3, type: "attaque", revueArmes2H: true,
    texte: "Deal damage equal to your Stone, then gain 10 Stone.",
    effets: [{ type: "pierre-vers-degats", valeur: 1 }, { type: "pierre", valeur: 10 }] },
  "tremblement": { id: "tremblement", nom: "Tremor", cout: 3, type: "attaque", aoe: true, revueArmes2H: true,
    texte: "Deal 10 damage to ALL enemies. If you have 20+ Stone, stun them all for 1 turn.",
    effets: [{ type: "degats", valeur: 10 }, { type: "stun-si-pierre", valeur: 1, seuil: 20 }] },

  // ---- Great Scythe (Epic) : saignement de masse + exécution + récolte d'âmes ----
  // Combo : poser du saignement partout (Reaping Arc, Grim Scythe) → Harvest soigne
  // par ennemi qui saigne → Death Sentence/Soul Reap achèvent → Soul Reap récolte
  // les morts (+Force +soin).
  "faux-sinistre": { id: "faux-sinistre", nom: "Grim Scythe", cout: 1, type: "attaque", revueArmes2H: true,
    texte: "Deal 14 damage. Apply 3 Bleed.",
    effets: [{ type: "degats", valeur: 14 }, { type: "sang", valeur: 3 }] },
  "arc-de-faux": { id: "arc-de-faux", nom: "Reaping Arc", cout: 3, type: "attaque", aoe: true, revueArmes2H: true,
    texte: "Deal 20 damage and apply 3 Bleed to ALL enemies.",
    effets: [{ type: "degats", valeur: 20 }, { type: "sang", valeur: 3 }] },
  "sentence-de-mort": { id: "sentence-de-mort", nom: "Death Sentence", cout: 2, type: "attaque", revueArmes2H: true,
    texte: "Deal 30 damage. Doubled if the target is below 50% HP.",
    effets: [{ type: "degats-si-faible", valeur: 30, seuil: 0.5 }] },
  "moisson": { id: "moisson", nom: "Harvest", cout: 2, type: "buff", revueArmes2H: true,
    texte: "Heal 10 HP per enemy that has Bleed.",
    effets: [{ type: "soin-par-ennemi-saignant", valeur: 10 }] },
  "fauche-d-ames": { id: "fauche-d-ames", nom: "Soul Reap", cout: 3, type: "attaque", revueArmes2H: true,
    texte: "Deal 15 damage. If the target dies, gain 4 Strength and heal 20 HP.",
    effets: [{ type: "degats", valeur: 15 }, { type: "recompense-mort", force: 4, soin: 20 }] },
};
