// ============================================================
//  MESSAGES — les petites bulles qui apparaissent en haut de
//  l'écran (« Pas assez d'or », « Nouvel âge »…).
// ============================================================

import { t } from '../systems/langue.js';

let zone = null;

export function initMessages() {
  zone = document.getElementById('messages');
}

// type : 'info' (par défaut), 'erreur', 'bien'
export function message(cle, params = null, type = 'info') {
  if (!zone) return;
  const el = document.createElement('div');
  el.className = 'message ' + type;
  el.textContent = t(cle, params);
  zone.appendChild(el);
  // On ne garde que les 4 derniers, sinon ça inonde l'écran.
  while (zone.children.length > 4) zone.removeChild(zone.firstChild);
  setTimeout(() => el.classList.add('sortie'), 1700);
  setTimeout(() => el.remove(), 2300);
}
