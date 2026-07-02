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
    direction: "droite",   // "gauche" | "droite"
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

  // Distance entre les pieds du héros et ceux du PNJ
  const dx = (heros.x + 32) - (pnj.x + s.caseL / 2);
  const dy = (heros.y + 54) - (pnj.y + s.caseH);

  // Héros tout proche : le PNJ s'arrête et se tourne vers lui (prêt à parler)
  pnj.proche = Math.abs(dx) < DIST_PROCHE && Math.abs(dy) < 40;
  if (pnj.proche) {
    pnj.mode = "face";
    pnj.direction = dx < 0 ? "gauche" : "droite";
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

  // Quelle animation selon ce qu'il fait. `marche`/`marcheGauche` peuvent ne pas
  // exister (marchand stationnaire, de face) → on retombe sur `repos`.
  const marche = (dir) => (dir === "droite" ? s.anims.marcheDroite : s.anims.marcheGauche) ?? s.anims.repos;
  let anim, fige = false, t = pnj.t;
  if (pnj.modele.passif && pnj.passifActif) {
    // Animation passive en cours : sa propre horloge, jouée une seule fois.
    anim = s.anims[pnj.modele.passif.anim];
    t = pnj.passifT;
  } else if (pnj.mode === "marche") {
    anim = marche(pnj.direction);
  } else if (pnj.mode === "face") {
    anim = marche(pnj.direction); // debout, tourné vers le héros (1re frame)
    fige = true;
  } else {
    anim = s.anims.repos;
  }

  if (fige) t = 0;
  let i = Math.floor(t * anim.ips);
  i = anim.boucle ? i % anim.frames.length : Math.min(i, anim.frames.length - 1);
  const frame = anim.frames[i];

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
