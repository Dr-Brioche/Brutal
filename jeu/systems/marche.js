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
//  2. OBJETS (armes, armures…) : VALEUR de référence fixe par objet (data/items.js
//     + data/valeurs.js). À l'HV on les met en ANNONCE dans la bande −20 %/−10 %
//     de la valeur : plus on vise haut (patient), plus la vente prend de temps
//     (formule exponentielle, cf. delaiMedian). Vendre coûte toujours (< valeur) ;
//     l'HV paie juste un peu mieux que le marchand (−25 %). Cf. HV_BANDE.
//
// ⏱ LE TEMPS DU MARCHÉ tourne EN PERMANENCE ; SEUL le menu pause (Échap) le
// fige (c'est principal.js qui décide quand appeler tickMarche).

import { MINERAIS, itemDef, prixVente, valeurEstimee } from "../data/items.js";
import { VALEUR_RESSOURCE } from "../data/valeurs.js";

// ----- Réglages (tout l'équilibrage du marché est ICI) ----------------------

// Ressources échangées à l'Hôtel des ventes : les minerais + bois/cuir et leurs
// variantes rares (leur prix de base vient de VALEUR_RESSOURCE via prixBaseRessource).
export const RESSOURCES_MARCHE = [
  ...MINERAIS,
  "bois", "bois-sombre", "bois-enchante",
  "cuir", "cuir-epais", "cuir-etrange",
];

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

// Prix de BASE d'une ressource au marché (le marché la fait ensuite fluctuer).
// SOURCE ÉDITABLE : onglet « Ressources » du classeur → data/valeurs.js
// (`VALEUR_RESSOURCE`). En secours (ressource absente de la table) : l'ancien
// barème par rang — PRIX_RANG1 × RATIO_RANG^(rang-1), ou `it.prixBase`.
const PRIX_RANG1 = 3, RATIO_RANG = 1.8;
const PRIX_BASE_PAR_RANG = [0];
for (let r = 1; r <= 12; r++) PRIX_BASE_PAR_RANG.push(Math.round(PRIX_RANG1 * RATIO_RANG ** (r - 1)));
export function prixBaseRessource(id) {
  if (VALEUR_RESSOURCE[id] != null) return VALEUR_RESSOURCE[id];
  const it = itemDef(id);
  return it?.prixBase || PRIX_BASE_PAR_RANG[it?.rang ?? 0] || 4;
}

// Valeur RÉELLE d'un objet = sa VALEUR DE RÉFÉRENCE (data/items.js, fixée dans
// le classeur). C'est l'ancre partout (HV, enchères) ; le prix de vente en
// découle plus bas. `it.valeur` peut toujours surcharger un objet précis.
export function valeurReelle(id, qualite = null) {
  const it = itemDef(id);
  return it?.valeur ?? valeurEstimee(id, qualite);
}

// ----- État ------------------------------------------------------------------

export function creerMarche() {
  const mults = {}, histo = {};
  for (const id of RESSOURCES_MARCHE) { mults[id] = 1; histo[id] = []; }
  const marche = {
    mults,          // id → multiplicateur courant (hors événement)
    histo,          // id → [{ t, prix }] (échantillonné toutes les 60 s)
    temps: 0,       // horloge du marché (s de jeu ACTIF cumulées)
    tickAcc: 0,     // accumulateur vers le prochain pas
    histCompte: 0,  // pas écoulés depuis le dernier point d'historique
    evenement: null, // { id, type: "penurie"|"surplus", facteur, reste } | null
    ventes: [],     // annonces d'objets : { id, prix, qualite, reste }
  };
  semerHistorique(marche);
  return marche;
}

// Sème un point d'historique « maintenant » pour toute ressource qui n'en a
// AUCUN : la variation sur 30 min a ainsi un repère dès la PREMIÈRE seconde.
// Sans ça, en début de partie (historique vide jusqu'au 1er échantillon à 60 s),
// tous les « 30m » restent à 0 % — le tri « Top gainers/losers » paraît
// aléatoire et une grosse vente du joueur n'y laisse aucune trace.
function semerHistorique(marche) {
  for (const id of RESSOURCES_MARCHE) {
    const h = marche.histo[id] ??= [];
    if (!h.length) h.push({ t: Math.round(marche.temps), prix: prixRessource(marche, id) });
  }
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

// L'HV peut rapporter MIEUX que le marchand, mais il faut ATTENDRE — et viser haut
// est un PARI. Le curseur va de −20 % (0.80, vente rapide) jusqu'à +50 % (1.50,
// vente lente et incertaine) de la valeur (décision Brioche 09/07/2026 : on PEUT
// demander AU-DESSUS de la valeur, mais ça se paie en délai). Le marchand, lui,
// paie −25 % tout de suite (cf. prixVente).
const HV_BANDE = [0.80, 1.50];   // [plancher, plafond] du curseur, × valeur
const HV_CONSEILLE = 0.85;       // prix conseillé (fraction de la valeur, vente sûre)

// Prix conseillé à l'HV : ~−15 % de la valeur (vente sûre et assez rapide).
export function prixConseille(id, qualite = null) {
  return Math.max(1, Math.round(valeurReelle(id, qualite) * HV_CONSEILLE));
}

// Bornes du curseur de prix : de −20 % (vente rapide) à +50 % (pari, très lent).
export function bornesPrixVente(id, qualite = null) {
  const v = valeurReelle(id, qualite);
  return { min: Math.max(1, Math.round(v * HV_BANDE[0])), max: Math.max(2, Math.round(v * HV_BANDE[1])) };
}

// Position dans la bande HV : 0 au plancher (0.80), 1 au plafond (1.50).
function fracBande(id, prix, qualite = null) {
  const v = valeurReelle(id, qualite);
  if (v <= 0) return 0;
  return Math.min(1, Math.max(0, (prix / v - HV_BANDE[0]) / (HV_BANDE[1] - HV_BANDE[0])));
}

// Délai MÉDIAN de vente (s de jeu actif) : plus on vise haut, plus c'est long.
// Courbe f^0.6 pour que le bas de bande ne soit pas quasi instantané ; ~2 min au
// plancher → ~12 h près du plafond (+50 %). Exponentiel.
const DELAI_MIN_S = 120, DELAI_MAX_S = 12 * 3600;
function delaiMedian(id, prix, qualite = null) {
  const f = Math.pow(fracBande(id, prix, qualite), 0.6);
  const s = DELAI_MIN_S * Math.pow(DELAI_MAX_S / DELAI_MIN_S, f);
  return Math.min(72 * 3600, Math.max(45, s));
}

// Largeur de la fourchette de hasard : ±2^w autour du médian ; s'élargit quand
// on vise haut (acheteur patient plus imprévisible).
function largeurFourchette(id, prix, qualite = null) {
  return 0.3 + 0.5 * fracBande(id, prix, qualite);
}

// Le délai FINAL (médian × hasard) reste borné : 45 s à 72 h de jeu actif.
const bornerDelai = (s) => Math.min(72 * 3600, Math.max(45, Math.round(s)));

// Fourchette AFFICHÉE au joueur : { min, max } en secondes de jeu actif.
export function estimerDelaiVente(id, prix, qualite = null) {
  const T = delaiMedian(id, prix, qualite), w = largeurFourchette(id, prix, qualite);
  return { min: bornerDelai(T * Math.pow(2, -w)), max: bornerDelai(T * Math.pow(2, w)) };
}

// Tirage RÉEL du délai (au moment de la mise en vente) : médian × 2^(u·w).
export function tirerDelaiVente(id, prix, qualite = null, rng = Math.random) {
  const T = delaiMedian(id, prix, qualite), w = largeurFourchette(id, prix, qualite);
  return bornerDelai(T * Math.pow(2, (rng() * 2 - 1) * w));
}

// Met un objet en annonce. Renvoie l'annonce créée (l'objet doit déjà avoir été
// retiré du sac par l'appelant).
export function mettreEnVente(marche, id, prix, qualite = null, rng = Math.random) {
  const annonce = { id, prix, qualite, reste: tirerDelaiVente(id, prix, qualite, rng) };
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
  const valeur = valeurReelle(annonce.id, annonce.qualite);
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
  semerHistorique(marche); // vieilles sauvegardes sans historique : repère immédiat
}
