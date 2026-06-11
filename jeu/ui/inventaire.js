// La fenêtre d'inventaire (touche B) : en haut la « poupée » d'équipement (ce
// qu'on porte), en bas le sac (grille de cases façon Diablo, items à empreinte).
//
// 1er jet : icônes placeholder (carré coloré + bordure de rareté), au clic :
//   - clic sur un item du sac  → on l'équipe sur son slot ;
//   - clic sur un slot équipé  → on le remet dans le sac.
// (Le glisser-déposer et le clavier viendront ensuite.)

import { itemDef, couleurRarete } from "../data/items.js";
import { rangsInventaire, equiper, desequiper } from "../systems/inventaire.js";

const CASE = 34; // taille d'une case en px (doit matcher le fond CSS de la grille)

// Disposition de la poupée d'équipement (ordre d'affichage + libellé).
const POUPEE = [
  { slot: "arme1", nom: "Main hand" },
  { slot: "arme2", nom: "Off hand" },
  { slot: "armure", nom: "Armor" },
  { slot: "gant", nom: "Gloves" },
  { slot: "botte", nom: "Boots" },
  { slot: "collier", nom: "Necklace" },
  { slot: "bague1", nom: "Ring 1" },
  { slot: "bague2", nom: "Ring 2" },
  { slot: "bague3", nom: "Ring 3" },
  { slot: "bague4", nom: "Ring 4" },
  { slot: "bague5", nom: "Ring 5" },
  { slot: "sac", nom: "Backpack" },
];

export function installerInventaire({ inventaire, surChangement, surFermer }) {
  const overlay = document.getElementById("inventaire");
  const grille = document.getElementById("inv-grille");
  const poupee = document.getElementById("inv-poupee");
  const elOr = document.getElementById("inv-or");
  document.getElementById("inv-fermer").onclick = () => surFermer();

  // Une icône d'item (carré coloré + bordure de rareté + nom).
  function iconeItem(id) {
    const d = itemDef(id);
    const el = document.createElement("div");
    el.className = "inv-item";
    el.style.background = d.icone;
    el.style.borderColor = couleurRarete(id);
    el.title = d.nom;
    const t = document.createElement("span");
    t.textContent = d.nom;
    el.append(t);
    return el;
  }

  function rendrePoupee() {
    poupee.replaceChildren();
    for (const { slot, nom } of POUPEE) {
      const cell = document.createElement("div");
      cell.className = "inv-slot";
      const id = inventaire.slots[slot];
      if (id) {
        const ic = iconeItem(id);
        ic.onclick = () => { if (desequiper(inventaire, slot)) { surChangement(); rendre(); } };
        cell.append(ic);
      } else {
        cell.classList.add("vide");
        cell.textContent = nom;
      }
      poupee.append(cell);
    }
  }

  function rendreGrille() {
    grille.replaceChildren();
    const rangs = rangsInventaire(inventaire);
    grille.style.width = inventaire.cols * CASE + "px";
    grille.style.height = rangs * CASE + "px";
    for (const o of inventaire.objets) {
      const d = itemDef(o.id);
      const ic = iconeItem(o.id);
      ic.style.position = "absolute";
      ic.style.left = o.x * CASE + 1 + "px";
      ic.style.top = o.y * CASE + 1 + "px";
      ic.style.width = d.taille.l * CASE - 4 + "px";
      ic.style.height = d.taille.h * CASE - 4 + "px";
      ic.onclick = () => { if (equiper(inventaire, o)) { surChangement(); rendre(); } };
      grille.append(ic);
    }
  }

  function rendre() {
    elOr.textContent = inventaire.or;
    rendrePoupee();
    rendreGrille();
  }

  return {
    ouvrir() { rendre(); overlay.hidden = false; },
    fermer() { overlay.hidden = true; },
    rendre,
  };
}
