// LE LIVRE D'ARTISANAT (« Craftsman's Book ») : l'écran qui liste les recettes
// APPRISES (cf. systems/bibliotheque.js), rangées par catégorie, avec leur MOTIF
// visible — pour pouvoir recopier le pattern à la forge sans tout retenir.
//
// Deux usages :
//   • BROWSE (touche L / bouton de la barre) : on feuillette, lecture seule.
//   • PICK (depuis la forge) : on CHOISIT une recette → `surChoix(recette)` (la
//     forge l'affiche alors en petit comme référence à copier).

import { itemDef, couleurRarete, RARETES } from "../data/items.js";
import { recettesParCategorie, compteBibliotheque } from "../systems/bibliotheque.js";

let overlay, elTitre, elCorps, elAide;
let biblioRef = null, surChoixActif = null, surFermerActif = null;
let recettesPlates = [], selCarte = 0; // navigation CLAVIER en mode PICK

export function livreActif() { return overlay && !overlay.hidden; }

export function installerLivre() {
  overlay = document.getElementById("livre");
  elTitre = document.getElementById("livre-titre");
  elCorps = document.getElementById("livre-corps");
  elAide = document.getElementById("livre-aide");
  document.getElementById("livre-fermer").addEventListener("click", fermer);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fermer(); });
}

// Pastille d'un ingrédient / résultat (image si dispo, sinon carré de couleur).
function pastille(id, taille) {
  const d = itemDef(id);
  if (!d) return "";
  const bord = couleurRarete(id);
  if (d.image) return `<img class="livre-past" style="width:${taille}px;height:${taille}px;border-color:${bord}" src="${d.image}" alt="">`;
  return `<span class="livre-past" style="width:${taille}px;height:${taille}px;background:${d.icone};border-color:${bord}"></span>`;
}

// Le MOTIF d'une recette en petite grille + la légende (×3 Iron…).
function motifHtml(recette, taille) {
  const forme = recette.forme;
  const cols = Math.max(...forme.map((r) => r.length));
  const compte = {};
  let cells = "";
  for (const ligne of forme) {
    for (let c = 0; c < cols; c++) {
      const car = ligne[c] ?? ".";
      if (car === "." || !recette.legende[car]) {
        cells += `<span class="livre-case livre-case--vide"></span>`;
      } else {
        const id = recette.legende[car];
        compte[id] = (compte[id] ?? 0) + 1;
        cells += `<span class="livre-case">${pastille(id, taille)}</span>`;
      }
    }
  }
  const grille = `<div class="livre-grille" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>`;
  const legende = Object.entries(compte)
    .map(([id, n]) => `<span class="livre-ingr">${pastille(id, 14)}×${n}</span>`).join("");
  return `<div class="livre-motif">${grille}<div class="livre-legende">${legende}</div></div>`;
}

// Une CARTE de recette (résultat + motif). Cliquable en mode PICK.
function carteHtml(recette) {
  const d = itemDef(recette.resultat);
  const nom = d?.nom ?? recette.resultat;
  const rar = RARETES[d?.rarete]?.nom ?? "";
  return (
    `<div class="livre-carte" data-id="${recette.resultat}">
       <div class="livre-carte-tete">
         ${pastille(recette.resultat, 26)}
         <div class="livre-carte-txt">
           <span class="livre-carte-nom" style="color:${couleurRarete(recette.resultat)}">${nom}</span>
           <small class="livre-carte-rar">${rar}</small>
         </div>
       </div>
       ${motifHtml(recette, 18)}
     </div>`
  );
}

function rendre() {
  const groupes = recettesParCategorie(biblioRef);
  const { connues, total } = compteBibliotheque(biblioRef);
  elTitre.innerHTML = `📖 Craftsman's Book <small class="livre-compte">${connues} / ${total} learned</small>`;

  if (!groupes.length) {
    elCorps.innerHTML =
      `<div class="livre-vide">No recipes learned yet.<br>
       <small>Read a craft scroll, or forge an item by finding its pattern — and it appears here forever.</small></div>`;
    return;
  }
  elCorps.innerHTML = groupes.map((g) =>
    `<div class="livre-section">
       <div class="livre-section-tete">${g.categorie} <small>(${g.recettes.length})</small></div>
       <div class="livre-cartes">${g.recettes.map(carteHtml).join("")}</div>
     </div>`).join("");

  // Liste PLATE (ordre d'affichage) pour la navigation clavier en mode PICK.
  recettesPlates = groupes.flatMap((g) => g.recettes);

  // En mode PICK : cartes cliquables (souris) ET sélectionnables au clavier.
  if (surChoixActif) {
    selCarte = Math.max(0, Math.min(recettesPlates.length - 1, selCarte));
    const cartes = [...elCorps.querySelectorAll(".livre-carte")];
    cartes.forEach((el, i) => {
      el.classList.add("livre-carte--choisir");
      el.classList.toggle("livre-carte--sel", i === selCarte);
      el.addEventListener("click", () => choisir(i));
    });
    cartes[selCarte]?.scrollIntoView({ block: "nearest" });
  }
}

// Valide la Nᵉ carte (souris ou clavier) → référence pour la forge.
function choisir(i) {
  const rec = recettesPlates[i];
  if (!rec) return;
  const cb = surChoixActif;
  fermer();
  cb(rec);
}

// `opts.surChoix` (optionnel) → mode PICK depuis la forge.
export function ouvrirLivre(biblio, opts = {}) {
  if (livreActif()) return;
  biblioRef = biblio;
  surChoixActif = opts.surChoix ?? null;
  surFermerActif = opts.surFermer ?? null;
  selCarte = 0;
  rendre();
  elAide.textContent = surChoixActif
    ? "Click a recipe, or [←→ arrows] + [Enter] to pick · [Esc] cancel"
    : "[L] / [Esc] close";
  overlay.hidden = false;
  window.addEventListener("keydown", surTouche, true);
}

function fermer() {
  if (!livreActif()) return;
  window.removeEventListener("keydown", surTouche, true);
  overlay.hidden = true;
  const cb = surFermerActif;
  surChoixActif = null; surFermerActif = null; biblioRef = null;
  if (cb) cb();
}

const DIRS_LIVRE = { ArrowLeft: -1, KeyA: -1, KeyQ: -1, ArrowUp: -1, KeyW: -1, KeyZ: -1,
                     ArrowRight: 1, KeyD: 1, ArrowDown: 1, KeyS: 1 };
function surTouche(e) {
  if (e.code === "Escape" || e.code === "KeyL") {
    e.preventDefault(); e.stopPropagation();
    fermer();
    return;
  }
  // Mode PICK : flèches pour choisir une carte, Entrée/Espace pour valider.
  if (surChoixActif && recettesPlates.length) {
    if (DIRS_LIVRE[e.code] !== undefined) {
      e.preventDefault(); e.stopPropagation();
      selCarte = (selCarte + DIRS_LIVRE[e.code] + recettesPlates.length) % recettesPlates.length;
      rendre();
    } else if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault(); e.stopPropagation();
      choisir(selCarte);
    }
  }
}
