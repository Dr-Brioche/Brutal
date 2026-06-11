// L'écran de combat : la mise en scène (dessinée dans le canvas) + les cartes
// et boutons (en HTML, par-dessus). La logique pure est dans systems/combat.js.
//
// Choix d'affichage validé : on VOIT le nain, de profil à gauche, en
// réutilisant son sprite de carte (pose latérale) agrandi ×3. L'ennemi est un
// vrai sprite animé (idle / attaque / coup reçu), lu depuis sa planche.
//
// On renvoie { mettreAJour(dt), dessiner() } : la boucle principale appelle
// ces deux fonctions tant que le combat est actif.

import { creerCombat, jouerCarte, finirTour, degatsSurchauffe } from "../systems/combat.js";
import { dessinerCaseEchelle } from "../core/sprites.js";

// ----- Placement sur la scène (canvas 640×360) -----------------------------
const ECHELLE_HEROS = 3;            // 64×64 → 192×192
const HEROS = { x: 70, y: 96 };     // coin haut-gauche du sprite agrandi
const GOBELIN = { x: 401, y: 120 }; // coin haut-gauche de la case ennemie
const SOL_Y = 270;                  // ligne de sol
const JAUGE = { x: 20, y: 76, l: 26, h: 192 }; // jauge de Chaleur (lave), à gauche
// ---------------------------------------------------------------------------

export function demarrerCombat({ ctx, heros, equipement, planches, ennemi, surFin }) {
  const combat = creerCombat(equipement, ennemi, heros.pv, heros.pvMax);
  const plancheEnnemi = planches?.get(ennemi.planche) ?? null;
  const spr = ennemi.sprite;
  const cx = GOBELIN.x + spr.caseL / 2; // centre horizontal de l'ennemi

  // Éléments d'interface (présents dans index.html)
  const overlay = document.getElementById("combat");
  const conteneurMain = document.getElementById("combat-main");
  const boutonFin = document.getElementById("combat-fin");
  const panneauResultat = document.getElementById("combat-resultat");
  const texteResultat = document.getElementById("combat-resultat-texte");
  const boutonContinuer = document.getElementById("combat-continuer");

  // Valeurs « affichées » : elles glissent vers les vraies (barres animées)
  const aff = { pvHeros: combat.pvHeros, pvEnnemi: combat.pvEnnemi, pierre: 0, chaleur: combat.chaleur };
  // Minuteries d'animation (en secondes restantes)
  let animAttaque = 0;   // le nain pousse son arme vers l'avant
  let secousseEnnemi = 0;
  let secousseHeros = 0;
  let temps = 0;         // horloge pour les scintillements de la lave
  const flottants = [];  // nombres de dégâts qui montent et s'estompent
  const lave = [];       // braises/fumée qui s'échappent de la jauge de Chaleur

  // L'état du sprite ennemi : quelle animation, depuis quand
  let animEnnemi = { nom: "idle", t: 0 };
  const jouerAnimEnnemi = (nom) => { animEnnemi = { nom, t: 0 }; };

  // Mort de l'ennemi : braises de forge + estompage du sprite, puis écran de fin
  const particules = [];
  const mortEnnemi = { actif: false, t: 0 };
  let delaiFin = -1, termine = false;

  function ajouterFlottant(texte, x, y, couleur) {
    flottants.push({ texte, x, y, couleur, t: 1 });
  }

  // Explosion de braises quand un ennemi meurt — pur code, réutilisable pour
  // n'importe quel ennemi (pas besoin de frame de mort dessinée).
  function exploserEnnemi() {
    mortEnnemi.actif = true;
    mortEnnemi.t = 0;
    jouerAnimEnnemi("ko");
    const ox = GOBELIN.x + spr.caseL / 2;
    const oy = GOBELIN.y + spr.caseH * 0.5;
    particules.push({ type: "flash", x: ox, y: oy, vx: 0, vy: 0, taille: 12, vie: 0.18, vieMax: 0.18 });
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 130;
      particules.push({
        type: "braise",
        x: ox + (Math.random() - 0.5) * 40, y: oy + (Math.random() - 0.5) * 50,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50,
        taille: 2 + Math.random() * 2, vie: 0.5 + Math.random() * 0.6, vieMax: 1.1,
      });
    }
    for (let i = 0; i < 8; i++) {
      particules.push({
        type: "fumee",
        x: ox + (Math.random() - 0.5) * 30, y: oy + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 24, vy: -22 - Math.random() * 28,
        taille: 8 + Math.random() * 10, vie: 0.7 + Math.random() * 0.5, vieMax: 1.2,
      });
    }
  }

  // Programme l'écran de fin après un court délai (laisse jouer le poof / le coup fatal)
  function verifierFin() {
    if (combat.fini && delaiFin < 0) {
      delaiFin = combat.resultat === "victoire" ? 0.7 : 0.45;
    }
  }

  // La surface de lave (haut du remplissage) d'où s'échappent les braises.
  function surfaceLave() {
    return JAUGE.y + JAUGE.h - (aff.chaleur / combat.chaleurMax) * JAUGE.h;
  }

  function emettreLave(fumee) {
    lave.push({
      x: JAUGE.x + 3 + Math.random() * (JAUGE.l - 6),
      y: surfaceLave(),
      vx: (Math.random() - 0.5) * (fumee ? 18 : 26),
      vy: -20 - Math.random() * (fumee ? 26 : 40),
      taille: fumee ? 4 + Math.random() * 5 : 1 + Math.random() * 2,
      vie: 0.5 + Math.random() * 0.6, vieMax: 1.1, fumee,
    });
  }

  function gicleeLave(n) { for (let i = 0; i < n; i++) emettreLave(false); }

  function majLave(dt) {
    // Émission : un peu dès que c'est chaud, beaucoup en surchauffe (+ fumée)
    const surplus = Math.max(0, combat.chaleur - combat.chaleurSeuil);
    const taux = combat.chaleur * 0.8 + surplus * 4;
    if (Math.random() < taux * dt) emettreLave(surplus > 0 && Math.random() < 0.4);
    for (const p of lave) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.fumee) { p.vy -= 8 * dt; p.taille += 8 * dt; }
      else { p.vy += 24 * dt; } // les braises retombent un peu
      p.vie -= dt;
    }
    for (let i = lave.length - 1; i >= 0; i--) if (lave[i].vie <= 0) lave.splice(i, 1);
  }

  // -- Construction de la main (cartes cliquables) --------------------------
  function rafraichir() {
    conteneurMain.replaceChildren();
    combat.main.forEach((carte, i) => {
      conteneurMain.append(creerCarteDOM(carte, combat, () => jouer(i)));
    });
    boutonFin.disabled = combat.fini || !combat.tourJoueur;
  }

  // -- Actions du joueur ----------------------------------------------------
  function jouer(i) {
    const carte = combat.main[i];
    if (!carte) return;
    const pvAvant = combat.pvEnnemi;
    const pierreAvant = combat.pierre;
    if (!jouerCarte(combat, i)) return; // pas assez de Chaleur, etc.

    if (combat.pvEnnemi < pvAvant) {
      animAttaque = 0.25;
      secousseEnnemi = 0.3;
      if (combat.pvEnnemi <= 0) exploserEnnemi();   // mort : braises de forge
      else jouerAnimEnnemi("touche");
      ajouterFlottant(`-${pvAvant - combat.pvEnnemi}`, cx, GOBELIN.y + 36, "#ffe27a");
    }
    if (combat.pierre > pierreAvant) {
      ajouterFlottant(`+${combat.pierre - pierreAvant}`,
        HEROS.x + 96, HEROS.y + 40, "#9cd3ff");
    }
    rafraichir();
    verifierFin();
  }

  function finDeTour() {
    const pvAvant = combat.pvHeros;
    finirTour(combat);
    if (combat.pvEnnemi > 0) jouerAnimEnnemi("attaque"); // le gobelin frappe
    // On distingue les dégâts de l'ennemi (sur le héros) de la brûlure de
    // surchauffe (sur la jauge).
    const brulure = combat.derniereBrulure;
    const degatsEnnemi = (pvAvant - combat.pvHeros) - brulure;
    if (degatsEnnemi > 0) {
      secousseHeros = 0.3;
      ajouterFlottant(`-${degatsEnnemi}`, HEROS.x + 96, HEROS.y + 30, "#ff7a7a");
    }
    if (brulure > 0) {
      secousseHeros = 0.3;
      ajouterFlottant(`🔥-${brulure}`, JAUGE.x + JAUGE.l / 2, JAUGE.y - 4, "#ff7a2c");
      gicleeLave(16); // grosse giclée de lave au moment de la brûlure
    }
    rafraichir();
    verifierFin();
  }

  function terminer() {
    texteResultat.textContent =
      combat.resultat === "victoire" ? "Victory!" : "Defeat";
    panneauResultat.hidden = false;
  }

  function fermer() {
    overlay.hidden = true;
    panneauResultat.hidden = true;
    boutonFin.removeEventListener("click", finDeTour);
    boutonContinuer.removeEventListener("click", fermer);
    heros.pv = combat.pvHeros; // la vie persiste vers la carte
    surFin(combat.resultat);
  }

  boutonFin.addEventListener("click", finDeTour);
  boutonContinuer.addEventListener("click", fermer);
  panneauResultat.hidden = true;
  overlay.hidden = false;
  rafraichir();

  // -- Boucle : animations + dessin ----------------------------------------
  function mettreAJour(dt) {
    // Les barres glissent doucement vers la vraie valeur
    aff.pvHeros += (combat.pvHeros - aff.pvHeros) * Math.min(1, dt * 8);
    aff.pvEnnemi += (combat.pvEnnemi - aff.pvEnnemi) * Math.min(1, dt * 8);
    aff.pierre += (combat.pierre - aff.pierre) * Math.min(1, dt * 10);
    aff.chaleur += (combat.chaleur - aff.chaleur) * Math.min(1, dt * 9);
    temps += dt;
    majLave(dt);

    // L'animation de l'ennemi avance ; touche/attaque reviennent à l'idle
    animEnnemi.t += dt;
    const def = spr.anims[animEnnemi.nom] ?? spr.anims.idle;
    if (!def.boucle && animEnnemi.t * def.ips >= def.frames.length &&
        (animEnnemi.nom === "touche" || animEnnemi.nom === "attaque")) {
      animEnnemi = { nom: "idle", t: 0 };
    }

    animAttaque = Math.max(0, animAttaque - dt);
    secousseEnnemi = Math.max(0, secousseEnnemi - dt);
    secousseHeros = Math.max(0, secousseHeros - dt);
    for (const f of flottants) f.t -= dt * 0.9;
    for (let i = flottants.length - 1; i >= 0; i--) {
      if (flottants[i].t <= 0) flottants.splice(i, 1);
    }

    // Mort de l'ennemi : estompage + envol des braises
    if (mortEnnemi.actif) mortEnnemi.t += dt;
    for (const p of particules) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === "braise") { p.vy += 90 * dt; p.vx *= 0.96; } // retombent un peu
      else if (p.type === "fumee") { p.vy -= 6 * dt; p.taille += 14 * dt; } // monte, gonfle
      else if (p.type === "flash") { p.taille += 180 * dt; }
      p.vie -= dt;
    }
    for (let i = particules.length - 1; i >= 0; i--) {
      if (particules[i].vie <= 0) particules.splice(i, 1);
    }

    // L'écran de fin apparaît après le délai (le temps que le poof se joue)
    if (delaiFin >= 0 && !termine) {
      delaiFin -= dt;
      if (delaiFin <= 0) { termine = true; terminer(); }
    }
  }

  function dessiner() {
    // Le combat est conçu en 640×360 ; on le fait tenir, centré, dans le canvas
    // (qui remplit l'écran, taille variable). Le pourtour reste sombre.
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0c0907";
    ctx.fillRect(0, 0, W, H);
    const s = Math.min(W / 640, H / 360);
    ctx.setTransform(s, 0, 0, s, Math.round((W - 640 * s) / 2), Math.round((H - 360 * s) / 2));

    dessinerFond(ctx);
    dessinerJauge(ctx, combat, aff, temps); // la jauge de Chaleur (lave)

    // Ennemi : sa frame courante. À sa mort il s'estompe pendant que les
    // braises jaillissent ; sa barre de vie et son intention disparaissent.
    const def = spr.anims[animEnnemi.nom] ?? spr.anims.idle;
    const frame = frameAnim(def, animEnnemi.t);
    const tr = secousseEnnemi > 0 ? (Math.random() - 0.5) * 6 : 0;
    const alphaEnnemi = mortEnnemi.actif ? Math.max(0, 1 - mortEnnemi.t / 0.35) : 1;
    if (alphaEnnemi > 0) {
      ctx.globalAlpha = alphaEnnemi;
      dessinerEnnemi(ctx, plancheEnnemi, spr, frame, GOBELIN.x + tr, GOBELIN.y);
      ctx.globalAlpha = 1;
    }
    if (!mortEnnemi.actif) {
      dessinerBarreVie(ctx, GOBELIN.x + 45, GOBELIN.y - 6, spr.caseL - 90,
        aff.pvEnnemi / combat.pvEnnemiMax, "#c0392b");
      dessinerIntention(ctx, combat.intention, cx, GOBELIN.y - 18);
    }

    // Héros : sprite de carte, pose « droite » (regarde l'ennemi), agrandi.
    // Pendant une attaque, il avance un peu vers l'ennemi (« poussée d'arme »).
    const avance = Math.sin((1 - animAttaque / 0.25) * Math.PI) * 14;
    const trHeros = secousseHeros > 0 ? (Math.random() - 0.5) * 8 : 0;
    const hx = HEROS.x + (animAttaque > 0 ? avance : 0) + trHeros;
    if (heros.plancheArmure) {
      dessinerCaseEchelle(ctx, heros.plancheArmure, 0, 2, hx, HEROS.y, ECHELLE_HEROS);
    }
    if (heros.plancheArme) {
      dessinerCaseEchelle(ctx, heros.plancheArme, 0, 2, hx, HEROS.y, ECHELLE_HEROS);
    }
    dessinerBarreVie(ctx, HEROS.x + 36, HEROS.y + 18, 120,
      aff.pvHeros / combat.pvHerosMax, "#2e8b57");
    if (combat.pierre > 0) {
      dessinerPierre(ctx, HEROS.x + 36, HEROS.y, Math.round(aff.pierre));
    }

    dessinerParticules(ctx, particules);
    dessinerLave(ctx, lave); // braises au-dessus de la jauge de Chaleur

    // Nombres de dégâts qui montent
    for (const f of flottants) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.t));
      ctx.fillStyle = f.couleur;
      ctx.font = "bold 20px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(f.texte, f.x, f.y - (1 - f.t) * 24);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.setTransform(1, 0, 0, 1, 0, 0); // on rétablit le repère écran après la scène
  }

  return { mettreAJour, dessiner };
}

// ----- Animation -----------------------------------------------------------

// La frame à afficher pour une animation donnée, au temps t (secondes).
function frameAnim(def, t) {
  let i = Math.floor(t * def.ips);
  i = def.boucle ? i % def.frames.length : Math.min(i, def.frames.length - 1);
  return def.frames[i];
}

// ----- Particules (braises de forge à la mort) -----------------------------

function dessinerParticules(ctx, particules) {
  // 1re passe : la fumée sombre, par-dessous (rendu normal)
  for (const p of particules) {
    if (p.type !== "fumee") continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.vie / p.vieMax)) * 0.32;
    ctx.fillStyle = "#2a2622";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
    ctx.fill();
  }
  // 2e passe : braises et flash en mode ADDITIF -> elles rougeoient dans le noir
  ctx.globalCompositeOperation = "lighter";
  for (const p of particules) {
    if (p.type === "fumee") continue;
    const k = Math.max(0, Math.min(1, p.vie / p.vieMax));
    if (p.type === "braise") {
      ctx.globalAlpha = k;
      ctx.fillStyle = k > 0.6 ? "#ffe39a" : (k > 0.3 ? "#ff8a2c" : "#a82a12");
      const s = Math.max(1, Math.round(p.taille));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    } else { // flash : bref éclat chaud à l'instant de la mort
      ctx.globalAlpha = k * 0.5;
      ctx.fillStyle = "#ffca8a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// ----- Dessin de la scène --------------------------------------------------

function dessinerFond(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, "#1a1410");
  grad.addColorStop(1, "#0c0907");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 360);
  // Sol
  ctx.fillStyle = "#241c16";
  ctx.fillRect(0, SOL_Y, 640, 360 - SOL_Y);
  ctx.fillStyle = "#2e241b";
  ctx.fillRect(0, SOL_Y, 640, 4);
}

// Mélange deux couleurs RGB ; renvoie "rgb(r, g, b)".
function lerpCouleur(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// La jauge de Chaleur de Forge : des crans de lave, couleur de plus en plus
// vive vers le haut, repère du seuil de surchauffe, halo rouge au-delà.
function dessinerJauge(ctx, combat, aff, temps) {
  const g = JAUGE;
  const max = combat.chaleurMax, seuil = combat.chaleurSeuil;
  const pitch = g.h / max;
  const surchauffe = combat.chaleur > seuil;

  // Halo rouge pulsé derrière la jauge quand on surchauffe
  if (surchauffe) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(temps * 9);
    ctx.fillStyle = "#ff4a18";
    ctx.fillRect(g.x - 9, g.y - 9, g.l + 18, g.h + 18);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  // Cadre de pierre
  ctx.fillStyle = "#0a0807";
  ctx.fillRect(g.x - 3, g.y - 3, g.l + 6, g.h + 6);
  ctx.fillStyle = "#3a2f26";
  ctx.fillRect(g.x - 2, g.y - 2, g.l + 4, g.h + 4);

  // Crans, du bas vers le haut
  for (let k = 1; k <= max; k++) {
    const sy = g.y + g.h - k * pitch;
    let col;
    if (aff.chaleur < k - 0.5) {
      col = "#17110d"; // cran vide (éteint)
    } else if (k <= seuil) {
      const t = seuil > 1 ? (k - 1) / (seuil - 1) : 1; // bas -> seuil
      col = lerpCouleur([150, 48, 14], [255, 142, 26], t); // rouge profond -> orange vif
    } else {
      const flick = 0.7 + 0.3 * Math.sin(temps * 18 + k); // jaune-blanc scintillant
      col = `rgb(255, ${Math.round(188 + 50 * flick)}, ${Math.round(80 + 70 * flick)})`;
    }
    ctx.fillStyle = col;
    ctx.fillRect(g.x, sy + 1, g.l, pitch - 2);
  }

  // Repère du seuil de surchauffe (trait clair)
  const sy = g.y + g.h - seuil * pitch;
  ctx.fillStyle = "#ffe2b0";
  ctx.fillRect(g.x - 5, sy - 1, g.l + 10, 2);

  // Valeur + brûlure projetée, au-dessus de la jauge (loin des cartes)
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px ui-monospace, monospace";
  ctx.fillText(String(combat.chaleur), g.x + g.l / 2, g.y - 6);
  const brulure = degatsSurchauffe(combat);
  if (brulure > 0) {
    ctx.fillStyle = "#ff8a3c";
    ctx.font = "bold 12px ui-monospace, monospace";
    ctx.fillText(`🔥-${brulure}/t`, g.x + g.l / 2, g.y - 22);
  }
  ctx.textAlign = "left";
}

// Les braises (et un peu de fumée) qui s'échappent de la lave de la jauge.
function dessinerLave(ctx, lave) {
  for (const p of lave) {
    if (!p.fumee) continue;
    ctx.globalAlpha = Math.max(0, p.vie / p.vieMax) * 0.25;
    ctx.fillStyle = "#2a2622";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter";
  for (const p of lave) {
    if (p.fumee) continue;
    const k = Math.max(0, p.vie / p.vieMax);
    ctx.globalAlpha = k;
    ctx.fillStyle = k > 0.5 ? "#ffd06a" : "#ff7a1e";
    const s = Math.max(1, Math.round(p.taille));
    ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// Une frame de la planche ennemie (ou un rectangle de secours si pas chargée).
function dessinerEnnemi(ctx, planche, spr, frame, x, y) {
  if (!planche) {
    ctx.fillStyle = "#5e8c3a";
    ctx.fillRect(x + 55, y + 30, 100, 120);
    return;
  }
  ctx.drawImage(
    planche,
    frame * spr.caseL, 0, spr.caseL, spr.caseH,
    Math.round(x), Math.round(y), spr.caseL, spr.caseH
  );
}

function dessinerBarreVie(ctx, x, y, largeur, ratio, couleur) {
  const r = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = "#000";
  ctx.fillRect(x - 1, y - 1, largeur + 2, 10);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(x, y, largeur, 8);
  ctx.fillStyle = couleur;
  ctx.fillRect(x, y, largeur * r, 8);
}

function dessinerIntention(ctx, intention, cx, y) {
  if (!intention) return;
  ctx.fillStyle = "#ff8a5b";
  ctx.font = "bold 18px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(`⚔ ${intention.valeur}`, cx, y);
  ctx.textAlign = "left";
}

function dessinerPierre(ctx, x, y, valeur) {
  ctx.fillStyle = "#9cd3ff";
  ctx.font = "bold 16px ui-monospace, monospace";
  ctx.fillText(`🛡 ${valeur}`, x, y);
}

// ----- Une carte en HTML ---------------------------------------------------

function creerCarteDOM(carte, combat, surClic) {
  const el = document.createElement("button");
  el.className = `combat-carte combat-carte--${carte.type}`;
  el.disabled = combat.fini || !combat.tourJoueur || carte.cout > combat.chaleur;

  const cout = document.createElement("span");
  cout.className = "combat-carte-cout";
  cout.textContent = carte.cout;

  const nom = document.createElement("span");
  nom.className = "combat-carte-nom";
  nom.textContent = carte.nom;

  const texte = document.createElement("span");
  texte.className = "combat-carte-texte";
  texte.textContent = carte.texte;

  el.append(cout, nom, texte);
  el.addEventListener("click", surClic);
  return el;
}
