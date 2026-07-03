// LA FORGE — espace plein écran du crafting. Ouverte en parlant au forgeron (Ferran).
//
// Table de craft 5×5 « façon Minecraft » : on prend une ressource dans la palette
// (les ressources du sac) puis on la POSE sur les cases pour dessiner un motif.
// Quand le motif correspond à une recette (cf. systems/craft.js), l'objet créé
// s'affiche à droite. « Forger » consomme les ingrédients et crée l'objet.
//
// NOTE (premier jet) : « Forger » fabrique directement en qualité NORMALE. Le
// mini-jeu de forge (jauge + marqueur 3 tailles → qualité, + zones rouges =
// ratage extrême) viendra remplacer cette résolution directe.
//
// API alignée sur le combat : ouvrirForge(inv, surFermer) / fermerForge() / forgeActive().

import { itemDef } from "../data/items.js";
import { trouverRecette, ingredientsPoses } from "../systems/craft.js";
import { compterRessource, retirerRessource, ajouterObjet } from "../systems/inventaire.js";

const TAILLE = 5; // table 5×5

let overlay, boutonFermer, elPalette, elTable, elSortie, elForger;
let actif = false;
let surFermerActif = null;
let inv = null;
let grille = [];          // 5×5 d'ids de ressource (ou null)
let ressourceSel = null;  // id de la ressource « en main » (clic pour poser)
let recetteCourante = null;

export function installerForge() {
  overlay = document.getElementById("forge");
  boutonFermer = document.getElementById("forge-fermer");
  elPalette = document.getElementById("forge-palette");
  elTable = document.getElementById("forge-table");
  elSortie = document.getElementById("forge-sortie");
  elForger = document.getElementById("forge-forger");
  boutonFermer.addEventListener("click", fermerForge);
  elForger.addEventListener("click", forger);
}

export function ouvrirForge(inventaire, surFermer = null) {
  if (actif) return;
  actif = true;
  inv = inventaire;
  surFermerActif = surFermer;
  grille = Array.from({ length: TAILLE }, () => Array(TAILLE).fill(null));
  ressourceSel = null;
  construireTable();
  rafraichir();
  overlay.hidden = false;
  // Capture + stopPropagation : Échap ferme la FORGE (et n'ouvre pas le menu pause).
  window.addEventListener("keydown", surTouche, true);
}

function construireTable() {
  elTable.replaceChildren();
  for (let r = 0; r < TAILLE; r++) {
    for (let c = 0; c < TAILLE; c++) {
      const cell = document.createElement("div");
      cell.className = "forge-case";
      cell.addEventListener("click", () => cliquerCase(r, c));
      elTable.appendChild(cell);
    }
  }
}

// Combien d'exemplaires de `id` sont DÉJÀ posés sur la table.
function posesSurTable(id) {
  let n = 0;
  for (const ligne of grille) for (const cell of ligne) if (cell === id) n++;
  return n;
}

function cliquerCase(r, c) {
  if (grille[r][c]) {
    grille[r][c] = null;                 // case pleine → on retire
  } else if (ressourceSel) {
    // on ne pose que si le sac en a encore (posés < possédés)
    if (posesSurTable(ressourceSel) < compterRessource(inv, ressourceSel)) {
      grille[r][c] = ressourceSel;
    }
  }
  rafraichir();
}

function choisirRessource(id) {
  ressourceSel = ressourceSel === id ? null : id; // re-cliquer désélectionne
  rafraichir();
}

function rafraichir() {
  // 1) PALETTE : les ressources du sac, avec le « restant » (possédé − déjà posé).
  elPalette.replaceChildren();
  const compte = {};
  for (const o of inv.objets) {
    if (itemDef(o.id)?.categorie !== "ressource") continue;
    compte[o.id] = (compte[o.id] ?? 0) + (o.quantite ?? 1);
  }
  for (const id of Object.keys(compte)) {
    const d = itemDef(id);
    const restant = compte[id] - posesSurTable(id);
    const tuile = document.createElement("div");
    tuile.className = "forge-palette-tuile" + (id === ressourceSel ? " sel" : "");
    tuile.innerHTML =
      `<span class="forge-pastille" style="background:${d.icone}"></span>` +
      `<span class="forge-palette-nom"></span>` +
      `<span class="forge-palette-qte">${restant}</span>`;
    tuile.querySelector(".forge-palette-nom").textContent = d.nom;
    tuile.addEventListener("click", () => choisirRessource(id));
    elPalette.appendChild(tuile);
  }

  // 2) TABLE : dessiner les pastilles posées.
  const cases = elTable.children;
  for (let r = 0; r < TAILLE; r++) {
    for (let c = 0; c < TAILLE; c++) {
      const cell = cases[r * TAILLE + c];
      cell.replaceChildren();
      const id = grille[r][c];
      if (id) {
        const p = document.createElement("span");
        p.className = "forge-pastille";
        p.style.background = itemDef(id).icone;
        cell.appendChild(p);
      }
    }
  }

  // 3) RÉSULTAT : recette reconnue → aperçu + bouton actif.
  recetteCourante = trouverRecette(grille);
  elSortie.replaceChildren();
  if (recetteCourante) {
    const d = itemDef(recetteCourante.resultat);
    elSortie.classList.add("pleine");
    const p = document.createElement("span");
    p.className = "forge-pastille";
    p.style.background = d.icone;
    const nom = document.createElement("span");
    nom.className = "forge-sortie-nom";
    nom.textContent = d.nom;
    elSortie.append(p, nom);
    elForger.disabled = false;
  } else {
    elSortie.classList.remove("pleine");
    elSortie.textContent = "?";
    elForger.disabled = true;
  }
}

// PREMIER JET : forge directe en qualité normale (le mini-jeu viendra ici).
function forger() {
  if (!recetteCourante) return;
  const besoin = {};
  for (const id of ingredientsPoses(grille)) besoin[id] = (besoin[id] ?? 0) + 1;
  for (const id of Object.keys(besoin)) retirerRessource(inv, id, besoin[id]);
  ajouterObjet(inv, recetteCourante.resultat, 1);
  grille = Array.from({ length: TAILLE }, () => Array(TAILLE).fill(null));
  ressourceSel = null;
  rafraichir();
}

function surTouche(e) {
  if (e.code === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    fermerForge();
  }
}

export function fermerForge() {
  if (!actif) return;
  actif = false;
  overlay.hidden = true;
  window.removeEventListener("keydown", surTouche, true);
  const cb = surFermerActif;
  surFermerActif = null;
  inv = null;
  if (cb) cb();
}

export function forgeActive() {
  return actif;
}
