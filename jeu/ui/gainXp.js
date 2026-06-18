// L'animation de gain d'XP en fin de combat : la barre d'XP du héros se remplit
// pour montrer le gain, et quand un palier est franchi elle « explose » en doré
// (halo + éclats jaunes + son de level up) avant de repartir de zéro avec le
// reste de l'XP. L'XP est DÉJÀ appliquée au héros par l'appelant ; ici on ne
// fait que REJOUER la montée visuellement (à partir de l'état d'avant le gain).
//
// `animerGainXp(refs, etat)` renvoie { promesse, zapper, arreter } :
//   - promesse : résolue quand l'animation est finie (ou zappée / arrêtée) ;
//   - zapper() : termine l'anim d'un coup (geste du joueur) — ignoré pendant un
//     court verrou anti-accident, et « marque le coup » si un niveau restait ;
//   - arreter() : coupe net l'anim sans effet (fermeture forcée de la fenêtre).
//
// refs = { barre, fill, txt, niveau, eclats } (éléments DOM)
// etat = { niveauDepart, xpDepart, gain }

import { xpPourNiveau } from "../systems/progression.js";
import { jouerSon, creerSonRemplissage, jouerSonDing } from "../core/sons.js";

// Durée d'animation proportionnelle au % de barre gagnée (choisi avec Brioche).
// Tout est en millisecondes.
//   ≤ 20 % de barre gagné → T_MIN (plancher fixe)
//   20 % → 100 %          → interpolation linéaire T_MIN → T_MAX
const T_MIN       = 3000; // durée plancher (petits combats, ≤ 20 % de barre)
const T_MAX       = 6000; // durée plafond  (gain d'un niveau entier)
const SEUIL_FRAC  = 0.20; // en dessous du seuil, on reste à T_MIN
const T_LEVELUP  = 1100; // durée de la célébration (halo + éclats)
const T_STATIQUE = 600;  // si aucune XP gagnée : on montre la barre un instant
const VERROU_ZAP = 300;  // délai avant d'autoriser le zap (anti-appui maintenu)
const NB_ECLATS  = 14;   // nombre d'éclats jaunes par passage de niveau

// Découpe le gain en SEGMENTS de barre. Chaque segment remplit la barre de
// `xpDe` à `xpVers` (dans le niveau `niveau`) ; `levelUp` = ce segment finit le
// niveau (la barre atteint 100 % et on passe au suivant).
function construireEtapes({ niveauDepart, xpDepart, gain }) {
  const etapes = [];
  let niveau = niveauDepart, xp = xpDepart, reste = Math.max(0, gain);
  let secu = 0; // garde-fou anti-boucle si un seuil était mal défini
  while (reste > 0 && secu++ < 1000) {
    const seuil = xpPourNiveau(niveau);
    const manque = seuil - xp;
    if (reste >= manque) {
      etapes.push({ niveau, seuil, xpDe: xp, xpVers: seuil, levelUp: true });
      reste -= manque; niveau += 1; xp = 0;
    } else {
      etapes.push({ niveau, seuil, xpDe: xp, xpVers: xp + reste, levelUp: false });
      xp += reste; reste = 0;
    }
  }
  return etapes;
}

// L'état EXACT où l'on doit finir (cohérent avec gagnerXp) : sert à poser la
// barre proprement à la fin ou lors d'un zap.
function etatFinal(etapes, etat) {
  if (!etapes.length) {
    return { niveau: etat.niveauDepart, seuil: xpPourNiveau(etat.niveauDepart), xp: etat.xpDepart };
  }
  const d = etapes[etapes.length - 1];
  if (d.levelUp) {
    const niveau = d.niveau + 1;
    return { niveau, seuil: xpPourNiveau(niveau), xp: 0 };
  }
  return { niveau: d.niveau, seuil: d.seuil, xp: d.xpVers };
}

export function animerGainXp(refs, etat) {
  const etapes = construireEtapes(etat);
  const final = etatFinal(etapes, etat);
  const totalNiveaux = final.niveau - etat.niveauDepart; // nb de paliers à franchir

  let fini = false, zappe = false, niveauxCelebres = 0;
  let timer = null, raf = null;
  let annulerEtape = null; // résout l'étape async en cours (pour un arrêt net)
  let resoudrePromesse;
  let stopSon = null; // coupe le son de remplissage en cours (drdrdrdr)
  const promesse = new Promise((r) => (resoudrePromesse = r));

  // Pose la barre + le texte. `anime` = laisser la largeur GLISSER (transition
  // CSS) ; sinon saut immédiat (et on réécrit le texte).
  function poser(xp, seuil, anime, duree = 0) {
    refs.fill.style.transition = anime ? `width ${duree}ms linear` : "none";
    refs.fill.style.width = (seuil > 0 ? Math.max(0, Math.min(1, xp / seuil)) : 0) * 100 + "%";
    if (!anime) refs.txt.textContent = `${Math.round(xp)} / ${seuil} XP`;
  }

  // Attente annulable.
  function attendre(ms) {
    return new Promise((res) => {
      const fin = () => { clearTimeout(timer); annulerEtape = null; res(); };
      annulerEtape = fin;
      timer = setTimeout(fin, ms);
    });
  }

  // Anime le COMPTEUR de texte de `de`→`vers` (la largeur, elle, glisse en
  // parallèle via la transition CSS). Annulable.
  function compter(de, vers, seuil, duree) {
    return new Promise((res) => {
      const t0 = performance.now();
      const fin = () => { if (raf) cancelAnimationFrame(raf); raf = null; annulerEtape = null; res(); };
      annulerEtape = fin;
      const pas = (t) => {
        if (zappe) { fin(); return; }
        const k = duree > 0 ? Math.min(1, (t - t0) / duree) : 1;
        refs.txt.textContent = `${Math.round(de + (vers - de) * k)} / ${seuil} XP`;
        if (k < 1) raf = requestAnimationFrame(pas);
        else fin();
      };
      raf = requestAnimationFrame(pas);
    });
  }

  // Projette les éclats jaunes en éventail depuis le centre de la barre.
  function lancerEclats() {
    for (let i = 0; i < NB_ECLATS; i++) {
      const angle = (Math.PI * 2 * i) / NB_ECLATS + (Math.random() - 0.5) * 0.5;
      const dist = 36 + Math.random() * 48;
      const el = document.createElement("span");
      el.className = "butin-xp-eclat";
      el.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      el.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      el.style.animationDelay = Math.random() * 70 + "ms";
      refs.eclats.append(el);
      setTimeout(() => el.remove(), 800);
    }
  }

  // Le « coup » du passage de niveau : son + halo doré + éclats.
  function celebrer() {
    jouerSon("levelup");
    refs.barre.classList.remove("butin-xp--levelup");
    void refs.barre.offsetWidth; // reflow : rejoue le halo à chaque palier
    refs.barre.classList.add("butin-xp--levelup");
    lancerEclats();
    niveauxCelebres += 1;
  }

  async function jouer() {
    refs.barre.classList.remove("butin-xp--levelup");
    refs.niveau.textContent = String(etat.niveauDepart);
    poser(etat.xpDepart, xpPourNiveau(etat.niveauDepart), false);

    if (!etapes.length) { await attendre(T_STATIQUE); return; } // aucun gain

    for (const s of etapes) {
      if (zappe) return;
      refs.niveau.textContent = String(s.niveau);
      const frac = s.seuil > 0 ? (s.xpVers - s.xpDe) / s.seuil : 1;
      const duree = frac <= SEUIL_FRAC
        ? T_MIN
        : T_MIN + (T_MAX - T_MIN) * (frac - SEUIL_FRAC) / (1 - SEUIL_FRAC);
      poser(s.xpDe, s.seuil, false);
      void refs.fill.offsetWidth;            // reflow avant de lancer la glisse
      poser(s.xpVers, s.seuil, true, duree); // la barre glisse…
      stopSon = creerSonRemplissage();        // drdrdrdr pendant que la barre monte
      await compter(s.xpDe, s.xpVers, s.seuil, duree); // …et le compteur monte
      stopSon?.(); stopSon = null;            // barre pleine : on coupe le son
      if (zappe) return;
      if (s.levelUp) {
        celebrer();                            // niveau : son de level-up (pas de chevauchement)
        await attendre(T_LEVELUP);
        if (zappe) return;
        const nv = s.niveau + 1;
        refs.niveau.textContent = String(nv);
        poser(0, xpPourNiveau(nv), false); // la nouvelle barre repart de zéro
      }
    }
  }

  // Pose l'état final exact et résout la promesse (une seule fois).
  // `avecDing` = false uniquement pour `arreter()` (fermeture forcée sans geste du joueur).
  function finaliser(celebrationRestante, avecDing = true) {
    if (fini) return;
    fini = true;
    stopSon?.(); stopSon = null; // coupe le drdrdrdr si un zap ou fermeture arrive en plein milieu
    if (annulerEtape) annulerEtape();
    clearTimeout(timer);
    if (raf) cancelAnimationFrame(raf);
    if (celebrationRestante) celebrer(); // un palier restait : on le marque quand même
    refs.niveau.textContent = String(final.niveau);
    poser(final.xp, final.seuil, false);
    if (avecDing) jouerSonDing(); // tintement de fin (fin naturelle ou zap du joueur)
    resoudrePromesse();
  }

  jouer().then(() => finaliser(false));

  return {
    promesse,
    // Geste du joueur : termine l'anim d'un coup. Ignoré tant que le verrou
    // anti-accident n'est pas passé.
    zapper(depuis) {
      if (fini) return;
      if (performance.now() - depuis < VERROU_ZAP) return;
      zappe = true;
      finaliser(niveauxCelebres < totalNiveaux); // marque le coup si un palier restait
    },
    // Arrêt net (fenêtre fermée autrement) : pas de célébration ni de ding.
    arreter() {
      zappe = true;
      finaliser(false, false);
    },
  };
}
