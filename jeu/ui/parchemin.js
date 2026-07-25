// L'ÉCRAN PARCHEMIN : on OUVRE un parchemin de craft (« Read ») et on découvre
// une RECETTE (le motif d'ingrédients + le résultat) et un petit texte de LORE.
//
// Le parchemin (cf. data/items.js, catégorie "parchemin") porte :
//   revele : id du RÉSULTAT → on va chercher sa recette dans data/recettes.js
//   lore   : texte d'ambiance
//   illustration : (optionnel) image dessinée du parchemin
//
// Souris OU clavier : [Space]/[Esc] ferment. C'est une fenêtre modale légère,
// posée par-dessus l'inventaire (on y revient en fermant).

import { itemDef, couleurRarete, RARETES } from "../data/items.js";
import { RECETTES } from "../data/recettes.js";
import { t } from "../systems/langue.js";

let overlay, elTitre, elIllu, elGrille, elLegende, elResultat, elLore;
let surFermerActif = null;

export function parcheminActif() { return overlay && !overlay.hidden; }

export function installerParchemin() {
  overlay = document.getElementById("parchemin");
  elTitre = document.getElementById("parch-titre");
  elIllu = document.getElementById("parch-illu");
  elGrille = document.getElementById("parch-grille");
  elLegende = document.getElementById("parch-legende");
  elResultat = document.getElementById("parch-resultat");
  elLore = document.getElementById("parch-lore");
  document.getElementById("parch-fermer").addEventListener("click", fermer);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fermer(); });
}

// Pastille visuelle d'un ingrédient / résultat (image si dispo, sinon couleur).
function pastille(id, taille) {
  const d = itemDef(id);
  if (!d) return "";
  const bord = couleurRarete(id);
  if (d.image) return `<img class="parch-past" style="width:${taille}px;height:${taille}px;border-color:${bord}" src="${d.image}" alt="">`;
  return `<span class="parch-past" style="width:${taille}px;height:${taille}px;background:${d.icone};border-color:${bord}"></span>`;
}

export function ouvrirParchemin(itemId, surFermer = null) {
  if (parcheminActif()) return;
  const it = itemDef(itemId);
  if (!it) return;
  surFermerActif = surFermer;
  const recette = RECETTES.find((r) => r.resultat === it.revele);

  elTitre.textContent = it.nom;

  // Illustration : le dessin du parchemin s'il existe, sinon on la cache.
  if (it.illustration) { elIllu.src = it.illustration; elIllu.hidden = false; }
  else elIllu.hidden = true;

  if (!recette) {
    elGrille.innerHTML = "";
    elLegende.innerHTML = `<em>${t("parch.encrePerdue")}</em>`;
    elResultat.innerHTML = "";
  } else {
    // 1) La GRILLE du motif (forme relative, comme à la forge).
    const forme = recette.forme;
    const cols = Math.max(...forme.map((r) => r.length));
    elGrille.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    let cells = "";
    const compte = {}; // id → nombre (pour la légende)
    for (const ligne of forme) {
      for (let c = 0; c < cols; c++) {
        const car = ligne[c] ?? ".";
        if (car === "." || !recette.legende[car]) {
          cells += `<span class="parch-case parch-case--vide"></span>`;
        } else {
          const id = recette.legende[car];
          compte[id] = (compte[id] ?? 0) + 1;
          cells += `<span class="parch-case">${pastille(id, 26)}</span>`;
        }
      }
    }
    elGrille.innerHTML = cells;

    // 2) La LÉGENDE : « ×3 Iron », « ×2 Wood ».
    elLegende.innerHTML = Object.entries(compte)
      .map(([id, n]) => `<span class="parch-ingr">${pastille(id, 18)} ×${n} ${itemDef(id)?.nom ?? id}</span>`)
      .join("");

    // 3) Le RÉSULTAT.
    const res = itemDef(recette.resultat);
    elResultat.innerHTML =
      `<span class="parch-fleche">➜</span>` +
      `<span class="parch-res-visuel">${pastille(recette.resultat, 44)}</span>` +
      `<span class="parch-res-nom" style="color:${couleurRarete(recette.resultat)}">${res?.nom ?? recette.resultat}` +
      `<small class="parch-res-rar">${RARETES[res?.rarete]?.nom ?? ""}</small></span>`;
  }

  // 4) Le LORE.
  elLore.textContent = it.lore ?? "";

  overlay.hidden = false;
  window.addEventListener("keydown", surTouche, true);
}

function fermer() {
  if (!parcheminActif()) return;
  window.removeEventListener("keydown", surTouche, true);
  overlay.hidden = true;
  const cb = surFermerActif;
  surFermerActif = null;
  if (cb) cb();
}

function surTouche(e) {
  if (e.code === "Escape" || e.code === "Space" || e.code === "Enter") {
    e.preventDefault(); e.stopPropagation();
    fermer();
  }
}
