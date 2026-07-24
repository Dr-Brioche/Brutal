// ═══════════════════════════════════════════════════════════════════════════
// LANGUE (i18n) — le petit moteur de traduction FR / EN du jeu.
//
// Idée : tout texte affiché passe par une CLÉ (ex. "combat.finTour"). La clé est
// traduite dans la langue courante via le dictionnaire `TEXTES` (data/textes.js).
//
//   • Côté JS   : `t("combat.finTour")` → "End Turn" ou "Fin du tour".
//   • Côté HTML : un attribut `data-i18n="combat.finTour"` sur un élément ; au
//                 chargement (et à chaque changement de langue) `appliquerTextesDOM()`
//                 remplit son texte. Variantes : `data-i18n-title` (attribut title),
//                 `data-i18n-html` (innerHTML, pour un texte avec un peu de balisage),
//                 `data-i18n-ph` (placeholder d'un champ).
//
// La langue choisie est mémorisée en local (localStorage) : au retour, le jeu
// s'ouvre directement dans la bonne langue. Pas de serveur (cf. CLAUDE.md).
//
// Traduction PROGRESSIVE : une clé absente du dictionnaire retombe sur l'anglais,
// puis sur la clé elle-même — donc rien ne « casse » tant qu'on traduit par lots.
// ═══════════════════════════════════════════════════════════════════════════

import { TEXTES } from "../data/textes.js";

const CLE_STOCKAGE = "brutal-langue";
export const LANGUES = ["fr", "en"];
export const LANGUE_DEFAUT = "en";

let langue = null; // résolue paresseusement (lit le localStorage au 1er accès)
const abonnes = new Set(); // callbacks (langue) => void, rappelés à chaque changement

// La langue déjà ENREGISTRÉE (ou null si le joueur n'a jamais choisi — on montre
// alors le menu de langue au démarrage).
export function langueEnregistree() {
  try {
    const l = localStorage.getItem(CLE_STOCKAGE);
    return LANGUES.includes(l) ? l : null;
  } catch { return null; }
}

export function getLangue() {
  if (langue == null) langue = langueEnregistree() ?? LANGUE_DEFAUT;
  return langue;
}

// Change la langue : mémorise, ré-applique les textes du DOM, prévient les abonnés.
export function definirLangue(l) {
  if (!LANGUES.includes(l)) return;
  langue = l;
  try { localStorage.setItem(CLE_STOCKAGE, l); } catch { /* privé/plein : tant pis */ }
  document.documentElement.setAttribute("lang", l);
  appliquerTextesDOM();
  for (const cb of abonnes) { try { cb(l); } catch (_) {} }
}

// S'abonner aux changements de langue (ex. redessiner un écran canvas ouvert).
export function surChangementLangue(cb) { abonnes.add(cb); return () => abonnes.delete(cb); }

// Traduit une clé dans la langue courante. `params` (optionnel) remplace les
// marqueurs {nom} dans le texte (ex. t("marchand.ajoute", { nom: "Épée" })).
export function t(cle, params = null) {
  const entree = TEXTES[cle];
  let s = entree ? (entree[getLangue()] ?? entree.en ?? cle) : cle;
  if (params) for (const k in params) s = s.split(`{${k}}`).join(params[k]);
  return s;
}

// Câble les boutons de choix de langue (écran de titre + onglet Interface du menu
// pause) et tient à jour leur liseré « actif ». À appeler une fois au démarrage.
export function installerSelecteurLangue() {
  const brancher = (id, l) => document.getElementById(id)?.addEventListener("click", () => definirLangue(l));
  brancher("titre-langue-fr", "fr"); brancher("titre-langue-en", "en");
  brancher("menu-langue-fr", "fr");  brancher("menu-langue-en", "en");
  function majActif() {
    const l = getLangue();
    document.getElementById("titre-langue-fr")?.classList.toggle("actif", l === "fr");
    document.getElementById("titre-langue-en")?.classList.toggle("actif", l === "en");
    document.getElementById("menu-langue-fr")?.classList.toggle("langue-actif", l === "fr");
    document.getElementById("menu-langue-en")?.classList.toggle("langue-actif", l === "en");
  }
  surChangementLangue(majActif);
  majActif();
}

// Comme `t`, mais avec un REPLI EXPLICITE (souvent le texte anglais déjà présent
// dans les données). Sert à traduire les noms/descriptions des data (objets, cartes,
// talents, monstres) sans devoir dupliquer tout l'anglais dans le dictionnaire :
// on n'ajoute que le français, et l'anglais d'origine reste le repli.
export function tr(cle, defaut) {
  const e = TEXTES[cle];
  if (!e) return defaut;
  return e[getLangue()] ?? e.en ?? defaut;
}

// Remplit tous les éléments porteurs d'un attribut data-i18n* avec leur traduction.
// Appelé au démarrage et à chaque changement de langue.
export function appliquerTextesDOM(racine = document) {
  racine.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  racine.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  racine.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
  });
  racine.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
  });
}
