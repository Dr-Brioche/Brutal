// LE MARCHÉ (Hôtel des ventes, pilier ÉCONOMIE) — logique pure, aucune UI ici.
//
// Deux mondes de prix :
//  1. RESSOURCES (minerais + bois) : prix VIVANTS. Chaque ressource a un prix de
//     base (selon son rang) multiplié par un facteur `mult` qui bouge avec :
//       - les échanges du JOUEUR : vendre fait BAISSER, acheter fait MONTER, au
//         même taux (symétrique). Le mouvement est ASYMPTOTIQUE vers un plancher/
//         plafond : plus on pousse, moins chaque unité déplace le prix (ça ne
//         s'arrête jamais vraiment, mais ça devient insignifiant).
//         ⚠ ANTI-EXPLOIT : le prix bouge AVANT l'échange (on achète au prix déjà
//         monté, on vend au prix déjà baissé) → un aller-retour achat/vente perd
//         TOUJOURS de l'argent. Aucune machine à sous possible.
//       - le CONTRECOUP : vendre beaucoup de X fait un peu monter 2 autres
//         ressources au hasard (et inversement) — l'ampleur est plus faible.
//       - la DÉRIVE naturelle : petite marche aléatoire + retour doux vers la
//         zone normale (mult 1) au fil du temps de jeu ACTIF.
//       - les ÉVÉNEMENTS rares : PÉNURIE (prix ×~3) ou SURPLUS (prix ×~0,4)
//         sur une ressource au hasard, 5-10 min, puis retour à la normale.
//  2. OBJETS (armes, armures…) : valeur RÉELLE fixe par objet (selon la rareté,
//     surchargée par `it.valeur`). À l'HV on les met en ANNONCE au prix qu'on
//     veut : plus la marge dépasse la valeur réelle, plus la vente prend du temps
//     (formule exponentielle, cf. delaiVente). Prix conseillé = valeur +10 %.
//
// ⏱ LE TEMPS DU MARCHÉ = temps de jeu ACTIF uniquement (exploration + combat).
// Les menus, dialogues, la Forge et l'HV lui-même FIGENT l'horloge (c'est
// principal.js qui décide quand appeler tickMarche).

import { MINERAIS, itemDef, prixVente } from "../data/items.js";

// ----- Réglages (tout l'équilibrage du marché est ICI) ----------------------

export const RESSOURCES_MARCHE = [...MINERAIS, "bois"];

const PLANCHER = 0.4;   // mult minimal (−60 % du prix de base)
const PLAFOND  = 2.5;   // mult maximal (+150 %) — hors événement
const K_ECHANGE = 0.05; // « poussée » d'UNE unité échangée vers le plancher/plafond
const CONTRECOUP = 0.3; // ampleur du contrecoup (fraction de la poussée primaire)

const TICK = 20;          // s de jeu actif entre deux « pas » du marché
const REVERSION = 0.02;   // retour vers mult=1 par pas (doux : ~50 % en 12 min)
const BRUIT = 0.015;      // marche aléatoire ±1,5 % par pas (la zone normale respire)
const HIST_PAS = 3;       // 1 point d'historique tous les 3 pas (= 60 s)
const HIST_MAX = 60;      // ~1 h d'historique conservée

const EVT_PROBA = TICK / 900;      // ~1 événement toutes les ~15 min de jeu actif
const EVT_DUREE = [300, 600];      // 5 à 10 min
const EVT_PENURIE = [2.6, 3.4];    // facteur prix pendant une pénurie
const EVT_SURPLUS = [0.35, 0.45];  // facteur prix pendant un surplus
const EVT_PART_PENURIE = 0.65;     // 65 % des événements sont des pénuries

// Prix de base d'une ressource selon son `rang` (1..12, cf. data/items.js) :
// PRIX_RANG1 × RATIO_RANG^(rang-1). RATIO_RANG (bien plus raide qu'avant, ~×1,45)
// fait que les minerais/cristaux les plus rares valent une FORTUNE face aux
// communs — le fond de mine devient un vrai jackpot, et une pénurie/vente sur
// un cristal rare pèse bien plus lourd en or qu'une pièce de pierre taillée.
const PRIX_RANG1 = 3, RATIO_RANG = 1.8;
const PRIX_BASE_PAR_RANG = [0];
for (let r = 1; r <= 12; r++) PRIX_BASE_PAR_RANG.push(Math.round(PRIX_RANG1 * RATIO_RANG ** (r - 1)));
export function prixBaseRessource(id) {
  const it = itemDef(id);
  return it?.prixBase || PRIX_BASE_PAR_RANG[it?.rang ?? 0] || 4;
}

// Valeur RÉELLE d'un objet (non-ressource) à l'HV = prix marchand (PRIX_VENTE,
// cf. data/items.js) + 10 % — surchargée par `it.valeur` si un objet mérite un
// prix particulier. Garantit que l'HV est TOUJOURS plus rentable que le
// marchand, même sans marge supplémentaire (cf. prixConseille plus bas).
export function valeurReelle(id) {
  const it = itemDef(id);
  return it?.valeur ?? Math.max(1, Math.round(prixVente(id) * 1.1));
}

// ----- État ------------------------------------------------------------------

export function creerMarche() {
  const mults = {}, histo = {};
  for (const id of RESSOURCES_MARCHE) { mults[id] = 1; histo[id] = []; }
  return {
    mults,          // id → multiplicateur courant (hors événement)
    histo,          // id → [{ t, prix }] (échantillonné toutes les 60 s)
    temps: 0,       // horloge du marché (s de jeu ACTIF cumulées)
    tickAcc: 0,     // accumulateur vers le prochain pas
    histCompte: 0,  // pas écoulés depuis le dernier point d'historique
    evenement: null, // { id, type: "penurie"|"surplus", facteur, reste } | null
    ventes: [],     // annonces d'objets : { id, prix, qualite, reste }
  };
}

// ----- Prix des ressources -----------------------------------------------------

function facteurEvenement(marche, id) {
  const e = marche.evenement;
  return e && e.id === id ? e.facteur : 1;
}

export function prixRessource(marche, id) {
  const brut = prixBaseRessource(id) * (marche.mults[id] ?? 1) * facteurEvenement(marche, id);
  return Math.max(1, Math.round(brut));
}

// Tendance (%) par rapport au prix de base — pour l'affichage (▲ +23 % / ▼ −40 %).
export function tendanceRessource(marche, id) {
  const ratio = (marche.mults[id] ?? 1) * facteurEvenement(marche, id);
  return Math.round((ratio - 1) * 100);
}

// Variation (%) du prix sur les ~30 DERNIÈRES MINUTES de jeu actif — sert au tri
// « meilleure hausse / pire baisse » (le momentum récent, différent de la
// tendance vs prix de base : une ressource peut être « chère » ET stagner, ou
// « pas chère » ET grimper vite). Compare au point d'historique le plus proche
// de (maintenant − 30 min) ; s'il n'y a pas encore assez d'historique, compare
// au plus ancien point connu (0 % si aucun historique).
export function variation30min(marche, id) {
  const h = marche.histo[id] ?? [];
  if (!h.length) return 0;
  const cible = marche.temps - 1800;
  let repere = h[0];
  for (const p of h) { if (p.t <= cible) repere = p; else break; } // h est croissant en t
  if (repere.prix <= 0) return 0;
  return Math.round(((prixRessource(marche, id) - repere.prix) / repere.prix) * 100);
}

// Poussée asymptotique d'UNE unité : vers le plancher (vente) ou le plafond
// (achat). Plus on est proche de la borne, plus le pas est petit — ça ne
// s'arrête jamais tout à fait, mais ça devient insignifiant.
function pousser(marche, id, sens, k = K_ECHANGE) {
  const m = marche.mults[id] ?? 1;
  marche.mults[id] = sens < 0
    ? PLANCHER + (m - PLANCHER) * (1 - k)
    : PLAFOND - (PLAFOND - m) * (1 - k);
}

// Contrecoup : `n` unités échangées sur `id` → 2 AUTRES ressources au hasard
// bougent en sens INVERSE, avec une ampleur réduite (CONTRECOUP), partagée.
function contrecoup(marche, id, sens, n, rng = Math.random) {
  const autres = RESSOURCES_MARCHE.filter((r) => r !== id);
  for (let i = 0; i < 2 && autres.length; i++) {
    const j = Math.floor(rng() * autres.length);
    const [cible] = autres.splice(j, 1);
    pousser(marche, cible, -sens, K_ECHANGE * CONTRECOUP * n / 2);
  }
}

// APERÇUS (sans rien modifier) : ce que coûterait/rapporterait un échange de n
// unités — la même arithmétique que l'échange réel (déterministe), sur une copie.
// Sert à l'UI pour vérifier l'or AVANT d'acheter et afficher un prix honnête.
function apercu(marche, id, sens, n) {
  const copie = { mults: { ...marche.mults }, evenement: marche.evenement };
  let total = 0;
  for (let i = 0; i < n; i++) {
    pousser(copie, id, sens);
    total += prixRessource(copie, id);
  }
  return total;
}
export function apercuAchat(marche, id, n = 1) { return apercu(marche, id, +1, n); }
export function apercuVente(marche, id, n = 1) { return apercu(marche, id, -1, n); }

// VENDRE n unités : pour CHAQUE unité le prix baisse D'ABORD, puis on encaisse
// le prix baissé (anti-exploit). Renvoie l'or total encaissé.
export function vendreRessource(marche, id, n = 1, rng = Math.random) {
  let gain = 0;
  for (let i = 0; i < n; i++) {
    pousser(marche, id, -1);
    gain += prixRessource(marche, id);
  }
  contrecoup(marche, id, -1, n, rng);
  return gain;
}

// ACHETER n unités : le prix monte D'ABORD, puis on paie le prix monté.
// Renvoie l'or total à payer.
export function acheterRessource(marche, id, n = 1, rng = Math.random) {
  let cout = 0;
  for (let i = 0; i < n; i++) {
    pousser(marche, id, +1);
    cout += prixRessource(marche, id);
  }
  contrecoup(marche, id, +1, n, rng);
  return cout;
}

// ----- Annonces d'objets (vente à prix libre) ---------------------------------

// Prix conseillé à l'HV : valeur réelle +10 % (toujours mieux que le marchand).
export function prixConseille(id) {
  return Math.max(1, Math.round(valeurReelle(id) * 1.1));
}

// Bornes du curseur de prix : du prix marchand (vente éclair) au DOUBLE de la
// valeur réelle (vente très longue).
export function bornesPrixVente(id) {
  return { min: Math.max(1, prixVente(id)), max: Math.max(2, valeurReelle(id) * 2) };
}

// Délai MÉDIAN de vente (en secondes de jeu actif) pour une marge de m % au-dessus
// de la valeur réelle. Ancré sur la spec : +10 % ≈ 12 min ; +30 % ≈ 2 h ; +50 % ≈
// très long (~21 h) — chaque +10 % multiplie le délai par ~3,2.
const DELAI_BASE_MIN = 12;   // minutes au prix conseillé (+10 %)
const DELAI_CROISSANCE = 3.2; // ×3,2 par tranche de +10 %
function delaiMedian(id, prix) {
  const marge = (prix / valeurReelle(id) - 1) * 100;
  const minutes = DELAI_BASE_MIN * Math.pow(DELAI_CROISSANCE, (marge - 10) / 10);
  return Math.min(72 * 3600, Math.max(45, minutes * 60)); // borné 45 s .. 72 h
}

// Largeur de la fourchette de hasard : ±2^w autour du médian ; elle S'ÉLARGIT
// avec la marge (gros prix = acheteur imprévisible). +10 % → ~[×0,73..×1,37]
// (≈ 10-15 min) ; +30 % → ~[×0,59..×1,68] (≈ 1 h 13-3 h 27).
function largeurFourchette(id, prix) {
  const marge = (prix / valeurReelle(id) - 1) * 100;
  return 0.3 + 0.015 * Math.max(0, marge);
}

// Le délai FINAL (médian × hasard) reste borné : 45 s à 72 h de jeu actif.
const bornerDelai = (s) => Math.min(72 * 3600, Math.max(45, Math.round(s)));

// Fourchette AFFICHÉE au joueur : { min, max } en secondes de jeu actif.
export function estimerDelaiVente(id, prix) {
  const T = delaiMedian(id, prix), w = largeurFourchette(id, prix);
  return { min: bornerDelai(T * Math.pow(2, -w)), max: bornerDelai(T * Math.pow(2, w)) };
}

// Tirage RÉEL du délai (au moment de la mise en vente) : médian × 2^(u·w).
export function tirerDelaiVente(id, prix, rng = Math.random) {
  const T = delaiMedian(id, prix), w = largeurFourchette(id, prix);
  return bornerDelai(T * Math.pow(2, (rng() * 2 - 1) * w));
}

// Met un objet en annonce. Renvoie l'annonce créée (l'objet doit déjà avoir été
// retiré du sac par l'appelant).
export function mettreEnVente(marche, id, prix, qualite = null, rng = Math.random) {
  const annonce = { id, prix, qualite, reste: tirerDelaiVente(id, prix, rng) };
  marche.ventes.push(annonce);
  return annonce;
}

// ----- Événements (pénurie / surplus) ------------------------------------------

const entre = (a, b, rng) => a + rng() * (b - a);

function lancerEvenement(marche, rng) {
  const id = RESSOURCES_MARCHE[Math.floor(rng() * RESSOURCES_MARCHE.length)];
  const penurie = rng() < EVT_PART_PENURIE;
  marche.evenement = {
    id,
    type: penurie ? "penurie" : "surplus",
    facteur: penurie ? entre(EVT_PENURIE[0], EVT_PENURIE[1], rng)
                     : entre(EVT_SURPLUS[0], EVT_SURPLUS[1], rng),
    reste: entre(EVT_DUREE[0], EVT_DUREE[1], rng),
  };
}

// ----- L'horloge du marché ------------------------------------------------------

// Un « pas » de marché (toutes les TICK s de jeu actif) : dérive + événements +
// historique. Séparé de tickMarche pour rester testable.
function pasMarche(marche, rng = Math.random) {
  for (const id of RESSOURCES_MARCHE) {
    let m = marche.mults[id] ?? 1;
    m += (1 - m) * REVERSION;              // retour doux vers la zone normale
    m *= 1 + (rng() * 2 - 1) * BRUIT;      // la zone normale respire
    marche.mults[id] = Math.min(PLAFOND, Math.max(PLANCHER, m));
  }
  // Événement : décompte, sinon tirage rare d'un nouveau.
  if (marche.evenement) {
    marche.evenement.reste -= TICK;
    if (marche.evenement.reste <= 0) marche.evenement = null;
  } else if (rng() < EVT_PROBA) {
    lancerEvenement(marche, rng);
  }
  // Historique échantillonné (toutes les HIST_PAS pas).
  if (++marche.histCompte >= HIST_PAS) {
    marche.histCompte = 0;
    for (const id of RESSOURCES_MARCHE) {
      const h = marche.histo[id] ??= [];
      h.push({ t: Math.round(marche.temps), prix: prixRessource(marche, id) });
      if (h.length > HIST_MAX) h.shift();
    }
  }
}

// Avance le marché de `dt` secondes de JEU ACTIF (l'appelant garantit qu'on
// n'est ni en pause, ni dans un menu/écran). Une annonce dont le délai s'écoule
// n'est PAS payée automatiquement : elle passe en état VENDUE (`vendu: true`,
// `reste` clampé à 0) et reste dans `marche.ventes` jusqu'à ce que le joueur
// aille la RÉCOLTER lui-même à l'HV (cf. collecterVente) — l'investissement
// reste passif, mais la récompense se va chercher. Renvoie les annonces qui
// viennent tout juste de passer « vendue » à ce tick (l'appelant peut prévenir
// le joueur, SANS créditer d'or).
export function tickMarche(marche, dt, rng = Math.random) {
  marche.temps += dt;
  const fraichementVendues = [];
  for (const v of marche.ventes) {
    if (v.vendu) continue;
    v.reste -= dt;
    if (v.reste <= 0) { v.reste = 0; v.vendu = true; fraichementVendues.push(v); }
  }
  marche.tickAcc += dt;
  while (marche.tickAcc >= TICK) {
    marche.tickAcc -= TICK;
    pasMarche(marche, rng);
  }
  return fraichementVendues;
}

// Récolte une annonce VENDUE : la retire de `marche.ventes` et renvoie
// { prix, profitPct } — `profitPct` = plus-value (%) par rapport à la valeur
// réelle de l'objet, pour le résumé affiché au joueur. `null` si l'annonce
// n'est pas (encore) vendue ou n'existe plus (ex. HV rouvert entre-temps).
export function collecterVente(marche, annonce) {
  const i = marche.ventes.indexOf(annonce);
  if (i < 0 || !annonce.vendu) return null;
  marche.ventes.splice(i, 1);
  const valeur = valeurReelle(annonce.id);
  const profitPct = valeur > 0 ? Math.round((annonce.prix / valeur - 1) * 100) : 0;
  return { prix: annonce.prix, profitPct };
}

// ----- Sauvegarde ----------------------------------------------------------------

export function etatMarche(marche) {
  return {
    mults: { ...marche.mults },
    histo: Object.fromEntries(Object.entries(marche.histo).map(([k, v]) => [k, v.slice()])),
    temps: marche.temps,
    evenement: marche.evenement ? { ...marche.evenement } : null,
    ventes: marche.ventes.map((v) => ({ ...v })),
  };
}

export function chargerMarche(marche, etat) {
  if (!etat) return;
  for (const id of RESSOURCES_MARCHE) {
    const m = etat.mults?.[id];
    marche.mults[id] = Number.isFinite(m) ? Math.min(PLAFOND, Math.max(PLANCHER, m)) : 1;
    marche.histo[id] = Array.isArray(etat.histo?.[id]) ? etat.histo[id].slice(-HIST_MAX) : [];
  }
  marche.temps = Number.isFinite(etat.temps) ? etat.temps : 0;
  marche.tickAcc = 0;
  marche.histCompte = 0;
  const e = etat.evenement;
  marche.evenement = e && RESSOURCES_MARCHE.includes(e.id) && Number.isFinite(e.reste) && e.reste > 0
    ? { id: e.id, type: e.type === "surplus" ? "surplus" : "penurie", facteur: Number(e.facteur) || 1, reste: e.reste }
    : null;
  marche.ventes = Array.isArray(etat.ventes)
    ? etat.ventes.filter((v) => itemDef(v?.id) && Number.isFinite(v.prix) && Number.isFinite(v.reste))
        .map((v) => ({ id: v.id, prix: Math.round(v.prix), qualite: v.qualite ?? null, reste: v.reste, vendu: v.vendu === true }))
    : [];
}
