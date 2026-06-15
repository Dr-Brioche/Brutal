// Un PNJ de ville : il fait les cent pas, et s'arrête pour faire face au héros
// quand il s'approche (`pnj.proche` devient true → on peut lui parler).

const VITESSE = 38;        // px/s (plus lent que le héros)
const PAUSE_BOUT = 0.8;    // pause à chaque extrémité du trajet (s)
const DIST_PROCHE = 50;    // distance d'« accostage » (px)

// `planche` : l'image déjà chargée. `x` : position de départ (haut-gauche du
// sprite). `xMin`/`xMax` : bornes du va-et-vient. `y` : rangée (fixe).
export function creerPnj({ modele, planche, x, y, xMin, xMax }) {
  return {
    modele, planche, x, y, xMin, xMax,
    direction: "droite",   // "gauche" | "droite"
    mode: "marche",        // "marche" | "repos" | "face"
    t: 0,                  // horloge d'animation
    pause: 0,
    proche: false,         // le héros est-il à portée de parole ?
  };
}

export function mettreAJourPnj(pnj, dt, heros) {
  pnj.t += dt;
  const s = pnj.modele.sprite;

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

  if (pnj.proche && pnj.modele.nom) {
    ctx.save();
    const nom = pnj.modele.nom;
    const cx = Math.round(pnj.x + s.caseL / 2);
    const cy = Math.round(pnj.y) - 2;
    ctx.font = "bold 7px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const larg = ctx.measureText(nom).width;
    ctx.fillStyle = "rgba(10, 8, 5, 0.78)";
    ctx.beginPath();
    ctx.roundRect(cx - larg / 2 - 4, cy - 10, larg + 8, 10, 3);
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
