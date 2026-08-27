// ============================================================
//  CENTURYS — point d'entrée.
//  Ce fichier assemble tout : il met l'image à l'échelle,
//  fait tourner la boucle du jeu, écoute le clavier et la
//  souris, et bascule entre menu / partie / pause / fin.
// ============================================================

import { R } from './data/reglages.js';
import { etat } from './systems/etat.js';
import { appliquerTextes, definirLangue, langue, t } from './systems/langue.js';
import { demarrerPartie, majJeu, acheterUnite, ameliorerRevenu,
         evoluer, lancerSpecial, annulerDernier } from './systems/combat.js';
import { majIA } from './systems/ia.js';
import { dessinerScene } from './rendu/scene.js';
import { initHud, majHud, majBoutonSon } from './ui/hud.js';
import { initMessages, message } from './ui/messages.js';
import { son, basculerSon } from './core/sons.js';

const zone = document.getElementById('zone');
const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');
let difficulte = 'normal';

// ------------------------------------------------------------
//  Mise à l'échelle : tout le jeu est dessiné en 1280×720 puis
//  agrandi ou réduit d'un bloc. Canvas ET interface HTML bougent
//  ensemble, donc rien ne se décale jamais.
// ------------------------------------------------------------

function redimensionner() {
  const k = Math.min(window.innerWidth / R.largeur, window.innerHeight / R.hauteur);
  zone.style.transform = 'scale(' + k + ')';
  const res = Math.max(1, Math.min(2, (window.devicePixelRatio || 1) * k));
  canvas.width = Math.round(R.largeur * res);
  canvas.height = Math.round(R.hauteur * res);
  ctx.setTransform(res, 0, 0, res, 0, 0);
}
window.addEventListener('resize', redimensionner);

// ------------------------------------------------------------
//  Les écrans
// ------------------------------------------------------------

const ECRANS = ['ecranMenu', 'ecranPause', 'ecranFin'];
function montrer(nom) {
  ECRANS.forEach(n => document.getElementById(n).classList.toggle('visible', n === nom));
  zone.classList.toggle('enJeu', etat.ecran === 'jeu');
}

function allerAuMenu() {
  demarrerPartie(difficulte);      // remet un décor propre derrière le menu
  etat.ecran = 'menu';
  montrer('ecranMenu');
  document.getElementById('btJouer').focus();
}

function jouer() {
  son('clic');
  demarrerPartie(difficulte);
  montrer(null);
  majHud();
}

function basculerPause(force) {
  if (etat.ecran !== 'jeu') return;
  etat.pause = (force !== undefined) ? force : !etat.pause;
  montrer(etat.pause ? 'ecranPause' : null);
  if (etat.pause) document.getElementById('btReprendre').focus();
}

function afficherFin() {
  const f = etat.fin;
  const titre = document.getElementById('finTitre');
  titre.textContent = t(f.victoire ? 'fin.victoire' : 'fin.defaite');
  titre.classList.toggle('perdu', !f.victoire);
  document.getElementById('finTexte').textContent =
    t(f.victoire ? 'fin.victoireTxt' : 'fin.defaiteTxt');

  const minutes = Math.floor(f.duree / 60);
  const secondes = Math.floor(f.duree % 60).toString().padStart(2, '0');
  const lignes = [
    [t('fin.duree'), minutes + ' : ' + secondes],
    [t('fin.age'), document.getElementById('ageNom').textContent],
    [t('fin.tues'), f.tues],
    [t('fin.perdues'), f.perdues],
    [t('fin.orGagne'), f.or],
  ];
  document.getElementById('finStats').innerHTML =
    lignes.map(l => '<li><span>' + l[0] + '</span><b>' + l[1] + '</b></li>').join('');
  montrer('ecranFin');
  document.getElementById('btRejouer').focus();
}
document.addEventListener('partie-finie', afficherFin);

// ------------------------------------------------------------
//  Boutons des écrans
// ------------------------------------------------------------

function initEcrans() {
  document.getElementById('btJouer').addEventListener('click', jouer);
  document.getElementById('btRejouer').addEventListener('click', jouer);
  document.getElementById('btMenu').addEventListener('click', () => { son('clic'); allerAuMenu(); });
  document.getElementById('btReprendre').addEventListener('click', () => basculerPause(false));
  document.getElementById('btQuitter').addEventListener('click', () => {
    etat.pause = false; allerAuMenu();
  });
  document.getElementById('btPause').addEventListener('click', () => basculerPause());

  document.getElementById('choixDiff').addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    difficulte = b.dataset.diff;
    for (const autre of b.parentNode.children) autre.classList.toggle('actif', autre === b);
    son('clic');
  });

  const choixLangue = document.getElementById('choixLangue');
  choixLangue.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    definirLangue(b.dataset.langue);
    marquerLangue();
    son('clic');
  });
  marquerLangue();
}

function marquerLangue() {
  for (const b of document.getElementById('choixLangue').children) {
    b.classList.toggle('actif', b.dataset.langue === langue());
  }
}

// ------------------------------------------------------------
//  Clavier — tout ce qui se fait à la souris se fait au clavier
// ------------------------------------------------------------

function initClavier() {
  window.addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.key === 'Tab') return;
    const k = ev.key.toLowerCase();

    if (k === 'm') { message(basculerSon() ? 'info.sonCoupe' : 'info.sonActif'); majBoutonSon(); return; }

    if (etat.ecran === 'menu') {
      if (k === 'enter' && document.activeElement === document.body) { jouer(); ev.preventDefault(); }
      return;
    }
    if (etat.ecran === 'fin') {
      if (k === 'enter' && document.activeElement === document.body) { jouer(); ev.preventDefault(); }
      if (k === 'escape') allerAuMenu();
      return;
    }
    if (etat.ecran !== 'jeu') return;

    if (k === 'p' || k === 'escape') { basculerPause(); ev.preventDefault(); return; }
    if (etat.pause) return;

    const j = etat.camps.joueur;
    switch (k) {
      case '1': case '2': case '3': acheterUnite(j, Number(k) - 1); break;
      case '4': ameliorerRevenu(j); break;
      case 'e': evoluer(j); break;
      case 'a': lancerSpecial(j); break;
      case 'backspace': annulerDernier(j); ev.preventDefault(); break;
      default: return;
    }
    ev.preventDefault();
  });

  // Si on quitte l'onglet en pleine partie, on met en pause.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && etat.ecran === 'jeu') basculerPause(true);
  });
}

// ------------------------------------------------------------
//  La boucle
// ------------------------------------------------------------

let dernierInstant = performance.now();

function boucle(maintenant) {
  const dt = Math.min(0.1, (maintenant - dernierInstant) / 1000);
  dernierInstant = maintenant;
  etat.horloge += dt;

  if (etat.ecran === 'jeu' && !etat.pause) {
    majJeu(dt);
    majIA(dt);
    majHud();
  }
  dessinerScene(ctx);
  requestAnimationFrame(boucle);
}

// ------------------------------------------------------------
//  Démarrage
// ------------------------------------------------------------

document.documentElement.lang = langue();
appliquerTextes();
initMessages();
initHud();
initEcrans();
initClavier();
redimensionner();
allerAuMenu();
requestAnimationFrame(boucle);

document.addEventListener('langue-changee', () => {
  if (etat.ecran === 'fin') afficherFin();
});
