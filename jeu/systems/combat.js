// Le moteur de combat : l'état d'une bataille + les règles qui le font évoluer.
//
// Ici, AUCUN affichage : que des nombres et des règles (comme inventaire.js).
// L'écran de combat (jeu/ui/combat.js) lit cet état et le dessine.
//
// Combat à PLUSIEURS ennemis : `combat.ennemis` est une LISTE ; `combat.cible`
// est l'index de l'ennemi visé par les cartes d'attaque. Victoire quand tous
// les ennemis sont morts ; défaite quand le héros tombe.
//
// Grammaire (façon Slay the Spire) : on pioche une main, on joue des cartes en
// dépensant de la Chaleur de Forge ; chaque carte va à la défausse ; « End Turn »
// fait agir les ennemis, puis nouveau tour.
//
// Twist nain VERROUILLÉ : la défense « Pierre » PERSISTE entre les tours.

import { CARTES } from "../data/cartes.js";

// ----- Réglages (équilibrage, valeurs provisoires) -------------------------
const TAILLE_MAIN = 3;        // cartes piochées par tour (de base ; monte avec les talents)
const MAIN_MAX = 8;          // plafond de cartes en main : toute carte piochée au-delà est défaussée d'office
// Cartes de SUPPLÉANCE : un filet de sécurité (toujours quelque chose à jouer)
// tant qu'un SLOT d'équipement est VIDE. Chaque entrée lie l'état d'occupation
// d'un slot (cf. inventaire.js → slotsOccupes) à une carte FAIBLE et son nombre
// d'exemplaires. Les mains (« Tap » / « Brace ») ET l'armure (torse / gants /
// bottes) sont couvertes → on est poussé à remplir CHAQUE emplacement avec du
// vrai stuff plutôt que de jouer un deck minuscule autour d'une seule arme. Dès
// qu'on équipe le slot, ses cartes de suppléance quittent le deck ; si on le
// libère (déséquipement, perte d'arme en combat), elles REVIENNENT — y compris
// en plein combat (majCartesDeBase).
// `cle`  = clé d'occupation renvoyée par inventaire.js → slotsOccupes (logique :
//          la main secondaire peut être prise par un 2-mains en arme1).
// `slot` = nom du SLOT d'inventaire correspondant — sert à MONTRER ces cartes au
//          survol d'un emplacement vide (cf. infobulle.js → montrerNoteSlotVide).
const CARTES_BASE_SLOTS = [
  { cle: "principale", slot: "arme1",  id: "coup-faible",  nb: 5 }, // « Tap »        — main principale libre
  { cle: "secondaire", slot: "arme2",  id: "garde-faible", nb: 3 }, // « Brace »      — main secondaire libre
  { cle: "armure",     slot: "armure", id: "expose",       nb: 4 }, // « Exposed »    — torse nu
  { cle: "gant",       slot: "gant",   id: "mains-nues",   nb: 2 }, // « Bare Hands » — gants nus
  { cle: "botte",      slot: "botte",  id: "pieds-nus",    nb: 2 }, // « Bare Foot »  — bottes nues
];

// Les ids des cartes de suppléance : jamais maîtrisables (cf. systems/maitrise.js).
export const CARTES_BASE = new Set(CARTES_BASE_SLOTS.map((s) => s.id));

// Les cartes de suppléance liées à un SLOT d'inventaire (arme1, armure, gant…),
// pour les afficher au survol d'un emplacement VIDE. Renvoie { id, nb } ou null
// si ce slot n'injecte aucune carte (collier, bagues, sac : pas de pénalité à vide).
export function cartesSuppleanceSlot(slot) {
  const e = CARTES_BASE_SLOTS.find((s) => s.slot === slot);
  return e ? { id: e.id, nb: e.nb } : null;
}

// Les cartes de suppléance ACTIVES selon l'état des slots. `slots` = objet
// { principale, secondaire, armure, gant, botte } : true = slot occupé → pas de
// carte de suppléance ; false/absent = slot libre → on ajoute ses cartes faibles.
export function cartesDeBase(slots = {}) {
  const ids = [];
  for (const { cle, id, nb } of CARTES_BASE_SLOTS) {
    if (!slots[cle]) for (let i = 0; i < nb; i++) ids.push(id);
  }
  return ids;
}

// La Chaleur de Forge (l'énergie des cartes). Persiste entre les tours, peut
// monter en SURCHAUFFE au-dessus du seuil. Valeurs modifiables par l'équipement.
const CHALEUR_DEPART = 1;     // forge FROIDE au départ (montée en puissance)
const CHALEUR_RECHARGE = 1;   // +1 par tour
const CHALEUR_SEUIL = 3;      // au-delà = surchauffe
const CHALEUR_MAX = 8;        // plafond absolu

// Initiative (ATB) : chacun remplit une jauge à sa VITESSE ; le 1er à SEUIL agit.
// Vitesse égale → on alterne 1:1 ; 2× plus rapide → 2 tours pour 1 de l'autre.
const VITESSE_HEROS_BASE = 10; // vitesse de base du héros (modifiée par talents/célérité)
const SEUIL_INIT = 100;        // jauge d'initiative à remplir pour agir
// Statuts de VITESSE (temporaires : ils tickent par tour comme le poison).
// La VALEUR d'une carte = le NOMBRE DE TICKS ajoutés. Chaque tick de Hâte donne
// +5% de vitesse ; chaque tour un tick s'écoule → plus de stacks = plus rapide.
const HATE_PAR_TICK = 0.05; // « Hâte » : +5% de vitesse par tick actif (N ticks = +N×5%)
const GEL_MULT  = 0.70; // « Gel » (lenteur)   : vitesse de l'ennemi ×0.70 pendant N tours
// À GEL_EXPLOSION stacks de Gel, l'ennemi est immédiatement étourdi (1 tour) et
// perd GEL_EXPLOSION stacks ; le surplus est conservé. Héros : identique mais déclenché
// au début de son tour (aucun ennemi ne le gèle pour l'instant).
const GEL_EXPLOSION = 5;        // seuil de stacks qui déclenche l'étourdissement
const DEGATS_GEL_EXPLOSION = 5; // dégâts directs héros quand la glace se brise (conservé)
// ---------------------------------------------------------------------------

// Vérifie si un ennemi vient d'atteindre ou de dépasser GEL_EXPLOSION stacks de Gel.
// Si oui : stun immédiat (+1 tour), retrait de GEL_EXPLOSION stacks, surplus conservé.
// Peut boucler si on accumule ≥ 10 stacks d'un coup (ex. buff ×2).
function verifierGelEnnemi(e) {
  while (e.gel >= GEL_EXPLOSION) {
    e.gel -= GEL_EXPLOSION;
    e.stun += 1;
  }
}

// Mélange une copie du tableau (Fisher-Yates : chaque ordre est équiprobable).
function melanger(tableau) {
  const t = [...tableau];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

// Construit le deck de départ : cartes de suppléance (selon les slots libres) +
// cartes de l'équipement + cartes de maîtrise choisies (facultatif). Exporté pour
// que l'écran Deck soit fidèle. `slots` = état d'occupation (cf. cartesDeBase).
export function composerDeck(cartesEquip, cartesSupp = [], slots = {}) {
  const ids = [...cartesDeBase(slots)];
  for (const idCarte of cartesEquip ?? []) ids.push(idCarte);
  for (const idCarte of cartesSupp ?? []) ids.push(idCarte);
  return ids.map((id) => CARTES[id]).filter(Boolean);
}

// Resynchronise les cartes de suppléance du deck EN COURS avec l'état des slots.
// À appeler quand l'équipement change PENDANT un combat (déséquipement, future
// perte d'arme) : un slot libéré fait REVENIR ses cartes faibles, un slot occupé
// les retire. Agit sur tout le deck vivant (pioche + main + défausse).
export function majCartesDeBase(combat, slots = {}) {
  for (const { cle, id, nb } of CARTES_BASE_SLOTS) {
    ajusterCarteBase(combat, id, slots[cle] ? 0 : nb);
  }
}

// Porte le nombre d'exemplaires d'une carte de base à `cible` dans le deck vivant.
function ajusterCarteBase(combat, carteId, cible) {
  const zones = [combat.pioche, combat.main, combat.defausse];
  let actuel = zones.reduce((n, z) => n + z.filter((c) => c.id === carteId).length, 0);
  if (actuel < cible) {
    // Il en manque : on AJOUTE dans la pioche, puis on la remélange (arrivée naturelle).
    const modele = CARTES[carteId];
    if (modele) {
      for (; actuel < cible; actuel++) combat.pioche.push(modele);
      combat.pioche = melanger(combat.pioche);
    }
  } else if (actuel > cible) {
    // Il y en a trop : on RETIRE, d'abord de la pioche, puis de la défausse, puis de la main.
    for (const zone of [combat.pioche, combat.defausse, combat.main]) {
      for (let i = zone.length - 1; i >= 0 && actuel > cible; i--) {
        if (zone[i].id === carteId) { zone.splice(i, 1); actuel--; }
      }
    }
  }
}

// Force totale appliquée à chaque coup = buff temporaire (tick) + bonus permanent.
function forceTotal(combat) { return combat.force + (combat.forcePerm ?? 0); }
function creerEnnemiCombat(def) {
  return {
    def, pv: def.pv, pvMax: def.pv,
    poison: 0, feu: 0, sang: 0,    // statuts (dégâts dans le temps)
    feuDeCarte: false,             // true = feu posé par une carte ce tour : propagera à la FIN du tour du héros
    stun: 0,                       // étourdissement : nb de SES tours encore sautés
    confusion: 0,                  // « Confusion » (éblouissement) : nb de SES tours où il frappe une cible AU HASARD
    dernierPoison: 0, dernierFeu: 0, dernierSang: 0, // dégâts subis au dernier tour (UI)
    dernierDegats: 0, // dégâts bruts infligés lors de la dernière carte (avant cap à 0, pour l'overkill UI)
    hitLog: [], // coups individuels reçus lors de la dernière carte (pour animation de chaîne UI)
    intention: null,              // ce qu'il prépare (télégraphié)
    vitesse: def.vitesse ?? VITESSE_HEROS_BASE, // vitesse d'initiative (agilité)
    gel: 0,                       // « Gel » : nb de SES tours encore ralentis (−30% vitesse)
    haste: 0,                     // « Hâte alliée » : nb de SES tours encore accélérés (+30% vitesse)
    init: 0,                      // jauge d'initiative courante
  };
}
export function ennemiVivant(e) { return e && e.pv > 0; }

// `ennemisDefs` : tableau de définitions d'ennemis (data/ennemis.js).
// `opts` : { pv, pvMax, cartes, stats } — vie (persiste) + cartes de l'équipement
// + réglages chiffrés (`stats`) venant de l'arbre de talents.
export function creerCombat(ennemisDefs, opts = {}) {
  const { pv = 40, pvMax = 40, cartes = [], cartesSupp = [], slots = {}, stats = {}, passifs = [] } = opts;
  const armureDepart = stats.armureDepart || 0;
  // Les TALENTS modifient les réglages de la Chaleur de Forge (seuil, plafond,
  // recharge, énergie de départ) — cf. bonusTalents() de l'arbre de talents.
  const chaleurSeuil = CHALEUR_SEUIL + (stats.chaleurSeuil || 0);
  const chaleurMax = CHALEUR_MAX + (stats.chaleurMax || 0);
  const chaleurRecharge = CHALEUR_RECHARGE + (stats.chaleurRecharge || 0);
  const chaleurDepart = Math.min(chaleurMax, CHALEUR_DEPART + (stats.chaleurDepart || 0));
  const combat = {
    // Héros
    pvHerosMax: pvMax,
    pvHeros: pv,
    pierre: armureDepart, // Pierre de départ des armures équipées
    force: 0,       // « Force » temporaire : +N à CHAQUE coup, diminue de 1 par tour du héros
    forcePerm: stats.forcePerm ?? 0, // Force permanente (déclarée par les items) : +N tout le combat
    regen: 0,       // « Régénération » : PV rendus au héros au début de chacun de ses tours
    poisonHeros: 0,
    feuHeros: 0,
    gelHeros: 0,    // gel du héros : ralentit (−30% vitesse) ; annulé par feuHeros et vice-versa
    tourSaute: false,        // true = le héros saute son tour (glace brisée à 5 stacks)
    gelExplosionHeros: 0,    // dégâts subis par la glace brisée (pour le floater UI)
    // Chaleur de Forge + surchauffe (réglages modifiés par l'équipement)
    chaleur: chaleurDepart,
    chaleurRecharge,
    chaleurSeuil,
    chaleurMax,
    derniereBrulure: 0,
    dernierPoisonHeros: 0,
    dernierFeuHeros: 0,
    dernierSoinCarte: 0, // soin brut rendu par la dernière carte (avant cap au max, pour l'over-heal UI)
    dernierGainAleatoire: null, // { min, max, gain } — résultat du dernier chaleur-aleatoire (animation dés)
    // Initiative (ATB)
    vitesseHerosBase: VITESSE_HEROS_BASE + (stats.agilite || 0), // + talents d'agilité
    celeritePct: stats.celeritePct || 0, // bonus PASSIF de célérité (%) des bottes (toujours actif en combat)
    hate: 0,               // « Hâte » : nb de tours du héros encore accélérés (+5%/tick d'agilité), s'écoule
    hatePerm: 0,           // Hâte PERMANENTE (ne s'écoule pas) : alimentée par Long run (+5%/tick aussi)
    riposte: 0,            // « Riposte » (Rebond) : renvoie les dégâts de MÊLÉE reçus, −1 tick par renvoi
    toursBonus: 0,         // « Joue 2 fois » (Innaretable) : tours du héros à enchaîner sans laisser agir les ennemis
    celeriteParTour: 0,    // « Long run » : ticks de Hâte gagnés au début de CHAQUE tour du héros (cumulable)
    cartesPierre: 0,       // Set Stone Age : compteur de cartes « pierre » jouées (Stone = 1, Many stone = 3)
    initHeros: SEUIL_INIT / 2, // petite avance : le héros OUVRE le combat (jamais frappé avant d'agir)
    premierTourHeros: true, // le 1er tour ne recharge pas la Chaleur (forge froide)
    // Ennemis (liste) + l'ennemi visé
    ennemis: ennemisDefs.map(creerEnnemiCombat),
    cible: 0,
    // Deck
    pioche: melanger(composerDeck(cartes, cartesSupp, slots)),
    main: [],
    defausse: [],
    tailleMain: TAILLE_MAIN + (stats.pioche || 0), // cartes piochées/tour (+ talents)
    // Déroulé
    tourJoueur: false,     // devient true au 1er tour du héros (commencerTourHeros)
    fini: false,
    resultat: null,
    // Passifs (bonus de set d'armure) déclenchés sur événement — cf. agirEnnemi.
    passifs,
  };
  // Passifs « début de combat » (set Mail : Pierre par ennemi rencontré). Appliqués
  // une fois, par-dessus l'armure de départ, avant le tout 1er tour.
  for (const p of passifs) {
    if (p.declencheur !== "debutCombat") continue;
    for (const ef of p.effets) {
      if (ef.type === "pierre") {
        combat.pierre += ef.parEnnemi ? ef.valeur * combat.ennemis.length : ef.valeur;
      }
    }
  }
  prevoirIntentions(combat);
  combat.cible = premierVivant(combat);
  return combat; // la 1re main est piochée par le 1er commencerTourHeros (via l'initiative)
}

// Vitesse EFFECTIVE (après les statuts de vitesse Hâte/Gel). Jamais < 1.
export function vitesseHeros(combat) {
  let v = combat.vitesseHerosBase * (1 + (combat.hate + combat.hatePerm) * HATE_PAR_TICK); // +5% par tick de Hâte (temporaire + permanente)
  if (combat.celeritePct) v *= 1 + combat.celeritePct / 100; // bonus passif des bottes (toujours actif)
  if (combat.gelHeros > 0) v *= GEL_MULT; // Gel héros : −30% de vitesse
  return Math.max(1, v);
}
export function vitesseEnnemi(e) {
  let v = e.vitesse * (1 + e.haste * HATE_PAR_TICK); // +5% par tick de Hâte alliée
  if (e.gel > 0) v *= GEL_MULT; // Gel : −30% de vitesse
  return Math.max(1, v);
}

// Index du premier ennemi vivant (0 par défaut s'il n'y en a plus).
function premierVivant(combat) {
  const i = combat.ennemis.findIndex(ennemiVivant);
  return i < 0 ? 0 : i;
}

// Pioche une carte ; si la pioche est vide, on remélange la défausse dedans.
function piocherUne(combat) {
  if (combat.pioche.length === 0) {
    combat.pioche = melanger(combat.defausse);
    combat.defausse = [];
  }
  return combat.pioche.pop() ?? null;
}

// Ajoute une carte piochée à la main, sans dépasser MAIN_MAX. Si la main est déjà
// pleine, la carte est PIOCHÉE mais part directement à la défausse (surplus perdu).
function ajouterCarteMain(combat, carte) {
  if (!carte) return;
  if (combat.main.length >= MAIN_MAX) combat.defausse.push(carte);
  else combat.main.push(carte);
}

function piocherMain(combat) {
  for (let i = 0; i < combat.tailleMain; i++) {
    ajouterCarteMain(combat, piocherUne(combat));
  }
}

// Tire une action selon les poids de `def.actions` (roulette pondérée).
function choisirAction(actions) {
  const total = actions.reduce((s, a) => s + a.poids, 0);
  let r = Math.random() * total;
  for (const a of actions) {
    r -= a.poids;
    if (r <= 0) return a;
  }
  return actions[actions.length - 1];
}

// --- Soin du chaman : cible VERROUILLÉE à la préparation ----------------------
// Le soigneur choisit sa cible UNE SEULE FOIS, quand il prépare son sort (l'allié
// vivant au % de PV le plus bas), et la garde — même si un autre allié descend
// plus bas ensuite. SEULE exception : si la cible verrouillée meurt avant le
// lancement, il en reverrouille une autre (sinon il soignerait dans le vide).

// L'allié vivant au plus bas POURCENTAGE de PV (hors lanceur ; lui-même s'il est seul).
function allieLePlusBlesse(combat, lanceur) {
  const alliés = combat.ennemis.filter((a) => a !== lanceur && ennemiVivant(a));
  const pool = alliés.length ? alliés : [lanceur];
  return pool.reduce((b, a) => (!b || a.pv / a.pvMax < b.pv / b.pvMax) ? a : b, null);
}

// La cible de soin EFFECTIVE : celle verrouillée à la préparation, SAUF si elle
// est morte entre-temps → on en reverrouille une nouvelle (et on met à jour
// l'intention pour que moteur et affichage restent d'accord).
export function cibleSoinVerrou(combat, lanceur) {
  const verrou = lanceur.intention?.cible;
  if (verrou && ennemiVivant(verrou)) return verrou;
  const cible = allieLePlusBlesse(combat, lanceur);
  if (lanceur.intention) lanceur.intention.cible = cible;
  return cible;
}

// Chaque ennemi annonce son prochain coup. Les ennemis avec `def.actions` tirent
// aléatoirement parmi leurs actions pondérées ; les autres attaquent toujours.
function prevoirIntentions(combat) {
  for (const e of combat.ennemis) {
    if (!ennemiVivant(e)) { e.intention = null; continue; }
    if (e.def.actions?.length) {
      const a = choisirAction(e.def.actions);
      e.intention = { type: a.type, valeur: a.valeur };
      // Soin : on VERROUILLE dès maintenant l'allié le plus blessé (% le plus bas).
      if (a.type === "soigner") e.intention.cible = allieLePlusBlesse(combat, e);
    } else {
      e.intention = { type: "attaque", valeur: e.def.attaque };
    }
  }
}

// Une carte vise-t-elle un ennemi ? (dégâts/poison/feu). Sinon elle se joue
// directement sur soi (Pierre…), sans choix de cible.
export function carteVise(carte) {
  return (carte?.effets ?? []).some(
    (e) => e.type === "degats" || e.type === "degats-execution" ||
           e.type === "degats-si-gel" || e.type === "degats-si-faible" ||
           e.type === "pierre-vers-degats" ||
           e.type === "poison" || e.type === "feu" ||
           e.type === "sang" || e.type === "stun" || e.type === "lenteur" ||
           e.type === "confusion" || e.type === "gel-cascade" ||
           e.type === "contagion" ||    // vise l'ennemi de référence (ses voisins s'alignent)
           e.type === "transfert-feu" || // vise l'ennemi SOURCE dont on déplace la brûlure
           e.type === "tout-en-feu"     // AOE offensif sur tous les ennemis
  );
}

// Renvoie true si la carte frappe TOUS les ennemis vivants à la fois (AOE).
// Ajouter `aoe: true` dans la définition de la carte (data/cartes.js) pour l'activer.
export function carteAOE(carte) { return carte?.aoe === true; }

// Faut-il demander au joueur de CHOISIR une cible ? Uniquement si la carte est
// offensive (vise un ennemi), non-AOE, ET qu'il y a plusieurs ennemis vivants.
// Dans tous les autres cas, un simple clic suffit pour jouer.
export function necessiteCiblage(carte, nbVivants) {
  return carteVise(carte) && !carteAOE(carte) && nbVivants >= 2;
}

// Vrai si cet effet touche un ennemi (offensive) — sert pour la logique AOE.
function effetViseEnnemi(e) {
  return e.type === "degats" || e.type === "poison" || e.type === "feu" ||
         e.type === "sang"   || e.type === "stun"   || e.type === "lenteur" ||
         e.type === "confusion" || e.type === "embrasement" ||
         e.type === "confusion-si-confus" || e.type === "stun-si-sang" ||
         e.type === "degats-si-force" || e.type === "stun-si-pierre";
}

// Un ennemi porte-t-il au moins un MALUS (statut négatif) ? Sert aux cartes
// « combo » qui récompensent de frapper une cible déjà affaiblie.
function aMalus(e) {
  return e && (e.poison > 0 || e.feu > 0 || e.sang > 0 || e.stun > 0 || e.gel > 0 || e.confusion > 0);
}

// --- Bonus (statuts POSITIFS) d'un ennemi : dissipables (Lay on Hands, Glory
// Strike) et volables (donne moi ça). Système GÉNÉRIQUE et extensible : pour
// rendre un nouveau bonus ennemi dissipable/volable, il suffit de l'ajouter à
// CLES_BONUS_ENNEMI et de définir sa traduction sur le héros dans volerBonus().
// Aujourd'hui le seul bonus qu'un ennemi peut porter est la Hâte alliée.
const CLES_BONUS_ENNEMI = ["haste"];

// Liste des bonus ACTIFS (valeur > 0) que porte `e`.
function bonusActifsEnnemi(e) {
  return e ? CLES_BONUS_ENNEMI.filter((k) => (e[k] ?? 0) > 0) : [];
}

// Vole un bonus à l'ennemi (le lui retire) et applique l'équivalent au héros.
function volerBonus(combat, ennemi, cle) {
  const val = ennemi[cle] ?? 0;
  ennemi[cle] = 0;
  if (cle === "haste") combat.hate += val; // Hâte alliée de l'ennemi → célérité du héros
  // Futurs bonus ennemis (force, regen, pierre…) : mapper leur traduction ici.
}

// Saignement TOTAL sur tous les ennemis vivants (cartes du set Sang qui scalent dessus).
function sangTotal(combat) {
  return combat.ennemis.reduce((s, e) => s + (ennemiVivant(e) ? e.sang : 0), 0);
}

// Set Sang (vampirique) : quand un combo de saignement inflige des dégâts bonus
// (`bonus`), les passifs « saignementCombo » soignent le héros d'une fraction
// (`ratio`, 1 = 100%). Renvoie le total soigné (pour l'affichage). Sans set : 0.
function soinSaignementCombo(combat, bonus) {
  let soin = 0;
  for (const p of combat.passifs ?? []) {
    if (p.declencheur !== "saignementCombo") continue;
    for (const ef of p.effets) {
      if (ef.type === "soin") soin += Math.round(bonus * (ef.ratio ?? 1));
    }
  }
  if (soin > 0) soinnerHeros(combat, soin);
  return soin;
}

// Set Stone Age : déclenché à chaque PALIER de 10 cartes « pierre » jouées dans le
// combat (`paliers` = nombre de paliers franchis d'un coup, ex. un Many stone qui
// fait passer le compteur de 9 à 12 franchit 1 palier). Applique le bonus de set
// (passif `paliersPierre`) autant de fois — ex. stun de TOUS les ennemis 1 tour.
function declencherPaliersPierre(combat, paliers) {
  for (const p of combat.passifs ?? []) {
    if (p.declencheur !== "paliersPierre") continue;
    for (let k = 0; k < paliers; k++) {
      for (const ef of p.effets) {
        if (ef.type === "stun") {
          for (const e of combat.ennemis) if (ennemiVivant(e)) e.stun += ef.valeur;
        }
      }
    }
  }
}

// Inflige `n` dégâts bruts à un ennemi : accumule `dernierDegats` (non capé)
// pour que l'UI puisse afficher l'overkill réel, puis réduit les PV (≥ 0).
function blesser(e, n) {
  if (n <= 0) return;
  e.dernierDegats += n;
  e.hitLog.push(n); // pour l'animation de chaîne (ordre préservé)
  e.pv = Math.max(0, e.pv - n);
}

// Soigne le héros de `n` PV : accumule `dernierSoinCarte` (non capé) pour
// afficher l'over-heal réel en UI, puis augmente les PV (≤ pvMax).
function soinnerHeros(combat, n) {
  if (n <= 0) return;
  combat.dernierSoinCarte += n;
  combat.pvHeros = Math.min(combat.pvHerosMax, combat.pvHeros + n);
}

// Applique un effet de carte : les effets offensifs touchent `ennemi` (la cible),
// les défensifs touchent le héros.
function appliquerEffet(combat, effet, ennemi) {
  // Force : s'applique uniquement aux coups de mêlée (portee "melee" par défaut).
  const portee = combat._porteeCarteCourante ?? "melee";
  const forceApp = portee === "melee" ? forceTotal(combat) : 0;
  if (effet.type === "degats") {
    if (ennemi) blesser(ennemi, effet.valeur + forceApp);
  } else if (effet.type === "degats-execution") {
    // Dégâts (Force incluse) DOUBLÉS si la cible porte au moins un malus.
    if (ennemi) {
      const base = effet.valeur + forceApp;
      blesser(ennemi, aMalus(ennemi) ? base * 2 : base);
    }
  } else if (effet.type === "degats-si-gel") {
    // Shatter : dégâts de base + bonus si la cible est GELÉE (récompense le frost).
    if (ennemi) blesser(ennemi, effet.valeur + forceApp + (ennemi.gel > 0 ? effet.bonus : 0));
  } else if (effet.type === "degats-si-faible") {
    // Execute : dégâts DOUBLÉS si la cible est sous `seuil` % de PV (achève les blessés).
    if (ennemi) {
      const base = effet.valeur + forceApp;
      blesser(ennemi, ennemi.pv <= ennemi.pvMax * (effet.seuil ?? 0.5) ? base * 2 : base);
    }
  } else if (effet.type === "pierre-vers-degats") {
    // Stone Fist : inflige des dégâts égaux à la Pierre actuelle (× valeur), SANS
    // la consommer. Paie le build « bloc » (Mail, armures) en attaque.
    if (ennemi) blesser(ennemi, combat.pierre * effet.valeur + forceApp);
  } else if (effet.type === "force") {
    combat.force += effet.valeur; // Force temporaire : décroît de 1 par tour du héros
  } else if (effet.type === "regen") {
    combat.regen += effet.valeur; // régénération : PV/tour du héros
  } else if (effet.type === "pierre") {
    combat.pierre += effet.valeur;
  } else if (effet.type === "poison") {
    if (ennemi) ennemi.poison += effet.valeur;
  } else if (effet.type === "feu") {
    if (ennemi) {
      // Feu sur ennemi gelé : le feu fond la glace (gel annulé), feu appliqué normalement.
      if (ennemi.gel > 0) ennemi.gel = 0;
      ennemi.feu += effet.valeur;
      ennemi.feuDeCarte = true; // feu posé par carte : propagera au premier tick
    }
  } else if (effet.type === "embrasement") {
    // Embrasement : consomme TOUTE la brûlure (feu) de l'ennemi et la transforme
    // en dégâts INSTANTANÉS (× valeur). Ex. 5 feu × 2 = 10 dégâts d'un coup, feu → 0.
    if (ennemi) {
      const feuConsomme = ennemi.feu;
      ennemi.feu = 0;
      blesser(ennemi, feuConsomme * effet.valeur);
    }
  } else if (effet.type === "sang") {
    if (ennemi) {
      // Les ticks existants restent ET font des dégâts bonus immédiats (sans être
      // consommés). Les nouveaux ticks s'empilent par-dessus. Plus les stacks sont
      // hauts, plus chaque attaque de saignement suivante fait mal.
      if (ennemi.sang > 0) {
        const bonus = ennemi.sang;
        blesser(ennemi, bonus);
        // Set Sang (vampirique) : ce combo soigne le héros d'autant — cf. soinSaignementCombo.
        soinSaignementCombo(combat, bonus);
      }
      ennemi.sang += effet.valeur;
    }
  } else if (effet.type === "pierre-par-sang") {
    // Sanguine Guard : Pierre proportionnelle au saignement TOTAL sur le champ
    // de bataille (récompense d'avoir empilé du saignement partout).
    combat.pierre += effet.valeur * sangTotal(combat);
  } else if (effet.type === "chaleur-par-sang") {
    // Blood Rush : énergie selon le saignement TOTAL (1 Chaleur par `par` points).
    const gain = Math.floor(sangTotal(combat) / effet.par);
    combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + gain);
  } else if (effet.type === "soin-par-sang") {
    soinnerHeros(combat, effet.valeur * sangTotal(combat));
  } else if (effet.type === "absorption-sang") {
    // Blood Absorption : soigne `valeur` PV par saignement TOTAL, puis efface TOUT
    // le saignement des ennemis (on « boit » les plaies — ne touche que les ennemis).
    soinnerHeros(combat, effet.valeur * sangTotal(combat));
    for (const e of combat.ennemis) e.sang = 0;
  } else if (effet.type === "auto-degats") {
    // Coût en sang : PV DIRECTS du héros (la Pierre ne protège PAS — c'est un
    // sacrifice). Peut faire tomber le héros ; le bilan vie est vérifié en fin de carte.
    combat.pvHeros = Math.max(0, combat.pvHeros - effet.valeur);
  } else if (effet.type === "soin-heros") {
    soinnerHeros(combat, effet.valeur);
  } else if (effet.type === "purifier-hero") {
    // Lay on Hands : retire COMPLÈTEMENT un malus du héros tiré au hasard (poison/feu/gel).
    const malus = [];
    if (combat.poisonHeros > 0) malus.push("poisonHeros");
    if (combat.feuHeros > 0)    malus.push("feuHeros");
    if (combat.gelHeros > 0)    malus.push("gelHeros");
    if (malus.length) combat[malus[Math.floor(Math.random() * malus.length)]] = 0;
  } else if (effet.type === "stun") {
    if (ennemi) ennemi.stun += effet.valeur; // étourdit : l'ennemi saute ses prochains tours (cumulable)
  } else if (effet.type === "stun-si-sang") {
    // Blood Slide (AOE) : n'étourdit QUE les ennemis qui portent déjà du saignement.
    if (ennemi && ennemi.sang > 0) ennemi.stun += effet.valeur;
  } else if (effet.type === "confusion") {
    // Confusion (éblouissement) : pendant `valeur` de ses tours, l'ennemi frappe
    // une cible AU HASARD (héros, un autre ennemi, ou lui-même). Cumulable.
    if (ennemi) ennemi.confusion += effet.valeur;
  } else if (effet.type === "confusion-si-confus") {
    // Halo Burst (AOE) : amplifie la Confusion → +`valeur` aux ennemis DÉJÀ confus.
    if (ennemi && ennemi.confusion > 0) ennemi.confusion += effet.valeur;
  } else if (effet.type === "confusion-proche") {
    // Armor of light : éblouit (Confusion) l'ennemi vivant le PLUS PROCHE (le 1er en file).
    const proche = combat.ennemis[premierVivant(combat)];
    if (proche && ennemiVivant(proche)) proche.confusion += effet.valeur;
  } else if (effet.type === "chaleur") {
    // Régénère de l'énergie (Chaleur). Peut dépasser le SEUIL → surchauffe au
    // tour suivant : énergie immédiate, mais risque de brûlure (choix tactique).
    combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + effet.valeur);
  } else if (effet.type === "trempe") {
    // Trempe : convertit TOUTE la Chaleur restante en Pierre (×valeur), puis la
    // forge refroidit complètement (chaleur → 0). Récompense d'avoir chauffé fort
    // (et bonus : ça fait retomber la surchauffe). Choix tactique : monter haut,
    // puis tremper pour un gros bouclier d'un coup.
    combat.pierre += combat.chaleur * effet.valeur;
    combat.chaleur = 0;
  } else if (effet.type === "celerite") {
    combat.hate += effet.valeur;            // Hâte : +30% d'agilité pendant `valeur` tours (la durée se cumule)
  } else if (effet.type === "celerite-chaleur") {
    // Hâte proportionnelle : autant de tours d'agilité que de Chaleur disponible
    // AU MOMENT DE JOUER la carte (AVANT d'en payer le coût). Récompense de jouer
    // chaud, sans pénaliser du coût de la carte elle-même.
    combat.hate += combat.chaleurAvantCarte ?? combat.chaleur;
  } else if (effet.type === "lenteur") {
    if (ennemi) {
      // Gel sur ennemi brûlant : la glace éteint le feu (brûlure annulée), gel appliqué normalement.
      if (ennemi.feu > 0) { ennemi.feu = 0; ennemi.feuDeCarte = false; }
      ennemi.gel += effet.valeur;
      verifierGelEnnemi(ennemi); // stun immédiat si ≥ 5 stacks
    }
  } else if (effet.type === "piocher") {
    // Pioche `valeur` cartes dans la main (recompose la pioche depuis la défausse
    // si besoin, comme en début de tour).
    for (let i = 0; i < effet.valeur; i++) ajouterCarteMain(combat, piocherUne(combat));
  } else if (effet.type === "doublerPierre") {
    combat.pierre *= 2;
  } else if (effet.type === "pierre-par-ennemi") {
    // Pierre proportionnelle au nombre d'ennemis encore vivants.
    const nbVivants = combat.ennemis.filter(ennemiVivant).length;
    combat.pierre += effet.valeur * nbVivants;
  } else if (effet.type === "piocher-par-ennemi") {
    // Pioche autant de cartes qu'il reste d'ennemis vivants en face.
    const nbVivants = combat.ennemis.filter(ennemiVivant).length;
    for (let i = 0; i < nbVivants; i++) ajouterCarteMain(combat, piocherUne(combat));
  } else if (effet.type === "refaire-main") {
    // Défausse TOUTE la main restante et repioche autant de cartes (relance propre).
    const n = combat.main.length;
    combat.defausse.push(...combat.main);
    combat.main = [];
    for (let i = 0; i < n; i++) ajouterCarteMain(combat, piocherUne(combat));
  } else if (effet.type === "defausser-piocher") {
    // Bare Hands : DÉFAUSSE `valeur` carte(s) au HASARD de la main, puis repioche
    // autant (échange sec). Si la main est vide, rien ne se passe — pas de pioche
    // gratuite : ça reste une carte « bouche-trou » de slot de gants nu.
    for (let i = 0; i < effet.valeur && combat.main.length > 0; i++) {
      const j = Math.floor(Math.random() * combat.main.length);
      combat.defausse.push(combat.main.splice(j, 1)[0]);
      ajouterCarteMain(combat, piocherUne(combat));
    }
  } else if (effet.type === "celerite-vers-energie") {
    // Échange `cout` tours de Hâte contre `gain` Chaleur. Rien si pas assez de Hâte.
    if (combat.hate >= effet.cout) {
      combat.hate -= effet.cout;
      combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + effet.gain);
    }
  } else if (effet.type === "feu-vers-energie") {
    // Transforme `cout` ticks de Feu DU HÉROS en `gain` Chaleur. Rien si pas assez de Feu.
    if (combat.feuHeros >= effet.cout) {
      combat.feuHeros -= effet.cout;
      combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + effet.gain);
    }
  } else if (effet.type === "drain-sang") {
    // Drain : consomme TOUT le Saignement de la cible et soigne le héros d'autant
    // de PV. Gagne aussi `energie` Chaleur (toujours, même sans saignement à boire).
    if (ennemi) {
      const draine = ennemi.sang;
      ennemi.sang = 0;
      soinnerHeros(combat, draine);
      combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + (effet.energie ?? 1));
    }
  } else if (effet.type === "supprimer-bonus") {
    // Lay on Hands / Glory strike : retire UN bonus (statut positif) de la cible,
    // tiré au hasard parmi ceux qu'elle porte. Si un bonus a bien été retiré, le
    // héros gagne `regen` Régénération.
    if (ennemi) {
      const actifs = bonusActifsEnnemi(ennemi);
      if (actifs.length) {
        ennemi[actifs[Math.floor(Math.random() * actifs.length)]] = 0;
        combat.regen += effet.regen ?? 0;
      }
    }
  } else if (effet.type === "voler-bonus") {
    // donne moi ça : vole UN bonus de la cible (tiré au hasard) et l'applique au
    // héros (la cible le perd). Rien si la cible n'a aucun bonus.
    if (ennemi) {
      const actifs = bonusActifsEnnemi(ennemi);
      if (actifs.length) volerBonus(combat, ennemi, actifs[Math.floor(Math.random() * actifs.length)]);
    }
  } else if (effet.type === "piocher-pierre") {
    // Nimble Hands : pioche `valeur` carte(s) ; pour chaque carte piochée, gagne
    // `mult`× son coût (Chaleur) sous forme de Pierre (récompense les cartes chères).
    for (let i = 0; i < effet.valeur; i++) {
      const c = piocherUne(combat);
      if (!c) break;
      combat.pierre += (c.cout ?? 0) * (effet.mult ?? 2);
      ajouterCarteMain(combat, c);
    }
  } else if (effet.type === "retirer-feu-hero") {
    // Vent frais : retire `valeur` ticks de Feu (brûlure) DU HÉROS.
    combat.feuHeros = Math.max(0, combat.feuHeros - effet.valeur);
  } else if (effet.type === "chaleur-aleatoire") {
    // Roll dice : gagne une quantité ALÉATOIRE de Chaleur entre `min` et `max` (inclus).
    const gain = effet.min + Math.floor(Math.random() * (effet.max - effet.min + 1));
    combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + gain);
    combat.dernierGainAleatoire = { min: effet.min, max: effet.max, gain };
  } else if (effet.type === "pioche-filtre") {
    // Lucky Draw : pioche `valeur` cartes, GARDE celles dont le coût est strictement
    // inférieur à `coutMax`, défausse les autres (les cartes chères).
    for (let i = 0; i < effet.valeur; i++) {
      const c = piocherUne(combat);
      if (!c) break;
      if ((c.cout ?? 0) < effet.coutMax) ajouterCarteMain(combat, c);
      else combat.defausse.push(c);
    }
  } else if (effet.type === "celerite-par-tour") {
    // Long run : ajoute `valeur` au gain de Hâte appliqué au début de CHAQUE tour
    // du héros, jusqu'à la fin du combat. Rejouer la carte empile l'effet.
    combat.celeriteParTour += effet.valeur;
  } else if (effet.type === "riposte") {
    // Rebond : gagne `valeur` ticks de Riposte (renvoie les dégâts de mêlée reçus).
    combat.riposte += effet.valeur;
  } else if (effet.type === "tour-bonus") {
    // Innaretable : le héros enchaînera `valeur` tour(s) supplémentaire(s).
    combat.toursBonus += effet.valeur;
  } else if (effet.type === "compteur-pierre") {
    // Set Stone Age : marque `valeur` carte(s) « pierre » jouée(s) (Stone = 1,
    // Many stone = 3). Les cartes de combo (Coagulation, vente, fonte) lisent ce total.
    const avant = combat.cartesPierre;
    combat.cartesPierre += effet.valeur;
    // Bonus de set : à chaque PALIER de 10 cartes pierre franchi, déclenche le set.
    const paliers = Math.floor(combat.cartesPierre / 10) - Math.floor(avant / 10);
    if (paliers > 0) declencherPaliersPierre(combat, paliers);
  } else if (effet.type === "pierre-par-compteur") {
    // Coagulation de pierre : gagne `valeur` Pierre par carte « pierre » déjà jouée
    // (Stone vaut 1, Many stone vaut 3 — cf. le compteur cartesPierre).
    combat.pierre += effet.valeur * combat.cartesPierre;
  } else if (effet.type === "piocher-par-compteur") {
    // Vente de cailloux : pioche (cartesPierre / `div`) cartes, borné à [min, max].
    const n = Math.max(effet.min, Math.min(effet.max, Math.floor(combat.cartesPierre / effet.div)));
    for (let i = 0; i < n; i++) ajouterCarteMain(combat, piocherUne(combat));
  } else if (effet.type === "chaleur-par-compteur") {
    // Fondre les pierres : gagne (cartesPierre / `div`) Chaleur, borné à [min, max].
    const n = Math.max(effet.min, Math.min(effet.max, Math.floor(combat.cartesPierre / effet.div)));
    combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + n);
  } else if (effet.type === "degats-si-force") {
    // Decisive Strike (Claymore) : dégâts (Force incluse) DOUBLÉS si la Force totale
    // du héros atteint `seuil` — récompense d'avoir empilé de la Force avant de frapper.
    if (ennemi) {
      const base = effet.valeur + forceApp;
      blesser(ennemi, forceTotal(combat) >= effet.seuil ? base * 2 : base);
    }
  } else if (effet.type === "stun-si-pierre") {
    // Tremor (Siege Maul) : n'étourdit la cible QUE si la Pierre du héros atteint
    // `seuil` — paie le build tank (on encaisse, puis on fige tout le monde).
    if (ennemi && combat.pierre >= effet.seuil) ennemi.stun += effet.valeur;
  } else if (effet.type === "soin-par-ennemi-saignant") {
    // Harvest (Great Scythe) : soigne `valeur` PV par ennemi vivant qui SAIGNE.
    const n = combat.ennemis.filter((e) => ennemiVivant(e) && e.sang > 0).length;
    soinnerHeros(combat, effet.valeur * n);
  }
}

// Le héros encaisse : la Pierre absorbe d'abord, le reste entame les PV.
function subirDegats(combat, degats) {
  const absorbe = Math.min(combat.pierre, degats);
  combat.pierre -= absorbe;
  combat.pvHeros = Math.max(0, combat.pvHeros - (degats - absorbe));
}

function verifierFin(combat) {
  if (combat.ennemis.every((e) => e.pv <= 0)) {
    combat.fini = true;
    combat.resultat = "victoire";
  } else if (combat.pvHeros <= 0) {
    combat.fini = true;
    combat.resultat = "defaite";
  }
}

// Dégâts de surchauffe pour la chaleur actuelle : (chaleur - seuil)² au-delà.
export function degatsSurchauffe(combat) {
  const surplus = combat.chaleur - combat.chaleurSeuil;
  return surplus > 0 ? surplus * surplus : 0;
}

// Joue la carte `index` ; `cible` = index de l'ennemi visé (ignoré si la carte
// est AOE ou ne vise personne). Renvoie true si elle a été jouée.
export function jouerCarte(combat, index, cible = combat.cible) {
  if (combat.fini || !combat.tourJoueur) return false;
  const carte = combat.main[index];
  if (!carte || carte.cout > combat.chaleur) return false;

  // Chaleur disponible AVANT de payer le coût : certains effets la lisent telle
  // quelle (ex. Burning Run compte la Chaleur du moment, coût de la carte inclus).
  combat.chaleurAvantCarte = combat.chaleur;
  combat.chaleur -= carte.cout;
  // La carte quitte la main AVANT de résoudre ses effets : certaines cartes
  // agissent sur le RESTE de la main (ex. défausse) et ne doivent pas se compter.
  combat.main.splice(index, 1);
  combat.defausse.push(carte);

  combat._porteeCarteCourante = carte.portee ?? "melee";
  if (carteAOE(carte)) resoudreAOE(combat, carte);
  else                 resoudreCiblee(combat, carte, cible);
  delete combat._porteeCarteCourante;

  verifierFin(combat);
  return true;
}

// L'ennemi situé DERRIÈRE `ennemi` dans la file (vers la droite = index suivant),
// le premier VIVANT. null s'il est en bout de file. Sert aux effets positionnels
// (rebond, éclaboussure, transfert de feu).
function ennemiDerriere(combat, ennemi) {
  const idx = combat.ennemis.indexOf(ennemi);
  return combat.ennemis.find((e, i) => i > idx && ennemiVivant(e)) ?? null;
}

// Les deux VOISINS DIRECTS vivants de `ennemi` (gauche idx-1, droite idx+1).
// Tableau de 0 à 2 ennemis. Sert aux cartes qui frappent « les côtés ».
function ennemisAdjacents(combat, ennemi) {
  const idx = combat.ennemis.indexOf(ennemi);
  return [combat.ennemis[idx - 1], combat.ennemis[idx + 1]].filter(ennemiVivant);
}

// Résout une carte AOE : effets offensifs sur TOUS les ennemis vivants, effets
// défensifs/utilitaires sur le héros. Les effets « dépense-tout » (rejet de
// Chaleur) sont calculés UNE fois, sinon le 1er ennemi viderait la ressource.
function resoudreAOE(combat, carte) {
  const vivants = combat.ennemis.filter(ennemiVivant);
  for (const effet of carte.effets) {
    if (effet.type === "rejet-chaleur") {
      // Trempe OFFENSIVE : convertit toute la Chaleur en brûlure (×valeur) sur
      // chaque ennemi vivant, puis la forge refroidit (chaleur → 0).
      const brulure = combat.chaleur * effet.valeur;
      combat.chaleur = 0;
      for (const e of vivants) { e.feu += brulure; e.feuDeCarte = true; }
    } else if (effet.type === "danse-poison") {
      // Danse empoisonnée : `hits` frappes sur TOUS les ennemis. Chaque frappe
      // inflige `degats` et empoisonne. Combo : un ennemi DÉJÀ empoisonné avant
      // la carte prend 2 poison/frappe au lieu de 1 (déterminé une fois, au début).
      const dejaPoison = new Map(vivants.map((e) => [e, e.poison > 0]));
      for (let h = 0; h < effet.hits; h++) {
        for (const e of vivants) {
          if (!ennemiVivant(e)) continue;
          blesser(e, effet.degats);
          e.poison += dejaPoison.get(e) ? 2 : 1;
        }
      }
    } else if (effet.type === "forgeage") {
      // Forgeage d'armure : `feu` brûlure à tous. Combo : un ennemi DÉJÀ en feu
      // en reçoit le double, puis TOUTE sa brûlure est consommée et convertie en
      // Pierre pour le héros (1 brûlure = 1 Pierre). Les autres gardent leur feu.
      for (const e of vivants) {
        if (e.feu > 0) {
          e.feu += effet.feu * 2;
          combat.pierre += e.feu;
          e.feu = 0;
          e.feuDeCarte = false;
        } else {
          e.feu += effet.feu;
          e.feuDeCarte = true;
        }
      }
    } else if (effet.type === "tout-en-feu") {
      // All Should Be Fire : somme TOUS les statuts de chaque ennemi (poison,
      // feu, sang, stun, gel, haste), les convertit en Feu × 2. Un stun de 3
      // et un poison de 5 deviennent 16 de brûlure — explosion de masse.
      for (const e of vivants) {
        const total = e.poison + e.feu + e.sang + e.stun + e.gel + e.haste;
        e.feu = total * 2;
        e.feuDeCarte = e.feu > 0;
        e.poison = 0; e.sang = 0; e.stun = 0; e.gel = 0; e.haste = 0;
      }
    } else if (effet.type === "boire-le-sang") {
      // Drink blood : le héros sacrifie `hp` PV (direct, ignore la Pierre), puis
      // frappe TOUS les ennemis (`degats` + `sang`). Chaque ennemi TUÉ par ce coup
      // rend `soinMort` PV (cumulable). Le bilan vie est résolu à la fin de la carte.
      combat.pvHeros = Math.max(0, combat.pvHeros - effet.hp);
      let morts = 0;
      for (const e of vivants) {
        const avant = e.pv;
        blesser(e, effet.degats);
        e.sang += effet.sang;
        if (avant > 0 && e.pv <= 0) morts++;
      }
      if (morts > 0) soinnerHeros(combat, effet.soinMort * morts);
    } else if (effet.type === "degats-soin-cible") {
      // Healing Cleave : `degats` à chaque ennemi vivant (Force incluse si mêlée),
      // puis soigne le héros de `soin` PV par ennemi touché.
      for (const e of vivants) appliquerEffet(combat, { type: "degats", valeur: effet.degats }, e);
      soinnerHeros(combat, effet.soin * vivants.length);
    } else if (effetViseEnnemi(effet)) {
      for (const e of vivants) appliquerEffet(combat, effet, e);
    } else {
      appliquerEffet(combat, effet, null);
    }
  }
}

// Effets résolus à part (positionnels), APRÈS les effets normaux de la carte.
const EFFETS_POSITIONNELS = new Set([
  "rebond", "eclaboussure", "transfert-feu",
  "cleave-adjacent", "brulure-adjacent", "coup-de-grace", "contagion",
  "recompense-mort",
]);

// Résout une carte ciblée (un ennemi). Effets normaux sur la cible, puis les
// effets POSITIONNELS qui regardent l'ennemi situé DERRIÈRE elle.
function resoudreCiblee(combat, carte, cible) {
  let ennemi = combat.ennemis[cible];
  if (!ennemiVivant(ennemi)) ennemi = combat.ennemis[premierVivant(combat)];

  // Burning Hand : défausse TOUTE la main restante ; chaque carte défaussée
  // envoie `valeur` de brûlure à un ennemi vivant AU HASARD (cumulable — un même
  // ennemi peut brûler plusieurs fois). La carte n'a pas d'autre effet.
  const defBrul = carte.effets.find((e) => e.type === "defausse-brulante");
  if (defBrul) {
    const n = combat.main.length;
    combat.defausse.push(...combat.main);
    combat.main = [];
    for (let k = 0; k < n; k++) {
      const vivants = combat.ennemis.filter(ennemiVivant);
      if (!vivants.length) break;
      const v = vivants[Math.floor(Math.random() * vivants.length)];
      v.feu += defBrul.valeur;
      v.feuDeCarte = true;
    }
    return;
  }

  // Frost Cascade : frappe la cible (dégâts + Gel) ; si elle était DÉJÀ gelée
  // avant le coup, le même coup rebondit sur l'ennemi suivant (vers l'arrière de
  // la file), et ainsi de suite tant que chaque cible touchée était déjà gelée.
  const casc = carte.effets.find((e) => e.type === "gel-cascade");
  if (casc) {
    const debut = combat.ennemis.indexOf(ennemi);
    for (let i = debut; i < combat.ennemis.length; i++) {
      const cible = combat.ennemis[i];
      if (!ennemiVivant(cible)) continue;
      const dejaGele = cible.gel > 0;
      blesser(cible, casc.degats);
      if (cible.feu > 0) { cible.feu = 0; cible.feuDeCarte = false; } // gel éteint le feu
      cible.gel += casc.gel;
      verifierGelEnnemi(cible); // stun immédiat si ≥ 5 stacks
      if (!dejaGele) break; // la chaîne s'arrête sur le premier ennemi pas déjà gelé
    }
    return;
  }

  for (const effet of carte.effets) {
    if (!EFFETS_POSITIONNELS.has(effet.type)) appliquerEffet(combat, effet, ennemi);
  }

  const derriere = ennemiDerriere(combat, ennemi);
  const adjacents = ennemisAdjacents(combat, ennemi);
  for (const effet of carte.effets) {
    if (effet.type === "rebond") {
      // Cleave : si la cible MEURT, ses dégâts rebondissent sur l'ennemi derrière
      // (rien si personne derrière — il ne « boucle » pas sur le premier ennemi).
      if (ennemi && ennemi.pv <= 0 && derriere) {
        appliquerEffet(combat, { type: "degats", valeur: effet.valeur }, derriere);
      }
    } else if (effet.type === "eclaboussure") {
      // Onyx Slash : la moitié (dégâts + brûlure) éclabousse l'ennemi derrière,
      // qu'il survive ou non (contrairement au rebond, conditionné à la mort).
      if (derriere) {
        if (effet.degats) appliquerEffet(combat, { type: "degats", valeur: effet.degats }, derriere);
        if (effet.feu)    appliquerEffet(combat, { type: "feu", valeur: effet.feu }, derriere);
      }
    } else if (effet.type === "transfert-feu") {
      // Flaming Kick : déplace TOUTE la brûlure de la cible vers l'ennemi derrière
      // (rien si personne derrière ou si la cible n'a pas de feu). Pas de nouvelle
      // propagation : on relocalise simplement le feu existant.
      if (derriere && ennemi && ennemi.feu > 0) {
        derriere.feu += ennemi.feu;
        ennemi.feu = 0;
      }
    } else if (effet.type === "cleave-adjacent") {
      // Rusty Cleave : les DEUX voisins directs prennent `valeur` dégâts.
      for (const v of adjacents) appliquerEffet(combat, { type: "degats", valeur: effet.valeur }, v);
    } else if (effet.type === "brulure-adjacent") {
      // Eclaboussure de frappe : chaque voisin a `proba` chance de prendre `feu` brûlure.
      for (const v of adjacents) {
        if (Math.random() < (effet.proba ?? 1)) appliquerEffet(combat, { type: "feu", valeur: effet.feu }, v);
      }
    } else if (effet.type === "coup-de-grace") {
      // Pickaxe Jab : si la cible est MORTE, un coup de `valeur` part sur un AUTRE
      // ennemi vivant tiré au hasard (rien s'il n'en reste pas).
      if (ennemi && ennemi.pv <= 0) {
        const autres = combat.ennemis.filter((e) => e !== ennemi && ennemiVivant(e));
        if (autres.length) {
          const cible2 = autres[Math.floor(Math.random() * autres.length)];
          appliquerEffet(combat, { type: "degats", valeur: effet.valeur }, cible2);
        }
      }
    } else if (effet.type === "contagion") {
      // Contagion : les voisins directs ÉGALISENT leur saignement sur celui de la
      // cible (ils prennent EXACTEMENT sa valeur — montée comme descente).
      const sangCible = ennemi ? ennemi.sang : 0;
      for (const v of adjacents) v.sang = sangCible;
    } else if (effet.type === "recompense-mort") {
      // Soul Reap (Great Scythe) : si la cible est MORTE après le coup, le héros
      // récolte son âme — gagne `force` Force et se soigne de `soin` PV.
      if (ennemi && ennemi.pv <= 0) {
        combat.force += effet.force ?? 0;
        if (effet.soin) soinnerHeros(combat, effet.soin);
      }
    }
  }
}

// Applique du feu / gel AU HÉROS avec annulation mutuelle (pour les futures
// capacités ennemies). Feu sur héros gelé → gel annulé. Gel sur héros brûlant → feu annulé.
export function appliquerFeuHeros(combat, valeur) {
  if (combat.gelHeros > 0) combat.gelHeros = 0; // le feu fond la glace
  combat.feuHeros += valeur;
}
export function appliquerGelHeros(combat, valeur) {
  if (combat.feuHeros > 0) combat.feuHeros = 0; // la glace éteint le feu
  combat.gelHeros += valeur;
}

// Tick d'un statut « dégâts dans le temps » sur un ennemi (poison/feu) : il perd
// `n` PV (ignore la Pierre), puis le statut baisse de 1. Renvoie les dégâts.
function tiquerEnnemi(e, nom) {
  const n = e[nom];
  if (n <= 0) return 0;
  e.pv = Math.max(0, e.pv - n);
  e[nom] = n - 1;
  return n;
}
// Idem pour le héros (champs poisonHeros / feuHeros).
function tiquerHeros(combat, nom) {
  const cle = nom + "Heros";
  const n = combat[cle];
  if (n <= 0) return 0;
  combat.pvHeros = Math.max(0, combat.pvHeros - n);
  combat[cle] = n - 1;
  return n;
}

// Propagation de l'Enflammé, résolue à la FIN DU TOUR DU HÉROS (cf. finirTourHeros).
// Chaque ennemi qui a reçu du Feu d'une CARTE ce tour-ci (feuDeCarte) en répand la
// MOITIÉ, arrondie au supérieur, à CHACUN de ses voisins vivants. Tout est calculé
// sur une PHOTO prise avant le moindre ajout → propagation SIMULTANÉE : le Feu reçu
// par un voisin ne se propage pas à son tour, et il n'y a qu'UNE vague (jamais de
// réaction en chaîne).
//   Ex. 3 ennemis, Feu 4 sur le centre → +2 à gauche, +2 à droite.
//   Ex. Feu 8 sur les 3 (AOE) → 8+4 / 8+4+4 / 8+4 = 12 / 16 / 12.
function propagerFeu(combat) {
  // Force répandue par chaque ennemi : figée AVANT tout ajout (vague simultanée).
  const force = combat.ennemis.map((e) =>
    (e.pv > 0 && e.feuDeCarte && e.feu > 0) ? Math.ceil(e.feu / 2) : 0
  );
  combat.ennemis.forEach((e, i) => {
    if (force[i] <= 0) return;
    for (const j of [i - 1, i + 1]) {
      const v = combat.ennemis[j];
      if (v && v.pv > 0) v.feu += force[i];
    }
  });
  // Marqueur consommé : sans nouvelle carte de Feu, plus aucune propagation ensuite.
  for (const e of combat.ennemis) e.feuDeCarte = false;
}

// Déclenche les passifs « frappeMelee » quand l'attaquant `e` vient de frapper le
// héros en mêlée. Effets sur l'ATTAQUANT (feu, confusion) ou sur le HÉROS (pierre,
// si cible:"heros"). Renvoie ce qui a été infligé à l'attaquant (pour l'affichage UI).
function declencherFrappeMelee(combat, e) {
  let brulure = 0, confusion = 0;
  for (const p of combat.passifs ?? []) {
    if (p.declencheur !== "frappeMelee") continue;
    for (const ef of p.effets) {
      if (ef.cible === "heros") {
        if (ef.type === "pierre") combat.pierre += ef.valeur;
      } else if (ef.type === "feu") {
        e.feu += ef.valeur; brulure += ef.valeur;
      } else if (ef.type === "confusion") {
        // `proba` optionnelle (set Croisé : 50% de chance d'éblouir l'attaquant).
        if (Math.random() < (ef.proba ?? 1)) { e.confusion += ef.valeur; confusion += ef.valeur; }
      } else if (ef.type === "degats") {
        e.pv = Math.max(0, e.pv - ef.valeur); // Épines : l'attaquant se blesse en frappant
      }
    }
  }
  return { brulure, confusion };
}

// Un ennemi agit : poison + feu + saignement (le sang SOIGNE le héros), puis il
// exécute son intention — SAUF s'il est étourdi (stun). (La propagation du Feu est
// résolue à la fin du tour du héros, cf. propagerFeu, pas ici.)
// Renvoie ce qui s'est passé, pour que l'écran l'anime.
export function agirEnnemi(combat, i) {
  const e = combat.ennemis[i];
  const evt = {
    poison: 0, feu: 0, sang: 0, soin: 0, mortStatut: false,
    attaque: 0, armureAbsorbe: 0, stun: false,
    soin_allie: 0,  // PV soignés sur un allié
    idx_soin: -1,   // index de l'ennemi soigné (pour le floater UI)
    haste_allie: 0, // tours de hâte donnés aux alliés vivants
    brulureRetour: 0, // brûlure renvoyée à l'attaquant par un passif (set Onyx)
    confusionRetour: 0, // confusion infligée à l'attaquant par un passif (set Croisé)
    confus: false,  // true = l'attaque a été déviée par la Confusion
    attaqueAllie: 0, // PV retirés à un allié/soi-même par une attaque confuse
    idxAttaqueAllie: -1, // index de la victime de l'attaque confuse (pour le floater UI)
    gelExplosion: 0, // dégâts subis par la « glace brisée » (5 stacks de Gel atteints)
    riposteRenvoi: 0, // dégâts renvoyés à l'attaquant par la Riposte (Rebond)
  };
  if (!e || e.pv <= 0) return evt;
  // Ordre des malus dans le temps : poison, puis feu, saignement en dernier.
  // (La PROPAGATION du Feu est résolue à la FIN DU TOUR DU HÉROS — cf. propagerFeu.)
  evt.poison = e.dernierPoison = tiquerEnnemi(e, "poison");
  evt.feu = e.dernierFeu = tiquerEnnemi(e, "feu");
  // Saignement TOUJOURS en dernier (si l'ennemi meurt du poison/feu avant, il ne
  // saigne plus). Chaque tick = 1 dégât plat, le compteur baisse de 1.
  if (e.pv > 0 && e.sang > 0) {
    e.pv = Math.max(0, e.pv - 1);
    evt.sang = e.dernierSang = 1;
    e.sang -= 1;
  } else {
    e.dernierSang = 0;
  }
  const confusActif = e.confusion > 0; // figé AVANT de décrémenter (l'attaque de CE tour est-elle confuse ?)
  // Glace brisée : à GEL_EXPLOSION stacks ou plus, la glace se rompt — l'ennemi
  // saute ce tour, perd GEL_EXPLOSION stacks et subit DEGATS_GEL_EXPLOSION dégâts
  // directs. Sinon le Gel s'écoule normalement de 1 (durée du ralentissement).
  let gelBrise = false;
  if (e.gel >= GEL_EXPLOSION) {
    e.gel -= GEL_EXPLOSION;
    e.pv = Math.max(0, e.pv - DEGATS_GEL_EXPLOSION);
    evt.gelExplosion = DEGATS_GEL_EXPLOSION;
    gelBrise = true;
  } else if (e.gel > 0) {
    e.gel -= 1; // le Gel s'écoule (1 de SES tours), même étourdi
  }
  if (e.haste > 0) e.haste -= 1; // la Hâte s'écoule (1 de SES tours)
  if (e.confusion > 0) e.confusion -= 1; // la Confusion s'écoule (1 de SES tours)
  if (e.pv <= 0) { evt.mortStatut = true; verifierFin(combat); return evt; }
  if (gelBrise) return evt; // gelé solide : il saute son tour (pas d'action)
  if (e.stun > 0) { e.stun -= 1; evt.stun = true; return evt; } // étourdi : pas d'action
  if (e.intention?.type === "attaque") {
    // Confusion (éblouissement) : la frappe part sur une cible AU HASARD parmi le
    // héros, les autres ennemis vivants, ou l'ennemi LUI-MÊME.
    let cibleConf = "heros";
    if (confusActif) {
      const pool = [{ t: "heros" }];
      combat.ennemis.forEach((o, j) => { if (ennemiVivant(o)) pool.push({ t: "ennemi", j }); });
      const choix = pool[Math.floor(Math.random() * pool.length)];
      cibleConf = choix.t === "heros" ? "heros" : choix.j;
      evt.confus = true;
    }
    if (cibleConf === "heros") {
      const avantPv = combat.pvHeros;
      const avantPierre = combat.pierre;
      subirDegats(combat, e.intention.valeur);
      evt.attaque = avantPv - combat.pvHeros;          // PV réellement perdus (après la Pierre)
      evt.armureAbsorbe = avantPierre - combat.pierre; // Pierre retirée par le coup (coup encaissé)
      // Passifs « quand frappé en mêlée » (set Onyx : l'attaquant prend du feu ;
      // set Croisé : l'attaquant est ébloui). Même si la Pierre a tout absorbé.
      const retour = declencherFrappeMelee(combat, e);
      evt.brulureRetour = retour.brulure;
      evt.confusionRetour = retour.confusion;
      // Riposte (Rebond) : renvoie à l'attaquant les dégâts de son attaque, mais
      // SEULEMENT si c'est un ennemi de MÊLÉE (pas les attaquants à distance).
      if (combat.riposte > 0 && e.def?.affix !== "range") {
        evt.riposteRenvoi = e.intention.valeur;
        e.pv = Math.max(0, e.pv - evt.riposteRenvoi);
        combat.riposte -= 1;
        if (e.pv <= 0) { evt.mortStatut = true; verifierFin(combat); }
      }
    } else {
      // Confusion : frappe un allié (ou soi-même). Pas de Pierre côté ennemi, pas
      // de passif de mêlée (le héros n'est pas touché). Friendly fire pur.
      const victime = combat.ennemis[cibleConf];
      const avant = victime.pv;
      victime.pv = Math.max(0, victime.pv - e.intention.valeur);
      evt.attaqueAllie = avant - victime.pv;
      evt.idxAttaqueAllie = cibleConf;
    }
  } else if (e.intention?.type === "soigner") {
    // Soigne la cible VERROUILLÉE à la préparation (l'allié au % le plus bas
    // alors), sauf si elle est morte entre-temps → une nouvelle est verrouillée.
    const cible = cibleSoinVerrou(combat, e);
    if (cible) {
      const avant = cible.pv;
      cible.pv = Math.min(cible.pvMax, cible.pv + e.intention.valeur);
      evt.soin_allie = cible.pv - avant;
      evt.idx_soin = combat.ennemis.indexOf(cible);
    }
  } else if (e.intention?.type === "haste-allie") {
    // Célérité à tous les alliés vivants (pas le chaman lui-même).
    const alliés = combat.ennemis.filter((a, j) => j !== i && ennemiVivant(a));
    for (const a of alliés) a.haste += e.intention.valeur;
    evt.haste_allie = alliés.length ? e.intention.valeur : 0;
  }
  verifierFin(combat);
  return evt;
}

// Début d'un TOUR DU HÉROS (désigné par l'initiative) : la Chaleur recharge +
// surchauffe, le poison/feu du héros tiquent, puis on pioche une main et on
// prévoit les intentions. Le TOUT 1er tour ne recharge pas (forge froide).
export function commencerTourHeros(combat) {
  combat.tourSaute = false;
  combat.gelExplosionHeros = 0;
  if (combat.premierTourHeros) {
    combat.premierTourHeros = false;
    combat.derniereBrulure = combat.dernierPoisonHeros = combat.dernierFeuHeros = 0;
  } else {
    combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + combat.chaleurRecharge);
    combat.derniereBrulure = degatsSurchauffe(combat);
    if (combat.derniereBrulure > 0) {
      combat.pvHeros = Math.max(0, combat.pvHeros - combat.derniereBrulure);
      verifierFin(combat);
      if (combat.fini) return;
    }
    combat.dernierPoisonHeros = tiquerHeros(combat, "poison");
    combat.dernierFeuHeros = tiquerHeros(combat, "feu");
    verifierFin(combat);
    if (combat.fini) return;
  }
  if (combat.hate   > 0) combat.hate   -= 1; // la Hâte temporaire s'écoule (1 tour du héros)
  if (combat.celeriteParTour > 0) combat.hatePerm += combat.celeriteParTour; // Long run : +N Hâte PERMANENTE par tour (s'accumule, ne s'écoule pas)
  if (combat.force  > 0) combat.force  -= 1; // la Force temporaire s'écoule (1 tour du héros)
  // Glace brisée (héros) : à GEL_EXPLOSION stacks, il saute son tour, perd
  // GEL_EXPLOSION stacks et subit DEGATS_GEL_EXPLOSION dégâts directs. (Aucun
  // ennemi ne gèle le héros pour l'instant, mais la règle est prête.)
  if (combat.gelHeros >= GEL_EXPLOSION) {
    combat.gelHeros -= GEL_EXPLOSION;
    combat.gelExplosionHeros = DEGATS_GEL_EXPLOSION;
    combat.pvHeros = Math.max(0, combat.pvHeros - DEGATS_GEL_EXPLOSION);
    combat.tourSaute = true;
    verifierFin(combat);
    return; // gelé solide : pas de pioche ni d'intentions, le tour est sauté
  } else if (combat.gelHeros > 0) {
    combat.gelHeros -= 1; // le Gel héros s'écoule (1 tour du héros)
  }
  if (combat.regen > 0) { // Régénération : soigne `regen` PV, puis -1 stack (comme le poison à l'envers)
    combat.dernierSoin = Math.min(combat.regen, combat.pvHerosMax - combat.pvHeros);
    combat.pvHeros = Math.min(combat.pvHerosMax, combat.pvHeros + combat.regen);
    combat.regen -= 1;
  } else combat.dernierSoin = 0;
  piocherMain(combat);
  prevoirIntentions(combat);
  combat.cible = premierVivant(combat);
  combat.tourJoueur = true;
}

// Fin du tour du héros : la main repart en défausse. L'initiative désignera la suite.
export function finirTourHeros(combat) {
  combat.tourJoueur = false;
  propagerFeu(combat); // le Feu posé par une carte ce tour se répand une fois aux voisins
  combat.defausse.push(...combat.main);
  combat.main = [];
  // Innaretable : tour(s) bonus → on remplit la jauge d'initiative du héros pour
  // qu'il rejoue IMMÉDIATEMENT (les ennemis ne gagnent rien entre-temps : leurs
  // jauges n'avancent pas tant que le héros est déjà au seuil).
  if (combat.toursBonus > 0) {
    combat.toursBonus -= 1;
    combat.initHeros = SEUIL_INIT;
  }
}

// ----- Initiative (ATB) : qui agit, et la file des prochains -------------------

// Photo de l'état d'initiative (héros + ennemis vivants) — vitesses EFFECTIVES.
function snapshotInit(combat) {
  return {
    heros: { init: combat.initHeros, vit: vitesseHeros(combat) },
    ennemis: combat.ennemis.map((e) => ({ pv: e.pv, init: e.init, vit: vitesseEnnemi(e) })),
  };
}
function ecrireInit(combat, s) {
  combat.initHeros = s.heros.init;
  combat.ennemis.forEach((e, i) => { e.init = s.ennemis[i].init; });
}

// Avance les jauges jusqu'au prochain acteur, le CONSOMME (init -= SEUIL) et le
// renvoie. Priorité au héros à égalité, puis aux ennemis de gauche à droite.
function etapeInit(s) {
  const acts = [{ id: "heros" }];
  s.ennemis.forEach((e, i) => { if (e.pv > 0) acts.push({ id: "ennemi", i }); });
  const inf = (a) => (a.id === "heros" ? s.heros : s.ennemis[a.i]);
  let dt = Infinity;
  for (const a of acts) {
    const o = inf(a);
    dt = Math.min(dt, Math.max(0, (SEUIL_INIT - o.init) / o.vit));
  }
  for (const a of acts) { const o = inf(a); o.init += o.vit * dt; }
  const acteur = acts.find((a) => inf(a).init >= SEUIL_INIT - 1e-6) || acts[0];
  inf(acteur).init -= SEUIL_INIT;
  return acteur;
}

// Désigne le prochain acteur ("heros" ou {ennemi:i}) et met à jour le combat.
export function avancerInitiative(combat) {
  const s = snapshotInit(combat);
  const acteur = etapeInit(s);
  ecrireInit(combat, s);
  return acteur;
}

// La FILE des `n` prochains acteurs, SANS modifier le combat (pour l'affichage).
// Chaque élément : { id:"heros" } ou { id:"ennemi", i }.
export function simulerFile(combat, n) {
  const s = snapshotInit(combat);
  const file = [];
  for (let k = 0; k < n; k++) file.push(etapeInit(s));
  return file;
}

// Fraction de remplissage de la jauge d'initiative d'un combattant (0..1, pour l'UI).
export function ratioInitiativeHeros(combat) {
  return Math.max(0, Math.min(1, combat.initHeros / SEUIL_INIT));
}
export function ratioInitiativeEnnemi(e) {
  return Math.max(0, Math.min(1, e.init / SEUIL_INIT));
}
