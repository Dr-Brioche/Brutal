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
    // Le bonus spécial de la scierie : du bois avec chaque versement.
    bonus: { id: "bois", parVersement: 2, max: 8 }, // max = 4 versements aussi
  },
};

export function batimentDef(id) { return BATIMENTS[id] ?? null; }

// ----- État ------------------------------------------------------------------

export function creerBatiments() {
  // possedes : id → { tresorerie, progres, stock } — progres = s de jeu actif
  // écoulées vers le PROCHAIN versement (gelé quand la trésorerie est pleine) ;
  // stock = bonus EN NATURE accumulé (ex. bois de la scierie), à récolter aussi.
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
  bats.possedes[id] = { tresorerie: 0, progres: 0, stock: 0 };
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
    const stockMax = def.bonus ? (auto ? STOCK_MAX_IMPOT : def.bonus.max) : 0;
    b.progres += dt;
    while (b.progres >= def.periode) {
      if (!auto && b.tresorerie >= def.tresorerieMax) break;
      b.progres -= def.periode;
      const gain = auto ? def.revenu : Math.min(def.revenu, def.tresorerieMax - b.tresorerie);
      b.tresorerie += gain;
      // Le bonus EN NATURE tombe avec le versement (plafonné).
      if (def.bonus) b.stock = Math.min(stockMax, (b.stock ?? 0) + def.bonus.parVersement);
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
// repart si elle était gelée), et range le bonus EN NATURE (bois…) dans le sac.
// Si le sac ne peut pas tout prendre, le RESTE ATTEND au bâtiment (rien n'est
// perdu). Renvoie { or, bonusId, bonusPris, bonusReste } — ou null si rien à
// prendre du tout.
export function collecterTresorerie(bats, inv, id) {
  const b = bats.possedes[id], def = batimentDef(id);
  if (!b || !def || (b.tresorerie <= 0 && !(b.stock > 0))) return null;
  const or = b.tresorerie;
  b.tresorerie = 0; // progres reprend de là où il était (0 si la scie était gelée)
  inv.or += or;
  // Bonus en nature : on range ce qui TIENT dans le sac (ajouterObjet remplit
  // partiellement puis renvoie false si plein — on mesure le vrai pris).
  let bonusPris = 0;
  if (def.bonus && b.stock > 0) {
    const avant = compterRessource(inv, def.bonus.id);
    ajouterObjet(inv, def.bonus.id, b.stock);
    bonusPris = compterRessource(inv, def.bonus.id) - avant;
    b.stock -= bonusPris;
  }
  return { or, bonusId: def.bonus?.id ?? null, bonusPris, bonusReste: b.stock ?? 0 };
}

// ----- Sauvegarde --------------------------------------------------------------

export function etatBatiments(bats) {
  return { possedes: Object.fromEntries(Object.entries(bats.possedes).map(([k, v]) => [k, { ...v }])) };
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
      // Plafond de chargement = STOCK_MAX_IMPOT (30) : avec le Collecteur d'impôt
      // le stock peut monter au-delà du max « normal » (def.bonus.max).
      stock: Number.isFinite(v?.stock) && def.bonus ? Math.max(0, Math.min(STOCK_MAX_IMPOT, Math.round(v.stock))) : 0,
    };
  }
}
