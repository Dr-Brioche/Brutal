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
import { cartesEquipees } from "../systems/inventaire.js";
import { dessinerCaseEchelle } from "../core/sprites.js";
import { garnirCarte } from "./carte.js";
import { alerteVie } from "./effets.js";

// ----- Placement sur la scène (canvas 640×360) -----------------------------
const ECHELLE_HEROS = 3;            // 64×64 → 192×192 (avant dézoom de scène)
const SOL_Y = 240;                  // ligne de sol au 1/3 DU BAS (scène 640×360) :
                                    // 2/3 libres au-dessus (futur fond), le bas pour
                                    // les cartes. Les pieds des persos se calent dessus.
// Dézoom global de l'avant-plan (héros + ennemi + barres) : 1 = taille d'avant,
// plus petit = moins zoomé. La réduction se fait VERS le sol pour garder les
// pieds ancrés. Un seul chiffre à régler si on veut plus ou moins gros.
const ECHELLE_SCENE = 0.4;
const PIVOT_SCENE = { x: 320, y: SOL_Y };
// Centres horizontaux VOULUS À L'ÉCRAN (repère 640 de la scène), écartés vers
// l'extérieur. L'avant-plan étant réduit autour du centre, on remonte aux coords
// d'origine en INVERSANT le dézoom (sinon les persos se tassent au milieu).
const HEROS_ECRAN_CX = 165;
const ENNEMI_ECRAN_CX = 475;
function versOrigine(cxEcran) {
  return PIVOT_SCENE.x + (cxEcran - PIVOT_SCENE.x) / ECHELLE_SCENE;
}
// Vie + états affichés SOUS chaque perso (la zone AU-DESSUS du monstre reste
// réservée à ses prochaines actions). Décalages réglables :
const VIE_SOUS = 8;    // écart bas du perso → barre de vie
const ETATS_SOUS = 16; // écart barre de vie → rangée d'états
// La jauge de Chaleur n'est plus dessinée ici : c'est une barre HTML (voir
// index.html + majJauge ci-dessous), posée à gauche des cartes.
// ---------------------------------------------------------------------------

export function demarrerCombat({ ctx, heros, inventaire, planches, ennemi, surFin }) {
  const combat = creerCombat(ennemi, {
    pv: heros.pv, pvMax: heros.pvMax, cartes: cartesEquipees(inventaire),
  });
  const plancheEnnemi = planches?.get(ennemi.planche) ?? null;
  const spr = ennemi.sprite;
  // Coins haut-gauche des sprites, calés sur les centres voulus à l'écran.
  // Pieds calés sur la ligne de sol (et l'avant-plan est réduit autour d'elle,
  // donc les pieds y restent exactement, et la vie/le sol coïncident).
  const HEROS = { x: versOrigine(HEROS_ECRAN_CX) - (64 * ECHELLE_HEROS) / 2, y: SOL_Y - 64 * ECHELLE_HEROS };
  const GOBELIN = { x: versOrigine(ENNEMI_ECRAN_CX) - spr.caseL / 2, y: SOL_Y - spr.caseH };
  const cx = GOBELIN.x + spr.caseL / 2; // centre horizontal de l'ennemi

  // Éléments d'interface (présents dans index.html)
  const overlay = document.getElementById("combat");
  const conteneurMain = document.getElementById("combat-main");
  const boutonFin = document.getElementById("combat-fin");
  const panneauResultat = document.getElementById("combat-resultat");
  const texteResultat = document.getElementById("combat-resultat-texte");
  const boutonContinuer = document.getElementById("combat-continuer");
  // La jauge de Chaleur (barre HTML horizontale, à gauche des cartes)
  const jauge = document.getElementById("combat-jauge");
  const jaugeBar = document.getElementById("combat-jauge-bar");
  const jaugeFill = document.getElementById("combat-jauge-fill");
  const jaugeSeuil = document.getElementById("combat-jauge-seuil");
  const jaugeValeur = document.getElementById("combat-jauge-valeur");
  const jaugeBrulure = document.getElementById("combat-jauge-brulure");
  // Le repère de seuil est fixe (l'équipement ne change pas pendant un combat).
  jaugeSeuil.style.left = (combat.chaleurSeuil / combat.chaleurMax) * 100 + "%";

  // Valeurs « affichées » : elles glissent vers les vraies (barres animées)
  const aff = { pvHeros: combat.pvHeros, pvEnnemi: combat.pvEnnemi, pierre: 0, chaleur: combat.chaleur };
  // Minuteries d'animation (en secondes restantes)
  let animAttaque = 0;   // le nain pousse son arme vers l'avant
  let secousseEnnemi = 0;
  let secousseHeros = 0;
  const flottants = [];  // nombres de dégâts qui montent et s'estompent

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

  // -- La jauge de Chaleur (barre HTML) -------------------------------------
  // On la rafraîchit à chaque image : le remplissage suit la valeur ANIMÉE
  // (aff.chaleur, qui glisse), le chiffre et la brûlure suivent la valeur réelle.
  function majJauge() {
    const pct = Math.max(0, Math.min(1, aff.chaleur / combat.chaleurMax)) * 100;
    jaugeFill.style.width = pct + "%";
    jaugeBar.classList.toggle("surchauffe", combat.chaleur > combat.chaleurSeuil);
    jaugeValeur.textContent = combat.chaleur;
    const brulure = degatsSurchauffe(combat);
    jaugeBrulure.textContent = brulure > 0 ? `🔥 -${brulure}/turn` : "";
  }

  // Flash + secousse de la jauge à l'instant où la surchauffe brûle.
  function pulserJauge() {
    jauge.classList.remove("brule");
    void jauge.offsetWidth;     // force le redémarrage de l'animation CSS
    jauge.classList.add("brule");
  }

  // -- Construction de la main + sélection clavier --------------------------
  let selection = 0; // index dans [cartes…, bouton Fin du tour]

  function elementsNavigables() {
    return [...conteneurMain.children, boutonFin];
  }
  // selection = index dans elementsNavigables(), ou -1 = RIEN de sélectionné
  // (état volontaire après avoir joué la dernière carte : on ne veut pas que
  // « End Turn » soit prêt à être validé par un Espace de trop).
  function majSelection() {
    const els = elementsNavigables();
    if (selection >= els.length) selection = els.length - 1; // jamais hors borne
    els.forEach((el, i) => el.classList.toggle("sel", i === selection));
  }
  function rafraichir() {
    conteneurMain.replaceChildren();
    combat.main.forEach((carte, i) => {
      conteneurMain.append(creerCarteDOM(carte, combat, () => jouer(i)));
    });
    disposerEventail();
    boutonFin.disabled = combat.fini || !combat.tourJoueur;
    majSelection();
  }

  // Pose chaque carte en léger éventail : rotation croissante + descente vers
  // les bords (le centre reste haut), pour l'effet « cartes tenues en main ».
  // Le CSS compose ces valeurs (--rot, --dy) avec le survol/la sélection.
  function disposerEventail() {
    const cartes = [...conteneurMain.children];
    const milieu = (cartes.length - 1) / 2;
    cartes.forEach((el, i) => {
      const ecart = i - milieu;                  // distance au centre, en cartes
      el.style.setProperty("--rot", (ecart * 4).toFixed(2) + "deg");
      el.style.setProperty("--dy", (ecart * ecart * 5).toFixed(1) + "px");
    });
  }

  // Navigation clavier : Q/D (ou flèches) pour choisir, Espace pour valider.
  // En phase capture + stopPropagation : ni menu pause ni déplacement pendant le combat.
  function surTouche(e) {
    if (!["KeyA", "KeyD", "ArrowLeft", "ArrowRight", "Space", "Enter", "Escape"].includes(e.code)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!panneauResultat.hidden) {                 // écran de fin : Espace = Continue
      if (e.code === "Space" || e.code === "Enter") fermer();
      return;
    }
    if (combat.fini || !combat.tourJoueur) return; // rien pendant l'anim de fin / le tour ennemi
    const els = elementsNavigables();
    if (e.code === "KeyA" || e.code === "ArrowLeft") {
      selection = selection < 0 ? els.length - 1 : (selection - 1 + els.length) % els.length;
      majSelection();
    } else if (e.code === "KeyD" || e.code === "ArrowRight") {
      selection = selection < 0 ? 0 : (selection + 1) % els.length;
      majSelection();
    } else if (e.code === "Space" || e.code === "Enter") {
      if (selection < 0) return;                  // rien de sélectionné : on ne valide rien
      if (selection < combat.main.length) jouer(selection);
      else finDeTour();
    }
    // Escape : bloqué (aucune action) — pas de menu pause par-dessus le combat
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
    // Après avoir joué : garder la sélection SUR UNE CARTE (jamais sur End Turn).
    // Si la main est vide, on ne sélectionne plus rien (-1) : aller sur End Turn
    // devient un geste volontaire, pas un automatisme.
    selection = combat.main.length > 0 ? Math.min(selection, combat.main.length - 1) : -1;
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
      pulserJauge(); // la barre de Chaleur « brûle » brièvement (flash + secousse)
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
    window.removeEventListener("keydown", surTouche, true);
    heros.pv = combat.pvHeros; // la vie persiste vers la carte
    surFin(combat.resultat);
  }

  boutonFin.addEventListener("click", finDeTour);
  boutonContinuer.addEventListener("click", fermer);
  window.addEventListener("keydown", surTouche, true);
  panneauResultat.hidden = true;
  overlay.hidden = false;
  rafraichir();
  majJauge(); // état correct dès la 1re image (pas de barre vide qui clignote)

  // -- Boucle : animations + dessin ----------------------------------------
  function mettreAJour(dt) {
    // Les barres glissent doucement vers la vraie valeur
    aff.pvHeros += (combat.pvHeros - aff.pvHeros) * Math.min(1, dt * 8);
    aff.pvEnnemi += (combat.pvEnnemi - aff.pvEnnemi) * Math.min(1, dt * 8);
    aff.pierre += (combat.pierre - aff.pierre) * Math.min(1, dt * 10);
    aff.chaleur += (combat.chaleur - aff.chaleur) * Math.min(1, dt * 9);
    majJauge();

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

    alerteVie(combat.pvHeros / combat.pvHerosMax); // liseré rouge si vie basse
  }

  // Les états affichés sous chaque perso. Pour l'instant : la Pierre du héros
  // (sa défense persistante = son « armure »). On ajoutera ici poison, stun,
  // saignement… : il suffira d'allonger la liste, l'affichage suit.
  function etatsHeros() {
    const liste = [];
    if (combat.pierre > 0) liste.push({ texte: `🛡 ${Math.round(aff.pierre)}`, couleur: "#9cd3ff" });
    return liste;
  }
  function etatsEnnemi() {
    return []; // aucun état ennemi pour l'instant
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

    // Tout l'avant-plan (ennemi, héros, barres, nombres, particules) est réduit
    // d'un cran VERS le sol : les persos paraissent moins zoomés, pieds ancrés.
    ctx.save();
    ctx.translate(PIVOT_SCENE.x, PIVOT_SCENE.y);
    ctx.scale(ECHELLE_SCENE, ECHELLE_SCENE);
    ctx.translate(-PIVOT_SCENE.x, -PIVOT_SCENE.y);

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
      const basEnnemi = GOBELIN.y + spr.caseH;          // ligne des pieds
      const vieEnnemiY = basEnnemi + VIE_SOUS;
      dessinerBarreVie(ctx, GOBELIN.x + 45, vieEnnemiY, spr.caseL - 90,
        aff.pvEnnemi / combat.pvEnnemiMax, "#c0392b");
      dessinerEtats(ctx, etatsEnnemi(), cx, vieEnnemiY + ETATS_SOUS);
      // L'intention reste AU-DESSUS du monstre (zone de ses prochaines actions).
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
    const basHeros = HEROS.y + 64 * ECHELLE_HEROS;      // ligne des pieds
    const vieHerosY = basHeros + VIE_SOUS;
    dessinerBarreVie(ctx, HEROS.x + 36, vieHerosY, 120,
      aff.pvHeros / combat.pvHerosMax, "#2e8b57");
    dessinerEtats(ctx, etatsHeros(), HEROS.x + 96, vieHerosY + ETATS_SOUS);

    dessinerParticules(ctx, particules);

    // Nombres de dégâts qui montent
    for (const f of flottants) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.t));
      ctx.fillStyle = f.couleur;
      ctx.font = "bold 20px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(f.texte, f.x, f.y - (1 - f.t) * 24);
    }
    ctx.restore(); // fin du dézoom de l'avant-plan
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

// Une rangée de petits badges d'état (armure/Pierre, poison, stun, saignement…),
// centrée en (cx, y). Vide = on n'affiche rien. Conçue pour grossir facilement :
// chaque état est juste { texte, couleur }.
function dessinerEtats(ctx, etats, cx, y) {
  if (!etats || etats.length === 0) return;
  ctx.font = "bold 14px ui-monospace, monospace";
  ctx.textAlign = "center";
  const espace = 46;
  const x0 = cx - ((etats.length - 1) * espace) / 2;
  etats.forEach((etat, i) => {
    ctx.fillStyle = etat.couleur;
    ctx.fillText(etat.texte, x0 + i * espace, y);
  });
  ctx.textAlign = "left";
}

// ----- Une carte en HTML ---------------------------------------------------

function creerCarteDOM(carte, combat, surClic) {
  const el = document.createElement("button");
  el.className = "combat-carte";
  // Désactivé UNIQUEMENT hors de notre tour. Ne pas pouvoir payer une carte ne
  // la grise plus (c'était bizarre) : on met juste son coût en ROUGE.
  el.disabled = combat.fini || !combat.tourJoueur;
  garnirCarte(el, carte); // coût + (illustration OU nom/texte)
  if (carte.cout > combat.chaleur) el.classList.add("combat-carte--injouable");
  el.addEventListener("click", surClic);
  return el;
}
