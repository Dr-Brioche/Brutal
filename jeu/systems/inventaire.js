// L'inventaire + l'équipement « sur soi » (la poupée d'équipement) + l'or.
//
// - grille : un sac de `cols` × `rangs` cases ; chaque objet posé occupe une
//   empreinte (façon Diablo). On range automatiquement au premier endroit libre.
// - slots  : ce que le héros porte (arme(s), armure, gants, bottes, collier,
//   5 bagues, sac). Le sac équipé agrandit la grille.
// - or     : la monnaie.

import { itemDef, SLOT_PAR_CATEGORIE, prixVente } from "../data/items.js";

const COLS = 6;          // largeur du sac
const RANGS_BASE = 4;    // hauteur de base (petite : s'agrandit avec un sac)

// Tous les slots d'équipement, dans l'ordre d'affichage.
export const SLOTS = [
  "arme1", "arme2", "armure", "gant", "botte", "collier",
  "bague1", "bague2", "bague3", "bague4", "bague5", "sac", "sac2", "outil",
];

export function creerInventaire() {
  const slots = {};
  for (const s of SLOTS) slots[s] = null;
  // `qualites` : qualité de FORGE par slot équipé (parallèle à `slots`). Elle voyage
  // avec l'exemplaire (slot ↔ sac). Vide/absent = qualité normale (cf. data/recettes.js).
  // `pileMax` : taille max d'une pile de ressources (minerais…). De BASE 5, agrandie
  // par le talent forge « Ore Hauler » (+5 par rang, jusqu'à 30). Synchronisée depuis
  // heros.pileMax à chaque changement de talents (cf. principal.js).
  return { cols: COLS, rangs: RANGS_BASE, objets: [], slots, qualites: {}, or: 0, pileMax: 5 };
}

// ONGLETS DE SAC : chaque sac équipé est une GRILLE séparée (un « onglet »), au
// lieu d'agrandir une seule grille (qui devenait trop large/haute). L'onglet 0 =
// le sac principal (slot `sac`) ; l'onglet 1 = le 2e sac (slot `sac2`). Chaque
// objet porte `sac` = l'index de son onglet (0 par défaut). Toutes les fonctions
// de placement prennent donc un `tab`.
export function nbSacs(inv) {
  return inv.slots?.sac2 ? 2 : 1;
}

// Hauteur de l'onglet `tab` : onglet 0 = base + rangées du sac principal ; onglet
// 1 = les rangées propres du 2e sac. Toutes les grilles font COLS de large.
export function rangsInventaire(inv, tab = 0) {
  if (tab === 1) {
    const sac2 = inv.slots.sac2 ? itemDef(inv.slots.sac2) : null;
    return sac2?.rangsBonus ?? 0;
  }
  const sac = inv.slots.sac ? itemDef(inv.slots.sac) : null;
  return inv.rangs + (sac?.rangsBonus ?? 0);
}

// Largeur d'un onglet : toujours COLS (plus de colonnes ajoutées → jamais trop large).
export function colsInventaire(inv, _tab = 0) {
  return inv.cols;
}

function casesOccupees(inv, tab, sauf = null) {
  const occ = new Set();
  for (const o of inv.objets) {
    if (o === sauf) continue;        // on peut exclure l'objet qu'on déplace
    if ((o.sac ?? 0) !== tab) continue; // seulement l'onglet demandé
    const d = itemDef(o.id);
    for (let dy = 0; dy < d.taille.h; dy++)
      for (let dx = 0; dx < d.taille.l; dx++)
        occ.add((o.x + dx) + "," + (o.y + dy));
  }
  return occ;
}

function tient(inv, tab, x, y, l, h, occ) {
  if (x < 0 || y < 0 || x + l > colsInventaire(inv, tab) || y + h > rangsInventaire(inv, tab)) return false;
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < l; dx++)
      if (occ.has((x + dx) + "," + (y + dy))) return false;
  return true;
}

// Première place libre dans l'onglet `tab` pour une empreinte l×h, ou null si plein.
function premierePlaceLibre(inv, tab, l, h) {
  const occ = casesOccupees(inv, tab);
  const rangs = rangsInventaire(inv, tab);
  const cols  = colsInventaire(inv, tab);
  for (let y = 0; y <= rangs - h; y++)
    for (let x = 0; x <= cols - l; x++)
      if (tient(inv, tab, x, y, l, h, occ)) return { x, y };
  return null;
}

// Première place libre TOUS ONGLETS confondus : renvoie { tab, x, y } ou null.
function premierePlaceTousOnglets(inv, l, h) {
  for (let t = 0; t < nbSacs(inv); t++) {
    const pos = premierePlaceLibre(inv, t, l, h);
    if (pos) return { tab: t, x: pos.x, y: pos.y };
  }
  return null;
}

// Pose `n` exemplaires d'un item à la première place libre. Les items EMPILABLES
// (ressources/minerais) complètent d'abord les piles existantes (< pileMax) avant
// d'en créer une nouvelle. Renvoie true si tout est rangé, false si le sac est plein.
export function ajouterObjet(inv, id, n = 1, champs = null) {
  const d = itemDef(id);
  if (!d) return false;
  if (d.empilable) {
    // Taille de pile pilotée par le HÉROS (talent « Ore Hauler ») : base 5, +5/rang
    // jusqu'à 30. (Le `pileMax` des items, hérité, n'est plus utilisé comme plafond.)
    const max = inv.pileMax ?? 5;
    let reste = n;
    for (const o of inv.objets) {                 // compléter les piles existantes
      if (o.id !== id) continue;
      const place = max - (o.quantite ?? 1);
      if (place > 0) {
        const add = Math.min(place, reste);
        o.quantite = (o.quantite ?? 1) + add;
        reste -= add;
        if (reste <= 0) return true;
      }
    }
    while (reste > 0) {                            // créer de nouvelles piles
      const pos = premierePlaceTousOnglets(inv, d.taille.l, d.taille.h);
      if (!pos) return false;                      // tous les sacs pleins
      const add = Math.min(max, reste);
      inv.objets.push({ id, x: pos.x, y: pos.y, sac: pos.tab, quantite: add });
      reste -= add;
    }
    return true;
  }
  const pos = premierePlaceTousOnglets(inv, d.taille.l, d.taille.h);
  if (!pos) return false;
  // `champs` : données d'INSTANCE en plus (ex. { qualite: "maitre" } pour une arme
  // forgée). Ignoré pour les empilables. Les objets lootés n'en ont pas (= normale).
  inv.objets.push({ id, x: pos.x, y: pos.y, sac: pos.tab, ...(champs || {}) });
  return true;
}

// Combien d'exemplaires de `id` dans le sac (somme des piles). Utile au craft.
export function compterRessource(inv, id) {
  let n = 0;
  for (const o of inv.objets) if (o.id === id) n += o.quantite ?? 1;
  return n;
}

// Retire `n` exemplaires de `id` du sac (vide d'abord les piles entamées). Renvoie
// le nombre RÉELLEMENT retiré (≤ n si le sac n'en avait pas assez). Utile au craft.
// (À ne pas confondre avec `retirerObjet(inv, objet)` plus bas, qui retire UN
// exemplaire précis déjà repéré.)
export function retirerRessource(inv, id, n = 1) {
  let reste = n;
  for (let i = inv.objets.length - 1; i >= 0 && reste > 0; i--) {
    const o = inv.objets[i];
    if (o.id !== id) continue;
    const dispo = o.quantite ?? 1;
    const pris = Math.min(dispo, reste);
    reste -= pris;
    if (pris >= dispo) inv.objets.splice(i, 1); // pile épuisée → on la retire
    else o.quantite = dispo - pris;
  }
  return n - reste;
}

// Vérifie sans muter si `id` trouverait une place dans UN des sacs.
function peutAjouter(inv, id) {
  const d = itemDef(id);
  if (!d) return false;
  return premierePlaceTousOnglets(inv, d.taille.l, d.taille.h) != null;
}

// Y aura-t-il la place pour l'objet FORGÉ `resultatId` une fois les ingrédients
// `besoin` ({ id: quantité }) consommés ? On simule sur une COPIE du sac (aucune
// mutation) : on retire d'abord les ingrédients (ça peut LIBÉRER des cases), puis
// on teste le placement du résultat. Sert au contrôle « sac plein » AVANT le
// mini-jeu de forge, sans bloquer à tort un craft qui libère la place qu'il occupe.
export function placePourFabrication(inv, resultatId, besoin) {
  const copie = { ...inv, objets: inv.objets.map((o) => ({ ...o })) };
  for (const id of Object.keys(besoin || {})) retirerRessource(copie, id, besoin[id]);
  return peutAjouter(copie, resultatId);
}

// L'objet posé sous la case (cx, cy) de l'onglet `tab`, ou null.
export function objetSousCase(inv, cx, cy, tab = 0) {
  for (const o of inv.objets) {
    if ((o.sac ?? 0) !== tab) continue;
    const d = itemDef(o.id);
    if (cx >= o.x && cx < o.x + d.taille.l && cy >= o.y && cy < o.y + d.taille.h) return o;
  }
  return null;
}

// `objet` tiendrait-il à (x, y) dans l'onglet `tab` (par défaut le sien) ? Il est
// exclu du test de collision (on le déplace), donc le reposer sur sa propre place
// reste valide. `tab` différent de son onglet actuel = déplacement inter-onglets.
export function peutPlacerA(inv, objet, x, y, tab = objet.sac ?? 0) {
  const d = itemDef(objet.id);
  if (!d) return false;
  return tient(inv, tab, x, y, d.taille.l, d.taille.h, casesOccupees(inv, tab, objet));
}

// Déplace `objet` à (x, y) dans l'onglet `tab` si la place est libre. Renvoie true
// si déplacé (met aussi à jour son onglet → déplacement entre sacs possible).
export function deplacerObjet(inv, objet, x, y, tab = objet.sac ?? 0) {
  if (!peutPlacerA(inv, objet, x, y, tab)) return false;
  objet.x = x;
  objet.y = y;
  objet.sac = tab;
  return true;
}

function retirerObjet(inv, objet) {
  const i = inv.objets.indexOf(objet);
  if (i !== -1) inv.objets.splice(i, 1);
}

// Le slot visé par un item. `slotForce` permet de cibler un slot précis (ex.
// remplacer exactement la bague3 en déposant une bague dessus). Si le slot forcé
// est compatible (même type de base), il est utilisé ; sinon on revient à l'auto.
function slotCible(inv, id, heros, slotForce = null) {
  const d = itemDef(id);
  const base = SLOT_PAR_CATEGORIE[d.categorie];
  // Slot forcé : valider que la catégorie correspond (évite de mettre une épée sur bague3).
  if (slotForce) {
    const slotBase = slotForce.replace(/\d+$/, ""); // "bague3" → "bague", "arme1" → "arme"
    if (slotBase === base || slotForce === base) return slotForce;
  }
  if (base === "bague") {
    for (let i = 1; i <= 5; i++) if (!inv.slots["bague" + i]) return "bague" + i;
    return "bague1"; // toutes prises → remplace la 1re par défaut (comportement inchangé)
  }
  // Sac secondaire : si sac est pris, le talent débloqué et sac2 libre → rediriger vers sac2.
  if (base === "sac" && inv.slots.sac && (heros?.talents?.sacBonus ?? 0) > 0 && !inv.slots.sac2) {
    return "sac2";
  }
  // Ambidextrie : si arme1 porte une arme 1M → toujours rediriger vers arme2 (même si
  // elle contient un bouclier — le bouclier est alors déplacé vers le sac).
  if (base === "arme1" && d.mains !== 2 && (heros?.talents?.ambidextrie ?? 0) > 0) {
    const arme1Def = itemDef(inv.slots.arme1 ?? "");
    if (arme1Def && arme1Def.mains !== 2) return "arme2";
  }
  return base ?? null;
}

// Équipe un objet de la grille. `slotForce` permet de cibler un slot précis
// (ex. déposer une bague sur bague3 pour remplacer celle-là plutôt que la 1re libre).
// Retourne true si succès, false si impossible, "plein" / "deux-mains" sinon.
export function equiper(inv, objet, heros, slotForce = null) {
  const d = itemDef(objet.id);
  if (d?.mains === 2 && !((heros?.talents?.deuxMains ?? 0) > 0)) return "deux-mains";
  const slot = slotCible(inv, objet.id, heros, slotForce);
  if (!slot) return false;
  // Bloquer arme2 si arme1 est une arme à deux mains (la seconde main est occupée).
  if (slot === "arme2" && itemDef(inv.slots.arme1 ?? "")?.mains === 2) return false;

  const ancien = inv.slots[slot];
  const a2Libere = (slot === "arme1" && d.mains === 2) ? inv.slots.arme2 : null;

  // Avant toute mutation, vérifier que les items déplacés auront de la place.
  // On simule : retire objet du sac (libère sa place), puis teste.
  if (ancien || a2Libere) {
    retirerObjet(inv, objet);
    let ok = true;
    if (ancien) {
      if (!peutAjouter(inv, ancien)) {
        ok = false;
      } else if (a2Libere) {
        // Poser ancien temporairement pour tester a2 dans l'état réel.
        ajouterObjet(inv, ancien);
        if (!peutAjouter(inv, a2Libere)) ok = false;
        inv.objets.pop(); // retire l'ajout temporaire (toujours le dernier push)
      }
    } else if (a2Libere && !peutAjouter(inv, a2Libere)) {
      ok = false;
    }
    inv.objets.push(objet); // restaure objet dans le sac
    if (!ok) return "plein";
  }

  // L'échange peut avoir lieu. La QUALITÉ de forge suit l'exemplaire : celle qui
  // ENTRE (objet.qualite) est mémorisée dans inv.qualites[slot] ; celle qui SORT
  // repart au sac avec son arme.
  inv.qualites ??= {};
  retirerObjet(inv, objet);
  const ancienQualite = inv.qualites[slot] ?? null;
  inv.slots[slot] = objet.id;
  inv.qualites[slot] = objet.qualite ?? null;
  // Arme à deux mains : libère la seconde main (retourne au sac), même si c'est
  // une arme mise là par Ambidextrie.
  if (slot === "arme1" && d.mains === 2 && inv.slots.arme2) {
    const a2 = inv.slots.arme2, a2q = inv.qualites.arme2 ?? null;
    inv.slots.arme2 = null; inv.qualites.arme2 = null;
    ajouterObjet(inv, a2, 1, a2q ? { qualite: a2q } : null);
  }
  if (ancien) ajouterObjet(inv, ancien, 1, ancienQualite ? { qualite: ancienQualite } : null);
  return true;
}

// Équipe un objet NEUF (PAS dans le sac) directement dans son slot, à condition
// qu'il soit LIBRE. Sert au marchand : acheter un SAC alors que le sac est PLEIN
// doit pouvoir l'équiper d'office — sinon c'est un blocage (il faudrait de la
// place pour ranger l'objet qui, justement, CRÉE de la place). Ne touche jamais
// à `inv.objets`. Renvoie le slot équipé, ou null si le slot visé est déjà pris
// (l'appelant retombe alors sur le rangement normal dans le sac).
export function equiperNeuf(inv, id, heros) {
  const d = itemDef(id);
  if (!d) return null;
  const slot = slotCible(inv, id, heros);
  if (!slot || inv.slots[slot]) return null; // slot occupé → pas d'auto-équipement
  inv.qualites ??= {};
  inv.slots[slot] = id;
  inv.qualites[slot] = null;                 // objet neuf = qualité normale
  return slot;
}

// Vrai si arme1 est une arme deux mains → arme2 est bloquée.
export function arme2Bloquee(inv) {
  return itemDef(inv.slots.arme1 ?? "")?.mains === 2;
}

// Vrai si l'item PEUT s'équiper (il a un slot : arme, armure, gant, botte, bague,
// amulette, sac…). Sert au marchand pour proposer « acheter & équiper » (clic droit)
// UNIQUEMENT sur ce qui s'équipe (pas les consommables, ressources ou trésors).
export function estEquipable(id) {
  const d = itemDef(id);
  return Boolean(d && SLOT_PAR_CATEGORIE[d.categorie]);
}

// État d'occupation des slots qui portent une carte de SUPPLÉANCE dans le deck
// (cf. systems/combat.js → cartesDeBase). Un slot occupé = pas de carte
// « bouche-trou ». La main PRINCIPALE est prise dès qu'une arme est en arme1 ; la
// main SECONDAIRE dès qu'arme2 est rempli OU qu'arme1 est une arme à deux mains
// (elle occupe alors les deux mains). Le torse, les gants et les bottes suivent
// simplement l'occupation de leur slot.
export function slotsOccupes(inv) {
  const deuxMains = itemDef(inv.slots.arme1 ?? "")?.mains === 2;
  return {
    principale: Boolean(inv.slots.arme1),
    secondaire: Boolean(inv.slots.arme2) || deuxMains,
    armure: Boolean(inv.slots.armure),
    gant: Boolean(inv.slots.gant),
    botte: Boolean(inv.slots.botte),
  };
}

// Déséquipe un slot : l'item retourne au sac (refusé si le sac est plein).
// Pour les sacs : refusé si des items occupent des rangées qui disparaîtraient
// (le joueur doit vider ces rangées avant de pouvoir enlever le sac).
export function desequiper(inv, slot) {
  const id = inv.slots[slot];
  if (!id) return false;
  const d = itemDef(id);
  const q = inv.qualites?.[slot] ?? null;              // la qualité repart au sac

  // 2e sac : son ONGLET disparaît. Ses objets (+ le sac lui-même) doivent tenir
  // dans l'onglet 1. On SIMULE d'abord sur une copie (sans sac2) ; si tout rentre,
  // on applique : on enlève sac2, on re-range ses objets dans l'onglet 1.
  if (slot === "sac2" && d?.rangsBonus) {
    const aReplacer = inv.objets.filter((o) => (o.sac ?? 0) === 1);
    const copie = {
      ...inv,
      slots: { ...inv.slots, sac2: null },
      objets: inv.objets.filter((o) => (o.sac ?? 0) === 0).map((o) => ({ ...o })),
    };
    for (const o of aReplacer)
      if (!ajouterObjet(copie, o.id, o.quantite ?? 1, o.qualite ? { qualite: o.qualite } : null)) return "overflow";
    if (!ajouterObjet(copie, id, 1, q ? { qualite: q } : null)) return "overflow";
    // OK → application réelle.
    inv.slots.sac2 = null;
    if (inv.qualites) inv.qualites.sac2 = null;
    const objTab1 = inv.objets.filter((o) => (o.sac ?? 0) === 1);
    inv.objets = inv.objets.filter((o) => (o.sac ?? 0) !== 1);
    for (const o of objTab1) ajouterObjet(inv, o.id, o.quantite ?? 1, o.qualite ? { qualite: o.qualite } : null);
    ajouterObjet(inv, id, 1, q ? { qualite: q } : null);
    return true;
  }

  // Sac principal : les rangées de l'onglet 1 rétrécissent → overflow si un objet
  // de CET onglet dépasserait les rangées futures.
  if (d?.rangsBonus) {
    const rangsFuturs = rangsInventaire(inv, 0) - d.rangsBonus;
    const overflow = inv.objets.some((o) => {
      if ((o.sac ?? 0) !== 0) return false;
      const h = itemDef(o.id)?.taille?.h ?? 1;
      return (o.y + h) > rangsFuturs;
    });
    if (overflow) return "overflow";
  }
  if (!ajouterObjet(inv, id, 1, q ? { qualite: q } : null)) return false;
  inv.slots[slot] = null;
  if (inv.qualites) inv.qualites[slot] = null;
  return true;
}

export function ajouterOr(inv, n) { inv.or += n; }

// Vend un objet du SAC au marchand : il quitte le sac, son prix est crédité en
// or. Renvoie le prix obtenu.
export function vendreObjet(inv, objet) {
  const prix = prixVente(objet.id, objet.qualite ?? null) * (objet.quantite ?? 1);
  retirerObjet(inv, objet);
  inv.or += prix;
  return prix;
}

// Jette un objet du SAC (le retire, sans rien rendre).
export function jeterObjet(inv, objet) {
  retirerObjet(inv, objet);
}

// ---- Liens avec le reste du jeu ------------------------------------------

// Le nain porte toujours au moins ses habits de base (pour avoir un corps).
export function armureEquipee(inv) {
  return itemDef(inv.slots.armure || "tenue-de-voyageur");
}
export function armeEquipee(inv) {
  return inv.slots.arme1 ? itemDef(inv.slots.arme1) : null;
}

// Les cartes apportées par tout l'équipement (deck = miroir de l'équipement).
export function cartesEquipees(inv) {
  const cartes = [];
  for (const s of SLOTS) {
    const id = inv.slots[s];
    if (id) cartes.push(...(itemDef(id).cartes ?? []));
  }
  return cartes;
}

// Applique le skin (armure) + le calque d'arme au héros, et recalcule le bonus
// de « move speed » (vitesse de déplacement en exploration) donné par l'équipement
// (surtout les bottes). À rappeler à chaque changement d'équipement.
export function appliquerEquipement(heros, inv, planches) {
  const arme = armeEquipee(inv);
  heros.plancheArmure = planches.get(armureEquipee(inv).planche);
  heros.plancheArme = arme ? planches.get(arme.planche) : null;
  // Move speed (exploration) : les bottes donnent un bonus en POURCENTAGE de la
  // vitesse de déplacement de base (somme des vitesseDeplPct des items équipés).
  const ids = Object.values(inv.slots || {}).filter(Boolean);
  heros.vitesseEquipPct = ids.reduce((s, id) => s + (itemDef(id)?.vitesseDeplPct || 0), 0);
  // Agilité (vitesse d'attaque en combat) donnée par les items (bottes surtout).
  heros.agiliteEquip = ids.reduce((s, id) => s + (itemDef(id)?.agilite || 0), 0);
  // « Ring of Luck » (et futurs items) : chance de DOUBLER le butin d'un coup de
  // minage. On cumule les passifs `minageDouble` des items équipés (plafonné à 1 = 100%).
  heros.minageDoubleChance = Math.min(1, ids.reduce((s, id) => s + (itemDef(id)?.minageDouble || 0), 0));
}

// ---- Sauvegarde ----------------------------------------------------------

export function etatInventaire(inv) {
  return { or: inv.or, objets: inv.objets.map((o) => ({ ...o })), slots: { ...inv.slots }, qualites: { ...(inv.qualites ?? {}) } };
}

export function chargerInventaire(inv, etat) {
  if (!etat) return;
  inv.or = Number.isFinite(etat.or) ? etat.or : 0;
  inv.objets = [];
  inv.slots = {};
  inv.qualites = {};
  for (const s of SLOTS) inv.slots[s] = null;
  // Slots : on ne garde que des ids connus (+ leur qualité de forge éventuelle).
  if (etat.slots) for (const s of SLOTS) {
    if (etat.slots[s] && itemDef(etat.slots[s])) {
      inv.slots[s] = etat.slots[s];
      if (etat.qualites?.[s]) inv.qualites[s] = etat.qualites[s];
    }
  }
  // Objets : on restaure la position rangée par le joueur si elle est valide,
  // sinon on auto-place au premier creux (sac réduit, données anciennes…). La
  // qualité de forge (arme forgée) est conservée sur l'exemplaire.
  if (Array.isArray(etat.objets)) {
    for (const o of etat.objets) {
      if (!itemDef(o?.id)) continue;
      const champs = o.qualite ? { qualite: o.qualite } : null;
      const qte = Number.isFinite(o.quantite) && o.quantite > 1 ? { quantite: o.quantite } : null;
      // Onglet 2 seulement s'il existe (sac2 équipé) ; sinon tout retombe sur l'onglet 1.
      const tab = (o.sac === 1 && nbSacs(inv) > 1) ? 1 : 0;
      if (Number.isInteger(o.x) && Number.isInteger(o.y) &&
          peutPlacerA(inv, { id: o.id, sac: tab }, o.x, o.y, tab)) {
        inv.objets.push({ id: o.id, x: o.x, y: o.y, sac: tab, ...(qte || {}), ...(champs || {}) });
      } else {
        ajouterObjet(inv, o.id, o.quantite ?? 1, champs);
      }
    }
  }
}
