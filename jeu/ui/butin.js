// La fenêtre de BUTIN, au centre de l'écran à la fin d'un combat gagné. Elle
// liste ce qu'on a looté ; on prend les OBJETS un par un (clic), et quand on a
// tout pris la fenêtre se ferme seule. On peut aussi tout prendre d'un coup
// (« Take all » / Espace) ou laisser le reste (« Discard rest » / Échap).
// L'XP et l'or sont toujours acquis : ils sont appliqués à la fermeture.
//
// principal.js fournit `prendre(id)` (range l'objet, renvoie true si réussi) et
// `surFin()` (applique XP+or et reprend le jeu). (Un visuel de fond viendra.)

import { ITEMS, couleurRarete } from "../data/items.js";
import { demanderConfirmation, confirmationActive } from "./confirmation.js";

export function installerButin() {
  const overlay = document.getElementById("butin");
  const liste = document.getElementById("butin-liste");
  const btnTout = document.getElementById("butin-tout");
  const btnLaisser = document.getElementById("butin-laisser");
  let prendre = null;   // (id) => bool : tente de ranger l'objet dans le sac
  let surFin = null;    // () => void  : applique XP/or + reprend le jeu
  let restants = 0;     // objets pas encore pris
  let pretClavier = false; // Espace/Entrée n'agit qu'après un court délai…
  let timerPret = null;    // …pour ne PAS valider à cause d'un appui maintenu depuis le combat
  const DELAI_CLAVIER = 1500; // ms : le temps de voir le butin

  function ligneInfo(html) {
    const d = document.createElement("div");
    d.className = "butin-ligne butin-info";
    d.innerHTML = html;
    return d;
  }

  function ligneObjet(id) {
    const d = ITEMS[id];
    const el = document.createElement("button");
    el.className = "butin-ligne butin-objet";
    el.dataset.id = id;
    el.innerHTML =
      `<span class="butin-pastille" style="background:${d.icone};border-color:${couleurRarete(id)}"></span>` +
      `<span class="butin-nom">${d.nom}</span><span class="butin-hint">Take</span>`;
    el.addEventListener("click", (e) => { e.stopPropagation(); prendreUn(el); });
    return el;
  }

  // Sac plein : on secoue la ligne et on la laisse en place.
  function refuser(el) {
    el.classList.remove("butin-ligne--pleine");
    void el.offsetWidth; // force un reflow pour rejouer l'animation
    el.classList.add("butin-ligne--pleine");
  }

  function prendreUn(el) {
    if (!prendre) return;
    if (prendre(el.dataset.id)) {
      el.remove();
      restants -= 1;
      if (restants <= 0) fermer(); // tout pris → la fenêtre se ferme seule
    } else {
      refuser(el);
    }
  }

  function prendreTout() {
    if (!prendre) return;
    for (const el of [...liste.querySelectorAll(".butin-objet")]) {
      if (prendre(el.dataset.id)) { el.remove(); restants -= 1; }
      else refuser(el);
    }
    if (restants <= 0) fermer();
  }

  // Ferme la fenêtre et applique XP/or (une seule fois).
  function fermer() {
    if (!surFin) return;
    const cb = surFin;
    surFin = null;
    prendre = null;
    clearTimeout(timerPret);
    overlay.hidden = true;
    window.removeEventListener("keydown", surTouche, true);
    cb();
  }

  // Quitter en laissant des objets → on confirme (ne pas perdre du loot par erreur).
  function tenterFermer() {
    if (restants > 0) {
      demanderConfirmation({
        titre: "Leave loot behind?",
        message: `${restants} item${restants > 1 ? "s" : ""} will be lost for good.`,
        texteOui: "Leave it",
        texteNon: "Keep looting",
        danger: true,
      }, fermer);
    } else {
      fermer();
    }
  }

  function surTouche(e) {
    if (confirmationActive()) return; // une confirmation est ouverte : on l'ignore
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault(); e.stopPropagation();
      if (pretClavier) prendreTout(); // sinon ignoré : appui maintenu depuis le combat
    } else if (e.code === "Escape") {
      e.preventDefault(); e.stopPropagation(); tenterFermer();
    }
  }

  btnTout.addEventListener("click", (e) => { e.stopPropagation(); prendreTout(); });
  btnLaisser.addEventListener("click", (e) => { e.stopPropagation(); tenterFermer(); });

  return {
    // `loot` = { or, xp, items: [idObjet…] }. `opts` = { prendre, surFin }.
    ouvrir({ or = 0, xp = 0, items = [] }, opts) {
      prendre = opts.prendre;
      surFin = opts.surFin;
      liste.replaceChildren();
      if (xp > 0) liste.append(ligneInfo(`✨ <b>+${xp}</b> XP`));
      if (or > 0) liste.append(ligneInfo(`🪙 <b>+${or}</b> Gold`));
      restants = 0;
      for (const id of items) {
        if (!ITEMS[id]) continue;
        liste.append(ligneObjet(id)); // une ligne par exemplaire (on prend 1 par 1)
        restants += 1;
      }
      // Sans objet à trier, un seul bouton « Close » (XP/or seulement).
      btnTout.textContent = restants ? "Take all" : "Close";
      btnLaisser.hidden = restants === 0;
      // Espace/Entrée bloqué un court instant (le temps de voir le butin, et pour
      // qu'un appui maintenu pendant le combat ne ramasse pas tout d'un coup).
      pretClavier = false;
      clearTimeout(timerPret);
      timerPret = setTimeout(() => { pretClavier = true; }, DELAI_CLAVIER);
      overlay.hidden = false;
      window.addEventListener("keydown", surTouche, true);
    },
    fermer,
  };
}
