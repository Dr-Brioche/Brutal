// Une petite fenêtre de CONFIRMATION oui/non, partagée (jeter un objet rare,
// quitter le butin sans tout prendre…). Elle passe AU-DESSUS de tout (z-index
// élevé) et capte le clavier (Entrée = oui, Échap = non).
//
// `confirmationActive()` permet aux autres écrans (butin, inventaire) d'ignorer
// le clavier / la souris pendant qu'une confirmation est affichée.

let actif = false;
export function confirmationActive() { return actif; }

// `surOui` / `surNon` : callbacks (optionnels). `danger` colore le bouton de
// validation en rouge (action destructrice).
export function demanderConfirmation(
  { titre, message, texteOui = "Confirm", texteNon = "Cancel", danger = false },
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

  elTitre.textContent = titre ?? "Are you sure?";
  elMsg.textContent = message ?? "";
  btnOui.textContent = texteOui;
  btnNon.textContent = texteNon;
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
    if (e.code === "Enter") { e.preventDefault(); e.stopPropagation(); oui(); }
    else if (e.code === "Escape") { e.preventDefault(); e.stopPropagation(); non(); }
  }

  btnOui.addEventListener("click", oui);
  btnNon.addEventListener("click", non);
  window.addEventListener("keydown", surTouche, true);
  overlay.hidden = false;
}
