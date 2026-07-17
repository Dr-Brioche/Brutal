// LE COFFRE DE VILLE : un grand rangement partagé et PERSISTANT (localStorage,
// via la sauvegarde). On y dépose objets, équipement et ressources pour libérer
// le sac. C'est une grille façon inventaire — on RÉUTILISE donc directement les
// fonctions de placement de systems/inventaire.js (mêmes règles d'empreinte et
// d'empilement). Le coffre n'a PAS d'équipement : juste une grille d'objets.

import { ajouterObjet, deplacerObjet, objetSousCase, peutPlacerA } from "./inventaire.js";
import { itemDef } from "../data/items.js";

// Grille généreuse mais bornée (80 cases). Agrandissable plus tard si besoin.
const COFFRE_COLS = 10;
const COFFRE_RANGS = 8;

// Un coffre a la MÊME forme qu'un inventaire (cols/rangs/objets), mais sans
// slots d'équipement — d'où `slots`/`qualites` vides : les helpers de grille
// (nbSacs, rangsInventaire…) fonctionnent alors comme sur l'onglet 0 d'un sac.
export function creerCoffre() {
  return { cols: COFFRE_COLS, rangs: COFFRE_RANGS, objets: [], slots: {}, qualites: {} };
}

export function coffreCols() { return COFFRE_COLS; }
export function coffreRangs() { return COFFRE_RANGS; }

// Sauvegarde / rechargement (comme etatInventaire, mais sans or ni équipement).
export function etatCoffre(c) {
  return { objets: c.objets.map((o) => ({ ...o })) };
}

export function chargerCoffre(c, etat) {
  c.objets = [];
  if (!etat || !Array.isArray(etat.objets)) return;
  for (const o of etat.objets) {
    if (!itemDef(o?.id)) continue;                 // id inconnu = ignoré (save abîmée)
    const champs = o.qualite ? { qualite: o.qualite } : null;
    // On restaure la position rangée si elle est encore valide, sinon auto-place.
    if (Number.isInteger(o.x) && Number.isInteger(o.y) &&
        peutPlacerA(c, { id: o.id, sac: 0 }, o.x, o.y, 0)) {
      c.objets.push({
        id: o.id, x: o.x, y: o.y, sac: 0,
        ...((o.quantite ?? 1) > 1 ? { quantite: o.quantite } : {}),
        ...(champs || {}),
      });
    } else {
      ajouterObjet(c, o.id, o.quantite ?? 1, champs);
    }
  }
}

// Transfère UN objet de `src` vers `dst`, AUTO-placé (les ressources complètent
// d'abord les piles existantes). Renvoie true si transféré, false si `dst` est
// plein — dans ce cas RIEN ne bouge (rollback). Sert au clic « envoyer ».
export function transfererObjet(src, dst, objet) {
  const i = src.objets.indexOf(objet);
  if (i === -1) return false;
  const champs = objet.qualite ? { qualite: objet.qualite } : null;
  src.objets.splice(i, 1);                          // on sort l'objet de la source
  const ok = ajouterObjet(dst, objet.id, objet.quantite ?? 1, champs);
  if (!ok) { src.objets.splice(i, 0, objet); return false; } // dst plein → on le remet
  return true;
}

// Pose `objet` (venu de `src`) à la case EXACTE (x, y) de `dst` si elle est libre.
// Renvoie true si posé. Sert au dépôt clavier/clic sur une case précise (rangement
// choisi). Ressources : la pile est déplacée telle quelle (pas de fusion ici).
export function poserObjetA(src, dst, objet, x, y) {
  if (src === dst) return deplacerObjet(dst, objet, x, y, 0); // simple repositionnement
  if (!peutPlacerA(dst, { id: objet.id, sac: 0 }, x, y, 0)) return false;
  const i = src.objets.indexOf(objet);
  if (i === -1) return false;
  src.objets.splice(i, 1);
  dst.objets.push({ ...objet, x, y, sac: 0 });
  return true;
}

// Réexport pratique pour l'UI (pointer sous une case).
export { objetSousCase };
