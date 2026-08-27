// ============================================================
//  DESSIN DES UNITÉS
//  Tout est dessiné à la main (formes géométriques) : aucune
//  image à charger, donc rien à télécharger et un jeu qui
//  marche hors ligne. On pourra remplacer chaque silhouette
//  par un vrai sprite plus tard sans toucher au reste du code.
//
//  Repère local : (0,0) = les PIEDS de l'unité, y négatif
//  vers le haut, x positif vers l'avant (elle regarde toujours
//  vers la droite dans son repère ; le miroir est fait avant).
// ============================================================

import { cheminArrondi } from '../core/style.js';

export const COULEUR_CAMP = { joueur: '#4ea8ff', ennemi: '#ff6a52' };

// --- Petits outils de couleur ------------------------------

function lire(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function ecrire(r, g, b) {
  const d = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + d(r) + d(g) + d(b);
}
export function assombrir(hex, k = 0.7) {
  const [r, g, b] = lire(hex); return ecrire(r * k, g * k, b * k);
}
export function eclaircir(hex, k = 0.3) {
  const [r, g, b] = lire(hex);
  return ecrire(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k);
}

// Quand une unité vient d'être touchée, elle blanchit une fraction
// de seconde : c'est ce mélange qui donne le « flash ».
let melange = 0;
function c(hex) { return melange > 0 ? eclaircir(hex, melange * 0.85) : hex; }

// ------------------------------------------------------------
//  Point d'entrée
// ------------------------------------------------------------

export function dessinerUnite(ctx, def, campId, x, ySol, opts = {}) {
  const echelle = opts.echelle || 1;
  const h = def.hauteur * echelle;
  const sens = opts.sens !== undefined ? opts.sens : (campId === 'joueur' ? 1 : -1);
  const phase = opts.phase || 0;
  const attaque = opts.attaque || 0;      // 0 → 1 juste après un coup
  melange = opts.flash || 0;

  ctx.save();
  ctx.translate(x, ySol);

  // Ombre au sol, teintée à la couleur du camp : on voit d'un
  // coup d'œil à qui appartient chaque troupe.
  const campCouleur = COULEUR_CAMP[campId] || '#8a8a8a';
  if (opts.ombre !== false) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, def.largeur * echelle * 0.56, h * 0.075, 0, 0, Math.PI * 2);
    ctx.globalAlpha = 0.42; ctx.fillStyle = campCouleur; ctx.fill();
    ctx.globalAlpha = 0.85; ctx.strokeStyle = campCouleur; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  ctx.scale(sens, 1);
  if (opts.chute) {
    ctx.rotate(opts.chute * 1.35);
    ctx.globalAlpha = Math.max(0, 1 - opts.chute * 0.75);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const l = def.look || {};
  switch (l.corps) {
    case 'bete':     bete(ctx, h, l, phase, attaque, campCouleur); break;
    case 'attelage': attelage(ctx, h, l, phase, attaque, campCouleur); break;
    case 'engin':    engin(ctx, h, l, phase, attaque, def, campCouleur); break;
    case 'meca':     meca(ctx, h, l, phase, attaque, campCouleur); break;
    default:         humain(ctx, h, l, phase, attaque, campCouleur);
  }

  ctx.restore();
  melange = 0;
}

// ------------------------------------------------------------
//  Un humain (la base de la plupart des unités)
// ------------------------------------------------------------

function humain(ctx, h, l, phase, attaque, camp) {
  const pas = Math.sin(phase) * h * 0.11;
  const rebond = Math.abs(Math.cos(phase)) * h * 0.015;
  const tenue = c(l.tenue || '#7a5a3a');
  const peau = c(l.peau || '#cf9a63');

  // Jambes
  ctx.strokeStyle = assombrir(tenue, 0.65);
  ctx.lineWidth = h * 0.095;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.42 - rebond); ctx.lineTo(pas, 0);
  ctx.moveTo(0, -h * 0.42 - rebond); ctx.lineTo(-pas, 0);
  ctx.stroke();

  // Bras arrière (derrière le corps)
  ctx.strokeStyle = assombrir(peau, 0.75);
  ctx.lineWidth = h * 0.05;
  ctx.beginPath();
  ctx.moveTo(-h * 0.02, -h * 0.66 - rebond);
  ctx.lineTo(-pas * 0.8 - h * 0.06, -h * 0.46 - rebond);
  ctx.stroke();

  // Torse
  cheminArrondi(ctx, -h * 0.15, -h * 0.80 - rebond, h * 0.30, h * 0.40, h * 0.10);
  ctx.fillStyle = tenue; ctx.fill();
  // Bandeau aux couleurs du camp : on reconnaît son armée d'un coup d'œil.
  if (camp) {
    cheminArrondi(ctx, -h * 0.155, -h * 0.71 - rebond, h * 0.31, h * 0.085, h * 0.03);
    ctx.fillStyle = c(camp); ctx.fill();
  }
  if (l.neon) {
    ctx.strokeStyle = c(l.neon); ctx.lineWidth = h * 0.022;
    ctx.beginPath();
    ctx.moveTo(-h * 0.09, -h * 0.62 - rebond); ctx.lineTo(h * 0.09, -h * 0.62 - rebond);
    ctx.stroke();
  }

  // Tête
  ctx.beginPath();
  ctx.arc(h * 0.02, -h * 0.90 - rebond, h * 0.115, 0, Math.PI * 2);
  ctx.fillStyle = peau; ctx.fill();
  if (l.casque) {
    ctx.beginPath();
    ctx.arc(h * 0.02, -h * 0.90 - rebond, h * 0.125, Math.PI * 1.05, Math.PI * 2.05);
    ctx.closePath();
    ctx.fillStyle = c(l.casque); ctx.fill();
  }

  // Bras avant + arme
  const epaule = { x: h * 0.07, y: -h * 0.68 - rebond };
  const arme = l.arme || 'gourdin';
  const distance = (arme === 'arc' || arme === 'arbalete' || arme === 'fusil'
                 || arme === 'longfusil' || arme === 'laser' || arme === 'fronde');
  let angle, recul = 0;
  if (distance) {
    angle = -0.10;
    recul = -attaque * h * 0.07;
  } else {
    angle = -0.30 - attaque * 1.30;      // l'arme se lève puis retombe
  }
  const longueur = h * 0.26;
  const main = {
    x: epaule.x + Math.cos(angle) * longueur + recul,
    y: epaule.y + Math.sin(angle) * longueur,
  };

  if (l.bouclier) {
    ctx.save();
    ctx.fillStyle = c(l.bouclier);
    ctx.strokeStyle = assombrir(l.bouclier, 0.6);
    ctx.lineWidth = h * 0.02;
    ctx.beginPath();
    ctx.ellipse(h * 0.13, -h * 0.58 - rebond, h * 0.075, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = peau;
  ctx.lineWidth = h * 0.055;
  ctx.beginPath();
  ctx.moveTo(epaule.x, epaule.y); ctx.lineTo(main.x, main.y);
  ctx.stroke();

  ctx.save();
  ctx.translate(main.x, main.y);
  ctx.rotate(angle);
  dessinerArme(ctx, h, arme, l, attaque);
  ctx.restore();
}

function dessinerArme(ctx, h, arme, l, attaque) {
  const metal = c(l.metal || '#c9cfd6');
  switch (arme) {
    case 'gourdin':
      ctx.fillStyle = c('#8a5f33');
      cheminArrondi(ctx, -h * 0.03, -h * 0.05, h * 0.30, h * 0.10, h * 0.05);
      ctx.fill();
      break;
    case 'fronde':
      ctx.strokeStyle = c('#7b6a55'); ctx.lineWidth = h * 0.02;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(h * 0.16, h * 0.10); ctx.stroke();
      ctx.beginPath(); ctx.arc(h * 0.17, h * 0.12, h * 0.045, 0, Math.PI * 2);
      ctx.fillStyle = c('#8d8577'); ctx.fill();
      break;
    case 'glaive':
    case 'epee':
      ctx.fillStyle = metal;
      cheminArrondi(ctx, 0, -h * 0.022, h * (arme === 'epee' ? 0.36 : 0.26), h * 0.044, h * 0.02);
      ctx.fill();
      ctx.fillStyle = c('#8a6134');
      cheminArrondi(ctx, -h * 0.05, -h * 0.035, h * 0.05, h * 0.07, h * 0.02);
      ctx.fill();
      break;
    case 'lame':
      ctx.fillStyle = c(l.neon || '#5fd7ff');
      ctx.shadowColor = l.neon || '#5fd7ff'; ctx.shadowBlur = h * 0.14;
      cheminArrondi(ctx, 0, -h * 0.018, h * 0.38, h * 0.036, h * 0.018);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    case 'arc':
      ctx.strokeStyle = c('#8a6134'); ctx.lineWidth = h * 0.028;
      ctx.beginPath(); ctx.arc(h * 0.02, 0, h * 0.19, -1.25, 1.25); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = h * 0.012;
      const c1 = Math.cos(1.25) * h * 0.19 + h * 0.02, s1 = Math.sin(1.25) * h * 0.19;
      ctx.beginPath(); ctx.moveTo(c1, -s1); ctx.lineTo(h * 0.02 - attaque * h * 0.10, 0);
      ctx.lineTo(c1, s1); ctx.stroke();
      break;
    case 'arbalete':
      ctx.fillStyle = c('#6b5138');
      cheminArrondi(ctx, -h * 0.06, -h * 0.02, h * 0.30, h * 0.04, h * 0.02); ctx.fill();
      ctx.strokeStyle = metal; ctx.lineWidth = h * 0.025;
      ctx.beginPath(); ctx.moveTo(h * 0.18, -h * 0.14); ctx.lineTo(h * 0.18, h * 0.14); ctx.stroke();
      break;
    case 'fusil':
    case 'longfusil':
      ctx.fillStyle = c('#54402c');
      cheminArrondi(ctx, -h * 0.09, -h * 0.025, h * 0.14, h * 0.05, h * 0.015); ctx.fill();
      ctx.fillStyle = c('#41474d');
      cheminArrondi(ctx, h * 0.02, -h * 0.017, h * (arme === 'fusil' ? 0.24 : 0.36), h * 0.034, h * 0.012);
      ctx.fill();
      if (attaque > 0.55) {
        ctx.fillStyle = 'rgba(255,214,120,' + (attaque - 0.4) + ')';
        ctx.beginPath();
        ctx.arc(h * (arme === 'fusil' ? 0.27 : 0.39), 0, h * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'laser':
      ctx.fillStyle = c('#3b3552');
      cheminArrondi(ctx, -h * 0.08, -h * 0.03, h * 0.34, h * 0.06, h * 0.02); ctx.fill();
      ctx.fillStyle = c(l.neon || '#c07bff');
      ctx.shadowColor = l.neon || '#c07bff'; ctx.shadowBlur = h * 0.16;
      ctx.beginPath(); ctx.arc(h * 0.28, 0, h * 0.04 + attaque * h * 0.04, 0, Math.PI * 2);
      ctx.fill(); ctx.shadowBlur = 0;
      break;
  }
}

// ------------------------------------------------------------
//  Le mastodonte
// ------------------------------------------------------------

function bete(ctx, h, l, phase, attaque, camp) {
  const poil = c(l.poil || '#7a5136');
  const poil2 = c(l.poil2 || '#5d3d29');
  const pas = Math.sin(phase) * h * 0.09;
  const secousse = -attaque * h * 0.05;

  // Pattes
  ctx.strokeStyle = poil2; ctx.lineWidth = h * 0.11;
  ctx.beginPath();
  ctx.moveTo(-h * 0.20, -h * 0.42); ctx.lineTo(-h * 0.20 + pas, 0);
  ctx.moveTo(h * 0.14, -h * 0.42); ctx.lineTo(h * 0.14 - pas, 0);
  ctx.stroke();
  ctx.strokeStyle = poil; ctx.lineWidth = h * 0.12;
  ctx.beginPath();
  ctx.moveTo(-h * 0.28, -h * 0.42); ctx.lineTo(-h * 0.28 - pas, 0);
  ctx.moveTo(h * 0.22, -h * 0.42); ctx.lineTo(h * 0.22 + pas, 0);
  ctx.stroke();

  // Corps
  ctx.fillStyle = poil;
  ctx.beginPath();
  ctx.ellipse(-h * 0.05, -h * 0.60, h * 0.36, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  // Couverture du camp sur le dos
  if (camp) {
    cheminArrondi(ctx, -h * 0.24, -h * 0.78, h * 0.36, h * 0.13, h * 0.05);
    ctx.fillStyle = c(camp); ctx.fill();
  }

  // Tête + trompe + défenses
  ctx.save();
  ctx.translate(h * 0.30 + secousse, -h * 0.62);
  ctx.fillStyle = poil;
  ctx.beginPath(); ctx.ellipse(0, 0, h * 0.16, h * 0.17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = poil2; ctx.lineWidth = h * 0.055;
  ctx.beginPath();
  ctx.moveTo(h * 0.06, h * 0.06);
  ctx.quadraticCurveTo(h * 0.24, h * 0.16, h * 0.20, h * 0.32);
  ctx.stroke();
  ctx.strokeStyle = c(l.defense || '#efe6cf'); ctx.lineWidth = h * 0.045;
  ctx.beginPath();
  ctx.moveTo(h * 0.05, h * 0.10);
  ctx.quadraticCurveTo(h * 0.26, h * 0.14, h * 0.30, -h * 0.02);
  ctx.stroke();
  ctx.fillStyle = '#1b1410';
  ctx.beginPath(); ctx.arc(h * 0.07, -h * 0.05, h * 0.022, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------
//  Le char de guerre (cheval + caisse à deux roues)
// ------------------------------------------------------------

function attelage(ctx, h, l, phase, attaque, camp) {
  const poil = c(l.poil || '#8a6134');
  const caisse = c(l.caisse || '#8d6a3a');
  const metal = c(l.metal || '#c8a44a');
  const pas = Math.sin(phase) * h * 0.10;

  // Roue arrière
  roue(ctx, -h * 0.34, -h * 0.15, h * 0.15, metal, phase);
  // Caisse
  ctx.fillStyle = caisse;
  cheminArrondi(ctx, -h * 0.50, -h * 0.52, h * 0.34, h * 0.30, h * 0.05);
  ctx.fill();
  ctx.strokeStyle = metal; ctx.lineWidth = h * 0.025;
  cheminArrondi(ctx, -h * 0.50, -h * 0.52, h * 0.34, h * 0.30, h * 0.05);
  ctx.stroke();
  if (camp) {
    cheminArrondi(ctx, -h * 0.50, -h * 0.50, h * 0.34, h * 0.09, h * 0.03);
    ctx.fillStyle = c(camp); ctx.fill();
  }
  // Timon
  ctx.strokeStyle = assombrir(caisse, 0.7); ctx.lineWidth = h * 0.035;
  ctx.beginPath(); ctx.moveTo(-h * 0.18, -h * 0.40); ctx.lineTo(h * 0.10, -h * 0.46); ctx.stroke();

  // Cheval
  ctx.strokeStyle = assombrir(poil, 0.75); ctx.lineWidth = h * 0.06;
  ctx.beginPath();
  ctx.moveTo(h * 0.10, -h * 0.34); ctx.lineTo(h * 0.10 + pas, 0);
  ctx.moveTo(h * 0.36, -h * 0.34); ctx.lineTo(h * 0.36 - pas, 0);
  ctx.stroke();
  ctx.fillStyle = poil;
  ctx.beginPath(); ctx.ellipse(h * 0.24, -h * 0.46, h * 0.20, h * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(h * 0.44, -h * 0.60);
  ctx.rotate(-0.35 - attaque * 0.25);
  ctx.fillStyle = poil;
  cheminArrondi(ctx, -h * 0.05, -h * 0.05, h * 0.22, h * 0.11, h * 0.04); ctx.fill();
  ctx.restore();
  // Guerrier debout dans la caisse
  ctx.save();
  ctx.translate(-h * 0.34, -h * 0.50);
  humain(ctx, h * 0.62, { peau: '#d3a06a', tenue: '#a33b2c', arme: 'glaive', casque: '#c8a44a' },
         phase * 0.2, attaque, camp);
  ctx.restore();
}

function roue(ctx, x, y, r, couleur, phase) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = couleur; ctx.lineWidth = r * 0.22;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(phase * 0.5);
  ctx.lineWidth = r * 0.14;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------
//  Les engins (catapulte, char d'assaut)
// ------------------------------------------------------------

function engin(ctx, h, l, phase, attaque, def, camp) {
  const caisse = c(l.caisse || '#7d5a34');
  const metal = c(l.metal || '#8b8b8b');
  const demi = def.largeur * 0.5;

  if (l.canon === 'bras') {
    // Catapulte : deux roues, un châssis, un bras qui claque.
    roue(ctx, -demi * 0.55, -h * 0.17, h * 0.17, metal, phase);
    roue(ctx, demi * 0.45, -h * 0.17, h * 0.17, metal, phase);
    ctx.fillStyle = caisse;
    cheminArrondi(ctx, -demi * 0.85, -h * 0.46, demi * 1.6, h * 0.22, h * 0.05); ctx.fill();
    if (camp) {
      cheminArrondi(ctx, -demi * 0.85, -h * 0.34, demi * 1.6, h * 0.07, 3);
      ctx.fillStyle = c(camp); ctx.fill();
    }
    ctx.save();
    ctx.translate(-demi * 0.30, -h * 0.46);
    ctx.rotate(-1.15 + attaque * 1.35);
    ctx.strokeStyle = assombrir(caisse, 0.75); ctx.lineWidth = h * 0.07;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(h * 0.62, 0); ctx.stroke();
    ctx.fillStyle = metal;
    ctx.beginPath(); ctx.arc(h * 0.66, 0, h * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = assombrir(caisse, 0.6); ctx.lineWidth = h * 0.05;
    ctx.beginPath();
    ctx.moveTo(-demi * 0.30, -h * 0.46); ctx.lineTo(demi * 0.20, -h * 0.46);
    ctx.stroke();
  } else {
    // Char d'assaut : chenilles, caisse, tourelle, tube.
    ctx.fillStyle = assombrir(metal, 0.6);
    cheminArrondi(ctx, -demi, -h * 0.34, demi * 2, h * 0.34, h * 0.12); ctx.fill();
    ctx.fillStyle = metal;
    for (let i = 0; i < 5; i++) {
      const rx = -demi + h * 0.14 + i * (demi * 2 - h * 0.28) / 4;
      ctx.beginPath(); ctx.arc(rx, -h * 0.17, h * 0.075, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = caisse;
    cheminArrondi(ctx, -demi * 0.9, -h * 0.62, demi * 1.8, h * 0.30, h * 0.06); ctx.fill();
    cheminArrondi(ctx, -demi * 0.35, -h * 0.84, demi * 0.9, h * 0.24, h * 0.07); ctx.fill();
    if (camp) {
      cheminArrondi(ctx, -demi * 0.9, -h * 0.45, demi * 1.8, h * 0.08, 3);
      ctx.fillStyle = c(camp); ctx.fill();
    }
    ctx.fillStyle = assombrir(caisse, 0.8);
    const recul = -attaque * h * 0.10;
    cheminArrondi(ctx, demi * 0.35 + recul, -h * 0.76, demi * 0.85, h * 0.09, h * 0.04); ctx.fill();
    if (attaque > 0.6) {
      ctx.fillStyle = 'rgba(255,205,110,' + (attaque - 0.45) + ')';
      ctx.beginPath(); ctx.arc(demi * 1.22, -h * 0.715, h * 0.13, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ------------------------------------------------------------
//  Le méca de siège
// ------------------------------------------------------------

function meca(ctx, h, l, phase, attaque, camp) {
  const metal = c(l.metal || '#5a6480');
  const metal2 = c(l.metal2 || '#39415a');
  const neon = c(l.neon || '#5fd7ff');
  const pas = Math.sin(phase) * h * 0.06;

  // Jambes
  ctx.strokeStyle = metal2; ctx.lineWidth = h * 0.085;
  ctx.beginPath();
  ctx.moveTo(-h * 0.10, -h * 0.46); ctx.lineTo(-h * 0.16 + pas, -h * 0.22);
  ctx.lineTo(-h * 0.10 + pas, 0);
  ctx.moveTo(h * 0.10, -h * 0.46); ctx.lineTo(h * 0.16 - pas, -h * 0.22);
  ctx.lineTo(h * 0.10 - pas, 0);
  ctx.stroke();

  // Torse
  ctx.fillStyle = metal;
  cheminArrondi(ctx, -h * 0.22, -h * 0.80, h * 0.44, h * 0.36, h * 0.08); ctx.fill();
  if (camp) {
    ctx.fillStyle = c(camp);
    cheminArrondi(ctx, -h * 0.26, -h * 0.80, h * 0.11, h * 0.24, h * 0.04); ctx.fill();
    cheminArrondi(ctx, h * 0.15, -h * 0.80, h * 0.11, h * 0.24, h * 0.04); ctx.fill();
  }
  ctx.fillStyle = metal2;
  cheminArrondi(ctx, -h * 0.10, -h * 0.94, h * 0.24, h * 0.17, h * 0.06); ctx.fill();
  ctx.fillStyle = neon;
  ctx.shadowColor = l.neon || '#5fd7ff'; ctx.shadowBlur = h * 0.10;
  cheminArrondi(ctx, -h * 0.04, -h * 0.90, h * 0.16, h * 0.045, h * 0.02); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -h * 0.62, h * 0.055, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Canon d'épaule
  const recul = -attaque * h * 0.07;
  ctx.fillStyle = metal2;
  cheminArrondi(ctx, h * 0.14 + recul, -h * 0.80, h * 0.44, h * 0.13, h * 0.05); ctx.fill();
  if (attaque > 0.55) {
    ctx.fillStyle = 'rgba(140,225,255,' + (attaque - 0.4) + ')';
    ctx.beginPath(); ctx.arc(h * 0.60, -h * 0.735, h * 0.11, 0, Math.PI * 2); ctx.fill();
  }
}
