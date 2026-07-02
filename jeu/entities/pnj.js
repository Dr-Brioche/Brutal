// Un PNJ de ville : il fait les cent pas, et s'arrête pour faire face au héros
// quand il s'approche (`pnj.proche` devient true → on peut lui parler).

import { police, POLICE_NOM } from "../core/texte.js";

const VITESSE = 38;        // px/s (plus lent que le héros)
const PAUSE_BOUT = 0.8;    // pause à chaque extrémité du trajet (s)
const DIST_PROCHE = 50;    // distance d'« accostage » (px)

const alea = (a, b) => a + Math.random() * (b - a); // réel aléatoire dans [a, b[

// `planche` : l'image déjà chargée. `x` : position de départ (haut-gauche du
// sprite). `xMin`/`xMax` : bornes du va-et-vient. `y` : rangée (fixe).
export function creerPnj({ modele, planche, x, y, xMin, xMax }) {
  const pnj = {
    modele, planche, x, y, xMin, xMax,
    direction: "droite",   // sens de MARCHE : "gauche" | "droite"
    regard: "bas",         // sens du REGARD face au héros : bas|haut|gauche|droite
    mode: "marche",        // "marche" | "repos" | "face"
    t: 0,                  // horloge d'animation
    pause: 0,
    proche: false,         // le héros est-il à portée de parole ?
  };
  // Animation passive occasionnelle (ex. le marchand qui fait tourner sa pièce) :
  // horloge dédiée + compte à rebours avant la prochaine passe.
  if (modele.passif) {
    pnj.passifActif = false;
    pnj.passifT = 0;
    pnj.passifDelai = alea(modele.passif.min, modele.passif.max);
  }
  return pnj;
}

// Fait avancer l'animation passive : décompte, puis joue l'anim UNE fois, puis
// re-tire un délai aléatoire. Rien à faire tant que le PNJ n'a pas de `passif`.
// JAMAIS en marche : un PNJ qui se déplace coupe sa passive (sinon le fanatique
// « prierait » en glissant) et le décompte est gelé jusqu'à l'arrêt.
function majPassif(pnj, dt) {
  const p = pnj.modele.passif;
  if (!p) return;
  if (pnj.mode === "marche") {
    if (pnj.passifActif) { pnj.passifActif = false; pnj.passifDelai = alea(p.min, p.max); }
    return;
  }
  if (pnj.passifActif) {
    pnj.passifT += dt;
    const a = pnj.modele.sprite.anims[p.anim];
    if (pnj.passifT * a.ips >= a.frames.length) { // anim terminée
      pnj.passifActif = false;
      pnj.passifDelai = alea(p.min, p.max);
    }
  } else {
    pnj.passifDelai -= dt;
    if (pnj.passifDelai <= 0) { pnj.passifActif = true; pnj.passifT = 0; }
  }
}

export function mettreAJourPnj(pnj, dt, heros) {
  pnj.t += dt;
  const s = pnj.modele.sprite;

  // Animation passive occasionnelle (indépendante du déplacement) : le marchand
  // fixe fait tourner sa pièce de temps en temps.
  majPassif(pnj, dt);

  // Position du héros RELATIVE au PNJ. En X : centre à centre. En Y : on vise le
  // centre de la « boîte de blocage » aux pieds (caseH-17), pour que « au-dessus »
  // et « en dessous » soient symétriques (le héros bute à ±17 px de ce point selon
  // qu'il aborde par le haut ou par le bas → le regard vertical est fiable).
  const dx = (heros.x + 32) - (pnj.x + s.caseL / 2);
  const dy = (heros.y + 54) - (pnj.y + s.caseH - 17);

  // Héros tout proche : le PNJ s'arrête et se TOURNE VERS LUI (règle des PNJ).
  pnj.proche = Math.abs(dx) < DIST_PROCHE && Math.abs(dy) < 40;
  if (pnj.proche) {
    pnj.mode = "face";
    // Axe dominant = d'où vient le héros → direction du regard (4 sens).
    if (Math.abs(dx) >= Math.abs(dy)) pnj.regard = dx < 0 ? "gauche" : "droite";
    else pnj.regard = dy < 0 ? "haut" : "bas";
    return;
  }

  // PNJ sans trajet (xMin == xMax) : il reste planté, au repos.
  if (pnj.xMin >= pnj.xMax) { pnj.mode = "repos"; return; }

  // Pause en bout de trajet
  if (pnj.pause > 0) { pnj.pause -= dt; pnj.mode = "repos"; return; }

  // Va-et-vient. La pause aux extrémités est réglable par PNJ (`modele.pauseBout`) :
  // le fanatique s'arrête longtemps (le temps de prier), les autres brièvement.
  pnj.mode = "marche";
  const pauseBout = pnj.modele.pauseBout ?? PAUSE_BOUT;
  pnj.x += VITESSE * dt * (pnj.direction === "droite" ? 1 : -1);
  if (pnj.x >= pnj.xMax) { pnj.x = pnj.xMax; pnj.direction = "gauche"; pnj.pause = pauseBout; }
  if (pnj.x <= pnj.xMin) { pnj.x = pnj.xMin; pnj.direction = "droite"; pnj.pause = pauseBout; }
}

export function dessinerPnj(ctx, pnj) {
  if (!pnj.planche) return;
  const s = pnj.modele.sprite;

  // Quelle image dessiner ?
  let frame;
  if (pnj.mode === "face" && s.regard) {
    const p = pnj.modele.passif;
    if (p && pnj.passifActif && pnj.regard === "bas") {
      // Abordé PAR EN BAS (il te fait déjà face) : il continue son anim passive
      // de face (pièce qui tourne, coups de marteau). L'anim passive est de face :
      // interdite dès qu'il se tourne sur le côté ou de dos → frame fixe alors.
      const anim = s.anims[p.anim];
      let i = Math.floor(pnj.passifT * anim.ips);
      i = anim.boucle ? i % anim.frames.length : Math.min(i, anim.frames.length - 1);
      frame = anim.frames[i];
    } else {
      // Tourné vers le héros : frame « debout » fixe selon le sens du regard.
      frame = s.regard[pnj.regard] ?? s.regard.bas;
    }
  } else {
    // Sinon : animation selon ce qu'il fait. `marcheGauche/Droite` peuvent ne pas
    // exister (PNJ stationnaire) → on retombe sur `repos`.
    const marche = (dir) => (dir === "droite" ? s.anims.marcheDroite : s.anims.marcheGauche) ?? s.anims.repos;
    let anim, fige = false, t = pnj.t;
    if (pnj.modele.passif && pnj.passifActif) {
      // Animation passive en cours : sa propre horloge, jouée une seule fois.
      anim = s.anims[pnj.modele.passif.anim];
      t = pnj.passifT;
    } else if (pnj.mode === "marche") {
      anim = marche(pnj.direction);
    } else if (pnj.mode === "face") {
      anim = marche(pnj.direction); // PNJ sans `regard` : debout, 1re frame
      fige = true;
    } else {
      anim = s.anims.repos;
    }
    if (fige) t = 0;
    let i = Math.floor(t * anim.ips);
    i = anim.boucle ? i % anim.frames.length : Math.min(i, anim.frames.length - 1);
    frame = anim.frames[i];
  }

  ctx.drawImage(
    pnj.planche,
    frame * s.caseL, 0, s.caseL, s.caseH,
    Math.round(pnj.x), Math.round(pnj.y), s.caseL, s.caseH
  );

  if (pnj.proche && pnj.modele.nom) {
    ctx.save();
    const nom = pnj.modele.nom;
    const cx = Math.round(pnj.x + s.caseL / 2);
    const cy = Math.round(pnj.y) - 2;
    ctx.font = police(10, POLICE_NOM);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const larg = ctx.measureText(nom).width;
    ctx.fillStyle = "rgba(10, 8, 5, 0.78)";
    ctx.beginPath();
    ctx.roundRect(cx - larg / 2 - 4, cy - 13, larg + 8, 13, 3);
    ctx.fill();
    ctx.fillStyle = "#f0e4b0";
    ctx.fillText(nom, cx, cy);
    ctx.restore();
  }
}

// Le « pied » du PNJ, pour ordonner l'affichage (qui passe devant qui)
export function piedsPnj(pnj) {
  return pnj.y + pnj.modele.sprite.caseH;
}
