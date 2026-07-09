// LES BÂTIMENTS À ACHETER (pilier ÉCONOMIE) — logique pure, aucune UI ici.
//
// Principe : en ville, certains bâtiments sont À VENDRE. Un PANNEAU planté
// devant explique tout (prix, revenu, plafond). Une fois acheté, le bâtiment
// produit un REVENU PASSIF versé dans sa TRÉSORERIE à intervalle régulier —
// mais la trésorerie a un PLAFOND : pleine, la production S'ARRÊTE (le
// rendement est perdu). Le joueur doit donc revenir À PIED au panneau pour
// RÉCOLTER régulièrement — même philosophie que les annonces de l'HV :
// l'investissement est passif, la récompense se va chercher.
//
// ⏱ LE TEMPS DES BÂTIMENTS tourne EN PERMANENCE (même horloge que le marché) ;
// SEUL le menu pause (Échap) le fige. Pas d'abus d'AFK : la trésorerie est
// PLAFONNÉE — laisser tourner le jeu ne rapporte jamais plus que le plafond.
//
// ÉQUILIBRAGE (tout est ICI, dans BATIMENTS) : la scierie coûte 12 000 🪙 et
// rapporte 1 200 🪙/h de jeu actif → remboursée en ~10 h de jeu. Le plafond de
// 4 800 🪙 (4 versements) force un passage au panneau toutes les ~4 h de jeu.
// (Prix/revenu calés sur les VALEURS d'objets refondues — cf. « Audit économie »
// dans docs/concept.md : ~2 objets rares à l'achat, revenu = ~1 rare / 6 h.)
//
// BONUS SPÉCIAL : chaque bâtiment a (aura) sa petite production EN NATURE en
// plus de l'or — la scierie donne du BOIS à chaque versement, récupéré en même
// temps que le bénéfice. Plafonné comme la trésorerie (même philosophie).

import { ajouterObjet, compterRessource } from "./inventaire.js";

// ----- Catalogue -------------------------------------------------------------

// `bonus` = liste de PRODUCTIONS EN NATURE possibles à chaque versement. Chaque
// entrée : { id, parVersement, chance (0..1, défaut 1), max }. Le 1er est le
// produit de base (toujours), les suivants sont des drops PLUS RARES (chance <1).
export const BATIMENTS = {
  scierie: {
    id: "scierie",
    nom: "Sawmill",                 // les textes du jeu sont en anglais (cf. concept)
    icone: "🪚",
    description: "Mills timber hauled down from the surface — a steady little business.",
    prix: 12000,                    // 🪙 à l'achat (somme conséquente, une fois)
    revenu: 1200,                   // 🪙 versés dans la trésorerie à chaque période
    periode: 3600,                  // s de jeu ACTIF entre deux versements (1 h)
    tresorerieMax: 4800,            // plafond de la trésorerie (4 versements)
    // Bois à chaque versement, + une CHANCE de bois plus rare (Brioche 09/07/2026).
    bonus: [
      { id: "bois",          parVersement: 2, chance: 1,    max: 8 },
      { id: "bois-sombre",   parVersement: 1, chance: 0.10, max: 8 },
      { id: "bois-enchante", parVersement: 1, chance: 0.01, max: 8 },
    ],
  },
  tannerie: {
    id: "tannerie",
    nom: "Tannery",
    icone: "🥾",
    description: "Cures hides into leather — the same steady trade, on the other side of the square.",
    prix: 12000,
    revenu: 1200,
    periode: 3600,
    tresorerieMax: 4800,
    // Cuir à chaque versement, + une chance de cuir plus rare.
    bonus: [
      { id: "cuir",         parVersement: 2, chance: 1,    max: 8 },
      { id: "cuir-epais",   parVersement: 1, chance: 0.10, max: 8 },
      { id: "cuir-etrange", parVersement: 1, chance: 0.01, max: 8 },
    ],
  },
};

export function batimentDef(id) { return BATIMENTS[id] ?? null; }

// Total des ressources EN NATURE stockées dans un bâtiment (toutes confondues).
export function stockTotal(b) {
  return Object.values(b?.stock ?? {}).reduce((s, n) => s + (n || 0), 0);
}

// ----- État ------------------------------------------------------------------

export function creerBatiments() {
  // possedes : id → { tresorerie, progres, stock } — progres = s de jeu actif
  // écoulées vers le PROCHAIN versement (gelé quand la trésorerie est pleine) ;
  // stock = { ressourceId → quantité } accumulé en nature, à récolter.
  return { possedes: {} };
}

export function possede(bats, id) { return Boolean(bats.possedes[id]); }
export function etatBatiment(bats, id) { return bats.possedes[id] ?? null; }

// Achat : débite l'or de l'inventaire et démarre la production à zéro.
// Renvoie true si l'achat a eu lieu (false : déjà possédé ou or insuffisant).
export function acheterBatiment(bats, inv, id) {
  const def = batimentDef(id);
  if (!def || possede(bats, id) || inv.or < def.prix) return false;
  inv.or -= def.prix;
  bats.possedes[id] = { tresorerie: 0, progres: 0, stock: {} };
  return true;
}

// ----- Production ------------------------------------------------------------

// Plafond du STOCK EN NATURE quand le « Collecteur d'impôt » tourne (la
// production ne gèle plus, donc les ressources s'accumuleraient sans fin) :
// 3 stacks de 10 = 30 (décision Brioche 09/07/2026). Au-delà, on ne perd rien,
// ça n'accumule juste plus (à venir récolter à pied).
const STOCK_MAX_IMPOT = 30;

// Avance tous les bâtiments possédés de `dt` secondes de JEU ACTIF (l'appelant
// garantit qu'on n'est ni en pause, ni dans un menu/écran).
//
// `opts.collecteurImpot` (talent légendaire) + `opts.inv` : quand le coffre est
// PLEIN, l'OR est versé AUTOMATIQUEMENT au joueur (plus besoin d'aller au
// panneau) et la production continue ; les RESSOURCES, elles, s'accumulent
// quand même (plafond 30) et restent à récolter à pied.
//
// Renvoie les événements notables du tick :
//   { id, type: "versement", montant }  → un versement vient de tomber
//   { id, type: "plein" }               → coffre plein, production À L'ARRÊT (mode normal)
//   { id, type: "impot", montant }      → l'or a été collecté automatiquement
export function tickBatiments(bats, dt, opts = {}) {
  const { collecteurImpot = false, inv = null } = opts;
  const auto = collecteurImpot && inv;
  const evts = [];
  for (const [id, b] of Object.entries(bats.possedes)) {
    const def = batimentDef(id);
    if (!def) continue;
    if (!auto && b.tresorerie >= def.tresorerieMax) continue; // pleine : production gelée (mode normal)
    b.stock ??= {};
    b.progres += dt;
    while (b.progres >= def.periode) {
      if (!auto && b.tresorerie >= def.tresorerieMax) break;
      b.progres -= def.periode;
      const gain = auto ? def.revenu : Math.min(def.revenu, def.tresorerieMax - b.tresorerie);
      b.tresorerie += gain;
      // Les bonus EN NATURE tombent avec le versement : le produit de base
      // (chance 1) + une CHANCE des paliers plus rares. Plafond par ressource
      // (avec Collecteur d'impôt : 3 stacks de 10).
      for (const d of def.bonus ?? []) {
        if (Math.random() < (d.chance ?? 1)) {
          const cap = auto ? STOCK_MAX_IMPOT : d.max;
          b.stock[d.id] = Math.min(cap, (b.stock[d.id] ?? 0) + d.parVersement);
        }
      }
      evts.push({ id, type: "versement", montant: gain });
      if (b.tresorerie >= def.tresorerieMax) {
        if (auto) {
          // Collecteur d'impôt : l'or file directement dans la bourse du joueur.
          inv.or += b.tresorerie;
          evts.push({ id, type: "impot", montant: b.tresorerie });
          b.tresorerie = 0; // le coffre repart de zéro, la production continue
        } else {
          b.progres = 0; // la scie s'arrête : le temps ne s'accumule plus
          evts.push({ id, type: "plein" });
        }
      }
    }
  }
  return evts;
}

// Secondes de jeu actif avant le prochain versement (null si production gelée).
export function tempsAvantVersement(bats, id) {
  const b = bats.possedes[id], def = batimentDef(id);
  if (!b || !def || b.tresorerie >= def.tresorerieMax) return null;
  return Math.max(0, def.periode - b.progres);
}

// Récolte : vide la trésorerie dans l'or de l'inventaire (et la production
// repart si elle était gelée), et range les bonus EN NATURE (bois, cuir…) dans
// le sac. Si le sac ne peut pas tout prendre, le RESTE ATTEND au bâtiment (rien
// n'est perdu). Renvoie { or, bonus: [{ id, pris }], reste } — ou null si rien.
export function collecterTresorerie(bats, inv, id) {
  const b = bats.possedes[id], def = batimentDef(id);
  b.stock ??= {};
  if (!b || !def || (b.tresorerie <= 0 && stockTotal(b) <= 0)) return null;
  const or = b.tresorerie;
  b.tresorerie = 0; // progres reprend de là où il était (0 si la scie était gelée)
  inv.or += or;
  // Chaque ressource stockée : on range ce qui TIENT dans le sac (ajouterObjet
  // remplit partiellement puis renvoie false si plein — on mesure le vrai pris).
  const bonus = [];
  for (const [rid, n] of Object.entries(b.stock)) {
    if (n <= 0) continue;
    const avant = compterRessource(inv, rid);
    ajouterObjet(inv, rid, n);
    const pris = compterRessource(inv, rid) - avant;
    b.stock[rid] = n - pris;
    if (pris > 0) bonus.push({ id: rid, pris });
  }
  return { or, bonus, reste: stockTotal(b) };
}

// ----- Sauvegarde --------------------------------------------------------------

export function etatBatiments(bats) {
  return { possedes: Object.fromEntries(Object.entries(bats.possedes)
    .map(([k, v]) => [k, { ...v, stock: { ...(v.stock ?? {}) } }])) };
}

// Nettoie le `stock` lu d'une sauvegarde → map { id → qté }. Compat ascendante :
// l'ancien format était un simple nombre (= le produit de base).
function stockCharge(def, raw) {
  const out = {};
  const clamp = (n) => Math.max(0, Math.min(STOCK_MAX_IMPOT, Math.round(n)));
  if (typeof raw === "number") {           // ancien format
    const base = def.bonus?.[0]?.id;
    if (base && raw > 0) out[base] = clamp(raw);
  } else if (raw && typeof raw === "object") {
    for (const [rid, n] of Object.entries(raw)) {
      if (Number.isFinite(n) && n > 0) out[rid] = clamp(n);
    }
  }
  return out;
}

export function chargerBatiments(bats, etat) {
  bats.possedes = {};
  if (!etat?.possedes) return;
  // Champ par champ : une sauvegarde abîmée ne doit jamais casser le jeu.
  for (const [id, v] of Object.entries(etat.possedes)) {
    const def = batimentDef(id);
    if (!def) continue; // bâtiment inconnu (ancienne version) : ignoré
    bats.possedes[id] = {
      tresorerie: Number.isFinite(v?.tresorerie) ? Math.max(0, Math.min(def.tresorerieMax, Math.round(v.tresorerie))) : 0,
      progres: Number.isFinite(v?.progres) ? Math.max(0, Math.min(def.periode, v.progres)) : 0,
      stock: stockCharge(def, v?.stock),
    };
  }
}
