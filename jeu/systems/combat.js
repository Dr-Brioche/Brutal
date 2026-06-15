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
// Deck de base commun : des cartes FAIBLES à 0 Chaleur (toujours jouables).
const DECK_BASE = [
  "coup-faible", "coup-faible", "coup-faible", "coup-faible", "coup-faible",
  "garde-faible", "garde-faible", "garde-faible",
];

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
// La VALEUR d'une carte = le NOMBRE DE TOURS d'effet (la durée), pas un montant
// de vitesse. L'intensité, elle, est FIXE : +30% (hâte) ou −30% (gel).
const HATE_MULT = 1.30; // « Hâte » (célérité) : agilité du héros ×1.30 pendant N tours
const GEL_MULT  = 0.70; // « Gel » (lenteur)   : vitesse de l'ennemi ×0.70 pendant N tours
// ---------------------------------------------------------------------------

// Mélange une copie du tableau (Fisher-Yates : chaque ordre est équiprobable).
function melanger(tableau) {
  const t = [...tableau];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

// Construit le deck de départ : deck de base + cartes de l'équipement + cartes
// de maîtrise choisies (facultatif). Exporté pour que le deck UI soit fidèle.
export function composerDeck(cartesEquip, cartesSupp = []) {
  const ids = [...DECK_BASE];
  for (const idCarte of cartesEquip ?? []) ids.push(idCarte);
  for (const idCarte of cartesSupp ?? []) ids.push(idCarte);
  return ids.map((id) => CARTES[id]).filter(Boolean);
}

// Un ennemi EN COMBAT : sa définition (stats/sprite) + son état mutable.
function creerEnnemiCombat(def) {
  return {
    def, pv: def.pv, pvMax: def.pv,
    poison: 0, feu: 0, sang: 0,    // statuts (dégâts dans le temps ; sang = vol de vie)
    stun: 0,                       // étourdissement : nb de SES tours encore sautés
    dernierPoison: 0, dernierFeu: 0, dernierSang: 0, // dégâts subis au dernier tour (UI)
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
  const { pv = 40, pvMax = 40, cartes = [], cartesSupp = [], stats = {} } = opts;
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
    pierre: 0,
    poisonHeros: 0,
    feuHeros: 0,
    // Chaleur de Forge + surchauffe (réglages modifiés par l'équipement)
    chaleur: chaleurDepart,
    chaleurRecharge,
    chaleurSeuil,
    chaleurMax,
    derniereBrulure: 0,
    dernierPoisonHeros: 0,
    dernierFeuHeros: 0,
    dernierSoinSang: 0,    // PV rendus au héros par le saignement ce tour (pour l'UI)
    // Initiative (ATB)
    vitesseHerosBase: VITESSE_HEROS_BASE + (stats.agilite || 0), // + talents d'agilité
    hate: 0,               // « Hâte » : nb de tours du héros encore accélérés (+30% agilité)
    initHeros: SEUIL_INIT / 2, // petite avance : le héros OUVRE le combat (jamais frappé avant d'agir)
    premierTourHeros: true, // le 1er tour ne recharge pas la Chaleur (forge froide)
    // Ennemis (liste) + l'ennemi visé
    ennemis: ennemisDefs.map(creerEnnemiCombat),
    cible: 0,
    // Deck
    pioche: melanger(composerDeck(cartes, cartesSupp)),
    main: [],
    defausse: [],
    tailleMain: TAILLE_MAIN + (stats.pioche || 0), // cartes piochées/tour (+ talents)
    // Déroulé
    tourJoueur: false,     // devient true au 1er tour du héros (commencerTourHeros)
    fini: false,
    resultat: null,
  };
  prevoirIntentions(combat);
  combat.cible = premierVivant(combat);
  return combat; // la 1re main est piochée par le 1er commencerTourHeros (via l'initiative)
}

// Vitesse EFFECTIVE (après les statuts de vitesse Hâte/Gel). Jamais < 1.
export function vitesseHeros(combat) {
  const v = combat.hate > 0 ? combat.vitesseHerosBase * HATE_MULT : combat.vitesseHerosBase;
  return Math.max(1, v);
}
export function vitesseEnnemi(e) {
  let v = e.vitesse;
  if (e.haste > 0) v *= HATE_MULT; // Hâte alliée : +30% de vitesse
  if (e.gel > 0)   v *= GEL_MULT;  // Gel : −30% de vitesse (cumulable avec hâte)
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

function piocherMain(combat) {
  for (let i = 0; i < combat.tailleMain; i++) {
    const carte = piocherUne(combat);
    if (carte) combat.main.push(carte);
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

// Chaque ennemi annonce son prochain coup. Les ennemis avec `def.actions` tirent
// aléatoirement parmi leurs actions pondérées ; les autres attaquent toujours.
function prevoirIntentions(combat) {
  for (const e of combat.ennemis) {
    if (!ennemiVivant(e)) { e.intention = null; continue; }
    if (e.def.actions?.length) {
      const a = choisirAction(e.def.actions);
      e.intention = { type: a.type, valeur: a.valeur };
    } else {
      e.intention = { type: "attaque", valeur: e.def.attaque };
    }
  }
}

// Une carte vise-t-elle un ennemi ? (dégâts/poison/feu). Sinon elle se joue
// directement sur soi (Pierre…), sans choix de cible.
export function carteVise(carte) {
  return (carte?.effets ?? []).some(
    (e) => e.type === "degats" || e.type === "poison" || e.type === "feu" ||
           e.type === "sang" || e.type === "stun" || e.type === "lenteur"
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
         e.type === "sang"   || e.type === "stun"   || e.type === "lenteur";
}

// Applique un effet de carte : les effets offensifs touchent `ennemi` (la cible),
// les défensifs touchent le héros.
function appliquerEffet(combat, effet, ennemi) {
  if (effet.type === "degats") {
    if (ennemi) ennemi.pv = Math.max(0, ennemi.pv - effet.valeur);
  } else if (effet.type === "pierre") {
    combat.pierre += effet.valeur;
  } else if (effet.type === "poison") {
    if (ennemi) ennemi.poison += effet.valeur;
  } else if (effet.type === "feu") {
    if (ennemi) ennemi.feu += effet.valeur;
  } else if (effet.type === "sang") {
    if (ennemi) ennemi.sang += effet.valeur; // saignement : soigne le héros à chaque tick
  } else if (effet.type === "stun") {
    if (ennemi) ennemi.stun += effet.valeur; // étourdit : l'ennemi saute ses prochains tours (cumulable)
  } else if (effet.type === "chaleur") {
    // Régénère de l'énergie (Chaleur). Peut dépasser le SEUIL → surchauffe au
    // tour suivant : énergie immédiate, mais risque de brûlure (choix tactique).
    combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + effet.valeur);
  } else if (effet.type === "celerite") {
    combat.hate += effet.valeur;            // Hâte : +30% d'agilité pendant `valeur` tours (la durée se cumule)
  } else if (effet.type === "lenteur") {
    if (ennemi) ennemi.gel += effet.valeur; // Gel : −30% de vitesse pendant `valeur` tours (la durée se cumule)
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

  combat.chaleur -= carte.cout;

  if (carteAOE(carte)) {
    // AOE : les effets offensifs frappent TOUS les ennemis vivants.
    // Les effets défensifs (pierre, chaleur, célérité) s'appliquent normalement.
    const vivants = combat.ennemis.filter(ennemiVivant);
    for (const effet of carte.effets) {
      if (effetViseEnnemi(effet)) for (const e of vivants) appliquerEffet(combat, effet, e);
      else appliquerEffet(combat, effet, null);
    }
  } else {
    // Carte ciblée : on vise un ennemi VIVANT (sinon on retombe sur le premier vivant).
    let ennemi = combat.ennemis[cible];
    if (!ennemiVivant(ennemi)) ennemi = combat.ennemis[premierVivant(combat)];
    // Les effets normaux s'appliquent à la cible (`rebond` est traité séparément).
    for (const effet of carte.effets) {
      if (effet.type !== "rebond") appliquerEffet(combat, effet, ennemi);
    }
    // Rebond : si la cible meurt, les mêmes dégâts frappent le prochain ennemi vivant.
    const rebondEff = carte.effets.find((e) => e.type === "rebond");
    if (rebondEff && ennemi && ennemi.pv <= 0) {
      const idx = combat.ennemis.indexOf(ennemi);
      const suivant = combat.ennemis.find((e, i) => i !== idx && ennemiVivant(e));
      if (suivant) appliquerEffet(combat, { type: "degats", valeur: rebondEff.valeur }, suivant);
    }
  }

  combat.main.splice(index, 1);
  combat.defausse.push(carte);
  verifierFin(combat);
  return true;
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

// Propagation de l'Enflammé : quand un ennemi agit, s'il était en feu il enflamme
// ses voisins VIVANTS non encore enflammés (de sa valeur de feu après tick). Il
// propage même s'il vient de mourir de son feu (« il brûle, propage, puis meurt »).
function propagerDepuis(combat, i, force) {
  if (force <= 0) return;
  for (const j of [i - 1, i + 1]) {
    const v = combat.ennemis[j];
    if (v && v.pv > 0 && v.feu <= 0) v.feu = force;
  }
}

// Un ennemi agit : poison + feu (+ propagation) + saignement (le sang SOIGNE le
// héros), puis il exécute son intention — SAUF s'il est étourdi (stun).
// Renvoie ce qui s'est passé, pour que l'écran l'anime.
export function agirEnnemi(combat, i) {
  const e = combat.ennemis[i];
  const evt = {
    poison: 0, feu: 0, sang: 0, soin: 0, mortStatut: false,
    attaque: 0, stun: false,
    soin_allie: 0,  // PV soignés sur un allié
    idx_soin: -1,   // index de l'ennemi soigné (pour le floater UI)
    haste_allie: 0, // tours de hâte donnés aux alliés vivants
  };
  if (!e || e.pv <= 0) return evt;
  const enFeuAvant = e.feu > 0;
  evt.poison = e.dernierPoison = tiquerEnnemi(e, "poison");
  evt.feu = e.dernierFeu = tiquerEnnemi(e, "feu");
  evt.sang = e.dernierSang = tiquerEnnemi(e, "sang");
  if (enFeuAvant) propagerDepuis(combat, i, e.feu); // enflamme les voisins (même s'il meurt)
  if (e.gel   > 0) e.gel   -= 1; // le Gel s'écoule (1 de SES tours), même étourdi
  if (e.haste > 0) e.haste -= 1; // la Hâte s'écoule (1 de SES tours)
  if (evt.sang > 0) {
    const avant = combat.pvHeros;
    combat.pvHeros = Math.min(combat.pvHerosMax, combat.pvHeros + evt.sang);
    evt.soin = combat.pvHeros - avant;
    combat.dernierSoinSang += evt.soin;
  }
  if (e.pv <= 0) { evt.mortStatut = true; verifierFin(combat); return evt; }
  if (e.stun > 0) { e.stun -= 1; evt.stun = true; return evt; } // étourdi : pas d'action
  if (e.intention?.type === "attaque") {
    const avant = combat.pvHeros;
    subirDegats(combat, e.intention.valeur);
    evt.attaque = avant - combat.pvHeros; // PV réellement perdus (après la Pierre)
  } else if (e.intention?.type === "soigner") {
    // Soigne l'allié le plus blessé (lui-même si seul survivant).
    const alliés = combat.ennemis.filter((a, j) => j !== i && ennemiVivant(a));
    const pool = alliés.length ? alliés : [e];
    const cible = pool.reduce((b, a) => (!b || a.pv < b.pv) ? a : b, null);
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
  combat.dernierSoinSang = 0;
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
  if (combat.hate > 0) combat.hate -= 1; // la Hâte s'écoule (1 tour du héros)
  piocherMain(combat);
  prevoirIntentions(combat);
  combat.cible = premierVivant(combat);
  combat.tourJoueur = true;
}

// Fin du tour du héros : la main repart en défausse. L'initiative désignera la suite.
export function finirTourHeros(combat) {
  combat.tourJoueur = false;
  combat.defausse.push(...combat.main);
  combat.main = [];
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
