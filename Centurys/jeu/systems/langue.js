// ============================================================
//  LANGUE — le jeu est bilingue FR / EN en permanence.
//  En HTML : <span data-i18n="menu.jouer"></span>
//            (variantes -html, -title, -ph pour un placeholder)
//  En JS   : t("info.nouvelAge", { age: "Antiquité" })
// ============================================================

import { TEXTES } from '../data/textes.js';

const CLE_STOCKAGE = 'centurys.langue';

function langueParDefaut() {
  const sauvee = localStorage.getItem(CLE_STOCKAGE);
  if (sauvee === 'fr' || sauvee === 'en') return sauvee;
  const nav = (navigator.language || 'fr').slice(0, 2).toLowerCase();
  return nav === 'fr' ? 'fr' : 'en';
}

let LANGUE = langueParDefaut();

export function langue() { return LANGUE; }

export function definirLangue(l) {
  LANGUE = (l === 'fr') ? 'fr' : 'en';
  try { localStorage.setItem(CLE_STOCKAGE, LANGUE); } catch (e) { /* navigation privée */ }
  document.documentElement.lang = LANGUE;
  appliquerTextes();
  document.dispatchEvent(new CustomEvent('langue-changee'));
}

export function basculerLangue() {
  definirLangue(LANGUE === 'fr' ? 'en' : 'fr');
}

// Traduit une clé, et remplace les {parametres}.
export function t(cle, params) {
  const entree = TEXTES[cle];
  let texte = entree ? (entree[LANGUE] || entree.fr) : cle;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      texte = texte.split('{' + k + '}').join(v);
    }
  }
  return texte;
}

// Nom traduit d'une donnée du jeu (unité, âge, attaque spéciale…).
export function nomDe(objet) {
  if (!objet || !objet.nom) return '';
  return objet.nom[LANGUE] || objet.nom.fr;
}

// Nom ANGLAIS, à utiliser pour tout ce qui est technique
// (nom de fichier, identifiant) : un chemin ne doit JAMAIS
// dépendre de la langue affichée.
export function nomAnglais(objet) {
  return (objet && objet.nom && objet.nom.en) || '';
}

// Applique les textes à tout le HTML porteur d'un data-i18n.
export function appliquerTextes(racine = document) {
  racine.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  racine.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  racine.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  racine.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
}
