// LA VENTE AUX ENCHÈRES DU SOIR (pilier ÉCONOMIE, contenu tardif) — logique
// pure, aucune UI ici. L'écran temps réel est dans ui/encheres.js.
//
// Le principe (décisions Brioche du 07/07/2026) :
//  - UNE vente par cycle jour/nuit (cf. systems/temps.js), à la TOMBÉE DU SOIR.
//  - Accès réservé aux TITRÉS : talent « Title of Nobility » (arbre, branche
//    économie) — c'est du contenu de fin de progression économique.
//  - Il faut être là UN PEU AVANT : acheter un TICKET pendant la fenêtre
//    d'inscription (fin d'après-midi), puis entrer au début de la nuit.
//    Vente ratée = tant pis, prochaine au cycle suivant.
//  - Les LOTS sont sérieux (pas de remplissage) : équipement rare+ et gros
//    paquets de ressources chères. Mise à prix proche de la vraie valeur
//    (~85 %, relevé le 09/07/2026 — le joueur ne voit AUCUN prix affiché,
//    juger « est-ce une affaire ? » est tout le jeu) : les bonnes affaires
//    restent modestes et réalistes, pas des braderies à moitié prix…
//  - …mais chaque rival PNJ a un BUDGET SECRET : la plupart sont frileux,
//    certains sont OBSTINÉS et poussent au-delà de la valeur réelle. Plus
//    l'objet est RARE, plus il y a de chances qu'un obstiné soit dans la
//    salle. Savoir s'arrêter est LE skill.
//  - DÉPÔT : on peut confier UN objet d'exception (rare+) par jour ; il est
//    vendu le soir même (devant nous si on assiste, sinon hors écran et l'or
//    attend chez le commissaire). Le prix peut dépasser largement la valeur
//    HV… ou finir EN DESSOUS (perte) : improbable sur du très rare, jamais
//    impossible. Prix plancher = prix marchand (jamais pire que lui).
//
// ⚖ TOUT L'ÉQUILIBRAGE EST ICI (et documenté dans docs/encheres.md).

import { ITEMS, itemDef, prixVente, RARETES } from "../data/items.js";
import { valeurReelle, prixBaseRessource } from "./marche.js";

// ----- Réglages (équilibrage) --------------------------------------------------

export const TICKET = 50;          // 🪙 le ticket d'entrée (fenêtre d'inscription)
export const FENETRE_ENTREE = 300; // s de nuit pendant lesquelles on peut ENTRER (avec ticket)

const NB_LOTS = [3, 4];            // lots par vente (min, max) — hors dépôt du joueur
// Mise à prix = valeur × [min..max]. À l'enchère, on DÉMARRE sous la valeur pour
// laisser une chance de faire une VRAIE affaire (Brioche 09/07/2026 : ~70 %,
// abaissé depuis 85 %). Aucun prix n'est affiché au joueur : juger si c'est une
// affaire fait tout le sel. La valeur du lot est déjà celle, élevée, de l'objet
// (cf. data/valeurs.js) — plus besoin de gonfler quoi que ce soit à l'enchère.
const MISE_A_PRIX = [0.65, 0.75];
const INCREMENT_PCT = 0.06;        // une enchère = +6 % de la valeur du lot (min 1 🪙)
const NB_RIVAUX = [2, 4];          // rivaux PNJ par lot (min, max)

// Budgets des rivaux = valeur × facteur.
const BUDGET_ACHAT = [0.55, 1.05]; // lots de la MAISON : rivaux plutôt frileux → bonnes affaires possibles
const BUDGET_DEPOT = [0.85, 1.35]; // lot DU JOUEUR : la salle est plus chaude (mais perte possible)
const OBSTINE_FACTEUR = [1.15, 1.50]; // un obstiné multiplie son budget par [min..max]

// Chance qu'UN rival soit OBSTINÉ, selon la rareté du lot (rang RARETES 0..4).
// Plus c'est rare, plus la salle s'enflamme (décision Brioche n°2).
const OBSTINE_PAR_RANG = [0.10, 0.15, 0.25, 0.40, 0.60];

// ARNAQUES D'ENCHÈRE (Brioche, 09/07/2026) : les trésors `camelote: true` (cf.
// data/items.js — Floating Pebble, Elixir of Youth) ont un prix d'enchère
// TRUQUÉ, déconnecté de leur revente réelle (1 000 🪙 = 10 % d'un vrai rare).
// Ancré sur la valeur d'un VRAI rare (`VALEUR_RARE_REF`) :
const VALEUR_RARE_REF = 10000;
// 1er tour (lot de la maison) : l'objet a l'air d'un vrai rare un peu « bon
// marché » → tentant. La salle enchérit dessus comme sur un rare.
const CAMELOTE_VALEUR_LOT = Math.round(VALEUR_RARE_REF * 0.90); // 9 000
// Remis en DÉPÔT par le joueur (re-refourgue) : la salle a un doute, ça part
// moins cher — mais toujours bien au-dessus de sa revente marchand (1 000).
const CAMELOTE_VALEUR_DEPOT = Math.round(VALEUR_RARE_REF * 0.40); // 4 000
const estCamelote = (id) => Boolean(itemDef(id)?.camelote);

// Paquets de ressources : minerais chers uniquement (rang de minerai ≥ 6).
const PAQUET_RANG_MIN = 6;
const PAQUET_QTE = [8, 18];

// Lots : rare et au-delà uniquement (pas de remplissage). Équipement JOUABLE +
// « tresor » (bibelots sans usage — leur seule fonction est d'être vendus, donc
// aussi bienvenus ici qu'au marchand).
const LOT_RARETES = { rare: 60, epique: 30, legendaire: 10 }; // poids de tirage
const CATEGORIES_LOT = ["arme", "bouclier", "armure", "gant", "botte", "bague", "collier", "sac", "tresor"];

// Dépôt du joueur : rare minimum.
export const DEPOT_RARETE_MIN = "rare";

// Noms des rivaux (ambiance — purement cosmétique).
const NOMS_RIVAUX = ["Thorvald", "Grimma", "Ulfar", "Brakka", "Dorin", "Vessa", "Karnak", "Hilda", "Sten", "Ymira"];

const entre = (a, b, rng) => a + rng() * (b - a);
const entier = (a, b, rng) => a + Math.floor(rng() * (b - a + 1));

// ----- État ----------------------------------------------------------------------

export function creerEncheres() {
  return {
    ticketPour: 0,   // n° de jour pour lequel un ticket est payé (0 = aucun)
    depot: null,     // { id, qualite, jour } : l'objet confié pour la vente du soir
    aRecuperer: { or: 0, objets: [] }, // gains hors écran + lots gagnés sac plein
    derniereVenteJouee: 0, // n° du dernier jour dont la vente a été VÉCUE à l'écran
  };
}

// ----- Ticket & accès --------------------------------------------------------------

export function aTicket(enc, jour) { return enc.ticketPour === jour; }

// Acheter le ticket du jour (l'appelant a vérifié la fenêtre d'inscription).
export function acheterTicket(enc, inv, jour) {
  if (aTicket(enc, jour) || inv.or < TICKET) return false;
  inv.or -= TICKET;
  enc.ticketPour = jour;
  return true;
}

// ----- Génération d'une vente --------------------------------------------------------

// La valeur d'un lot : objets → valeur de référence ; paquets → n × prix de
// base ; camelote → prix truqué à part (cf. CAMELOTE_VALEUR_LOT plus haut).
function valeurLot(lot) {
  if (lot.type === "paquet") return lot.quantite * prixBaseRessource(lot.id);
  if (estCamelote(lot.id)) return CAMELOTE_VALEUR_LOT;
  return valeurReelle(lot.id);
}

// Rang de rareté (0..4) d'un lot, pour l'agressivité de la salle.
function rangLot(lot) {
  if (lot.type === "paquet") return 2; // un gros paquet vaut « rare » dans la salle
  return RARETES[itemDef(lot.id)?.rarete]?.rang ?? 0;
}

function tirerRarete(rng) {
  const total = Object.values(LOT_RARETES).reduce((s, p) => s + p, 0);
  let t = rng() * total;
  for (const [rarete, poids] of Object.entries(LOT_RARETES)) {
    t -= poids;
    if (t <= 0) return rarete;
  }
  return "rare";
}

// Tire les lots de la MAISON pour la vente du soir : 2-3 équipements rare+ et
// souvent un gros paquet de minerai cher. Chaque lot : { type, id, quantite?,
// valeur, misePrix, increment }.
export function genererLots(rng = Math.random) {
  const lots = [];
  const nb = entier(NB_LOTS[0], NB_LOTS[1], rng);
  const nbPaquets = rng() < 0.75 ? 1 : 0; // presque toujours un paquet, jamais deux
  const equipables = Object.values(ITEMS).filter((it) => CATEGORIES_LOT.includes(it.categorie));
  for (let i = 0; i < nb - nbPaquets; i++) {
    const rarete = tirerRarete(rng);
    const choix = equipables.filter((it) => it.rarete === rarete);
    const it = choix.length ? choix[Math.floor(rng() * choix.length)] : equipables[Math.floor(rng() * equipables.length)];
    lots.push(finaliserLot({ type: "objet", id: it.id }, rng));
  }
  if (nbPaquets) {
    const chers = Object.values(ITEMS).filter((it) => it.categorie === "ressource" && (it.rang ?? 0) >= PAQUET_RANG_MIN);
    if (chers.length) {
      const it = chers[Math.floor(rng() * chers.length)];
      lots.push(finaliserLot({ type: "paquet", id: it.id, quantite: entier(PAQUET_QTE[0], PAQUET_QTE[1], rng) }, rng));
    }
  }
  // Ordre de passage aléatoire (le paquet n'est pas toujours en dernier).
  return lots.sort(() => rng() - 0.5);
}

function finaliserLot(lot, rng) {
  lot.valeur = valeurLot(lot);
  lot.misePrix = Math.max(1, Math.round(lot.valeur * entre(MISE_A_PRIX[0], MISE_A_PRIX[1], rng)));
  lot.increment = Math.max(1, Math.round(lot.valeur * INCREMENT_PCT));
  return lot;
}

// Le lot du DÉPÔT du joueur : mise à prix plancher = prix MARCHAND (déposer ne
// démarre jamais sous ce qu'on obtiendrait en vendant direct), salle plus chaude
// que pour les lots de la maison (cf. BUDGET_DEPOT). Camelote : prix à part (cf.
// CAMELOTE_VALEUR_DEPOT), re-refourgue à la salle sous sa fausse rareté.
export function lotDepot(depot) {
  const camelote = estCamelote(depot.id);
  const valeur = camelote ? CAMELOTE_VALEUR_DEPOT : valeurReelle(depot.id);
  // Camelote : plancher = mise à prix normale (la salle croit encore à un rare).
  // Sinon : plancher = prix marchand (jamais pire qu'une vente directe).
  const plancher = camelote
    ? Math.round(valeur * MISE_A_PRIX[0])
    : prixVente(depot.id);
  return {
    type: "objet", id: depot.id, qualite: depot.qualite ?? null, duJoueur: true,
    valeur,
    misePrix: Math.max(1, plancher),
    increment: Math.max(1, Math.round(valeur * INCREMENT_PCT)),
  };
}

// Les RIVAUX d'un lot : chacun a un nom et un BUDGET SECRET. La plupart sont
// frileux ; les OBSTINÉS (plus probables sur du rare) vont bien au-delà de la
// valeur. `duJoueur` → fourchette de budgets plus haute (la salle veut l'objet).
export function genererRivaux(lot, rng = Math.random) {
  const nb = entier(NB_RIVAUX[0], NB_RIVAUX[1], rng);
  const [bMin, bMax] = lot.duJoueur ? BUDGET_DEPOT : BUDGET_ACHAT;
  const pObstine = OBSTINE_PAR_RANG[rangLot(lot)] ?? 0.15;
  const noms = [...NOMS_RIVAUX].sort(() => rng() - 0.5).slice(0, nb);
  return noms.map((nom) => {
    let facteur = entre(bMin, bMax, rng);
    const obstine = rng() < pObstine;
    if (obstine) facteur *= entre(OBSTINE_FACTEUR[0], OBSTINE_FACTEUR[1], rng);
    return { nom, budget: Math.round(lot.valeur * facteur), obstine };
  });
}

// ----- Résolution HORS ÉCRAN (le joueur n'assiste pas) -------------------------------
//
// Théorie des enchères : le gagnant paie ≈ le 2e budget + un cran, borné par
// son propre budget et par le prix plancher. Même modèle de salle que la vente
// vécue à l'écran → résultats cohérents.
export function resoudreHorsEcran(lot, rng = Math.random) {
  const rivaux = genererRivaux(lot, rng);
  const budgets = rivaux.map((r) => r.budget).sort((a, b) => b - a);
  const plancher = lot.misePrix;
  if (!budgets.length || budgets[0] < plancher) {
    return { prix: plancher, acheteur: null }; // personne : repris au plancher (la maison)
  }
  const second = budgets[1] ?? plancher;
  const prix = Math.min(budgets[0], Math.max(plancher, second + lot.increment));
  const gagnant = rivaux.find((r) => r.budget === budgets[0]);
  return { prix, acheteur: gagnant?.nom ?? null };
}

// ----- Dépôt d'un objet ---------------------------------------------------------------

// L'objet du sac est-il acceptable en dépôt ? (équipement OU trésor, rare et au-delà)
export function depotAcceptable(id) {
  const it = itemDef(id);
  if (!it || !CATEGORIES_LOT.includes(it.categorie)) return false;
  return (RARETES[it.rarete]?.rang ?? 0) >= (RARETES[DEPOT_RARETE_MIN]?.rang ?? 2);
}

// ----- Gains en attente -----------------------------------------------------------------

// Ajoute un lot gagné qui n'a pas tenu dans le sac (à réclamer chez Magnar).
export function mettreEnAttente(enc, lot) {
  enc.aRecuperer.objets.push({ id: lot.id, quantite: lot.quantite ?? 1, qualite: lot.qualite ?? null });
}

// ----- Sauvegarde -----------------------------------------------------------------------

export function etatEncheres(enc) {
  return {
    ticketPour: enc.ticketPour,
    depot: enc.depot ? { ...enc.depot } : null,
    aRecuperer: { or: enc.aRecuperer.or, objets: enc.aRecuperer.objets.map((o) => ({ ...o })) },
    derniereVenteJouee: enc.derniereVenteJouee,
  };
}

export function chargerEncheres(enc, etat) {
  if (!etat) return;
  enc.ticketPour = Number.isFinite(etat.ticketPour) ? Math.max(0, Math.floor(etat.ticketPour)) : 0;
  enc.depot = etat.depot && itemDef(etat.depot.id) && Number.isFinite(etat.depot.jour)
    ? { id: etat.depot.id, qualite: etat.depot.qualite ?? null, jour: Math.floor(etat.depot.jour) }
    : null;
  enc.aRecuperer = {
    or: Number.isFinite(etat.aRecuperer?.or) ? Math.max(0, Math.round(etat.aRecuperer.or)) : 0,
    objets: Array.isArray(etat.aRecuperer?.objets)
      ? etat.aRecuperer.objets.filter((o) => itemDef(o?.id))
          .map((o) => ({ id: o.id, quantite: Math.max(1, Math.round(o.quantite ?? 1)), qualite: o.qualite ?? null }))
      : [],
  };
  enc.derniereVenteJouee = Number.isFinite(etat.derniereVenteJouee) ? Math.max(0, Math.floor(etat.derniereVenteJouee)) : 0;
}
