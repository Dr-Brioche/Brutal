// La sauvegarde locale : plusieurs emplacements ("slots") dans le carnet
// du navigateur (localStorage). Aucun serveur : conforme à notre règle
// "100 % local". Le carnet peut être indisponible (navigation privée) ou
// abîmé : dans ces cas on renvoie null / false sans jamais planter.

const PREFIXE = "brutal.slot.";
const VERSION = 1; // permettra de faire évoluer le format sans tout casser

export const NB_SLOTS = 3;

// Emplacement SPÉCIAL de sauvegarde AUTOMATIQUE, séparé des slots manuels 1..3.
// Le jeu y écrit tout seul (à chaque entrée/sortie de la cité) : un filet de
// sécurité si le joueur oublie de sauvegarder. On ne sauvegarde JAMAIS dedans à la
// main (le menu n'y propose que « Load »). La clé "auto" ne collisionne pas avec
// les numéros → lireSlot/ecrireSlot/effacerSlot fonctionnent tels quels.
export const SLOT_AUTO = "auto";

// Renvoie le contenu d'un emplacement, ou null s'il est vide/illisible.
export function lireSlot(n) {
  try {
    const texte = localStorage.getItem(PREFIXE + n);
    if (!texte) return null;
    const donnees = JSON.parse(texte);
    return donnees && donnees.version === VERSION ? donnees : null;
  } catch {
    return null;
  }
}

// Écrit dans un emplacement. Ajoute la version et la date automatiquement.
// Renvoie true si l'écriture a réussi.
export function ecrireSlot(n, donnees) {
  try {
    localStorage.setItem(
      PREFIXE + n,
      JSON.stringify({ ...donnees, version: VERSION, date: Date.now() })
    );
    return true;
  } catch {
    return false; // stockage indisponible : on jouera sans mémoire
  }
}

export function effacerSlot(n) {
  try {
    localStorage.removeItem(PREFIXE + n);
  } catch {}
}
