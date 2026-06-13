// Le moteur de combat : l'état d'une bataille + les règles qui le font évoluer.
//
// Ici, AUCUN affichage : que des nombres et des règles (comme inventaire.js).
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

// ----- Réglages (équilibrage, valeurs provisoires) -------------------------
const TAILLE_MAIN = 5;        // cartes piochées par tour
// Deck de base commun : des cartes FAIBLES à 0 Chaleur (toujours jouables),
// avant l'ajout des cartes fortes (coûteuses) de l'équipement.
const DECK_BASE = [
  "coup-faible", "coup-faible", "coup-faible", "coup-faible", "coup-faible",
  "garde-faible", "garde-faible", "garde-faible",
];

// La Chaleur de Forge (l'énergie des cartes). Elle PERSISTE entre les tours et
// peut monter en SURCHAUFFE au-dessus du seuil. Ces valeurs de base seront
// modifiables par l'équipement plus tard.
const CHALEUR_DEPART = 1;     // chaleur au début du combat (forge FROIDE : on
                              // monte en puissance avec le temps + l'équipement,
                              // et on ne brûle pas dès le 1er tour)
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

// Construit le deck de départ : deck de base + les cartes apportées par
// l'équipement (« le deck est le miroir de l'équipement »). On met 2 exemplaires
// de chaque carte d'équipement pour bien les voir.
//
// Exporté pour que l'écran de consultation du deck (jeu/ui/deck.js) montre
// EXACTEMENT le même deck que celui joué en combat — pas une approximation.
export function composerDeck(cartesEquip) {
  const ids = [...DECK_BASE];
  for (const idCarte of cartesEquip ?? []) ids.push(idCarte, idCarte);
  return ids.map((id) => CARTES[id]).filter(Boolean);
}

// `opts` : { pv, pvMax, cartes } — la vie du héros (qui PERSISTE entre les
// combats) et les cartes apportées par son équipement.
export function creerCombat(ennemi, opts = {}) {
  const { pv = 40, pvMax = 40, cartes = [] } = opts;
  const combat = {
    // Héros
    pvHerosMax: pvMax,
    pvHeros: pv,
    pierre: 0,
    poisonHeros: 0,         // poison sur le héros (subi en début de SON tour)
    feuHeros: 0,            // Enflammé sur le héros (idem ; se propage entre ennemis)
    // Chaleur de Forge (persiste, comme la Pierre) + ses stats de surchauffe
    chaleur: CHALEUR_DEPART,
    chaleurRecharge: CHALEUR_RECHARGE,
    chaleurSeuil: CHALEUR_SEUIL,
    chaleurMax: CHALEUR_MAX,
    derniereBrulure: 0,        // dégâts de surchauffe au dernier tour (pour l'UI)
    dernierPoisonHeros: 0,     // dégâts de poison/feu au dernier tour (pour l'UI)
    dernierPoisonEnnemi: 0,
    dernierFeuHeros: 0,
    dernierFeuEnnemi: 0,
    // Ennemi
    ennemi,
    pvEnnemiMax: ennemi.pv,
    pvEnnemi: ennemi.pv,
    poisonEnnemi: 0,        // poison sur l'ennemi (subi en début de SON tour)
    feuEnnemi: 0,           // Enflammé sur l'ennemi
    intention: null,        // ce que l'ennemi prépare (télégraphié au joueur)
    // Deck
    pioche: melanger(composerDeck(cartes)),
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
  } else if (effet.type === "poison") {
    combat.poisonEnnemi += effet.valeur; // empoisonne l'ennemi
  } else if (effet.type === "feu") {
    combat.feuEnnemi += effet.valeur;    // enflamme l'ennemi
  }
}

// Un statut « dégâts dans le temps » (poison, feu…) agit en DÉBUT du tour de sa
// cible : elle perd `n` PV (ignore la Pierre), puis le statut baisse de 1.
// `nom` = "poison" | "feu" ; `cible` = "ennemi" | "heros". Renvoie les dégâts.
function tiquerStatut(combat, cible, nom) {
  const cle = nom + (cible === "ennemi" ? "Ennemi" : "Heros");
  const n = combat[cle];
  if (n <= 0) return 0;
  if (cible === "ennemi") combat.pvEnnemi = Math.max(0, combat.pvEnnemi - n);
  else combat.pvHeros = Math.max(0, combat.pvHeros - n);
  combat[cle] = n - 1;
  return n;
}

// Propagation de l'Enflammé aux ennemis ADJACENTS, à la FIN du tour ennemi.
// INERTE pour l'instant : le combat n'a qu'UN ennemi (pas de voisin). Quand les
// combats à plusieurs ennemis arriveront, on parcourra ici chaque ennemi en feu
// et on appliquera à ses voisins son nombre de ticks COURANT (déjà décrémenté ce
// tour). C'est le point d'accroche prévu — rien à faire tant qu'on est seul.
function propagerFeu(combat) {
  const ennemis = combat.ennemis; // futur : tableau d'ennemis
  if (!ennemis || ennemis.length < 2) return;
  // … propagation aux voisins (à implémenter avec le multi-ennemis) …
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
  combat.dernierPoisonEnnemi = combat.dernierPoisonHeros = 0;
  combat.dernierFeuEnnemi = combat.dernierFeuHeros = 0;

  // Les cartes encore en main repartent à la défausse
  combat.defausse.push(...combat.main);
  combat.main = [];

  // Début du tour de l'ENNEMI : poison + feu agissent d'abord (il peut en mourir).
  combat.dernierPoisonEnnemi = tiquerStatut(combat, "ennemi", "poison");
  combat.dernierFeuEnnemi = tiquerStatut(combat, "ennemi", "feu");
  verifierFin(combat);
  if (combat.fini) return;

  // L'ennemi exécute son intention
  if (combat.intention?.type === "attaque") {
    subirDegats(combat, combat.intention.valeur);
  }
  verifierFin(combat);
  if (combat.fini) return;

  // FIN du tour ennemi : le feu se propagerait ici aux voisins (inerte à 1 ennemi).
  propagerFeu(combat);

  // Nouveau tour du HÉROS : on recharge la Chaleur (elle persiste et peut
  // surchauffer), la surchauffe brûle (dégâts DIRECTS, la Pierre ne protège pas
  // du feu intérieur), puis le poison et le feu du héros agissent. (La Pierre
  // n'est jamais remise à zéro.)
  combat.chaleur = Math.min(combat.chaleurMax, combat.chaleur + combat.chaleurRecharge);
  combat.derniereBrulure = degatsSurchauffe(combat);
  if (combat.derniereBrulure > 0) {
    combat.pvHeros = Math.max(0, combat.pvHeros - combat.derniereBrulure);
    verifierFin(combat);
    if (combat.fini) return;
  }
  combat.dernierPoisonHeros = tiquerStatut(combat, "heros", "poison");
  combat.dernierFeuHeros = tiquerStatut(combat, "heros", "feu");
  verifierFin(combat);
  if (combat.fini) return;

  piocherMain(combat);
  prevoirIntention(combat);
  combat.tourJoueur = true;
}
