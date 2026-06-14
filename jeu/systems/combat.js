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
const TAILLE_MAIN = 5;        // cartes piochées par tour
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

// Construit le deck de départ : deck de base + cartes de l'équipement (×2).
// Exporté pour que l'écran de deck montre EXACTEMENT le deck joué.
export function composerDeck(cartesEquip) {
  const ids = [...DECK_BASE];
  for (const idCarte of cartesEquip ?? []) ids.push(idCarte, idCarte);
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
  };
}
export function ennemiVivant(e) { return e && e.pv > 0; }

// `ennemisDefs` : tableau de définitions d'ennemis (data/ennemis.js).
// `opts` : { pv, pvMax, cartes, stats } — vie (persiste) + cartes de l'équipement
// + réglages chiffrés (`stats`) venant de l'arbre de talents.
export function creerCombat(ennemisDefs, opts = {}) {
  const { pv = 40, pvMax = 40, cartes = [], stats = {} } = opts;
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
    // Ennemis (liste) + l'ennemi visé
    ennemis: ennemisDefs.map(creerEnnemiCombat),
    cible: 0,
    // Deck
    pioche: melanger(composerDeck(cartes)),
    main: [],
    defausse: [],
    tailleMain: TAILLE_MAIN + (stats.pioche || 0), // cartes piochées/tour (+ talents)
    // Déroulé
    tourJoueur: true,
    fini: false,
    resultat: null,
  };
  piocherMain(combat);
  prevoirIntentions(combat);
  combat.cible = premierVivant(combat);
  return combat;
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

// Chaque ennemi annonce son prochain coup (v1 : il attaque, toujours).
function prevoirIntentions(combat) {
  for (const e of combat.ennemis) {
    e.intention = ennemiVivant(e) ? { type: "attaque", valeur: e.def.attaque } : null;
  }
}

// Une carte vise-t-elle un ennemi ? (dégâts/poison/feu). Sinon elle se joue
// directement sur soi (Pierre…), sans choix de cible.
export function carteVise(carte) {
  return (carte?.effets ?? []).some(
    (e) => e.type === "degats" || e.type === "poison" || e.type === "feu" ||
           e.type === "sang" || e.type === "stun"
  );
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
// ne vise personne). Renvoie true si elle a été jouée.
export function jouerCarte(combat, index, cible = combat.cible) {
  if (combat.fini || !combat.tourJoueur) return false;
  const carte = combat.main[index];
  if (!carte || carte.cout > combat.chaleur) return false;

  // On vise un ennemi VIVANT (sinon on retombe sur le premier vivant).
  let ennemi = combat.ennemis[cible];
  if (!ennemiVivant(ennemi)) ennemi = combat.ennemis[premierVivant(combat)];

  combat.chaleur -= carte.cout;
  for (const effet of carte.effets) appliquerEffet(combat, effet, ennemi);

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

// Propagation de l'Enflammé aux ennemis ADJACENTS, à la FIN du tour ennemi :
// chaque ennemi en feu transmet son nombre de ticks COURANT (déjà décrémenté ce
// tour) à ses voisins vivants. Calcul SIMULTANÉ pour ne pas cascader le même tour.
//
// `vivantAvant[i]` = l'ennemi i était-il vivant AU DÉBUT du tour ennemi ? Un
// ennemi qui vient de mourir de SON feu ce tour-ci propage quand même ses
// flammes avant de disparaître (« il brûle, propage, puis meurt ») — alors qu'un
// ennemi mort à un tour précédent, lui, ne propage plus.
function propagerFeu(combat, vivantAvant) {
  const es = combat.ennemis;
  if (es.length < 2) return; // pas de voisin → rien à propager
  // État du feu AVANT propagation : un ennemi DÉJÀ en feu ne se ré-enflamme pas
  // (il continue juste à brûler) ; seuls les voisins NON enflammés prennent feu.
  // Calcul simultané (pas de cascade le même tour) → la flamme avance d'un cran.
  const avant = es.map((e) => e.feu);
  es.forEach((e, i) => {
    if (e.pv <= 0 || avant[i] > 0) return; // mort, ou déjà en feu → ne reçoit rien
    let recu = 0;
    for (const j of [i - 1, i + 1]) {
      if (j >= 0 && j < es.length && vivantAvant[j] && avant[j] > 0) {
        recu = Math.max(recu, avant[j]); // prend le feu du voisin le plus ardent
      }
    }
    if (recu > 0) e.feu = recu;
  });
}

// ----- Le tour ENNEMI, en 3 étapes pour pouvoir le JOUER au ralenti -----------
// (l'écran de combat appelle ces étapes une par une, ennemi par ennemi, de
//  gauche à droite, pour qu'on voie chaque attaque ; `finirTour` plus bas fait
//  tout d'un coup pour les usages instantanés.)

// Début du tour ennemi : on défausse la main, on remet à zéro les compteurs
// d'affichage. Renvoie l'ORDRE des ennemis qui agissent (vivants, gauche→droite)
// et l'instantané `vivantAvant` (pour la propagation du feu).
export function commencerTourEnnemi(combat) {
  combat.tourJoueur = false;
  combat.dernierPoisonHeros = combat.dernierFeuHeros = combat.dernierSoinSang = 0;
  for (const e of combat.ennemis) { e.dernierPoison = 0; e.dernierFeu = 0; e.dernierSang = 0; }
  combat.defausse.push(...combat.main);
  combat.main = [];
  const vivantAvant = combat.ennemis.map((e) => e.pv > 0);
  const ordre = combat.ennemis.map((_, i) => i).filter((i) => combat.ennemis[i].pv > 0);
  return { vivantAvant, ordre };
}

// Un ennemi agit : poison + feu + saignement (le sang SOIGNE le héros), puis il
// attaque — SAUF s'il est étourdi (il saute son tour, le stun baisse). Renvoie ce
// qui s'est passé, pour que l'écran l'anime.
export function agirEnnemi(combat, i) {
  const e = combat.ennemis[i];
  const evt = { poison: 0, feu: 0, sang: 0, soin: 0, mortStatut: false, attaque: 0, stun: false };
  if (!e || e.pv <= 0) return evt;
  evt.poison = e.dernierPoison = tiquerEnnemi(e, "poison");
  evt.feu = e.dernierFeu = tiquerEnnemi(e, "feu");
  evt.sang = e.dernierSang = tiquerEnnemi(e, "sang");
  if (evt.sang > 0) {
    const avant = combat.pvHeros;
    combat.pvHeros = Math.min(combat.pvHerosMax, combat.pvHeros + evt.sang);
    evt.soin = combat.pvHeros - avant;
    combat.dernierSoinSang += evt.soin;
  }
  if (e.pv <= 0) { evt.mortStatut = true; verifierFin(combat); return evt; }
  if (e.stun > 0) { e.stun -= 1; evt.stun = true; return evt; } // étourdi : pas d'attaque
  if (e.intention?.type === "attaque") {
    const avant = combat.pvHeros;
    subirDegats(combat, e.intention.valeur);
    evt.attaque = avant - combat.pvHeros; // PV réellement perdus (après la Pierre)
  }
  verifierFin(combat);
  return evt;
}

// Fin du tour ennemi : le feu se propage, puis nouveau tour du HÉROS (Chaleur +
// surchauffe + poison/feu du héros), pioche d'une main et intentions.
export function terminerTourEnnemi(combat, vivantAvant) {
  verifierFin(combat);
  if (combat.fini) return;
  propagerFeu(combat, vivantAvant);

  // Chaleur + surchauffe (dégâts DIRECTS, la Pierre ne protège pas du feu intérieur).
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

  piocherMain(combat);
  prevoirIntentions(combat);
  combat.cible = premierVivant(combat); // la cible peut être morte ce tour
  combat.tourJoueur = true;
}

// Tout le tour ennemi d'un coup (instantané). L'écran, lui, préfère séquencer.
export function finirTour(combat) {
  if (combat.fini || !combat.tourJoueur) return;
  const { vivantAvant, ordre } = commencerTourEnnemi(combat);
  for (const i of ordre) {
    agirEnnemi(combat, i);
    if (combat.pvHeros <= 0) break;
  }
  terminerTourEnnemi(combat, vivantAvant);
}
