// Une petite fenêtre de CONFIRMATION oui/non, partagée (jeter un objet rare,
// vendre un objet rare, quitter le butin sans tout prendre…). Elle passe
// AU-DESSUS de tout (z-index élevé) et se pilote au CLAVIER comme à la souris :
//   ←/→ ou ↑/↓ (WASD/ZQSD) ou Tab : viser un bouton (liseré doré = bouton visé)
//   Entrée / Espace : valider le bouton visé
//   Échap : annuler (= Non)
// Le bouton visé AU DÉPART est le choix SÛR : « Non » pour une action dangereuse
// (danger=true), « Oui » sinon → on voit tout de suite où l'on est, et un appui
// trop rapide ne déclenche pas une action destructrice par accident.
//
// `confirmationActive()` permet aux autres écrans (butin, inventaire, dialogue
// marchand) d'ignorer le clavier / la souris pendant qu'une confirmation est là.

import { t } from "../systems/langue.js";

let actif = false;
export function confirmationActive() { return actif; }

// Touches qui visent le bouton de GAUCHE (Non) / de DROITE (Oui).
const VERS_NON = new Set(["ArrowLeft", "ArrowUp", "KeyA", "KeyQ", "KeyW", "KeyZ"]);
const VERS_OUI = new Set(["ArrowRight", "ArrowDown", "KeyD", "KeyS"]);

// `surOui` / `surNon` : callbacks (optionnels). `danger` colore le bouton de
// validation en rouge (action destructrice) ET met le focus initial sur « Non ».
export function demanderConfirmation(
  { titre, message, texteOui, texteNon, danger = false },
  surOui,
  surNon,
) {
  if (actif) return;
  actif = true;
  const overlay = document.getElementById("confirmation");
  const elTitre = document.getElementById("confirm-titre");
  const elMsg = document.getElementById("confirm-message");
  const btnOui = document.getElementById("confirm-oui");
  const btnNon = document.getElementById("confirm-non");

  elTitre.textContent = titre ?? t("confirm.sur");
  elMsg.textContent = message ?? "";
  btnOui.textContent = texteOui ?? t("confirm.oui");
  btnNon.textContent = texteNon ?? t("confirm.non");
  btnOui.classList.toggle("confirm-danger", !!danger);

  function fini(reponse) {
    actif = false;
    window.removeEventListener("keydown", surTouche, true);
    btnOui.removeEventListener("click", oui);
    btnNon.removeEventListener("click", non);
    overlay.hidden = true;
    if (reponse) surOui?.();
    else surNon?.();
  }
  function oui() { fini(true); }
  function non() { fini(false); }

  function surTouche(e) {
    // On laisse passer les raccourcis navigateur (F5, Ctrl+R…) intacts.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Modale : on bloque la propagation pour qu'AUCUN écran derrière (inventaire,
    // marchand, menu pause…) ne réagisse pendant que la confirmation est là.
    e.stopPropagation();
    const c = e.code;
    if (c === "Escape") { e.preventDefault(); non(); }
    else if (c === "Enter" || c === "NumpadEnter" || c === "Space") {
      e.preventDefault();
      (document.activeElement === btnOui ? oui : non)();
    }
    else if (VERS_NON.has(c)) { e.preventDefault(); btnNon.focus(); }
    else if (VERS_OUI.has(c)) { e.preventDefault(); btnOui.focus(); }
    else if (c === "Tab") {
      e.preventDefault();
      (document.activeElement === btnOui ? btnNon : btnOui).focus();
    }
    // Autres touches : avalées (stopPropagation) mais sans effet.
  }

  btnOui.addEventListener("click", oui);
  btnNon.addEventListener("click", non);
  window.addEventListener("keydown", surTouche, true);
  overlay.hidden = false;
  // Focus initial sur le choix SÛR → liseré doré visible, on voit où l'on est.
  (danger ? btnNon : btnOui).focus();
}
