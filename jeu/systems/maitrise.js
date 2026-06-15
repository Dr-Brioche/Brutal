// Maîtrise des Ancêtres : comptage des usages de cartes + bibliothèque.
//
// Le comptage NE démarre QU'une fois le talent "maitrise1" débloqué.
// À 200 usages → carte maîtrisée → disponible dans la bibliothèque.
// On choisit jusqu'à 3 cartes maîtrisées : elles s'ajoutent au deck en
// combat, sans avoir besoin d'équiper l'arme correspondante.
//
// Seules les cartes d'ÉQUIPEMENT sont maîtrisables : on exclut les cartes du
// deck de BASE (coup-faible, garde-faible) et les cartes « UNIQUE » (très
// puissantes, marquées `unique: true` dans data/cartes.js).

import { CARTES } from "../data/cartes.js";
import { CARTES_BASE } from "./combat.js";

export const SEUIL_MAITRISE = 10; // provisoire pour les tests (valeur finale : 200)
const MAX_CHOISIES = 3;

export function creerMaitrise() {
  return { compteurs: {}, choisies: [] };
}

// Une carte est-elle maîtrisable ? Non si elle est du deck de base ou « unique ».
export function carteMaitrisable(carteId) {
  const carte = CARTES[carteId];
  if (!carte) return false;            // carte inconnue
  if (CARTES_BASE.has(carteId)) return false; // deck de base : exclu
  if (carte.unique) return false;      // carte « unique » : exclue
  return true;
}

// Incrémente le compteur (uniquement si le talent est débloqué ET la carte est
// maîtrisable — les cartes de base et « uniques » ne comptent jamais).
export function incrementerMaitrise(maitrise, heros, carteId) {
  if (!heros?.talents?.maitrise1) return;
  if (!carteMaitrisable(carteId)) return;
  maitrise.compteurs[carteId] = (maitrise.compteurs[carteId] || 0) + 1;
}

export function compteurMaitrise(maitrise, carteId) {
  return maitrise.compteurs[carteId] || 0;
}

export function carteMaitrisee(maitrise, carteId) {
  return compteurMaitrise(maitrise, carteId) >= SEUIL_MAITRISE;
}

export function cartesMaitrisees(maitrise) {
  return Object.keys(maitrise.compteurs)
    .filter((id) => carteMaitrisable(id) && carteMaitrisee(maitrise, id));
}

// Ajoute / retire une carte des slots choisis. Retourne false si les 3 slots
// sont déjà pleins et que la carte n'était pas déjà choisie.
export function toggleCarteChoisie(maitrise, carteId) {
  const idx = maitrise.choisies.indexOf(carteId);
  if (idx >= 0) { maitrise.choisies.splice(idx, 1); return true; }
  if (maitrise.choisies.length >= MAX_CHOISIES) return false;
  maitrise.choisies.push(carteId);
  return true;
}

export function etatMaitrise(maitrise) {
  return { compteurs: { ...maitrise.compteurs }, choisies: [...maitrise.choisies] };
}

export function chargerMaitrise(maitrise, donnees) {
  if (donnees?.compteurs && typeof donnees.compteurs === "object")
    maitrise.compteurs = { ...donnees.compteurs };
  if (Array.isArray(donnees?.choisies))
    maitrise.choisies = donnees.choisies.slice(0, MAX_CHOISIES);
}
