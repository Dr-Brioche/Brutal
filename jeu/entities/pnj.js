// Un PNJ de ville : il fait les cent pas, et s'arrête pour « parler » quand le
// héros s'approche. Premier jet d'ambiance — pas encore de vrai dialogue.

import { afficherMessage } from "../ui/effets.js";

const VITESSE = 38;        // px/s (plus lent que le héros)
const PAUSE_BOUT = 0.8;    // pause à chaque extrémité du trajet (s)
const DIST_PROCHE = 50;    // distance d'« accostage » (px)

// `planche` : l'image déjà chargée. `x` : position de départ (haut-gauche du
// sprite). `xMin`/`xMax` : bornes du va-et-vient. `y` : rangée (fixe).
export function creerPnj({ modele, planche, x, y, xMin, xMax, message }) {
  return {
    modele, planche, x, y, xMin, xMax, message,
    direction: "droite",   // "gauche" | "droite"
    mode: "marche",        // "marche" | "repos" | "face"
    t: 0,                  // horloge d'animation
    pause: 0,
    aParle: false,         // déjà parlé pour cette approche ?
  };
}

export function mettreAJourPnj(pnj, dt, heros) {
  pnj.t += dt;
  const s = pnj.modele.sprite;

  // Distance entre les pieds du héros et ceux du PNJ
  const dx = (heros.x + 32) - (pnj.x + s.caseL / 2);
  const dy = (heros.y + 54) - (pnj.y + s.caseH);

  // Héros tout proche : le PNJ s'arrête, se tourne vers lui, et l'interpelle
  if (Math.abs(dx) < DIST_PROCHE && Math.abs(dy) < 40) {
    pnj.mode = "face";
    pnj.direction = dx < 0 ? "gauche" : "droite";
    if (!pnj.aParle) { afficherMessage(pnj.message); pnj.aParle = true; }
    return;
  }
  pnj.aParle = false;

  // Pause en bout de trajet
  if (pnj.pause > 0) { pnj.pause -= dt; pnj.mode = "repos"; return; }

  // Va-et-vient
  pnj.mode = "marche";
  pnj.x += VITESSE * dt * (pnj.direction === "droite" ? 1 : -1);
  if (pnj.x >= pnj.xMax) { pnj.x = pnj.xMax; pnj.direction = "gauche"; pnj.pause = PAUSE_BOUT; }
  if (pnj.x <= pnj.xMin) { pnj.x = pnj.xMin; pnj.direction = "droite"; pnj.pause = PAUSE_BOUT; }
}

export function dessinerPnj(ctx, pnj) {
  if (!pnj.planche) return;
  const s = pnj.modele.sprite;

  // Quelle animation selon ce qu'il fait
  let anim, fige = false;
  if (pnj.mode === "marche") {
    anim = pnj.direction === "droite" ? s.anims.marcheDroite : s.anims.marcheGauche;
  } else if (pnj.mode === "face") {
    // debout, tourné vers le héros (frame 0 de la marche du bon côté)
    anim = pnj.direction === "droite" ? s.anims.marcheDroite : s.anims.marcheGauche;
    fige = true;
  } else {
    anim = s.anims.repos;
  }

  const t = fige ? 0 : pnj.t;
  let i = Math.floor(t * anim.ips);
  i = anim.boucle ? i % anim.frames.length : Math.min(i, anim.frames.length - 1);
  const frame = anim.frames[i];

  ctx.drawImage(
    pnj.planche,
    frame * s.caseL, 0, s.caseL, s.caseH,
    Math.round(pnj.x), Math.round(pnj.y), s.caseL, s.caseH
  );
}

// Le « pied » du PNJ, pour ordonner l'affichage (qui passe devant qui)
export function piedsPnj(pnj) {
  return pnj.y + pnj.modele.sprite.caseH;
}
