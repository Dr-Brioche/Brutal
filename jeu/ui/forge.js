// LA FORGE — espace plein écran du crafting. Ouverte en parlant au forgeron (Ferran).
//
// Table de craft 5×5 « façon Minecraft » : on prend une ressource dans la palette
// (les ressources du sac) puis on la POSE sur les cases pour dessiner un motif.
// Quand le motif correspond à une recette (cf. systems/craft.js), l'objet créé
// s'affiche à droite. « Forger » lance le MINI-JEU de forge.
//
// Mini-jeu : une jauge orange, un curseur qui fait des va-et-vient. On frappe
// ([Espace]/clic) quand il est sur le MARQUEUR (3 bandes concentriques) :
//   cœur (or) → Exceptional (+3) · milieu (bleu) → Master (+2) · large (vert) → Artisan (+1)
//   zone orange (hors marqueur) → Normal (0, objet créé quand même)
//   ZONES ROUGES aux extrémités → ratage EXTRÊME : composants perdus, aucun objet.
// Les ingrédients sont TOUJOURS consommés à la frappe (sauf si on annule avec Échap).
//
// API alignée sur le combat : ouvrirForge(inv, surFermer) / fermerForge() / forgeActive().

import { itemDef } from "../data/items.js";
import { QUALITES, forceQualite } from "../data/recettes.js";
import {
  trouverRecette, ingredientsPoses,
  centreMarqueur, outcomeFrappe, QUALITE_PAR_MARQUEUR, MJ, periodeMiniJeu,
} from "../systems/craft.js";
import { compterRessource, retirerRessource, ajouterObjet } from "../systems/inventaire.js";

const TAILLE = 5;         // table 5×5

let overlay, boutonFermer, elPalette, elTable, elSortie, elForger;
let elMiniJeu, elCurseur, elMGrand, elMMoyen, elMPetit, elMJTitre, elMJAide;
let actif = false;
let surFermerActif = null;
let inv = null;
let heros = null;         // pour lire le rang du talent « Master Craftsman »
let grille = [];          // 5×5 d'ids de ressource (ou null)
let ressourceSel = null;  // id de la ressource « en main » (clic pour poser)
let recetteCourante = null;
// État du mini-jeu.
let miniActif = false, mjRaf = 0, mjCentre = 0.5, mjDebut = 0, mjPos = 0, mjPeriode = 1300;

export function installerForge() {
  overlay = document.getElementById("forge");
  boutonFermer = document.getElementById("forge-fermer");
  elPalette = document.getElementById("forge-palette");
  elTable = document.getElementById("forge-table");
  elSortie = document.getElementById("forge-sortie");
  elForger = document.getElementById("forge-forger");
  elMiniJeu = document.getElementById("forge-minijeu");
  elCurseur = document.getElementById("forge-mj-curseur");
  elMGrand = document.getElementById("forge-mj-grand");
  elMMoyen = document.getElementById("forge-mj-moyen");
  elMPetit = document.getElementById("forge-mj-petit");
  elMJTitre = document.getElementById("forge-mj-titre");
  elMJAide = document.getElementById("forge-mj-aide");
  boutonFermer.addEventListener("click", fermerForge);
  elForger.addEventListener("click", forger);
  elMiniJeu.addEventListener("click", () => { if (miniActif) validerFrappe(); });
}

export function ouvrirForge(inventaire, herosRef = null, surFermer = null) {
  if (actif) return;
  actif = true;
  inv = inventaire;
  heros = herosRef;
  surFermerActif = surFermer;
  grille = Array.from({ length: TAILLE }, () => Array(TAILLE).fill(null));
  ressourceSel = null;
  miniActif = false;                 // sécurité : jamais de mini-jeu « collé » d'une session précédente
  cancelAnimationFrame(mjRaf);
  elMiniJeu.hidden = true;
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
  if (miniActif) return;
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

// ----- Mini-jeu de forge ---------------------------------------------------

function forger() {
  if (!recetteCourante || miniActif) return;
  lancerMiniJeu();
}

// Place une bande du marqueur : `left` = centre (%), `width` = 2×demi-largeur (%).
function placerBande(el, centre, demi) {
  el.style.left = centre * 100 + "%";
  el.style.width = demi * 2 * 100 + "%";
}

function lancerMiniJeu() {
  // Vitesse du curseur = selon la RARETÉ de l'objet, ralentie par le talent
  // « Master Craftsman » (rang lu sur le héros).
  const rarete = itemDef(recetteCourante.resultat)?.rarete;
  const rangArtisanat = heros?.talents?.artisanat ?? 0;
  mjPeriode = periodeMiniJeu(rarete, rangArtisanat);
  mjCentre = centreMarqueur(Math.random());
  placerBande(elMGrand, mjCentre, MJ.HG);
  placerBande(elMMoyen, mjCentre, MJ.HM);
  placerBande(elMPetit, mjCentre, MJ.HP);
  elMJTitre.textContent = "Frappe le métal !";
  elMJAide.hidden = false;
  miniActif = true;
  mjDebut = performance.now();
  elMiniJeu.hidden = false;
  mjRaf = requestAnimationFrame(boucleMiniJeu);
}

function boucleMiniJeu() {
  const t = performance.now() - mjDebut;
  const phase = (t % mjPeriode) / mjPeriode;         // 0..1
  mjPos = phase < 0.5 ? phase * 2 : 2 - phase * 2;  // triangle : 0 → 1 → 0
  elCurseur.style.left = mjPos * 100 + "%";
  mjRaf = requestAnimationFrame(boucleMiniJeu);
}

function validerFrappe() {
  if (!miniActif) return;
  miniActif = false;
  cancelAnimationFrame(mjRaf);
  resoudreCraft(outcomeFrappe(mjPos, mjCentre));
}

function resoudreCraft(marqueur) {
  // Les ingrédients sont TOUJOURS consommés à la frappe.
  const besoin = {};
  for (const id of ingredientsPoses(grille)) besoin[id] = (besoin[id] ?? 0) + 1;
  for (const id of Object.keys(besoin)) retirerRessource(inv, id, besoin[id]);

  const qualite = QUALITE_PAR_MARQUEUR[marqueur]; // undefined si "rouge"
  const d = itemDef(recetteCourante.resultat);
  if (qualite) {
    if (ajouterObjet(inv, recetteCourante.resultat, 1, { qualite })) {
      const q = QUALITES[qualite];
      const force = forceQualite(d.rarete, qualite);
      elMJTitre.textContent = `${d.nom} — ${q.nom}${force > 0 ? ` (+${force} Force)` : ""} !`;
    } else {
      // Sac plein : impossible de placer l'objet forgé. On REND les ingrédients
      // (leurs cases viennent d'être libérées, la place ne manquera pas) plutôt
      // que de faire disparaître l'objet dans le vide.
      for (const id of Object.keys(besoin)) ajouterObjet(inv, id, besoin[id]);
      elMJTitre.textContent = "Sac plein ! Fais de la place — rien n'est perdu.";
    }
  } else {
    elMJTitre.textContent = "Raté ! Métal gâché — composants perdus.";
  }
  elMJAide.hidden = true;
  grille = Array.from({ length: TAILLE }, () => Array(TAILLE).fill(null));
  ressourceSel = null;
  // On laisse le message un instant, puis retour à la table.
  setTimeout(() => {
    if (!actif) return;               // forge fermée entre-temps
    elMiniJeu.hidden = true;
    rafraichir();
  }, 1500);
}

function annulerMiniJeu() {
  miniActif = false;
  cancelAnimationFrame(mjRaf);
  elMiniJeu.hidden = true;            // ingrédients gardés, motif intact
}

function surTouche(e) {
  if (e.code === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    if (miniActif) annulerMiniJeu();
    else fermerForge();
    return;
  }
  if (miniActif && (e.code === "Space" || e.code === "Enter")) {
    e.preventDefault();
    e.stopPropagation();
    validerFrappe();
  }
}

export function fermerForge() {
  if (!actif) return;
  actif = false;
  miniActif = false;
  cancelAnimationFrame(mjRaf);
  elMiniJeu.hidden = true;
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
