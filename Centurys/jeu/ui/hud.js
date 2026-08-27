// ============================================================
//  L'INTERFACE : barres du haut, bourse, file d'entraînement
//  et boutons du bas. Tout est en HTML/CSS (donc net et
//  redimensionné avec le reste), le canvas ne sert qu'au jeu.
//  Chaque bouton a sa touche clavier : jouable à la souris
//  OU au clavier, sans exception.
// ============================================================

import { R, coutRevenu, revenuDe } from '../data/reglages.js';
import { AGES, xpPourEvoluer } from '../data/ages.js';
import { etat } from '../systems/etat.js';
import { t, nomDe } from '../systems/langue.js';
import { acheterUnite, ameliorerRevenu, evoluer, peutEvoluer,
         lancerSpecial, annulerDernier } from '../systems/combat.js';
import { dessinerUnite } from '../rendu/unites.js';
import { basculerSon, sonCoupe } from '../core/sons.js';
import { message } from './messages.js';

const el = {};
let ageAffiche = -1;
let langueAffichee = '';
let signatureFile = '';

export function initHud() {
  const id = n => document.getElementById(n);
  Object.assign(el, {
    or: id('orTxt'), revenu: id('revenuTxt'),
    viePj: id('viePj'), viePjTxt: id('viePjTxt'),
    vieIa: id('vieIa'), vieIaTxt: id('vieIaTxt'),
    ageNom: id('ageNom'), xpBarre: id('xpBarre'), xpTxt: id('xpTxt'),
    unites: id('unites'), file: id('file'),
    btRevenu: id('btRevenu'), btEvoluer: id('btEvoluer'), btSpecial: id('btSpecial'),
    btPause: id('btPause'), btSon: id('btSon'),
  });

  el.btRevenu.addEventListener('click', () => ameliorerRevenu(etat.camps.joueur));
  el.btEvoluer.addEventListener('click', () => evoluer(etat.camps.joueur));
  el.btSpecial.addEventListener('click', () => lancerSpecial(etat.camps.joueur));
  el.btSon.addEventListener('click', () => {
    const coupe = basculerSon();
    message(coupe ? 'info.sonCoupe' : 'info.sonActif');
    majBoutonSon();
  });
  majBoutonSon();

  // Un changement de langue oblige à réécrire les boutons.
  document.addEventListener('langue-changee', () => { langueAffichee = ''; });
}

export function majBoutonSon() {
  if (el.btSon) el.btSon.textContent = sonCoupe() ? '✕' : '♪';
}

// ------------------------------------------------------------
//  Les trois boutons de troupes (reconstruits à chaque âge)
// ------------------------------------------------------------

function construireBoutonsUnites(camp) {
  el.unites.innerHTML = '';
  AGES[camp.age].unites.forEach((def, i) => {
    const b = document.createElement('button');
    b.className = 'unite';
    b.dataset.index = String(i);
    b.title = infobulle(def);

    const touche = document.createElement('span');
    touche.className = 'touche';
    touche.textContent = String(i + 1);

    const cv = document.createElement('canvas');
    cv.className = 'apercu';
    cv.width = 112; cv.height = 112;

    const nom = document.createElement('span');
    nom.className = 'nom';
    nom.textContent = nomDe(def);

    const prix = document.createElement('span');
    prix.className = 'prix';
    prix.textContent = def.cout;

    b.append(touche, cv, nom, prix);
    b.addEventListener('click', () => acheterUnite(etat.camps.joueur, i));
    el.unites.appendChild(b);
    dessinerApercu(cv, def);
  });
}

function infobulle(def) {
  const type = def.type === 'distance' ? t('stat.distance') : t('stat.corpsACorps');
  return nomDe(def) + ' (' + type + ')'
    + '\n' + t('stat.cout') + ' : ' + def.cout
    + '\n' + t('stat.pv') + ' : ' + def.pv
    + '\n' + t('stat.degats') + ' : ' + def.degats
    + '\n' + t('stat.portee') + ' : ' + Math.round(def.portee)
    + '\n' + t('stat.vitesse') + ' : ' + Math.round(def.vitesse);
}

function dessinerApercu(canvas, def) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const echelle = Math.min((canvas.width * 0.78) / def.largeur,
                           (canvas.height * 0.86) / def.hauteur);
  dessinerUnite(ctx, def, 'joueur', canvas.width / 2, canvas.height * 0.95,
                { echelle, phase: 0, ombre: false });
}

// ------------------------------------------------------------
//  Mise à jour, appelée à chaque image
// ------------------------------------------------------------

export function majHud() {
  const j = etat.camps.joueur, e = etat.camps.ennemi;
  if (!j || !e) return;

  if (j.age !== ageAffiche || langueAffichee !== document.documentElement.lang) {
    ageAffiche = j.age;
    langueAffichee = document.documentElement.lang;
    construireBoutonsUnites(j);
    signatureFile = '';
  }

  // Bourse
  el.or.textContent = Math.floor(j.or);
  el.revenu.textContent = '+' + revenuDe(j).toFixed(1) + '/s';

  // Châteaux
  el.viePj.style.width = (100 * j.pv / j.pvMax) + '%';
  el.viePjTxt.textContent = Math.ceil(j.pv) + ' / ' + j.pvMax;
  el.vieIa.style.width = (100 * e.pv / e.pvMax) + '%';
  el.vieIaTxt.textContent = Math.ceil(e.pv) + ' / ' + e.pvMax
                          + '  ·  ' + nomDe(AGES[e.age]);

  // Âge et expérience
  el.ageNom.textContent = nomDe(AGES[j.age]);
  const requis = xpPourEvoluer(j.age);
  if (requis === null) {
    el.xpBarre.style.width = '100%';
    el.xpTxt.textContent = t('hud.ageMax');
  } else {
    el.xpBarre.style.width = Math.min(100, 100 * j.xp / requis) + '%';
    el.xpTxt.textContent = t('hud.evolution') + ' : ' + Math.floor(j.xp) + ' / ' + requis;
  }

  // Boutons de troupes
  const unites = AGES[j.age].unites;
  for (const b of el.unites.children) {
    const def = unites[+b.dataset.index];
    b.disabled = (j.or < def.cout) || (j.file.length >= R.fileMax);
  }

  majBoutonRevenu(j);
  majBoutonEvoluer(j, requis);
  majBoutonSpecial(j);
  majFile(j);
}

function majBoutonRevenu(j) {
  const max = j.revenuNiveau >= R.revenuMax;
  const prix = coutRevenu(j);
  el.btRevenu.innerHTML =
    '<span class="touche">4</span>'
    + '<span class="icone">▲</span>'
    + '<b>' + t('bouton.revenu') + '</b>'
    + (max ? '<span class="prix">' + t('bouton.max') + '</span>'
           : '<span class="prix">' + prix + '</span>')
    + '<small>' + t('bouton.revenuNiv', { n: j.revenuNiveau + 1 }) + '</small>';
  el.btRevenu.disabled = max || j.or < prix;
  el.btRevenu.title = t('bouton.revenu') + ' : +' + R.revenuPas.toFixed(2) + '/s';
}

function majBoutonEvoluer(j, requis) {
  const pret = peutEvoluer(j);
  el.btEvoluer.innerHTML =
    '<span class="touche">E</span>'
    + '<span class="icone">✦</span>'
    + '<b>' + t('bouton.evoluer') + '</b>'
    + '<span class="prix">' + (requis === null ? t('bouton.max')
        : (pret ? t('bouton.pret') : Math.floor(j.xp) + ' / ' + requis)) + '</span>'
    + '<small>' + (requis === null ? '' : nomDe(AGES[j.age + 1])) + '</small>';
  el.btEvoluer.disabled = !pret;
  el.btEvoluer.classList.toggle('pret', pret);
}

function majBoutonSpecial(j) {
  const sp = AGES[j.age].special;
  const pret = j.specialRecharge <= 0;
  const reste = Math.ceil(j.specialRecharge);
  el.btSpecial.innerHTML =
    '<span class="touche">A</span>'
    + '<span class="icone">☄</span>'
    + '<b>' + nomDe(sp) + '</b>'
    + '<span class="prix">' + (pret ? t('bouton.pret') : reste + ' s') + '</span>'
    + (pret ? '' : '<span class="recharge" style="width:'
        + (100 * (1 - j.specialRecharge / sp.recharge)) + '%"></span>');
  el.btSpecial.disabled = !pret;
  el.btSpecial.classList.toggle('pret', pret);
}

function majFile(j) {
  const signature = j.file.map(f => f.def.id).join(',');
  if (signature !== signatureFile) {
    signatureFile = signature;
    el.file.innerHTML = '';
    j.file.forEach((entree, i) => {
      const c = document.createElement('div');
      c.className = 'case';
      c.title = nomDe(entree.def);
      const cv = document.createElement('canvas');
      cv.width = 92; cv.height = 92;
      const p = document.createElement('div');
      p.className = 'progres';
      c.append(cv, p);
      c.addEventListener('click', () => {
        // Cliquer sur la dernière case rembourse l'entraînement.
        if (i === j.file.length - 1) annulerDernier(etat.camps.joueur);
      });
      el.file.appendChild(c);
      dessinerApercu(cv, entree.def);
    });
  }
  // Avancement de la case en cours
  const cases = el.file.children;
  if (cases.length && j.file.length) {
    const tete = j.file[0];
    const barre = cases[0].querySelector('.progres');
    if (barre) barre.style.width = (100 * (1 - tete.restant / tete.total)) + '%';
    for (let i = 1; i < cases.length; i++) {
      const b = cases[i].querySelector('.progres');
      if (b) b.style.width = '0%';
    }
  }
}
