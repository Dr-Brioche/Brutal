// ============================================================
//  LE CŒUR DU JEU : économie, entraînement, marche, combat.
//  Toutes les actions possibles (acheter, améliorer, évoluer,
//  attaque spéciale) passent par ce fichier, que ce soit le
//  joueur ou l'ordinateur qui les déclenche.
// ============================================================

import { R, coutRevenu, revenuDe } from '../data/reglages.js';
import { AGES, xpPourEvoluer } from '../data/ages.js';
import { etat, creerCamp, autre, bordChateau } from './etat.js';
import { son } from '../core/sons.js';
import { message } from '../ui/messages.js';
import { nomDe } from './langue.js';

// ------------------------------------------------------------
//  Démarrage
// ------------------------------------------------------------

export function demarrerPartie(difficulte = 'normal') {
  const reg = R.ia[difficulte] || R.ia.normal;
  etat.difficulte = difficulte;
  etat.temps = 0;
  etat.pause = false;
  etat.fin = null;
  etat.unites.length = 0;
  etat.projectiles.length = 0;
  etat.effets.length = 0;
  etat.camps.joueur = creerCamp('joueur');
  etat.camps.ennemi = creerCamp('ennemi', {
    bonusRevenu: reg.revenu,
    agressivite: reg.agressivite,
  });
  etat.ecran = 'jeu';
}

// ------------------------------------------------------------
//  Les actions
// ------------------------------------------------------------

export function acheterUnite(camp, index) {
  const def = AGES[camp.age].unites[index];
  if (!def) return false;
  if (camp.file.length >= R.fileMax) {
    if (camp.id === 'joueur') { message('info.filePleine', null, 'erreur'); son('erreur'); }
    return false;
  }
  if (camp.or < def.cout) {
    if (camp.id === 'joueur') { message('info.pasAssezOr', null, 'erreur'); son('erreur'); }
    return false;
  }
  camp.or -= def.cout;
  camp.file.push({ def, restant: def.duree, total: def.duree });
  if (camp.id === 'joueur') son('achat');
  return true;
}

export function annulerDernier(camp) {
  if (!camp.file.length) return false;
  const annulee = camp.file.pop();
  camp.or += annulee.def.cout;
  if (camp.id === 'joueur') { message('info.annule', null, 'info'); son('clic'); }
  return true;
}

export function ameliorerRevenu(camp) {
  if (camp.revenuNiveau >= R.revenuMax) {
    if (camp.id === 'joueur') { message('info.revenuMax', null, 'erreur'); son('erreur'); }
    return false;
  }
  const prix = coutRevenu(camp);
  if (camp.or < prix) {
    if (camp.id === 'joueur') { message('info.pasAssezOr', null, 'erreur'); son('erreur'); }
    return false;
  }
  camp.or -= prix;
  camp.revenuNiveau++;
  if (camp.id === 'joueur') son('revenu');
  return true;
}

export function peutEvoluer(camp) {
  const requis = xpPourEvoluer(camp.age);
  return requis !== null && camp.xp >= requis;
}

export function evoluer(camp) {
  if (!peutEvoluer(camp)) {
    if (camp.id === 'joueur') { message('info.pasAssezXp', null, 'erreur'); son('erreur'); }
    return false;
  }
  camp.xp -= xpPourEvoluer(camp.age);
  camp.age++;
  // Évoluer répare un peu le château : ça récompense la montée
  // en âge et laisse une chance de remonter au score.
  camp.pv = Math.min(camp.pvMax, camp.pv + camp.pvMax * R.soinEvolution);
  camp.specialRecharge = Math.max(camp.specialRecharge, 10);
  etat.effets.push({ type: 'evolution', camp: camp.id, t: 0, duree: 1.5 });
  if (camp.id === 'joueur') son('evolution');
  message(camp.id === 'joueur' ? 'info.nouvelAge' : 'info.ageEnnemi',
          { age: nomDe(AGES[camp.age]) },
          camp.id === 'joueur' ? 'bien' : 'info');
  return true;
}

export function lancerSpecial(camp) {
  if (camp.specialRecharge > 0) {
    if (camp.id === 'joueur') { message('info.recharge', null, 'erreur'); son('erreur'); }
    return false;
  }
  const cibles = etat.unites.filter(u => !u.mort && u.camp !== camp.id);
  if (!cibles.length) {
    if (camp.id === 'joueur') { message('info.aucuneCible', null, 'erreur'); son('erreur'); }
    return false;
  }
  const sp = AGES[camp.age].special;
  camp.specialRecharge = sp.recharge;
  etat.effets.push({ type: 'special', variante: sp.effet, camp: camp.id, t: 0, duree: 1.2 });
  for (const c of cibles) {
    etat.effets.push({ type: 'impact', x: c.x, y: R.solY - 10, t: 0, duree: 0.45,
                       rayon: 46, couleur: '#ffd9a0' });
    if (!c.mort) infligerDegats(c, sp.degats, camp.id);
  }
  if (camp.id === 'joueur') son('special');
  else son('explosion');
  return true;
}

// ------------------------------------------------------------
//  La boucle de simulation
// ------------------------------------------------------------

export function majJeu(dt) {
  dt = Math.min(dt, 0.05);           // un gros ralentissement ne doit pas téléporter les troupes
  etat.temps += dt;
  majCamp(etat.camps.joueur, dt);
  majCamp(etat.camps.ennemi, dt);
  majUnites(dt);
  majProjectiles(dt);
  majEffets(dt);
}

function majCamp(camp, dt) {
  const gain = revenuDe(camp) * dt;
  camp.or += gain;
  camp.orTotal += gain;
  if (camp.specialRecharge > 0) camp.specialRecharge = Math.max(0, camp.specialRecharge - dt);
  if (camp.secousse > 0) camp.secousse = Math.max(0, camp.secousse - dt * 2.5);

  const tete = camp.file[0];
  if (tete) {
    tete.restant -= dt;
    if (tete.restant <= 0) {
      camp.file.shift();
      faireSortir(camp, tete.def);
    }
  }
}

function faireSortir(camp, def) {
  etat.unites.push({
    camp: camp.id,
    sens: camp.sens,
    def,
    pv: def.pv,
    pvMax: def.pv,
    x: camp.x + camp.sens * (R.chateauLargeur / 2 + def.largeur / 2 + 6),
    cd: 0,
    marche: true,
    phase: Math.random() * 10,
    animAttaque: 0,
    flash: 0,
    mort: false,
    fade: 0,
  });
  if (camp.id === 'joueur') son('sortie');
}

function majUnites(dt) {
  for (const u of etat.unites) {
    if (u.mort) { u.fade -= dt; continue; }
    if (u.flash > 0) u.flash = Math.max(0, u.flash - dt * 4);
    if (u.animAttaque > 0) u.animAttaque = Math.max(0, u.animAttaque - dt);
    if (u.cd > 0) u.cd -= dt;

    const campAdverse = etat.camps[autre(u.camp)];
    const cible = trouverCible(u);
    let distance;
    if (cible) {
      distance = Math.abs(cible.x - u.x) - (u.def.largeur + cible.def.largeur) / 2;
    } else {
      distance = Math.abs(bordChateau(campAdverse) - u.x) - u.def.largeur / 2;
    }

    if (distance <= u.def.portee) {
      u.marche = false;
      if (u.cd <= 0) {
        attaquer(u, cible, cible ? null : campAdverse);
        u.cd = u.def.cadence;
        u.animAttaque = Math.min(0.35, u.def.cadence * 0.5);
      }
    } else {
      u.marche = true;
      avancer(u, dt);
    }
  }
  // On retire les morts une fois leur petite chute terminée.
  for (let i = etat.unites.length - 1; i >= 0; i--) {
    if (etat.unites[i].mort && etat.unites[i].fade <= 0) etat.unites.splice(i, 1);
  }
}

// L'ennemi vivant le plus proche devant nous (null = plus personne, on tape le château).
function trouverCible(u) {
  let meilleur = null, meilleureD = Infinity;
  for (const e of etat.unites) {
    if (e.mort || e.camp === u.camp) continue;
    const devant = (e.x - u.x) * u.sens;
    if (devant < -12) continue;                 // il est derrière nous : on l'ignore
    if (devant < meilleureD) { meilleureD = devant; meilleur = e; }
  }
  return meilleur;
}

function avancer(u, dt) {
  let nx = u.x + u.sens * u.def.vitesse * dt;

  // On ne rentre pas dans le château adverse.
  const limite = bordChateau(etat.camps[autre(u.camp)]) - u.sens * (u.def.largeur / 2 + 2);
  if ((nx - limite) * u.sens > 0) nx = limite;

  // On ne traverse pas un allié : on fait la queue derrière lui.
  for (const a of etat.unites) {
    if (a === u || a.mort || a.camp !== u.camp) continue;
    if ((a.x - u.x) * u.sens <= 0) continue;
    const requis = (u.def.largeur + a.def.largeur) / 2 + R.ecart;
    if ((a.x - nx) * u.sens < requis) nx = a.x - u.sens * requis;
  }

  if ((nx - u.x) * u.sens < 0) nx = u.x;         // jamais de marche arrière
  u.x = nx;
  u.phase += dt * (u.def.vitesse / 7);
}

function attaquer(u, cible, chateau) {
  if (u.def.type === 'distance') {
    tirer(u, cible, chateau);
    son('tir');
    return;
  }
  const impactX = u.x + u.sens * (u.def.largeur / 2 + 8);
  const impactY = R.solY - u.def.hauteur * 0.5;
  if (chateau) frapperChateau(chateau, u.def.degats);
  else infligerDegats(cible, u.def.degats, u.camp);
  etincelles(impactX, impactY, '#ffe3a0', 5);
  son('coup');
}

function tirer(u, cible, chateau) {
  const arc = (u.def.projectile === 'rocher' || u.def.projectile === 'obus'
            || u.def.projectile === 'pierre' || u.def.projectile === 'plasma');
  const depart = {
    x: u.x + u.sens * (u.def.largeur / 2 + 4),
    y: R.solY - u.def.hauteur * 0.66,
  };
  const arrivee = chateau
    ? { x: bordChateau(chateau) - u.sens * 6, y: R.solY - R.chateauHauteur * 0.45 }
    : { x: cible.x, y: R.solY - cible.def.hauteur * 0.5 };
  const dx = arrivee.x - depart.x, dy = arrivee.y - depart.y;
  const distance = Math.hypot(dx, dy);
  const vitesse = arc ? 430 : 760;
  etat.projectiles.push({
    type: u.def.projectile,
    camp: u.camp,
    sens: u.sens,
    x: depart.x, y: depart.y,
    x0: depart.x, y0: depart.y,
    cible, chateau,
    degats: u.def.degats,
    aoe: u.def.aoe || 0,
    arc,
    t: 0,
    duree: Math.max(0.08, distance / vitesse),
    angle: Math.atan2(dy, dx),
  });
}

function majProjectiles(dt) {
  for (let i = etat.projectiles.length - 1; i >= 0; i--) {
    const p = etat.projectiles[i];
    p.t += dt;
    // La cible bouge : on la suit tant qu'elle est en vie.
    const arrivee = p.chateau
      ? { x: bordChateau(p.chateau) - p.sens * 6, y: R.solY - R.chateauHauteur * 0.45 }
      : (p.cible && !p.cible.mort
          ? { x: p.cible.x, y: R.solY - p.cible.def.hauteur * 0.5 }
          : { x: p.xFin !== undefined ? p.xFin : p.x, y: p.yFin !== undefined ? p.yFin : p.y });
    if (!p.chateau && p.cible && !p.cible.mort) { p.xFin = arrivee.x; p.yFin = arrivee.y; }

    const k = Math.min(1, p.t / p.duree);
    const nx = p.x0 + (arrivee.x - p.x0) * k;
    let ny = p.y0 + (arrivee.y - p.y0) * k;
    if (p.arc) ny -= Math.sin(k * Math.PI) * (Math.abs(arrivee.x - p.x0) * 0.28 + 20);
    p.angle = Math.atan2(ny - p.y, nx - p.x) || p.angle;
    p.x = nx; p.y = ny;

    if (k >= 1) {
      impact(p);
      etat.projectiles.splice(i, 1);
    }
  }
}

function impact(p) {
  if (p.aoe) {
    etat.effets.push({ type: 'impact', x: p.x, y: p.y, t: 0, duree: 0.4,
                       rayon: p.aoe, couleur: '#ffca7a' });
    son('explosion');
    for (const u of etat.unites) {
      if (u.mort || u.camp === p.camp) continue;
      if (Math.abs(u.x - p.x) <= p.aoe) infligerDegats(u, p.degats, p.camp);
    }
    if (p.chateau) frapperChateau(p.chateau, p.degats);
    return;
  }
  etincelles(p.x, p.y, '#ffe3a0', 4);
  if (p.chateau) { frapperChateau(p.chateau, p.degats); son('chateau'); return; }
  if (p.cible && !p.cible.mort) { infligerDegats(p.cible, p.degats, p.camp); son('coup'); return; }
  // La cible est morte en vol : le tir touche le premier ennemi qui traîne là.
  for (const u of etat.unites) {
    if (u.mort || u.camp === p.camp) continue;
    if (Math.abs(u.x - p.x) < 22) { infligerDegats(u, p.degats, p.camp); son('coup'); return; }
  }
}

// ------------------------------------------------------------
//  Dégâts, morts, château
// ------------------------------------------------------------

function infligerDegats(cible, degats, campSource) {
  if (cible.mort) return;
  cible.pv -= degats;
  cible.flash = 1;
  if (degats >= 25) {
    texteFlottant(cible.x, R.solY - cible.def.hauteur - 12, '-' + Math.round(degats), '#ffc9be');
  }
  if (cible.pv <= 0) tuer(cible, campSource);
}

function tuer(cible, campSource) {
  cible.mort = true;
  cible.fade = 0.5;
  const gagnant = etat.camps[campSource];
  const perdant = etat.camps[cible.camp];
  gagnant.or += cible.def.or;
  gagnant.orTotal += cible.def.or;
  gagnant.xp += cible.def.xp;
  gagnant.tues++;
  perdant.perdues++;
  texteFlottant(cible.x, R.solY - cible.def.hauteur - 26,
                '+' + cible.def.or, campSource === 'joueur' ? '#ffd76a' : '#ffa9a0');
  etincelles(cible.x, R.solY - cible.def.hauteur * 0.5, '#d8d0c0', 8);
  son('mort');
}

function frapperChateau(camp, degats) {
  if (etat.fin) return;
  camp.pv -= degats * R.degatsChateauMult;
  camp.secousse = 1;
  texteFlottant(bordChateau(camp) - camp.sens * 24, R.solY - R.chateauHauteur * 0.7,
                '-' + Math.round(degats), '#ff9a8a');
  if (camp.pv <= 0) {
    camp.pv = 0;
    terminer(camp.id !== 'joueur');
  }
}

function terminer(victoire) {
  if (etat.fin) return;
  const j = etat.camps.joueur;
  etat.fin = {
    victoire,
    duree: etat.temps,
    tues: j.tues,
    perdues: j.perdues,
    age: j.age,
    or: Math.round(j.orTotal),
  };
  etat.ecran = 'fin';
  son(victoire ? 'victoire' : 'defaite');
  document.dispatchEvent(new CustomEvent('partie-finie'));
}

// ------------------------------------------------------------
//  Petits effets visuels
// ------------------------------------------------------------

export function texteFlottant(x, y, texte, couleur) {
  etat.effets.push({ type: 'texte', x, y, texte, couleur, t: 0, duree: 0.9 });
}

export function etincelles(x, y, couleur, nombre = 6) {
  for (let i = 0; i < nombre; i++) {
    etat.effets.push({
      type: 'particule', x, y, couleur, t: 0, duree: 0.3 + Math.random() * 0.35,
      vx: (Math.random() - 0.5) * 190, vy: -Math.random() * 170 - 25,
      taille: 2 + Math.random() * 2.5,
    });
  }
}

function majEffets(dt) {
  for (let i = etat.effets.length - 1; i >= 0; i--) {
    const e = etat.effets[i];
    e.t += dt;
    if (e.type === 'particule') {
      e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 620 * dt;
    } else if (e.type === 'texte') {
      e.y -= 34 * dt;
    }
    if (e.t >= e.duree) etat.effets.splice(i, 1);
  }
}
