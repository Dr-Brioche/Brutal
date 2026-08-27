// ============================================================
//  DESSIN DU TERRAIN : ciel, collines, sol, châteaux,
//  troupes, projectiles et effets. Rien de ce fichier ne
//  modifie l'état du jeu : il ne fait que le regarder.
// ============================================================

import { R } from '../data/reglages.js';
import { AGES } from '../data/ages.js';
import { etat } from '../systems/etat.js';
import { cheminArrondi, jauge, texteContour } from '../core/style.js';
import { dessinerUnite, COULEUR_CAMP, assombrir, eclaircir } from './unites.js';

export function dessinerScene(ctx) {
  const age = AGES[etat.camps.joueur ? etat.camps.joueur.age : 0];
  fond(ctx, age);
  if (etat.camps.ennemi) dessinerChateau(ctx, etat.camps.ennemi);
  if (etat.camps.joueur) dessinerChateau(ctx, etat.camps.joueur);
  troupes(ctx);
  projectiles(ctx);
  effets(ctx);
}

// ------------------------------------------------------------
//  Décor
// ------------------------------------------------------------

function fond(ctx, age) {
  const ciel = ctx.createLinearGradient(0, 0, 0, R.solY);
  ciel.addColorStop(0, age.ciel[0]);
  ciel.addColorStop(1, age.ciel[1]);
  ctx.fillStyle = ciel;
  ctx.fillRect(0, 0, R.largeur, R.solY);

  // Soleil (ou lune à l'âge futuriste)
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = age.id === 'futur' ? '#d8ccff' : '#fff3c4';
  ctx.beginPath(); ctx.arc(R.largeur * 0.78, 128, 46, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Nuages, qui dérivent très lentement
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    const base = i * 290 + 60;
    const x = ((base + etat.horloge * (6 + i * 2)) % (R.largeur + 320)) - 160;
    const y = 60 + (i % 3) * 52;
    nuage(ctx, x, y, 46 + (i % 3) * 16);
  }
  ctx.restore();

  // Deux rangs de collines
  collines(ctx, age.collines[0], R.solY - 96, 150, 0.9);
  collines(ctx, age.collines[1], R.solY - 46, 96, 1.7);

  // Sol
  ctx.fillStyle = age.sol;
  ctx.fillRect(0, R.solY, R.largeur, R.hauteur - R.solY);
  ctx.fillStyle = assombrir(age.sol, 0.78);
  ctx.fillRect(0, R.solY, R.largeur, 6);
  ctx.strokeStyle = assombrir(age.sol, 0.68);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const x = (i * 97 % R.largeur);
    const y = R.solY + 16 + (i * 37 % (R.hauteur - R.solY - 20));
    ctx.moveTo(x, y); ctx.lineTo(x + 14, y);
  }
  ctx.stroke();
}

function nuage(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.arc(x + r * 0.6, y - r * 0.18, r * 0.45, 0, Math.PI * 2);
  ctx.arc(x - r * 0.55, y + r * 0.05, r * 0.40, 0, Math.PI * 2);
  ctx.fill();
}

function collines(ctx, couleur, base, hauteur, frequence) {
  ctx.fillStyle = couleur;
  ctx.beginPath();
  ctx.moveTo(0, R.solY);
  for (let x = 0; x <= R.largeur; x += 16) {
    const y = base - Math.sin(x / 190 * frequence + frequence) * hauteur * 0.30
                   - Math.sin(x / 70 * frequence) * hauteur * 0.08;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(R.largeur, R.solY);
  ctx.closePath();
  ctx.fill();
}

// ------------------------------------------------------------
//  Les châteaux
// ------------------------------------------------------------

function dessinerChateau(ctx, camp) {
  const age = AGES[camp.age];
  const L = R.chateauLargeur, H = R.chateauHauteur;
  const tremble = camp.secousse > 0 ? Math.sin(etat.horloge * 55) * camp.secousse * 4 : 0;
  const x = camp.x + tremble;
  const haut = R.solY - H;
  const pierre = age.pierre;
  const couleur = COULEUR_CAMP[camp.id];

  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(camp.sens, 1);           // le château regarde vers le terrain

  // Corps
  ctx.fillStyle = pierre;
  cheminArrondi(ctx, -L / 2, haut, L, H, 10);
  ctx.fill();
  ctx.fillStyle = assombrir(pierre, 0.82);
  cheminArrondi(ctx, -L / 2, haut, L * 0.34, H, 10);
  ctx.fill();

  // Décor du haut, propre à chaque âge
  ctx.fillStyle = pierre;
  switch (camp.age) {
    case 0:  // toit de chaume
      ctx.fillStyle = '#a07840';
      ctx.beginPath();
      ctx.moveTo(-L * 0.62, haut); ctx.lineTo(0, haut - 52); ctx.lineTo(L * 0.62, haut);
      ctx.closePath(); ctx.fill();
      break;
    case 1:  // fronton et colonnes
      ctx.fillStyle = eclaircir(pierre, 0.25);
      ctx.beginPath();
      ctx.moveTo(-L * 0.60, haut); ctx.lineTo(0, haut - 40); ctx.lineTo(L * 0.60, haut);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = eclaircir(pierre, 0.4);
      for (let i = 0; i < 4; i++) {
        cheminArrondi(ctx, -L * 0.42 + i * L * 0.26, haut + 16, L * 0.10, H * 0.55, 4);
        ctx.fill();
      }
      break;
    case 2:  // créneaux
      ctx.fillStyle = pierre;
      for (let i = 0; i < 5; i++) {
        cheminArrondi(ctx, -L / 2 + i * (L / 5) + 3, haut - 24, L / 5 - 8, 26, 4);
        ctx.fill();
      }
      cheminArrondi(ctx, L * 0.22, haut - 74, L * 0.30, 78, 6);
      ctx.fill();
      break;
    case 3:  // toit plat, sacs de sable, antenne
      ctx.fillStyle = assombrir(pierre, 0.8);
      cheminArrondi(ctx, -L * 0.56, haut - 16, L * 1.12, 20, 5); ctx.fill();
      ctx.strokeStyle = '#8e8e8e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(L * 0.30, haut - 16); ctx.lineTo(L * 0.34, haut - 74); ctx.stroke();
      break;
    default: // dôme lumineux
      ctx.fillStyle = eclaircir(pierre, 0.2);
      ctx.beginPath(); ctx.ellipse(0, haut + 4, L * 0.52, 46, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#8ee6ff'; ctx.lineWidth = 4;
      ctx.shadowColor = '#8ee6ff'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.ellipse(0, haut + 4, L * 0.52, 46, 0, Math.PI, 0); ctx.stroke();
      ctx.shadowBlur = 0;
      break;
  }

  // Porte, tournée vers le terrain
  ctx.fillStyle = assombrir(pierre, 0.45);
  cheminArrondi(ctx, L * 0.06, R.solY - H * 0.42, L * 0.34, H * 0.42, 14);
  ctx.fill();

  // Meurtrières
  ctx.fillStyle = assombrir(pierre, 0.4);
  for (let i = 0; i < 3; i++) {
    cheminArrondi(ctx, -L * 0.34 + i * L * 0.20, haut + H * 0.22, 10, 24, 4);
    ctx.fill();
  }

  // Fissures quand le château souffre
  const sante = camp.pv / camp.pvMax;
  if (sante < 0.65) {
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-L * 0.18, haut + 30); ctx.lineTo(-L * 0.04, haut + 88); ctx.lineTo(-L * 0.20, haut + 140);
    if (sante < 0.35) {
      ctx.moveTo(L * 0.26, haut + 46); ctx.lineTo(L * 0.12, haut + 104); ctx.lineTo(L * 0.28, haut + 160);
    }
    ctx.stroke();
  }

  // Mât et bannière du camp
  ctx.strokeStyle = '#5a4a33'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-L * 0.36, haut - 10); ctx.lineTo(-L * 0.36, haut - 78); ctx.stroke();
  ctx.fillStyle = couleur;
  const flotte = Math.sin(etat.horloge * 3) * 5;
  ctx.beginPath();
  ctx.moveTo(-L * 0.36, haut - 76);
  ctx.lineTo(-L * 0.36 - 46, haut - 66 + flotte);
  ctx.lineTo(-L * 0.36, haut - 50);
  ctx.closePath(); ctx.fill();

  ctx.restore();
}

// ------------------------------------------------------------
//  Les troupes
// ------------------------------------------------------------

function troupes(ctx) {
  // Les grandes unités passent derrière : la mêlée reste lisible.
  const liste = etat.unites.slice().sort((a, b) => b.def.hauteur - a.def.hauteur);
  for (const u of liste) {
    const chute = u.mort ? Math.max(0, 1 - u.fade / 0.5) : 0;
    dessinerUnite(ctx, u.def, u.camp, u.x, R.solY, {
      phase: u.marche ? u.phase : 0,
      attaque: u.animAttaque > 0 ? u.animAttaque / 0.35 : 0,
      flash: u.flash,
      chute,
    });
    if (!u.mort && u.pv < u.pvMax) {
      const l = Math.max(26, u.def.largeur * 0.9);
      jauge(ctx, u.x - l / 2, R.solY - u.def.hauteur - 12, l, 5,
            u.pv / u.pvMax, COULEUR_CAMP[u.camp]);
    }
  }
}

// ------------------------------------------------------------
//  Les projectiles
// ------------------------------------------------------------

function projectiles(ctx) {
  for (const p of etat.projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle || 0);
    switch (p.type) {
      case 'pierre':
      case 'rocher':
        ctx.fillStyle = '#8d8577';
        ctx.beginPath(); ctx.arc(0, 0, p.type === 'rocher' ? 10 : 5, 0, Math.PI * 2); ctx.fill();
        break;
      case 'fleche':
      case 'carreau':
        ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = '#d8dde2';
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
        break;
      case 'balle':
        ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(6, 0); ctx.stroke();
        break;
      case 'obus':
        ctx.fillStyle = '#3d4436';
        cheminArrondi(ctx, -9, -4, 18, 8, 4); ctx.fill();
        break;
      case 'laser':
        ctx.strokeStyle = '#c07bff'; ctx.lineWidth = 4;
        ctx.shadowColor = '#c07bff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(10, 0); ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      case 'plasma':
        ctx.fillStyle = '#8ee6ff';
        ctx.shadowColor = '#8ee6ff'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        break;
      default:
        ctx.fillStyle = '#eee';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------
//  Les effets (particules, textes, explosions, attaque spéciale)
// ------------------------------------------------------------

function effets(ctx) {
  for (const e of etat.effets) {
    const k = e.t / e.duree;
    switch (e.type) {
      case 'particule':
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = e.couleur;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.taille, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case 'texte':
        ctx.globalAlpha = Math.max(0, 1 - k * k);
        texteContour(ctx, e.texte, e.x, e.y, 17, e.couleur);
        ctx.globalAlpha = 1;
        break;
      case 'impact':
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.strokeStyle = e.couleur; ctx.lineWidth = 5 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.rayon * (0.25 + k * 0.9), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = e.couleur; ctx.globalAlpha = Math.max(0, 0.5 - k);
        ctx.beginPath(); ctx.arc(e.x, e.y, e.rayon * 0.5 * (1 - k), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case 'evolution':
        dessinerEvolution(ctx, e, k);
        break;
      case 'special':
        dessinerSpecial(ctx, e, k);
        break;
    }
  }
}

function dessinerEvolution(ctx, e, k) {
  const camp = etat.camps[e.camp];
  if (!camp) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k);
  const g = ctx.createLinearGradient(0, R.solY - R.chateauHauteur - 220, 0, R.solY);
  g.addColorStop(0, 'rgba(255,236,160,0)');
  g.addColorStop(1, 'rgba(255,236,160,0.65)');
  ctx.fillStyle = g;
  ctx.fillRect(camp.x - R.chateauLargeur * 0.7, R.solY - R.chateauHauteur - 220,
               R.chateauLargeur * 1.4, R.chateauHauteur + 220);
  ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 6 * (1 - k) + 1;
  ctx.beginPath();
  ctx.ellipse(camp.x, R.solY, 60 + k * 190, 18 + k * 60, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function dessinerSpecial(ctx, e, k) {
  // Le camp qui lance frappe la moitié adverse du terrain.
  const versLaDroite = (e.camp === 'joueur');
  const x0 = versLaDroite ? R.largeur * 0.42 : 40;
  const largeur = R.largeur * 0.58 - 40;
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const av = Math.min(1, Math.max(0, k * 1.6 - (i % 5) * 0.12));
    if (av <= 0) continue;
    const x = x0 + ((i * 137) % largeur);
    const yArrivee = R.solY - 10;
    ctx.globalAlpha = Math.max(0, 1 - k);
    switch (e.variante) {
      case 'meteore': {
        const y = -80 + av * (yArrivee + 80);
        ctx.strokeStyle = '#ff9a44'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(x - 26, y - 52); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = '#ffd08a';
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'javelot':
      case 'fleches': {
        const y = -60 + av * (yArrivee + 60);
        ctx.strokeStyle = e.variante === 'javelot' ? '#d9c58a' : '#e8e2d0';
        ctx.lineWidth = e.variante === 'javelot' ? 4 : 2.5;
        ctx.beginPath(); ctx.moveTo(x - 12, y - 34); ctx.lineTo(x, y); ctx.stroke();
        break;
      }
      case 'obus': {
        const y = -60 + av * (yArrivee + 60);
        ctx.fillStyle = '#3d4436';
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        if (av >= 1) {
          ctx.fillStyle = 'rgba(255,190,90,0.75)';
          ctx.beginPath(); ctx.arc(x, yArrivee, 26, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      default: { // orbital
        ctx.strokeStyle = '#9be6ff';
        ctx.lineWidth = 10 * av;
        ctx.shadowColor = '#9be6ff'; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, yArrivee); ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
    }
  }
  ctx.globalAlpha = Math.max(0, 0.22 - k * 0.22);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, R.largeur, R.hauteur);
  ctx.restore();
  ctx.globalAlpha = 1;
}
