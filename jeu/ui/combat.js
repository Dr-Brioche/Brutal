// L'écran de combat : la mise en scène (dessinée dans le canvas) + les cartes
// et boutons (en HTML, par-dessus). La logique pure est dans systems/combat.js.
//
// Choix d'affichage validé : on VOIT le nain, de profil à gauche, en
// réutilisant son sprite de carte (pose latérale) agrandi ×3. L'ennemi est un
// placeholder dessiné « au feutre » (formes pleines) en attendant un vrai skin.
//
// On renvoie { mettreAJour(dt), dessiner() } : la boucle principale appelle
// ces deux fonctions tant que le combat est actif.

import { creerCombat, jouerCarte, finirTour } from "../systems/combat.js";
import { dessinerCaseEchelle } from "../core/sprites.js";

// ----- Placement sur la scène (canvas 640×360) -----------------------------
const ECHELLE_HEROS = 3;            // 64×64 → 192×192
const HEROS = { x: 70, y: 96 };     // coin haut-gauche du sprite agrandi
const ENNEMI = { x: 430, y: 150, l: 110, h: 120 }; // rectangle du placeholder
const SOL_Y = 270;                  // ligne de sol
// ---------------------------------------------------------------------------

export function demarrerCombat({ ctx, heros, equipement, ennemi, surFin }) {
  const combat = creerCombat(equipement, ennemi);

  // Éléments d'interface (présents dans index.html)
  const overlay = document.getElementById("combat");
  const conteneurMain = document.getElementById("combat-main");
  const elEnergie = document.getElementById("combat-energie");
  const boutonFin = document.getElementById("combat-fin");
  const panneauResultat = document.getElementById("combat-resultat");
  const texteResultat = document.getElementById("combat-resultat-texte");
  const boutonContinuer = document.getElementById("combat-continuer");

  // Valeurs « affichées » : elles glissent vers les vraies (barres animées)
  const aff = { pvHeros: combat.pvHeros, pvEnnemi: combat.pvEnnemi, pierre: 0 };
  // Minuteries d'animation (en secondes restantes)
  let animAttaque = 0;   // le nain pousse son arme vers l'avant
  let secousseEnnemi = 0;
  let secousseHeros = 0;
  const flottants = [];  // nombres de dégâts qui montent et s'estompent

  function ajouterFlottant(texte, x, y, couleur) {
    flottants.push({ texte, x, y, couleur, t: 1 });
  }

  // -- Construction de la main (cartes cliquables) --------------------------
  function rafraichir() {
    conteneurMain.replaceChildren();
    combat.main.forEach((carte, i) => {
      conteneurMain.append(creerCarteDOM(carte, combat, () => jouer(i)));
    });
    elEnergie.textContent = `${combat.energie}/${combat.energieMax}`;
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
      ajouterFlottant(`-${pvAvant - combat.pvEnnemi}`,
        ENNEMI.x + ENNEMI.l / 2, ENNEMI.y, "#ffe27a");
    }
    if (combat.pierre > pierreAvant) {
      ajouterFlottant(`+${combat.pierre - pierreAvant}`,
        HEROS.x + 96, HEROS.y + 40, "#9cd3ff");
    }
    rafraichir();
    if (combat.fini) terminer();
  }

  function finDeTour() {
    const pvAvant = combat.pvHeros;
    finirTour(combat);
    if (combat.pvHeros < pvAvant) {
      secousseHeros = 0.3;
      ajouterFlottant(`-${pvAvant - combat.pvHeros}`,
        HEROS.x + 96, HEROS.y + 30, "#ff7a7a");
    }
    rafraichir();
    if (combat.fini) terminer();
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

    animAttaque = Math.max(0, animAttaque - dt);
    secousseEnnemi = Math.max(0, secousseEnnemi - dt);
    secousseHeros = Math.max(0, secousseHeros - dt);
    for (const f of flottants) f.t -= dt * 0.9;
    for (let i = flottants.length - 1; i >= 0; i--) {
      if (flottants[i].t <= 0) flottants.splice(i, 1);
    }
  }

  function dessiner() {
    dessinerFond(ctx);

    // Ennemi (placeholder), avec secousse + éclair rouge quand il est touché
    const trEnnemi = secousseEnnemi > 0 ? (Math.random() - 0.5) * 8 : 0;
    dessinerGobelin(ctx, ENNEMI, trEnnemi, secousseEnnemi > 0);
    dessinerBarreVie(ctx, ENNEMI.x - 5, ENNEMI.y - 26, ENNEMI.l + 10,
      aff.pvEnnemi / combat.pvEnnemiMax, "#c0392b");
    dessinerIntention(ctx, combat.intention, ENNEMI.x + ENNEMI.l / 2, ENNEMI.y - 36);

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
  }

  return { mettreAJour, dessiner };
}

// ----- Dessin de la scène (placeholders « au feutre ») ---------------------

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

function dessinerGobelin(ctx, e, tr, touche) {
  const x = e.x + tr;
  // Corps
  ctx.fillStyle = touche ? "#9fd07a" : "#5e8c3a";
  ctx.fillRect(x + 22, e.y + 36, e.l - 44, e.h - 36);
  // Tête
  ctx.fillRect(x + 30, e.y, e.l - 60, 44);
  // Oreilles pointues
  ctx.beginPath();
  ctx.moveTo(x + 30, e.y + 8); ctx.lineTo(x + 16, e.y - 6); ctx.lineTo(x + 32, e.y + 24);
  ctx.moveTo(x + e.l - 30, e.y + 8); ctx.lineTo(x + e.l - 16, e.y - 6); ctx.lineTo(x + e.l - 32, e.y + 24);
  ctx.fill();
  // Yeux (tournés vers le héros, à gauche)
  ctx.fillStyle = "#ffdd55";
  ctx.fillRect(x + 34, e.y + 18, 7, 7);
  ctx.fillRect(x + 48, e.y + 18, 7, 7);
  // Gourdin
  ctx.fillStyle = "#6b4a2b";
  ctx.fillRect(x + 14, e.y + 40, 10, 46);
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
  el.disabled = combat.fini || !combat.tourJoueur || carte.cout > combat.energie;

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
