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
const TAILLE_MAIN = 5;        // cartes piochées par tour
// Deck de base commun (avant l'ajout des cartes d'équipement)
const DECK_BASE = ["frappe", "frappe", "frappe", "frappe", "garde", "garde", "garde"];

// La Chaleur de Forge (l'énergie des cartes). Elle PERSISTE entre les tours et
// peut monter en SURCHAUFFE au-dessus du seuil. Ces valeurs de base seront
// modifiables par l'équipement plus tard.
const CHALEUR_DEPART = 3;     // chaleur au début du combat
const CHALEUR_RECHARGE = 1;   // +1 par tour
const CHALEUR_SEUIL = 3;      // au-delà = surchauffe (le « max » de base)
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
    // Chaleur de Forge (persiste, comme la Pierre) + ses stats de surchauffe
    chaleur: CHALEUR_DEPART,
    chaleurRecharge: CHALEUR_RECHARGE,
    chaleurSeuil: CHALEUR_SEUIL,
    chaleurMax: CHALEUR_MAX,
    derniereBrulure: 0,        // dégâts de surchauffe au dernier tour (pour l'UI)
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

// Dégâts de surchauffe pour la chaleur actuelle : (chaleur - seuil)² si on
// dépasse le seuil, sinon 0. (Ex. seuil 3 : à 4 → 1, à 5 → 4, à 6 → 9…)
export function degatsSurchauffe(combat) {
  const surplus = combat.chaleur - combat.chaleurSeuil;
  return surplus > 0 ? surplus * surplus : 0;
}

// Joue la carte à l'indice `index` de la main. Renvoie true si elle a été jouée.
export function jouerCarte(combat, index) {
  if (combat.fini || !combat.tourJoueur) return false;
  const carte = combat.main[index];
  if (!carte || carte.cout > combat.chaleur) return false;

  combat.chaleur -= carte.cout;
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

  // Nouveau tour : on recharge la Chaleur (elle persiste et peut surchauffer),
  // puis la surchauffe brûle le héros — dégâts DIRECTS, la Pierre ne protège
  // pas du feu intérieur. (La Pierre, elle, n'est jamais remise à zéro.)
  combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + combat.chaleurRecharge);
  combat.derniereBrulure = degatsSurchauffe(combat);
  if (combat.derniereBrulure > 0) {
    combat.pvHeros = Math.max(0, combat.pvHeros - combat.derniereBrulure);
    verifierFin(combat);
    if (combat.fini) return;
  }
  piocherMain(combat);
  prevoirIntention(combat);
  combat.tourJoueur = true;
}
