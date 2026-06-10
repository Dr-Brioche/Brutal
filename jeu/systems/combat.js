// Le moteur de combat : l'état d'une bataille + les règles qui le font évoluer.
//
// Ici, AUCUN affichage : que des nombres et des règles (comme equipement.js).
// L'écran de combat (jeu/ui/combat.js) lit cet état et le dessine.
//
// Grammaire (façon Slay the Spire) :
//   - on pioche une main, on joue des cartes en dépensant de la Chaleur de Forge ;
//   - chaque carte va ensuite à la défausse ;
//   - « End Turn » : l'ennemi frappe selon son intention, puis nouveau tour.
//
// Twist nain VERROUILLÉ : la défense « Pierre » PERSISTE entre les tours
// (contrairement au Blocage classique qui disparaît chaque tour).

import { CARTES } from "../data/cartes.js";
import { armeActuelle } from "./equipement.js";

// ----- Réglages (équilibrage, valeurs provisoires) -------------------------
const PV_HEROS = 40;
const ENERGIE_PAR_TOUR = 3;   // Chaleur de Forge regénérée à chaque tour
const TAILLE_MAIN = 5;        // cartes piochées par tour
// Deck de base commun (avant l'ajout des cartes d'équipement)
const DECK_BASE = ["frappe", "frappe", "frappe", "frappe", "garde", "garde", "garde"];
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

// Construit le deck de départ : deck de base + les cartes de l'arme équipée
// (« le deck est le miroir de l'équipement »). On met 2 exemplaires de la
// carte d'arme pour bien la voir pendant ces premiers tests.
function construireDeck(equipement) {
  const ids = [...DECK_BASE];
  const arme = armeActuelle(equipement);
  for (const idCarte of arme.cartes ?? []) {
    ids.push(idCarte, idCarte);
  }
  return ids.map((id) => CARTES[id]);
}

export function creerCombat(equipement, ennemi) {
  const combat = {
    // Héros
    pvHerosMax: PV_HEROS,
    pvHeros: PV_HEROS,
    pierre: 0,
    energieMax: ENERGIE_PAR_TOUR,
    energie: ENERGIE_PAR_TOUR,
    // Ennemi
    ennemi,
    pvEnnemiMax: ennemi.pv,
    pvEnnemi: ennemi.pv,
    intention: null,        // ce que l'ennemi prépare (télégraphié au joueur)
    // Deck
    pioche: melanger(construireDeck(equipement)),
    main: [],
    defausse: [],
    // Déroulé
    tourJoueur: true,
    fini: false,
    resultat: null,         // "victoire" | "defaite"
  };
  piocherMain(combat);
  prevoirIntention(combat);
  return combat;
}

// Pioche une carte ; si la pioche est vide, on remélange la défausse dedans.
function piocherUne(combat) {
  if (combat.pioche.length === 0) {
    combat.pioche = melanger(combat.defausse);
    combat.defausse = [];
  }
  return combat.pioche.pop() ?? null; // null = vraiment plus aucune carte
}

function piocherMain(combat) {
  for (let i = 0; i < TAILLE_MAIN; i++) {
    const carte = piocherUne(combat);
    if (carte) combat.main.push(carte);
  }
}

// L'ennemi annonce son prochain coup (v1 : il attaque, toujours).
function prevoirIntention(combat) {
  combat.intention = { type: "attaque", valeur: combat.ennemi.attaque };
}

function appliquerEffet(combat, effet) {
  if (effet.type === "degats") {
    combat.pvEnnemi = Math.max(0, combat.pvEnnemi - effet.valeur);
  } else if (effet.type === "pierre") {
    combat.pierre += effet.valeur;
  }
}

// Le héros encaisse : la Pierre absorbe d'abord, le reste entame les PV.
// La Pierre qui survit RESTE pour les tours suivants (twist nain).
function subirDegats(combat, degats) {
  const absorbe = Math.min(combat.pierre, degats);
  combat.pierre -= absorbe;
  combat.pvHeros = Math.max(0, combat.pvHeros - (degats - absorbe));
}

function verifierFin(combat) {
  if (combat.pvEnnemi <= 0) {
    combat.fini = true;
    combat.resultat = "victoire";
  } else if (combat.pvHeros <= 0) {
    combat.fini = true;
    combat.resultat = "defaite";
  }
}

// Joue la carte à l'indice `index` de la main. Renvoie true si elle a été jouée.
export function jouerCarte(combat, index) {
  if (combat.fini || !combat.tourJoueur) return false;
  const carte = combat.main[index];
  if (!carte || carte.cout > combat.energie) return false;

  combat.energie -= carte.cout;
  for (const effet of carte.effets) appliquerEffet(combat, effet);

  combat.main.splice(index, 1);
  combat.defausse.push(carte);
  verifierFin(combat);
  return true;
}

// Fin du tour du joueur : l'ennemi frappe, puis on prépare le tour suivant.
export function finirTour(combat) {
  if (combat.fini || !combat.tourJoueur) return;
  combat.tourJoueur = false;

  // Les cartes encore en main repartent à la défausse
  combat.defausse.push(...combat.main);
  combat.main = [];

  // L'ennemi exécute son intention
  if (combat.intention?.type === "attaque") {
    subirDegats(combat, combat.intention.valeur);
  }
  verifierFin(combat);
  if (combat.fini) return;

  // Nouveau tour du joueur (la Pierre n'est PAS remise à zéro : elle persiste)
  combat.energie = combat.energieMax;
  piocherMain(combat);
  prevoirIntention(combat);
  combat.tourJoueur = true;
}
