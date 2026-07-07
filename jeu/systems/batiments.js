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
// ⏱ LE TEMPS DES BÂTIMENTS = temps de jeu ACTIF uniquement (exploration +
// combat), la même horloge que le marché. Les menus, dialogues, la Forge et
// l'HV le FIGENT (c'est principal.js qui décide quand appeler tickBatiments).
// → Impossible de laisser tourner le jeu dans un menu pour farmer de l'or.
//
// ÉQUILIBRAGE (tout est ICI, dans BATIMENTS) : la scierie coûte 1200 🪙 et
// rapporte 120 🪙/h de jeu actif → remboursée en ~10 h de jeu. Le plafond de
// 480 🪙 (4 versements) force un passage au panneau toutes les ~4 h de jeu.
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
    prix: 1200,                     // 🪙 à l'achat (somme conséquente, une fois)
    revenu: 120,                    // 🪙 versés dans la trésorerie à chaque période
    periode: 3600,                  // s de jeu ACTIF entre deux versements (1 h)
    tresorerieMax: 480,             // plafond de la trésorerie (4 versements)
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

// Avance tous les bâtiments possédés de `dt` secondes de JEU ACTIF (l'appelant
// garantit qu'on n'est ni en pause, ni dans un menu/écran). Renvoie les
// événements notables de ce tick, pour que l'UI prévienne le joueur :
//   { id, type: "versement", montant }  → un versement vient de tomber
//   { id, type: "plein" }               → la trésorerie vient d'atteindre le
//                                         plafond (production À L'ARRÊT)
export function tickBatiments(bats, dt) {
  const evts = [];
  for (const [id, b] of Object.entries(bats.possedes)) {
    const def = batimentDef(id);
    if (!def) continue;
    if (b.tresorerie >= def.tresorerieMax) continue; // pleine : production gelée
    b.progres += dt;
    while (b.progres >= def.periode && b.tresorerie < def.tresorerieMax) {
      b.progres -= def.periode;
      const gain = Math.min(def.revenu, def.tresorerieMax - b.tresorerie);
      b.tresorerie += gain;
      // Le bonus EN NATURE tombe avec le versement (plafonné lui aussi).
      if (def.bonus) b.stock = Math.min(def.bonus.max, (b.stock ?? 0) + def.bonus.parVersement);
      evts.push({ id, type: "versement", montant: gain });
      if (b.tresorerie >= def.tresorerieMax) {
        b.progres = 0; // la scie s'arrête : le temps ne s'accumule plus
        evts.push({ id, type: "plein" });
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
      stock: Number.isFinite(v?.stock) && def.bonus ? Math.max(0, Math.min(def.bonus.max, Math.round(v.stock))) : 0,
    };
  }
}
