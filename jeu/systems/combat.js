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
    (e) => e.type === "degats" || e.type === "poison" || e.type === "feu" || e.type === "sang"
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
function propagerFeu(combat) {
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
      if (j >= 0 && j < es.length && es[j].pv > 0 && avant[j] > 0) {
        recu = Math.max(recu, avant[j]); // prend le feu du voisin le plus ardent
      }
    }
    if (recu > 0) e.feu = recu;
  });
}

// Fin du tour du joueur : chaque ennemi agit, le feu se propage, puis nouveau tour.
export function finirTour(combat) {
  if (combat.fini || !combat.tourJoueur) return;
  combat.tourJoueur = false;
  combat.dernierPoisonHeros = combat.dernierFeuHeros = combat.dernierSoinSang = 0;
  for (const e of combat.ennemis) { e.dernierPoison = 0; e.dernierFeu = 0; e.dernierSang = 0; }

  // Les cartes encore en main repartent à la défausse
  combat.defausse.push(...combat.main);
  combat.main = [];

  // Chaque ennemi vivant : poison + feu + saignement en début de SON tour, puis
  // il attaque. Le saignement absorbé SOIGNE le héros du même montant.
  for (const e of combat.ennemis) {
    if (e.pv <= 0) continue;
    e.dernierPoison = tiquerEnnemi(e, "poison");
    e.dernierFeu = tiquerEnnemi(e, "feu");
    e.dernierSang = tiquerEnnemi(e, "sang");
    if (e.dernierSang > 0) {
      const avant = combat.pvHeros;
      combat.pvHeros = Math.min(combat.pvHerosMax, combat.pvHeros + e.dernierSang);
      combat.dernierSoinSang += combat.pvHeros - avant; // soin réellement appliqué
    }
    if (e.pv <= 0) continue;            // mort par statut → il n'attaque pas
    if (e.intention?.type === "attaque") subirDegats(combat, e.intention.valeur);
    if (combat.pvHeros <= 0) break;     // héros mort → on arrête là
  }
  verifierFin(combat);
  if (combat.fini) return;

  // FIN du tour ennemi : le feu se propage aux voisins.
  propagerFeu(combat);

  // Nouveau tour du HÉROS : Chaleur + surchauffe (dégâts DIRECTS, la Pierre ne
  // protège pas du feu intérieur), puis poison + feu du héros. (La Pierre persiste.)
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
