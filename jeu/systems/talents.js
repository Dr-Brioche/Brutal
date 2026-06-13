// La logique de l'arbre de talents : calcul des bonus, règles de déblocage,
// application des CHIFFRES au héros. (Les données des nœuds sont dans data/talents.js.)

import { talentDef } from "../data/talents.js";

// Stats de base du héros (doivent matcher entities/heros.js).
const PV_BASE = 40;
const VITESSE_BASE = 160;

// Somme des effets de TOUS les talents débloqués (× leur rang).
// Ex. { pvMax: 25, chaleurSeuil: 1, pioche: 1 }.
export function bonusTalents(heros) {
  const total = {};
  for (const [id, rang] of Object.entries(heros.talents || {})) {
    const n = talentDef(id);
    if (!n || rang <= 0) continue;
    for (const [k, v] of Object.entries(n.effet || {})) {
      total[k] = (total[k] || 0) + v * rang;
    }
  }
  return total;
}

// Peut-on débloquer ce nœud maintenant ? (assez de points, prérequis ok, pas au max)
export function peutDebloquer(heros, id) {
  const n = talentDef(id);
  if (!n) return false;
  const rang = heros.talents?.[id] || 0;
  if (rang >= (n.rangMax || 1)) return false;            // déjà au rang max
  if ((heros.pointsTalent || 0) < n.cout) return false;  // pas assez de points
  return (n.requis || []).every((r) => (heros.talents?.[r] || 0) > 0); // prérequis débloqués
}

// État d'un nœud pour l'affichage : "debloque" | "disponible" | "bloque".
export function etatNoeud(heros, id) {
  if ((heros.talents?.[id] || 0) > 0) return "debloque";
  return peutDebloquer(heros, id) ? "disponible" : "bloque";
}

// Recalcule les stats du héros dérivées des talents (vie max, vitesse). À appeler
// au démarrage, au chargement et après chaque déblocage.
export function appliquerTalents(heros) {
  const b = bonusTalents(heros);
  heros.pvMax = PV_BASE + (b.pvMax || 0);
  heros.vitesse = VITESSE_BASE + (b.vitesse || 0);
  if (heros.pv > heros.pvMax) heros.pv = heros.pvMax;
}

// Débloque un nœud (dépense les points). Renvoie true si fait. Le gain de PV max
// soigne le héros d'autant (on profite tout de suite de la vie supplémentaire).
export function debloquer(heros, id) {
  if (!peutDebloquer(heros, id)) return false;
  heros.talents = heros.talents || {};
  heros.talents[id] = (heros.talents[id] || 0) + 1;
  heros.pointsTalent -= talentDef(id).cout;
  const ancienMax = heros.pvMax;
  appliquerTalents(heros);
  heros.pv = Math.min(heros.pvMax, heros.pv + Math.max(0, heros.pvMax - ancienMax));
  return true;
}
