// Petits effets d'interface : messages furtifs et flash de combat.

// ---- Flash de rencontre façon FF9 (~2.5 s) ----------------------------------
//
// Séquence en trois phases :
//   1. Stroboscopique (0–0.2) : 3 éclairs blancs rapides
//   2. Tourbillon (0.2–0.85)  : l'image se déforme en spirale + bloom blanc du centre
//   3. Blanc total (0.85–1.0) : plein blanc → fondu sortant
//
// Technique : un canvas overlay (z-index 18, fixed plein écran) est créé pour
// la durée de l'effet. La déformation utilise un calcul de tourbillon sur une
// version 1/4 de résolution de la frame courante (léger, ~32 k pixels) puis
// l'agrandit. Le canvas est retiré du DOM quand la promesse se résout.
export function flashCombat() {
  return new Promise(resoudre => {
    const jeu = document.getElementById("jeu");
    const W = jeu.width, H = jeu.height;

    // Snapshot de la frame courante (exploration figée)
    const snap = document.createElement("canvas");
    snap.width = W; snap.height = H;
    snap.getContext("2d").drawImage(jeu, 0, 0);

    // Version basse résolution pour le pixel-swirl (16x moins de pixels)
    const SW = W >> 2, SH = H >> 2;
    const snapPetit = document.createElement("canvas");
    snapPetit.width = SW; snapPetit.height = SH;
    const ctxPetit = snapPetit.getContext("2d", { willReadFrequently: true });
    ctxPetit.drawImage(snap, 0, 0, SW, SH);
    const pixelsOriginaux = ctxPetit.getImageData(0, 0, SW, SH).data;

    // Canvas overlay plein écran (mêmes pixels internes que le jeu → CSS l'agrandit)
    const ov = document.createElement("canvas");
    ov.width = W; ov.height = H;
    Object.assign(ov.style, {
      position: "fixed", inset: "0",
      width: "100%", height: "100%",
      zIndex: "18", pointerEvents: "none",
      imageRendering: "pixelated",
    });
    document.body.append(ov);
    const ctx = ov.getContext("2d");

    const DUREE = 2500;
    const debut = performance.now();

    // Applique un tourbillon de `force` radians sur la petite image,
    // écrit le résultat dans snapPetit (sera dessiné agrandi ensuite).
    function tourbillon(force) {
      const dst = new Uint8ClampedArray(SW * SH * 4);
      const cx = SW / 2, cy = SH / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      for (let y = 0; y < SH; y++) {
        for (let x = 0; x < SW; x++) {
          const dx = x - cx, dy = y - cy;
          const r = Math.sqrt(dx * dx + dy * dy);
          const a = Math.atan2(dy, dx) + force * (1 - r / maxR) * Math.PI;
          const sx = Math.max(0, Math.min(SW - 1, Math.round(cx + r * Math.cos(a))));
          const sy = Math.max(0, Math.min(SH - 1, Math.round(cy + r * Math.sin(a))));
          const si = (sy * SW + sx) * 4;
          const di = (y  * SW + x)  * 4;
          dst[di]     = pixelsOriginaux[si];
          dst[di + 1] = pixelsOriginaux[si + 1];
          dst[di + 2] = pixelsOriginaux[si + 2];
          dst[di + 3] = pixelsOriginaux[si + 3];
        }
      }
      ctxPetit.putImageData(new ImageData(dst, SW, SH), 0, 0);
    }

    function frame(now) {
      const t = Math.min((now - debut) / DUREE, 1);
      ctx.clearRect(0, 0, W, H);

      if (t < 0.2) {
        // Phase 1 : 3 éclairs stroboscopiques
        const ft = t / 0.2;
        if (Math.floor(ft * 6) % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillRect(0, 0, W, H);
        }

      } else if (t < 0.85) {
        // Phase 2 : tourbillon + bloom blanc
        const ft = (t - 0.2) / 0.65;
        const cx = W / 2, cy = H / 2;

        // Image déformée (tourbillon croissant, flou croissant)
        tourbillon(ft * 1.4);
        ctx.save();
        ctx.filter = `blur(${Math.round(ft * 5)}px)`;
        ctx.drawImage(snapPetit, 0, 0, W, H);
        ctx.filter = "none";
        ctx.restore();

        // Bloom blanc radial depuis le centre
        const bloomR = Math.max(W, H) * (0.2 + ft * 1.1);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR);
        grad.addColorStop(0,   `rgba(255,255,255,${0.15 + ft * 0.85})`);
        grad.addColorStop(0.45,`rgba(255,255,255,${ft * 0.55})`);
        grad.addColorStop(1,   "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Rayons du tourbillon (gradient conique qui tourne)
        if (ft > 0.15) {
          const intensite = (ft - 0.15) * 0.18;
          const conicGrad = ctx.createConicGradient(ft * Math.PI * 4, cx, cy);
          for (let i = 0; i < 12; i++) {
            conicGrad.addColorStop(i / 12,
              `rgba(255,255,255,${i % 2 === 0 ? intensite : 0})`);
          }
          conicGrad.addColorStop(1, "rgba(255,255,255,0)");
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = conicGrad;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }

      } else {
        // Phase 3 : blanc tenu jusqu'à la fin — PAS de fondu vers transparent.
        // Raison : fondre vers transparent révèlerait le canvas de jeu figé avant
        // que l'écran de combat soit affiché. On coupe net sur blanc ; ov.remove()
        // et demarrerCombat() s'exécutent dans la même tâche JS → le navigateur
        // peint l'écran de combat directement, sans frame intermédiaire.
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, W, H);
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        ov.remove();
        resoudre();
      }
    }

    requestAnimationFrame(frame);
  });
}

// Fondu au noir pour les transitions de zone. Règle l'opacité du voile noir
// (0 = transparent, 1 = noir plein) et renvoie une promesse résolue à la fin
// du fondu — pour enchaîner : await fondu(1) … changer de zone … await fondu(0).
export function fondu(opacite, duree = 220) {
  const voile = document.getElementById("fondu");
  voile.style.transition = `opacity ${duree}ms ease`;
  voile.style.opacity = String(opacite);
  return new Promise((resoudre) => setTimeout(resoudre, duree));
}

// Alerte « vie basse » : un liseré rouge pulse autour de l'écran quand les PV
// passent sous le seuil. `ratio` = pv / pvMax (0..1). Appelée chaque image,
// aussi bien en exploration qu'en combat (chacun fournit sa source de PV).
const SEUIL_VIE_BASSE = 0.10;
export function alerteVie(ratio) {
  const voile = document.getElementById("vignette-vie");
  if (voile) voile.classList.toggle("actif", ratio > 0 && ratio < SEUIL_VIE_BASSE);
}

let minuterieMessage = null;

// Affiche un court message en bas de l'écran, qui disparaît tout seul.
export function afficherMessage(texte, duree = 2200) {
  const boite = document.getElementById("message-zone");
  boite.textContent = texte;
  boite.classList.add("visible");
  clearTimeout(minuterieMessage);
  minuterieMessage = setTimeout(() => boite.classList.remove("visible"), duree);
}

// Toast centré, style identique au message « retour en ville » de la Maîtrise.
let minuterieToast = null;
export function montrerToast(texte, duree = 2600) {
  document.querySelectorAll(".maitrise-toast").forEach((t) => t.remove());
  clearTimeout(minuterieToast);
  const toast = document.createElement("div");
  toast.className = "maitrise-toast";
  toast.textContent = texte;
  document.body.append(toast);
  minuterieToast = setTimeout(() => toast.remove(), duree);
}
