// L'écran de combat : la mise en scène (dessinée dans le canvas) + les cartes
// et boutons (en HTML, par-dessus). La logique pure est dans systems/combat.js.
//
// Combat à PLUSIEURS ennemis : chacun a son sprite, sa barre de vie (chiffrée),
// ses états et son intention. Les cartes d'attaque visent UNE cible :
//   - au clavier : on « arme » la carte (Espace), puis on choisit la cible avec
//     les flèches (une flèche rouge animée pointe la cible), Espace confirme,
//     Échap annule.
//   - à la souris (commit suivant) : on tirera une flèche de la carte au monstre.
//
// On renvoie { mettreAJour(dt), dessiner() } : la boucle principale appelle ces
// deux fonctions tant que le combat est actif.

import {
  creerCombat, jouerCarte, finirTour, degatsSurchauffe, carteVise, ennemiVivant,
} from "../systems/combat.js";
import { cartesEquipees, bonusStats } from "../systems/inventaire.js";
import { dessinerCaseEchelle } from "../core/sprites.js";
import { garnirCarte } from "./carte.js";
import { alerteVie } from "./effets.js";

// ----- Placement sur la scène (canvas 640×360) -----------------------------
const ECHELLE_HEROS = 3;            // 64×64 → 192×192 (avant dézoom de scène)
const SOL_Y = 240;                  // ligne de sol au 1/3 DU BAS (2/3 libres au-dessus)
const ECHELLE_SCENE = 0.4;          // dézoom global des sprites (vers le sol)
const PIVOT_SCENE = { x: 320, y: SOL_Y };
const HEROS_ECRAN_CX = 165;         // centre du héros à l'écran (scène)
// Le groupe d'ennemis est centré à droite ; ils s'étalent autour de ce centre.
const ENNEMIS_CX = 470;
const ENNEMIS_ESPACE = 96;          // écart horizontal entre deux ennemis (scène)
function versOrigine(cxEcran) {
  return PIVOT_SCENE.x + (cxEcran - PIVOT_SCENE.x) / ECHELLE_SCENE;
}
// Centres horizontaux (écran) de N ennemis, centrés sur ENNEMIS_CX.
function poserEnnemis(n) {
  const x0 = ENNEMIS_CX - ((n - 1) * ENNEMIS_ESPACE) / 2;
  return Array.from({ length: n }, (_, i) => x0 + i * ENNEMIS_ESPACE);
}
// Barre de vie sous chaque perso (unités SCÈNE, taille réelle, PV chiffrés dedans).
const BAR_L = 80, BAR_H = 11;
const VIE_SOUS = 7;            // écart pieds (sol) → haut de la barre
const ETATS_SOUS = 10;         // écart bas de la barre → rangée d'états
// ---------------------------------------------------------------------------

// `ennemis` : tableau de définitions d'ennemis (data/ennemis.js).
export function demarrerCombat({ ctx, heros, inventaire, planches, ennemis, surFin }) {
  const combat = creerCombat(ennemis, {
    pv: heros.pv, pvMax: heros.pvMax,
    cartes: cartesEquipees(inventaire), stats: bonusStats(inventaire),
  });

  // Héros : coin haut-gauche du sprite (pieds sur le sol) + repère écran.
  const HEROS = { x: versOrigine(HEROS_ECRAN_CX) - (64 * ECHELLE_HEROS) / 2, y: SOL_Y - 64 * ECHELLE_HEROS };
  const heroEcran = { cx: HEROS_ECRAN_CX, sol: SOL_Y, haut: SOL_Y - 64 * ECHELLE_HEROS * ECHELLE_SCENE };
  heroEcran.milieu = (heroEcran.haut + heroEcran.sol) / 2;

  // État d'AFFICHAGE de chaque ennemi (le moteur tient l'état de jeu dans
  // combat.ennemis ; ici on tient le sprite, la position, les animations).
  const cxs = poserEnnemis(combat.ennemis.length);
  const ennemisUI = combat.ennemis.map((e, i) => {
    const spr = e.def.sprite;
    const ecran = { cx: cxs[i], sol: SOL_Y, haut: SOL_Y - spr.caseH * ECHELLE_SCENE };
    ecran.milieu = (ecran.haut + ecran.sol) / 2;
    return {
      e, spr,
      planche: planches?.get(e.def.planche) ?? null,
      localX: versOrigine(cxs[i]) - spr.caseL / 2, // dans le groupe dézoomé
      localY: SOL_Y - spr.caseH,
      ecran,
      anim: { nom: "idle", t: 0 },
      secousse: 0,
      affPv: e.pv,
      mort: { actif: false, t: 0 },
      partis: false, // sprite totalement disparu (après l'estompage)
    };
  });

  // Éléments d'interface (présents dans index.html)
  const overlay = document.getElementById("combat");
  const conteneurMain = document.getElementById("combat-main");
  const boutonFin = document.getElementById("combat-fin");
  const panneauResultat = document.getElementById("combat-resultat");
  const texteResultat = document.getElementById("combat-resultat-texte");
  const boutonContinuer = document.getElementById("combat-continuer");
  // La jauge de Chaleur (barre HTML horizontale)
  const jauge = document.getElementById("combat-jauge");
  const jaugeBar = document.getElementById("combat-jauge-bar");
  const jaugeFill = document.getElementById("combat-jauge-fill");
  const jaugeSeuil = document.getElementById("combat-jauge-seuil");
  const jaugeValeur = document.getElementById("combat-jauge-valeur");
  const jaugeBrulure = document.getElementById("combat-jauge-brulure");
  jaugeSeuil.style.left = (combat.chaleurSeuil / combat.chaleurMax) * 100 + "%";

  // Valeurs « affichées » côté héros (glissent vers les vraies)
  const aff = { pvHeros: combat.pvHeros, pierre: 0, chaleur: combat.chaleur };
  let animAttaque = 0;   // le nain pousse son arme vers l'avant
  let secousseHeros = 0;
  let temps = 0;         // horloge (animation de la flèche de cible)
  const flottants = [];  // nombres de dégâts qui montent et s'estompent
  const particules = []; // braises de mort (partagées, positionnées par ennemi)
  let delaiFin = -1, termine = false;

  // Ciblage clavier : carte « armée » en attente de cible.
  let phaseCiblage = false;
  let carteEnAttente = -1;

  function ajouterFlottant(texte, x, y, couleur) {
    flottants.push({ texte, x, y, couleur, t: 1 });
  }
  const jouerAnim = (u, nom) => { u.anim = { nom, t: 0 }; };

  // -- Ennemis : vivants, cible, animations -------------------------------
  function indicesVivants() {
    return combat.ennemis.map((_, i) => i).filter((i) => combat.ennemis[i].pv > 0);
  }
  // Si la cible est morte, on revient sur le premier ennemi vivant.
  function recalerCible() {
    if (combat.ennemis[combat.cible]?.pv > 0) return;
    const v = indicesVivants();
    if (v.length) combat.cible = v[0];
  }
  // Déplace la cible au prochain ennemi vivant (dir = -1 gauche, +1 droite).
  function cycleCible(dir) {
    const v = indicesVivants();
    if (v.length === 0) return;
    const pos = v.indexOf(combat.cible);
    combat.cible = v[(pos < 0 ? 0 : pos + dir + v.length) % v.length];
  }

  // Explosion de braises quand un ennemi meurt (positionnée à son sprite).
  function exploser(u) {
    u.mort.actif = true;
    u.mort.t = 0;
    jouerAnim(u, "ko");
    const ox = u.localX + u.spr.caseL / 2;
    const oy = u.localY + u.spr.caseH * 0.5;
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

  // Programme l'écran de fin après un court délai (laisse jouer le poof / coup fatal)
  function verifierFin() {
    if (combat.fini && delaiFin < 0) {
      delaiFin = combat.resultat === "victoire" ? 0.7 : 0.45;
    }
  }

  // -- La jauge de Chaleur (barre HTML) -------------------------------------
  function majJauge() {
    const pct = Math.max(0, Math.min(1, aff.chaleur / combat.chaleurMax)) * 100;
    jaugeFill.style.width = pct + "%";
    jaugeBar.classList.toggle("surchauffe", combat.chaleur > combat.chaleurSeuil);
    jaugeValeur.textContent = combat.chaleur;
    const brulure = degatsSurchauffe(combat);
    jaugeBrulure.textContent = brulure > 0 ? `🔥 -${brulure}/turn` : "";
  }
  function pulserJauge() {
    jauge.classList.remove("brule");
    void jauge.offsetWidth;
    jauge.classList.add("brule");
  }

  // -- Main + sélection clavier ---------------------------------------------
  let selection = 0; // index dans [cartes…, bouton Fin du tour], ou -1 = rien

  function elementsNavigables() {
    return [...conteneurMain.children, boutonFin];
  }
  function majSelection() {
    const els = elementsNavigables();
    if (selection >= els.length) selection = els.length - 1;
    els.forEach((el, i) => el.classList.toggle("sel", i === selection));
  }
  function rafraichir() {
    conteneurMain.replaceChildren();
    combat.main.forEach((carte, i) => {
      const el = creerCarteDOM(carte, combat);
      el.addEventListener("pointerdown", (ev) => debutDrag(i, el, ev));
      // Survol souris : la surbrillance « clavier » saute sur cette carte.
      el.addEventListener("pointerenter", () => { if (!drag) { selection = i; majSelection(); } });
      conteneurMain.append(el);
    });
    disposerEventail();
    boutonFin.disabled = combat.fini || !combat.tourJoueur;
    majSelection();
  }
  function disposerEventail() {
    const cartes = [...conteneurMain.children];
    const milieu = (cartes.length - 1) / 2;
    cartes.forEach((el, i) => {
      const ecart = i - milieu;
      el.style.setProperty("--rot", (ecart * 4).toFixed(2) + "deg");
      el.style.setProperty("--dy", (ecart * ecart * 5).toFixed(1) + "px");
    });
  }

  // Navigation clavier (phase capture + stopPropagation : pas de menu/déplacement).
  function surTouche(e) {
    if (!["KeyA", "KeyD", "ArrowLeft", "ArrowRight", "Space", "Enter", "Escape"].includes(e.code)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!panneauResultat.hidden) {                 // écran de fin : Espace = Continue
      if (e.code === "Space" || e.code === "Enter") fermer();
      return;
    }
    if (combat.fini || !combat.tourJoueur) return;

    // Phase CIBLAGE : on choisit l'ennemi visé par la carte armée.
    if (phaseCiblage) {
      if (e.code === "KeyA" || e.code === "ArrowLeft") cycleCible(-1);
      else if (e.code === "KeyD" || e.code === "ArrowRight") cycleCible(+1);
      else if (e.code === "Space" || e.code === "Enter") jouer(carteEnAttente, combat.cible);
      else if (e.code === "Escape") phaseCiblage = false; // on annule, retour à la main
      return;
    }

    // Phase MAIN : navigation de la main.
    const els = elementsNavigables();
    if (e.code === "KeyA" || e.code === "ArrowLeft") {
      selection = selection < 0 ? els.length - 1 : (selection - 1 + els.length) % els.length;
      majSelection();
    } else if (e.code === "KeyD" || e.code === "ArrowRight") {
      selection = selection < 0 ? 0 : (selection + 1) % els.length;
      majSelection();
    } else if (e.code === "Space" || e.code === "Enter") {
      if (selection < 0) return;
      if (selection < combat.main.length) tenterJouer(selection);
      else finDeTour();
    }
    // Escape en phase main : bloqué (pas de menu pause par-dessus le combat)
  }

  // -- Actions du joueur ----------------------------------------------------

  // Espace sur une carte : carte d'attaque + plusieurs ennemis → on arme la
  // carte et on passe en ciblage ; sinon on joue directement (cible unique ou
  // carte défensive).
  function tenterJouer(i) {
    const carte = combat.main[i];
    if (!carte || carte.cout > combat.chaleur) return; // injouable (coût en rouge)
    if (carteVise(carte) && indicesVivants().length >= 2) {
      phaseCiblage = true;
      carteEnAttente = i;
      recalerCible();
    } else {
      jouer(i);
    }
  }

  // Joue la carte `i` sur l'ennemi `cible` (par défaut : la cible courante).
  function jouer(i, cible = combat.cible) {
    const carte = combat.main[i];
    if (!carte) return;
    const elJouee = conteneurMain.children[i] || null; // carte à animer
    const eCible = combat.ennemis[cible];
    const pvAvant = eCible ? eCible.pv : 0;
    const pierreAvant = combat.pierre;
    if (!jouerCarte(combat, i, cible)) return; // pas assez de Chaleur, etc.

    if (elJouee) animerCarteJouee(elJouee); // la carte sort, grandit, puis disparaît

    // Animation sur l'ennemi touché (s'il a perdu des PV)
    const u = ennemisUI[cible];
    if (u && eCible && eCible.pv < pvAvant) {
      animAttaque = 0.25;
      u.secousse = 0.3;
      if (eCible.pv <= 0) exploser(u);
      else jouerAnim(u, "touche");
      ajouterFlottant(`-${pvAvant - eCible.pv}`, u.ecran.cx, u.ecran.milieu, "#ffe27a");
    }
    if (combat.pierre > pierreAvant) {
      ajouterFlottant(`+${combat.pierre - pierreAvant}`, heroEcran.cx, heroEcran.milieu, "#9cd3ff");
    }
    phaseCiblage = false;
    recalerCible();
    selection = combat.main.length > 0 ? Math.min(selection, combat.main.length - 1) : -1;
    rafraichir();
    verifierFin();
  }

  // -- Ciblage SOURIS : on saisit une carte et on tire une flèche vers un monstre.
  let drag = null; // { i, el, vise, depart{x,y}, x, y (scène), cibleSurvol }

  // Convertit un point ÉCRAN (clientX/Y) en coords de la SCÈNE (640×360).
  function pointerVersScene(clientX, clientY) {
    const r = ctx.canvas.getBoundingClientRect();
    const bx = (clientX - r.left) * (ctx.canvas.width / r.width);
    const by = (clientY - r.top) * (ctx.canvas.height / r.height);
    const s = Math.min(ctx.canvas.width / 640, ctx.canvas.height / 360);
    const offX = (ctx.canvas.width - 640 * s) / 2;
    const offY = (ctx.canvas.height - 360 * s) / 2;
    return { x: (bx - offX) / s, y: (by - offY) / s };
  }
  function elementVersScene(el) {
    const r = el.getBoundingClientRect();
    return pointerVersScene(r.left + r.width / 2, r.top); // haut-centre de la carte
  }
  // Quel ennemi vivant est sous ce point (coords scène) ? -1 sinon.
  function ennemiSousPoint(sx, sy) {
    for (let i = 0; i < ennemisUI.length; i++) {
      const u = ennemisUI[i];
      if (u.e.pv <= 0 || u.partis) continue;
      const dl = (u.spr.caseL * ECHELLE_SCENE) / 2 + 8;
      if (Math.abs(sx - u.ecran.cx) <= dl && sy >= u.ecran.haut - 12 && sy <= u.ecran.sol + 12) return i;
    }
    return -1;
  }

  function debutDrag(i, el, ev) {
    if (combat.fini || !combat.tourJoueur || phaseCiblage) return;
    const carte = combat.main[i];
    if (!carte || carte.cout > combat.chaleur) return; // injouable
    ev.preventDefault();
    const p = pointerVersScene(ev.clientX, ev.clientY);
    drag = {
      i, el,
      vise: carteVise(carte) && indicesVivants().length >= 1, // tire une flèche ?
      depart: elementVersScene(el),
      x: p.x, y: p.y,
      cibleSurvol: -1,
    };
    if (drag.vise) drag.cibleSurvol = ennemiSousPoint(p.x, p.y);
    window.addEventListener("pointermove", surDragMove);
    window.addEventListener("pointerup", surDragUp);
  }
  function surDragMove(ev) {
    if (!drag) return;
    const p = pointerVersScene(ev.clientX, ev.clientY);
    drag.x = p.x; drag.y = p.y;
    if (drag.vise) drag.cibleSurvol = ennemiSousPoint(p.x, p.y);
  }
  function surDragUp(ev) {
    window.removeEventListener("pointermove", surDragMove);
    window.removeEventListener("pointerup", surDragUp);
    const d = drag; drag = null;
    if (!d) return;
    if (d.vise) {
      if (d.cibleSurvol >= 0) jouer(d.i, d.cibleSurvol); // lâché SUR un ennemi → joue
      // lâché ailleurs → annulé (la carte reste en main)
    } else {
      // Carte sans cible (défense) : jouée par un clic dessus OU en la tirant
      // vers le haut (lâcher au niveau de la carte ou plus haut). Vers le bas = annulé.
      const r = d.el.getBoundingClientRect();
      if (ev.clientY <= r.bottom) jouer(d.i);
    }
  }

  function finDeTour() {
    if (phaseCiblage) return; // on choisit une cible : End Turn attend
    const pvHerosAvant = combat.pvHeros;
    finirTour(combat);

    // Statuts sur chaque ennemi (poison vert / feu orange) + mort + anim d'attaque.
    ennemisUI.forEach((u) => {
      const e = u.e;
      if (e.dernierPoison > 0) {
        u.secousse = 0.3;
        ajouterFlottant(`☠ ${e.dernierPoison}`, u.ecran.cx, u.ecran.milieu, "#7ec850");
      }
      if (e.dernierFeu > 0) {
        u.secousse = 0.3;
        ajouterFlottant(`🔥 ${e.dernierFeu}`, u.ecran.cx, u.ecran.milieu - 16, "#ff8a2c");
      }
      if (e.dernierSang > 0) {
        u.secousse = 0.3;
        ajouterFlottant(`🩸 ${e.dernierSang}`, u.ecran.cx, u.ecran.milieu - 32, "#e05a5a");
      }
      if (e.pv <= 0 && !u.mort.actif && !u.partis) exploser(u);       // mort par statut
      else if (e.pv > 0 && e.intention?.type === "attaque") jouerAnim(u, "attaque");
    });

    // Vie du héros : attaques cumulées, moins le soin du saignement, séparés de
    // la brûlure (jauge) et des statuts du héros.
    const brulure = combat.derniereBrulure;
    const poison = combat.dernierPoisonHeros;
    const feu = combat.dernierFeuHeros;
    const soin = combat.dernierSoinSang;
    const degats = (pvHerosAvant - combat.pvHeros) - brulure - poison - feu + soin;
    if (degats > 0) {
      secousseHeros = 0.3;
      ajouterFlottant(`-${degats}`, heroEcran.cx, heroEcran.milieu, "#ff7a7a");
    }
    if (soin > 0) {
      ajouterFlottant(`+${soin}`, heroEcran.cx, heroEcran.milieu - 16, "#86e08a"); // saignement → vie
    }
    if (poison > 0) {
      secousseHeros = 0.3;
      ajouterFlottant(`☠ ${poison}`, heroEcran.cx, heroEcran.milieu - 32, "#7ec850");
    }
    if (feu > 0) {
      secousseHeros = 0.3;
      ajouterFlottant(`🔥 ${feu}`, heroEcran.cx, heroEcran.milieu - 48, "#ff8a2c");
    }
    if (brulure > 0) {
      secousseHeros = 0.3;
      pulserJauge();
    }
    recalerCible();
    rafraichir();
    verifierFin();
  }

  function terminer() {
    texteResultat.textContent = combat.resultat === "victoire" ? "Victory!" : "Defeat";
    panneauResultat.hidden = false;
  }

  function fermer() {
    overlay.hidden = true;
    panneauResultat.hidden = true;
    boutonFin.removeEventListener("click", finDeTour);
    boutonContinuer.removeEventListener("click", fermer);
    window.removeEventListener("keydown", surTouche, true);
    window.removeEventListener("pointermove", surDragMove); // au cas où un drag traîne
    window.removeEventListener("pointerup", surDragUp);
    heros.pv = combat.pvHeros; // la vie persiste vers la carte
    surFin(combat.resultat);
  }

  boutonFin.addEventListener("click", finDeTour);
  boutonFin.addEventListener("pointerenter", () => {
    if (!drag) { selection = elementsNavigables().length - 1; majSelection(); }
  });
  boutonContinuer.addEventListener("click", fermer);
  window.addEventListener("keydown", surTouche, true);
  panneauResultat.hidden = true;
  overlay.hidden = false;
  rafraichir();
  majJauge();

  // -- Boucle : animations + dessin ----------------------------------------
  function mettreAJour(dt) {
    aff.pvHeros += (combat.pvHeros - aff.pvHeros) * Math.min(1, dt * 8);
    aff.pierre += (combat.pierre - aff.pierre) * Math.min(1, dt * 10);
    aff.chaleur += (combat.chaleur - aff.chaleur) * Math.min(1, dt * 9);
    majJauge();
    temps += dt;

    for (const u of ennemisUI) {
      u.affPv += (u.e.pv - u.affPv) * Math.min(1, dt * 8);
      u.anim.t += dt;
      const def = u.spr.anims[u.anim.nom] ?? u.spr.anims.idle;
      if (!def.boucle && u.anim.t * def.ips >= def.frames.length &&
          (u.anim.nom === "touche" || u.anim.nom === "attaque")) {
        u.anim = { nom: "idle", t: 0 };
      }
      u.secousse = Math.max(0, u.secousse - dt);
      if (u.mort.actif) { u.mort.t += dt; if (u.mort.t > 0.35) u.partis = true; }
    }

    animAttaque = Math.max(0, animAttaque - dt);
    secousseHeros = Math.max(0, secousseHeros - dt);
    for (const f of flottants) f.t -= dt * 0.9;
    for (let i = flottants.length - 1; i >= 0; i--) {
      if (flottants[i].t <= 0) flottants.splice(i, 1);
    }

    for (const p of particules) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === "braise") { p.vy += 90 * dt; p.vx *= 0.96; }
      else if (p.type === "fumee") { p.vy -= 6 * dt; p.taille += 14 * dt; }
      else if (p.type === "flash") { p.taille += 180 * dt; }
      p.vie -= dt;
    }
    for (let i = particules.length - 1; i >= 0; i--) {
      if (particules[i].vie <= 0) particules.splice(i, 1);
    }

    if (delaiFin >= 0 && !termine) {
      delaiFin -= dt;
      if (delaiFin <= 0) { termine = true; terminer(); }
    }
    alerteVie(combat.pvHeros / combat.pvHerosMax);
  }

  // États sous la barre (poison/feu). L'armure (Pierre, héros) = bouclier bleu.
  function etatsHeros() {
    const l = [];
    if (combat.poisonHeros > 0) l.push({ texte: `☠ ${combat.poisonHeros}`, couleur: "#7ec850" });
    if (combat.feuHeros > 0) l.push({ texte: `🔥 ${combat.feuHeros}`, couleur: "#ff8a2c" });
    return l;
  }
  function etatsEnnemi(e) {
    const l = [];
    if (e.poison > 0) l.push({ texte: `☠ ${e.poison}`, couleur: "#7ec850" });
    if (e.feu > 0) l.push({ texte: `🔥 ${e.feu}`, couleur: "#ff8a2c" });
    if (e.sang > 0) l.push({ texte: `🩸 ${e.sang}`, couleur: "#e05a5a" });
    return l;
  }

  function dessiner() {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0c0907";
    ctx.fillRect(0, 0, W, H);
    const s = Math.min(W / 640, H / 360);
    ctx.setTransform(s, 0, 0, s, Math.round((W - 640 * s) / 2), Math.round((H - 360 * s) / 2));

    dessinerFond(ctx);

    // SPRITES (héros + ennemis + braises) : réduits VERS le sol (pieds ancrés).
    ctx.save();
    ctx.translate(PIVOT_SCENE.x, PIVOT_SCENE.y);
    ctx.scale(ECHELLE_SCENE, ECHELLE_SCENE);
    ctx.translate(-PIVOT_SCENE.x, -PIVOT_SCENE.y);

    for (const u of ennemisUI) {
      if (u.partis) continue;
      const def = u.spr.anims[u.anim.nom] ?? u.spr.anims.idle;
      const frame = frameAnim(def, u.anim.t);
      const tr = u.secousse > 0 ? (Math.random() - 0.5) * 6 : 0;
      const alpha = u.mort.actif ? Math.max(0, 1 - u.mort.t / 0.35) : 1;
      if (alpha > 0) {
        ctx.globalAlpha = alpha;
        dessinerEnnemi(ctx, u.planche, u.spr, frame, u.localX + tr, u.localY);
        ctx.globalAlpha = 1;
      }
    }

    const avance = Math.sin((1 - animAttaque / 0.25) * Math.PI) * 14;
    const trHeros = secousseHeros > 0 ? (Math.random() - 0.5) * 8 : 0;
    const hx = HEROS.x + (animAttaque > 0 ? avance : 0) + trHeros;
    if (heros.plancheArmure) dessinerCaseEchelle(ctx, heros.plancheArmure, 0, 2, hx, HEROS.y, ECHELLE_HEROS);
    if (heros.plancheArme) dessinerCaseEchelle(ctx, heros.plancheArme, 0, 2, hx, HEROS.y, ECHELLE_HEROS);

    dessinerParticules(ctx, particules);
    ctx.restore(); // fin du dézoom des sprites

    // Vie + états + intention de chaque ennemi vivant (taille réelle, lisible).
    ennemisUI.forEach((u) => {
      if (u.e.pv <= 0 || u.mort.actif) return;
      barreVieAuSol(ctx, u.ecran, u.affPv / u.e.pvMax,
        `${Math.round(u.e.pv)}/${u.e.pvMax}`, "#c0392b", etatsEnnemi(u.e), 0);
      dessinerIntention(ctx, u.e.intention, u.ecran.cx, u.ecran.haut - 8);
    });

    // Flèche rouge au-dessus de la cible : UNIQUEMENT quand une carte d'attaque
    // est armée au clavier (sinon rien). La souris a sa propre flèche (drag).
    if (!drag && phaseCiblage && combat.tourJoueur && !combat.fini) {
      const u = ennemisUI[combat.cible];
      if (u && u.e.pv > 0) dessinerFlecheCible(ctx, u.ecran, temps, true);
    }

    // Flèche de DRAG souris : de la carte vers le pointeur (ou l'ennemi survolé).
    if (drag && drag.vise) {
      const surv = drag.cibleSurvol >= 0 ? ennemisUI[drag.cibleSurvol] : null;
      const ex = surv ? surv.ecran.cx : drag.x;
      const ey = surv ? surv.ecran.milieu : drag.y;
      dessinerFlecheDrag(ctx, drag.depart.x, drag.depart.y, ex, ey);
      if (surv && surv.e.pv > 0) dessinerFlecheCible(ctx, surv.ecran, temps, true);
    }

    // Vie du héros (avec son bouclier d'armure = la Pierre).
    barreVieAuSol(ctx, heroEcran, aff.pvHeros / combat.pvHerosMax,
      `${Math.round(combat.pvHeros)}/${combat.pvHerosMax}`, "#2e8b57", etatsHeros(), combat.pierre);

    // Nombres de dégâts qui montent (coords scène)
    for (const f of flottants) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.t));
      ctx.fillStyle = f.couleur;
      ctx.font = "bold 13px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(f.texte, f.x, f.y - (1 - f.t) * 14);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { mettreAJour, dessiner };
}

// ----- Animation -----------------------------------------------------------

function frameAnim(def, t) {
  let i = Math.floor(t * def.ips);
  i = def.boucle ? i % def.frames.length : Math.min(i, def.frames.length - 1);
  return def.frames[i];
}

// ----- Particules (braises de forge à la mort) -----------------------------

function dessinerParticules(ctx, particules) {
  for (const p of particules) {
    if (p.type !== "fumee") continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.vie / p.vieMax)) * 0.32;
    ctx.fillStyle = "#2a2622";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter";
  for (const p of particules) {
    if (p.type === "fumee") continue;
    const k = Math.max(0, Math.min(1, p.vie / p.vieMax));
    if (p.type === "braise") {
      ctx.globalAlpha = k;
      ctx.fillStyle = k > 0.6 ? "#ffe39a" : (k > 0.3 ? "#ff8a2c" : "#a82a12");
      const s = Math.max(1, Math.round(p.taille));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    } else {
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
  ctx.fillStyle = "#241c16";
  ctx.fillRect(0, SOL_Y, 640, 360 - SOL_Y);
  ctx.fillStyle = "#2e241b";
  ctx.fillRect(0, SOL_Y, 640, 4);
}

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

// La vie d'un perso posée à son repère-écran : bouclier d'armure (Pierre) à
// GAUCHE, barre + PV chiffrés au centre, états (poison/feu…) en DESSOUS.
function barreVieAuSol(ctx, perso, ratio, texte, couleur, etats, pierre) {
  const x = perso.cx - BAR_L / 2;
  const y = perso.sol + VIE_SOUS;
  if (pierre > 0) dessinerBouclier(ctx, x - BAR_H * 0.95, y + BAR_H / 2, BAR_H + 6, pierre);
  dessinerBarreVie(ctx, x, y, BAR_L, BAR_H, ratio, couleur, texte);
  dessinerEtats(ctx, etats, perso.cx, y + BAR_H + ETATS_SOUS);
}

function dessinerBarreVie(ctx, x, y, l, h, ratio, couleur, texte) {
  const r = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = "#000";
  ctx.fillRect(x - 1, y - 1, l + 2, h + 2);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(x, y, l, h);
  ctx.fillStyle = couleur;
  ctx.fillRect(x, y, l * r, h);
  if (texte) {
    ctx.font = `bold ${Math.round(h * 0.82)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.strokeText(texte, x + l / 2, y + h / 2 + 0.5);
    ctx.fillStyle = "#fff";
    ctx.fillText(texte, x + l / 2, y + h / 2 + 0.5);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

// Un petit bouclier bleu (l'armure du nain = sa Pierre) avec sa valeur dedans.
function dessinerBouclier(ctx, cx, cy, taille, valeur) {
  const w = taille, h = taille * 1.18;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy + h * 0.12);
  ctx.quadraticCurveTo(cx + w * 0.46, cy + h * 0.42, cx, cy + h / 2);
  ctx.quadraticCurveTo(cx - w * 0.46, cy + h * 0.42, cx - w / 2, cy + h * 0.12);
  ctx.closePath();
  ctx.fillStyle = "#2f6fb0";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#bcd8f5";
  ctx.stroke();
  ctx.font = `bold ${Math.round(taille * 0.6)}px ui-monospace, monospace`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(valeur), cx, cy + h * 0.04);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function dessinerIntention(ctx, intention, cx, y) {
  if (!intention) return;
  ctx.fillStyle = "#ff8a5b";
  ctx.font = "bold 12px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(`⚔ ${intention.valeur}`, cx, y);
  ctx.textAlign = "left";
}

// Une rangée de petits badges d'état (poison, feu, stun… à venir), centrée.
function dessinerEtats(ctx, etats, cx, y) {
  if (!etats || etats.length === 0) return;
  ctx.font = "bold 9px ui-monospace, monospace";
  ctx.textAlign = "center";
  const espace = 22;
  const x0 = cx - ((etats.length - 1) * espace) / 2;
  etats.forEach((etat, i) => {
    ctx.fillStyle = etat.couleur;
    ctx.fillText(etat.texte, x0 + i * espace, y);
  });
  ctx.textAlign = "left";
}

// Une flèche rouge qui pointe la CIBLE, au-dessus de sa tête, avec un petit
// rebond. `fort` (pendant le ciblage clavier) la rend plus vive et plus grande.
function dessinerFlecheCible(ctx, ecran, t, fort) {
  const bob = Math.sin(t * 6) * 3;
  const x = ecran.cx;
  const y = ecran.haut - 14 + bob;
  const w = fort ? 13 : 10, h = fort ? 15 : 12;
  ctx.fillStyle = fort ? "#ff3b30" : "#e0473a";
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h);
  ctx.lineTo(x + w / 2, y - h);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.stroke();
}

// Une flèche rouge tracée de la carte (x0,y0) vers le pointeur/monstre (x1,y1).
function dessinerFlecheDrag(ctx, x0, y0, x1, y1) {
  ctx.strokeStyle = "#ff3b30";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  // Pointe de flèche
  const a = Math.atan2(y1 - y0, x1 - x0);
  const t = 11;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - t * Math.cos(a - 0.45), y1 - t * Math.sin(a - 0.45));
  ctx.lineTo(x1 - t * Math.cos(a + 0.45), y1 - t * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fillStyle = "#ff3b30";
  ctx.fill();
  ctx.lineCap = "butt";
}

// ----- Une carte en HTML ---------------------------------------------------

// Anime la carte qu'on vient de jouer : un clone sort de la main, grandit au
// centre de l'écran (bien visible), puis s'estompe et disparaît. Le clone est
// indépendant (la main, elle, se referme tout de suite).
function animerCarteJouee(el) {
  const r = el.getBoundingClientRect();
  const clone = el.cloneNode(true);
  clone.classList.remove("sel");
  clone.disabled = false;
  Object.assign(clone.style, {
    position: "fixed", left: r.left + "px", top: r.top + "px",
    width: r.width + "px", height: r.height + "px",
    margin: "0", zIndex: "30", pointerEvents: "none", transformOrigin: "center center",
  });
  clone.style.setProperty("--carte-l", r.width + "px"); // garde la bonne taille de texte
  document.body.appendChild(clone);

  const dx = innerWidth / 2 - (r.left + r.width / 2);
  const dy = innerHeight / 2 - (r.top + r.height / 2);
  clone.animate([
    { transform: "translate(0px, 0px) rotate(0deg) scale(1)", opacity: 1 },
    { transform: `translate(${dx}px, ${dy - 30}px) rotate(0deg) scale(1.7)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy - 30}px) rotate(0deg) scale(1.7)`, opacity: 1, offset: 0.72 },
    { transform: `translate(${dx}px, ${dy - 80}px) rotate(0deg) scale(1.9)`, opacity: 0, offset: 1 },
  ], { duration: 620, easing: "cubic-bezier(.2, .7, .3, 1)" }).onfinish = () => clone.remove();
}

function creerCarteDOM(carte, combat) {
  const el = document.createElement("button");
  el.className = "combat-carte";
  el.disabled = combat.fini || !combat.tourJoueur;
  garnirCarte(el, carte);
  if (carte.cout > combat.chaleur) el.classList.add("combat-carte--injouable");
  return el;
}
