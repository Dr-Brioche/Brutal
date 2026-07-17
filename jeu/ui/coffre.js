// L'ÉCRAN DU COFFRE DE VILLE : le SAC du héros à gauche, le COFFRE à droite.
// On transfère un objet d'un côté à l'autre :
//   - à la SOURIS : un clic sur un objet l'envoie dans l'autre contenant ;
//   - au CLAVIER : ←↑→↓ déplacent un curseur, Tab change de grille, Entrée/Espace
//     envoie l'objet sous le curseur dans l'autre contenant. Échap ferme.
// (Règle du projet : tout est jouable souris OU clavier.)
//
// La grille et les icônes réutilisent le style de l'inventaire (classes .inv-*).

import { itemDef, couleurRarete } from "../data/items.js";
import { rangsInventaire, colsInventaire, nbSacs, objetSousCase } from "../systems/inventaire.js";
import { transfererObjet, coffreCols, coffreRangs } from "../systems/coffre.js";
import { montrerToast } from "./effets.js";
import { montrerInfobulle, suivreInfobulle, cacherInfobulle } from "./infobulle.js";

const CASE = 34; // même taille de case que l'inventaire (doit matcher le fond CSS)

let actif = false;
export function coffreActif() { return actif; }

export function installerCoffre() {
  const panneau   = document.getElementById("coffre");
  const elSac      = document.getElementById("coffre-sac");
  const elCoffre   = document.getElementById("coffre-grille");
  const elOnglets  = document.getElementById("coffre-onglets");
  const boutonFermer = document.getElementById("coffre-fermer");

  let inv = null, cof = null, surChangement = null, surFermer = null;
  let ongletSac = 0;                 // onglet de sac affiché (0 = principal)
  let focusGrille = "sac";           // "sac" ou "coffre" (navigation clavier)
  let curX = 0, curY = 0;            // curseur clavier
  let curVisible = false;            // le curseur n'apparaît qu'au clavier

  // Une icône d'objet (placeholder coloré OU image de ressource), comme l'inventaire.
  function iconeItem(o) {
    const d = itemDef(o.id);
    const el = document.createElement("div");
    el.className = "inv-item";
    el.style.borderColor = couleurRarete(o.id);
    if (d.image) {
      el.classList.add("inv-item--img");
      el.style.backgroundImage = `url("${d.image}")`;
    } else {
      el.style.background = d.icone;
      const t = document.createElement("span");
      t.textContent = d.nom; t.style.color = couleurRarete(o.id);
      el.append(t);
    }
    el.addEventListener("mouseenter", (e) => montrerInfobulle(o.id, e, o.qualite));
    el.addEventListener("mousemove", suivreInfobulle);
    el.addEventListener("mouseleave", cacherInfobulle);
    return el;
  }

  // Dimensions logiques de chaque grille.
  const dimsSac    = () => ({ cols: colsInventaire(inv, ongletSac), rangs: rangsInventaire(inv, ongletSac) });
  const dimsCoffre = () => ({ cols: coffreCols(), rangs: coffreRangs() });

  // Envoie un objet vers l'AUTRE contenant (auto-placé). `depuis` = "sac" | "coffre".
  function envoyer(objet, depuis) {
    const ok = depuis === "sac"
      ? transfererObjet(inv, cof, objet)
      : transfererObjet(cof, inv, objet);
    if (!ok) { montrerToast(depuis === "sac" ? "📦 Chest is full." : "🎒 Bag is full."); return; }
    cacherInfobulle();
    if (surChangement) surChangement();
    rendre();
  }

  // Construit une grille (sac ou coffre) : items positionnés en absolu + curseur.
  function rendreGrille(el, invLike, tab, cols, rangs, depuis) {
    el.replaceChildren();
    el.style.width  = cols  * CASE + "px";
    el.style.height = rangs * CASE + "px";
    for (const o of invLike.objets) {
      if ((o.sac ?? 0) !== tab) continue;
      const d = itemDef(o.id);
      const ic = iconeItem(o);
      ic.style.position = "absolute";
      ic.style.left = o.x * CASE + 1 + "px";
      ic.style.top  = o.y * CASE + 1 + "px";
      ic.style.width  = d.taille.l * CASE - 4 + "px";
      ic.style.height = d.taille.h * CASE - 4 + "px";
      if ((o.quantite ?? 1) > 1) {
        const q = document.createElement("span");
        q.className = "inv-item-qte"; q.textContent = o.quantite; ic.append(q);
      }
      ic.title = "Click to move";
      ic.addEventListener("click", () => envoyer(o, depuis));
      el.append(ic);
    }
    // Curseur clavier (rouge) sur la grille qui a le focus.
    if (curVisible && focusGrille === depuis) {
      const cur = document.createElement("div");
      cur.className = "inv-curseur";
      cur.style.left = curX * CASE + "px";
      cur.style.top  = curY * CASE + "px";
      cur.style.width = CASE + "px"; cur.style.height = CASE + "px";
      el.append(cur);
    }
  }

  // Onglets de sac (seulement si un 2e sac est équipé).
  function rendreOnglets() {
    elOnglets.replaceChildren();
    const n = nbSacs(inv);
    elOnglets.style.display = n > 1 ? "flex" : "none";
    if (n <= 1) return;
    for (let t = 0; t < n; t++) {
      const b = document.createElement("button");
      b.className = "inv-onglet" + (t === ongletSac ? " inv-onglet--actif" : "");
      b.textContent = t === 0 ? "Bag" : "Bag 2";
      b.addEventListener("click", () => { ongletSac = t; clamperCurseur(); rendre(); });
      elOnglets.append(b);
    }
  }

  function clamperCurseur() {
    const d = focusGrille === "sac" ? dimsSac() : dimsCoffre();
    curX = Math.max(0, Math.min(d.cols - 1, curX));
    curY = Math.max(0, Math.min(d.rangs - 1, curY));
  }

  function rendre() {
    rendreOnglets();
    const ds = dimsSac(), dc = dimsCoffre();
    rendreGrille(elSac, inv, ongletSac, ds.cols, ds.rangs, "sac");
    rendreGrille(elCoffre, cof, 0, dc.cols, dc.rangs, "coffre");
  }

  function surClavier(e) {
    if (!actif) return;
    const k = e.code;
    if (k === "Escape") { e.preventDefault(); fermer(); return; }
    if (k === "Tab") {
      e.preventDefault();
      focusGrille = focusGrille === "sac" ? "coffre" : "sac";
      curVisible = true; clamperCurseur(); rendre(); return;
    }
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(k)) {
      e.preventDefault(); curVisible = true;
      if (k === "ArrowLeft")  curX--;
      if (k === "ArrowRight") curX++;
      if (k === "ArrowUp")    curY--;
      if (k === "ArrowDown")  curY++;
      clamperCurseur(); rendre(); return;
    }
    if (k === "Enter" || k === "Space") {
      e.preventDefault(); curVisible = true;
      const src = focusGrille === "sac" ? inv : cof;
      const tab = focusGrille === "sac" ? ongletSac : 0;
      const o = objetSousCase(src, curX, curY, tab);
      if (o) envoyer(o, focusGrille);
      return;
    }
  }

  function ouvrir({ inventaire, coffre, surChangement: sc, surFermer: sf }) {
    inv = inventaire; cof = coffre; surChangement = sc; surFermer = sf;
    ongletSac = 0; focusGrille = "sac"; curX = 0; curY = 0; curVisible = false;
    panneau.hidden = false;
    actif = true;
    rendre();
    window.addEventListener("keydown", surClavier, true);
    boutonFermer.focus();
  }

  function fermer() {
    if (!actif) return;
    actif = false;
    panneau.hidden = true;
    cacherInfobulle();
    window.removeEventListener("keydown", surClavier, true);
    if (surFermer) surFermer();
  }

  boutonFermer.addEventListener("click", fermer);

  return { ouvrir, fermer, actif: () => actif };
}
