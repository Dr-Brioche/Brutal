// L'ÉCRAN DE CHOIX DE PROFONDEUR : à chaque étage, on choisit UN buff de run
// parmi 2 (ou plus). Modale OBLIGATOIRE — on ne peut pas la fermer sans choisir
// (le run se construit à chaque descente). Souris OU clavier (flèches + chiffres
// + Entrée), comme tout le reste du jeu.

import { RARETES_PROFONDEUR } from "../systems/profondeur.js";

// Libellé de l'effet d'un loot (ex. « +2 Force »).
const LABEL_EFFET = {
  force: (v) => `+${v} Force`,
  gold: (v) => `+${v} Gold`,
  celerite: (v) => `+${v}% Speed`,
  armure: (v) => `+${v} Armor`,
};
function texteEffet(loot) {
  return (LABEL_EFFET[loot.effet] ?? ((v) => `+${v}`))(loot.valeur);
}

let overlay, elCartes, elAide;
let choixActifs = null, surChoisirActif = null, selection = 0;

export function choixProfondeurActif() { return overlay && !overlay.hidden; }

export function installerChoixProfondeur() {
  overlay = document.getElementById("choix-profondeur");
  elCartes = document.getElementById("cprof-cartes");
  elAide = document.getElementById("cprof-aide");
}

function rendre() {
  elCartes.replaceChildren();
  choixActifs.forEach((loot, i) => {
    const rar = RARETES_PROFONDEUR[loot.rarete] ?? { nom: loot.rarete, couleur: "#c9c4b8" };
    const carte = document.createElement("button");
    carte.className = "cprof-carte" + (i === selection ? " cprof-carte--sel" : "");
    carte.innerHTML =
      `<span class="cprof-past" style="background:${loot.icone};border-color:${rar.couleur}"></span>` +
      `<span class="cprof-rarete" style="color:${rar.couleur}">${rar.nom}</span>` +
      `<span class="cprof-nom">${loot.nom}</span>` +
      `<span class="cprof-effet">${texteEffet(loot)}</span>` +
      `<span class="cprof-num">[${i + 1}]</span>`;
    carte.addEventListener("mouseenter", () => { selection = i; majSelection(); });
    carte.addEventListener("click", () => choisir(i));
    elCartes.append(carte);
  });
}

function majSelection() {
  [...elCartes.children].forEach((el, i) =>
    el.classList.toggle("cprof-carte--sel", i === selection));
}

function choisir(i) {
  if (!choixProfondeurActif()) return;
  const loot = choixActifs[i];
  if (!loot) return;
  const cb = surChoisirActif;
  fermer();
  cb?.(loot);
}

// Ouvre la modale. `opts.surChoisir(loot)` est appelé au choix (obligatoire).
export function ouvrirChoixProfondeur(choix, opts = {}) {
  if (choixProfondeurActif()) return;
  choixActifs = choix;
  surChoisirActif = opts.surChoisir ?? null;
  selection = 0;
  rendre();
  elAide.innerHTML = "← → choose &nbsp;·&nbsp; Enter pick &nbsp;·&nbsp; 1-" + choix.length + " quick pick";
  overlay.hidden = false;
  window.addEventListener("keydown", surTouche, true);
}

function fermer() {
  if (!choixProfondeurActif()) return;
  window.removeEventListener("keydown", surTouche, true);
  overlay.hidden = true;
  choixActifs = null; surChoisirActif = null;
}

function surTouche(e) {
  // Modale obligatoire : Échap NE ferme PAS (on doit choisir).
  if (e.code === "ArrowLeft" || e.code === "KeyA" || e.code === "KeyQ") {
    e.preventDefault(); e.stopPropagation();
    selection = (selection - 1 + choixActifs.length) % choixActifs.length; majSelection();
  } else if (e.code === "ArrowRight" || e.code === "KeyD") {
    e.preventDefault(); e.stopPropagation();
    selection = (selection + 1) % choixActifs.length; majSelection();
  } else if (e.code === "Enter" || e.code === "Space") {
    e.preventDefault(); e.stopPropagation();
    choisir(selection);
  } else if (/^Digit[1-9]$/.test(e.code)) {
    const n = Number(e.code.slice(5)) - 1;
    if (n < choixActifs.length) { e.preventDefault(); e.stopPropagation(); choisir(n); }
  } else if (e.code === "Escape") {
    e.preventDefault(); e.stopPropagation(); // avalé : pas de fermeture sans choix
  }
}
