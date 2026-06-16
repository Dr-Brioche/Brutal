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
  "bague1", "bague2", "bague3", "bague4", "bague5", "sac",
];

export function creerInventaire() {
  const slots = {};
  for (const s of SLOTS) slots[s] = null;
  return { cols: COLS, rangs: RANGS_BASE, objets: [], slots, or: 0 };
}

// Hauteur réelle de la grille (un sac équipé ajoute des rangées).
export function rangsInventaire(inv) {
  const sac = inv.slots.sac ? itemDef(inv.slots.sac) : null;
  return inv.rangs + (sac?.rangsBonus ?? 0);
}

function casesOccupees(inv, sauf = null) {
  const occ = new Set();
  for (const o of inv.objets) {
    if (o === sauf) continue; // on peut exclure l'objet qu'on déplace
    const d = itemDef(o.id);
    for (let dy = 0; dy < d.taille.h; dy++)
      for (let dx = 0; dx < d.taille.l; dx++)
        occ.add((o.x + dx) + "," + (o.y + dy));
  }
  return occ;
}

function tient(inv, x, y, l, h, occ) {
  if (x < 0 || y < 0 || x + l > inv.cols || y + h > rangsInventaire(inv)) return false;
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < l; dx++)
      if (occ.has((x + dx) + "," + (y + dy))) return false;
  return true;
}

// Pose un item à la première place libre. Renvoie true si placé, false si plein.
export function ajouterObjet(inv, id) {
  const d = itemDef(id);
  if (!d) return false;
  const occ = casesOccupees(inv);
  const rangs = rangsInventaire(inv);
  for (let y = 0; y <= rangs - d.taille.h; y++)
    for (let x = 0; x <= inv.cols - d.taille.l; x++)
      if (tient(inv, x, y, d.taille.l, d.taille.h, occ)) {
        inv.objets.push({ id, x, y });
        return true;
      }
  return false;
}

// Vérifie sans muter si `id` trouverait une place dans le sac tel qu'il est.
function peutAjouter(inv, id) {
  const d = itemDef(id);
  if (!d) return false;
  const occ = casesOccupees(inv);
  const rangs = rangsInventaire(inv);
  for (let y = 0; y <= rangs - d.taille.h; y++)
    for (let x = 0; x <= inv.cols - d.taille.l; x++)
      if (tient(inv, x, y, d.taille.l, d.taille.h, occ)) return true;
  return false;
}

// L'objet posé sous la case (cx, cy), ou null.
export function objetSousCase(inv, cx, cy) {
  for (const o of inv.objets) {
    const d = itemDef(o.id);
    if (cx >= o.x && cx < o.x + d.taille.l && cy >= o.y && cy < o.y + d.taille.h) return o;
  }
  return null;
}

// `objet` (déjà dans le sac) tiendrait-il à (x, y) ? Il est exclu du test de
// collision (on le déplace), donc le reposer sur sa propre place reste valide.
export function peutPlacerA(inv, objet, x, y) {
  const d = itemDef(objet.id);
  if (!d) return false;
  return tient(inv, x, y, d.taille.l, d.taille.h, casesOccupees(inv, objet));
}

// Déplace `objet` à (x, y) si la place est libre. Renvoie true si déplacé.
export function deplacerObjet(inv, objet, x, y) {
  if (!peutPlacerA(inv, objet, x, y)) return false;
  objet.x = x;
  objet.y = y;
  return true;
}

function retirerObjet(inv, objet) {
  const i = inv.objets.indexOf(objet);
  if (i !== -1) inv.objets.splice(i, 1);
}

// Le slot visé par un item (une bague va sur la 1re bague libre).
// `heros` est optionnel : s'il a le talent ambidextrie et qu'arme1 est libre
// d'une 1M + arme2 est vide, la 2e arme va directement en arme2.
function slotCible(inv, id, heros) {
  const d = itemDef(id);
  const base = SLOT_PAR_CATEGORIE[d.categorie];
  if (base === "bague") {
    for (let i = 1; i <= 5; i++) if (!inv.slots["bague" + i]) return "bague" + i;
    return "bague1";
  }
  // Ambidextrie : si arme1 porte une arme 1M et arme2 est libre → rediriger vers arme2.
  if (base === "arme1" && d.mains !== 2 && (heros?.talents?.ambidextrie ?? 0) > 0) {
    const arme1Def = itemDef(inv.slots.arme1 ?? "");
    if (arme1Def && arme1Def.mains !== 2 && !inv.slots.arme2) return "arme2";
  }
  return base ?? null;
}

// Équipe un objet de la grille : il quitte le sac pour son slot ; l'ancien
// occupant du slot retourne dans le sac.
// `heros` est optionnel (nécessaire pour Ambidextrie).
// Retourne true si succès, false si impossible (slot invalide / bloqué),
// ou "plein" si le sac n'a pas la place pour accueillir les items déplacés.
export function equiper(inv, objet, heros) {
  const d = itemDef(objet.id);
  const slot = slotCible(inv, objet.id, heros);
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

  // L'échange peut avoir lieu.
  retirerObjet(inv, objet);
  inv.slots[slot] = objet.id;
  // Arme à deux mains : libère la seconde main (retourne au sac), même si c'est
  // une arme mise là par Ambidextrie.
  if (slot === "arme1" && d.mains === 2 && inv.slots.arme2) {
    const a2 = inv.slots.arme2; inv.slots.arme2 = null; ajouterObjet(inv, a2);
  }
  if (ancien) ajouterObjet(inv, ancien);
  return true;
}

// Vrai si arme1 est une arme deux mains → arme2 est bloquée.
export function arme2Bloquee(inv) {
  return itemDef(inv.slots.arme1 ?? "")?.mains === 2;
}

// État d'occupation des deux mains, pour les cartes de base du deck (cf.
// systems/combat.js → cartesDeBase). La main PRINCIPALE est prise dès qu'une
// arme est en arme1 ; la main SECONDAIRE dès qu'arme2 est rempli OU qu'arme1
// est une arme à deux mains (elle occupe alors les deux mains).
export function mainsOccupees(inv) {
  const deuxMains = itemDef(inv.slots.arme1 ?? "")?.mains === 2;
  return {
    principale: Boolean(inv.slots.arme1),
    secondaire: Boolean(inv.slots.arme2) || deuxMains,
  };
}

// Déséquipe un slot : l'item retourne au sac (refusé si le sac est plein).
export function desequiper(inv, slot) {
  const id = inv.slots[slot];
  if (!id) return false;
  if (!ajouterObjet(inv, id)) return false;
  inv.slots[slot] = null;
  return true;
}

export function ajouterOr(inv, n) { inv.or += n; }

// Vend un objet du SAC au marchand : il quitte le sac, son prix est crédité en
// or. Renvoie le prix obtenu.
export function vendreObjet(inv, objet) {
  const prix = prixVente(objet.id);
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

// Applique le skin (armure) + le calque d'arme au héros.
export function appliquerEquipement(heros, inv, planches) {
  const arme = armeEquipee(inv);
  heros.plancheArmure = planches.get(armureEquipee(inv).planche);
  heros.plancheArme = arme ? planches.get(arme.planche) : null;
}

// ---- Sauvegarde ----------------------------------------------------------

export function etatInventaire(inv) {
  return { or: inv.or, objets: inv.objets.map((o) => ({ ...o })), slots: { ...inv.slots } };
}

export function chargerInventaire(inv, etat) {
  if (!etat) return;
  inv.or = Number.isFinite(etat.or) ? etat.or : 0;
  inv.objets = [];
  inv.slots = {};
  for (const s of SLOTS) inv.slots[s] = null;
  // Slots : on ne garde que des ids connus
  if (etat.slots) for (const s of SLOTS) {
    if (etat.slots[s] && itemDef(etat.slots[s])) inv.slots[s] = etat.slots[s];
  }
  // Objets : on restaure la position rangée par le joueur si elle est valide,
  // sinon on auto-place au premier creux (sac réduit, données anciennes…).
  if (Array.isArray(etat.objets)) {
    for (const o of etat.objets) {
      if (!itemDef(o?.id)) continue;
      if (Number.isInteger(o.x) && Number.isInteger(o.y) &&
          peutPlacerA(inv, { id: o.id }, o.x, o.y)) {
        inv.objets.push({ id: o.id, x: o.x, y: o.y });
      } else {
        ajouterObjet(inv, o.id);
      }
    }
  }
}
