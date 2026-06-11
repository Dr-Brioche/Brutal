// Système de dialogue : un panneau avec du texte, puis des choix. Navigable au
// clavier — Z/S (ou flèches haut/bas) pour choisir, Espace pour valider.
//
//   ouvrirDialogue({ nom, texte: ["page 1", "page 2"], choix: [{ texte, action }] },
//                   surFin)
//   - texte : pages affichées l'une après l'autre (Espace pour avancer)
//   - choix : proposés après la dernière page ; l'`action` du choix retenu est
//             exécutée, puis `surFin` est appelé (ex. pour reprendre le jeu).

// Touches captées par le dialogue (bloquées pour le reste du jeu pendant qu'il
// est ouvert : pas de menu pause, pas de déplacement parasite).
const TOUCHES = new Set([
  "Space", "Enter", "KeyW", "KeyS", "KeyA", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape",
]);

let actif = false;
export function dialogueActif() { return actif; }

export function ouvrirDialogue(dialogue, surFin) {
  if (actif) return;
  actif = true;

  const overlay = document.getElementById("dialogue");
  const elNom = document.getElementById("dialogue-nom");
  const elTexte = document.getElementById("dialogue-texte");
  const elChoix = document.getElementById("dialogue-choix");
  const elAide = document.getElementById("dialogue-aide");

  const pages = dialogue.texte ?? [];
  const choix = dialogue.choix ?? [];
  let page = 0;
  let enChoix = pages.length === 0;
  let sel = 0;

  elNom.textContent = dialogue.nom ?? "";

  function rendre() {
    elTexte.textContent = pages.length ? pages[Math.min(page, pages.length - 1)] : "";
    elChoix.replaceChildren();
    if (!enChoix) {
      elAide.textContent = "[Space] continue";
      return;
    }
    choix.forEach((c, i) => {
      const el = document.createElement("div");
      el.className = "dialogue-option" + (i === sel ? " sel" : "");
      el.textContent = (i === sel ? "▶ " : "   ") + c.texte;
      el.addEventListener("click", () => choisir(i));
      elChoix.append(el);
    });
    elAide.textContent = choix.length ? "[Z/S] choose · [Space] confirm" : "[Space] close";
  }

  function fermerUI() {
    actif = false;
    window.removeEventListener("keydown", surTouche, true);
    overlay.hidden = true;
  }

  // Valide le choix `i` : on ferme, on exécute son action, puis surFin.
  function choisir(i) {
    const action = choix[i]?.action;
    fermerUI();
    if (action) action();
    if (surFin) surFin();
  }

  function avancer() {
    if (!enChoix) {
      if (page < pages.length - 1) { page++; rendre(); }
      else { enChoix = true; sel = 0; rendre(); }
    } else {
      choisir(sel);
    }
  }

  function surTouche(e) {
    if (!TOUCHES.has(e.code)) return; // on laisse passer le reste
    e.preventDefault();
    e.stopPropagation();              // bloque menu pause / déplacement pendant le dialogue
    const n = Math.max(1, choix.length);
    if (e.code === "Space" || e.code === "Enter") avancer();
    else if (enChoix && (e.code === "KeyW" || e.code === "ArrowUp")) { sel = (sel - 1 + n) % n; rendre(); }
    else if (enChoix && (e.code === "KeyS" || e.code === "ArrowDown")) { sel = (sel + 1) % n; rendre(); }
    // Escape, Q/D… : simplement bloqués (aucune action)
  }

  window.addEventListener("keydown", surTouche, true); // phase capture : on passe avant le reste
  overlay.hidden = false;
  rendre();
}
