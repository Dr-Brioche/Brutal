// Contrôles tactiles — UNIQUEMENT pour tester sur téléphone. Ils n'apparaissent
// que sur un écran tactile (donc jamais sur PC / la version finale).
//
// Astuce : chaque bouton SIMULE une touche clavier (il envoie un évènement
// keydown/keyup). Tout le jeu continue donc de tourner au clavier — rien à
// changer dans la logique. Les menus/cartes/dialogues se tapent directement
// (ce sont déjà des boutons HTML).

export function installerTactile() {
  const tactile = document.getElementById("tactile");
  const estTactile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!estTactile) return; // pas un écran tactile : on n'affiche rien
  tactile.hidden = false;

  const envoyer = (type, code) =>
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }));

  for (const bouton of tactile.querySelectorAll("[data-code]")) {
    const code = bouton.dataset.code;
    const presser = (e) => { e.preventDefault(); envoyer("keydown", code); };
    const relacher = () => envoyer("keyup", code);
    bouton.addEventListener("pointerdown", presser);
    bouton.addEventListener("pointerup", relacher);
    bouton.addEventListener("pointerleave", relacher);   // doigt qui glisse hors du bouton
    bouton.addEventListener("pointercancel", relacher);
    bouton.addEventListener("contextmenu", (e) => e.preventDefault());
  }
}
