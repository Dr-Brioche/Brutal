// Système de dialogue : un panneau avec du texte, puis des choix. Navigable au
// clavier — Z/S (ou flèches haut/bas) pour choisir, Espace pour valider.
//
//   ouvrirDialogue({ nom, texte: ["page 1", "page 2"], choix: [{ texte, action }] },
//                   surFin)
//   - texte : pages affichées l'une après l'autre (Espace pour avancer)
//   - choix : proposés après la dernière page ; l'`action` du choix retenu est
//             exécutée, puis `surFin` est appelé (ex. pour reprendre le jeu).
//             Un choix peut porter `itemId` : au survol, on montre la bulle de
//             l'objet (effets + visuel des cartes) — utilisé par le marchand.
//   - surEchap : (optionnel) appelé sur Échap AVANT la fermeture. Sert aux
//                sous-menus (marchand) à préparer un RETOUR au menu parent plutôt
//                que de tout fermer. Sans lui, Échap ferme le dialogue (défaut).

import { montrerInfobulle, suivreInfobulle, cacherInfobulle, montrerInfobulleEl } from "./infobulle.js";
import { itemDef, couleurRarete } from "../data/items.js";
import { confirmationActive } from "./confirmation.js";

// Touches captées par le dialogue (bloquées pour le reste du jeu pendant qu'il
// est ouvert : pas de menu pause, pas de déplacement parasite).
const TOUCHES = new Set([
  "Space", "Enter", "KeyW", "KeyS", "KeyA", "KeyD", "KeyE",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape",
]);

let actif = false;
let rafraichirActif = null; // (nouveauxChoix) => void : met à jour le dialogue en cours
let fermerActif = null;     // () => void : ferme le dialogue courant + déclenche surFin
export function dialogueActif() { return actif; }
export function fermerDialogue() { if (fermerActif) fermerActif(); }

// Met à jour les CHOIX du dialogue courant à chaud (ex. l'inventaire a changé
// pendant le menu de vente). Sans effet si aucun dialogue n'est ouvert.
export function rafraichirChoix(nouveauxChoix) {
  rafraichirActif?.(nouveauxChoix);
}

export function ouvrirDialogue(dialogue, surFin) {
  if (actif) return;
  actif = true;

  const overlay = document.getElementById("dialogue");
  const elNom = document.getElementById("dialogue-nom");
  const elTexte = document.getElementById("dialogue-texte");
  const elChoix = document.getElementById("dialogue-choix");
  const elAide = document.getElementById("dialogue-aide");

  const pages = dialogue.texte ?? [];
  let choix = dialogue.choix ?? []; // peut être remplacé à chaud (rafraichirChoix)
  let page = 0;
  let enChoix = pages.length === 0;
  let sel = Math.max(0, Math.min(dialogue.selInitial ?? 0, Math.max(0, choix.length - 1)));
  // Options marquées `confirmClic` (ex. ACHAT chez le marchand) : un 1er clic
  // SÉLECTIONNE seulement (aperçu) ; il faut un 2e clic sur la MÊME ligne pour
  // valider — évite d'acheter par mégarde en un clic. `clicEnAttente` = l'index
  // en attente de confirmation (-1 = aucun). La navigation clavier le remet à zéro.
  let clicEnAttente = -1;
  // Si la position initiale tombe sur un séparateur, avancer jusqu'au premier item.
  while (sel < choix.length - 1 && choix[sel]?.separateur) sel++;

  elNom.textContent = dialogue.nom ?? "";

  function rendre() {
    elTexte.textContent = pages.length ? pages[Math.min(page, pages.length - 1)] : "";
    elChoix.replaceChildren();
    if (!enChoix) {
      elAide.textContent = "Click or [Space] to continue";
      cacherInfobulle();
      return;
    }
    choix.forEach((c, i) => {
      if (c.separateur) {
        const el = document.createElement("div");
        el.className = "dialogue-separateur";
        el.textContent = c.texte;
        elChoix.append(el);
        return;
      }
      const el = document.createElement("div");
      const enAttente = c.confirmClic && clicEnAttente === i;
      el.className = "dialogue-option" + (i === sel ? " sel" : "") + (enAttente ? " dialogue-option--attente" : "");
      const fleche = i === sel ? "▶ " : "   ";
      const d = c.itemId ? itemDef(c.itemId) : null;
      if (d) {
        // Item : on montre son VISUEL (vraie image si elle existe un jour, sinon
        // la pastille colorée placeholder) + son nom, et sa bulle au survol.
        el.classList.add("dialogue-option--item");
        const marque = document.createElement("span");
        marque.textContent = fleche;
        const ic = document.createElement(d.image ? "img" : "span");
        ic.className = "dialogue-icone";
        if (d.image) { ic.src = d.image; ic.style.backgroundColor = "#e6d9bd"; ic.style.objectFit = "contain"; ic.style.imageRendering = "auto"; }
        else { ic.style.background = d.icone; ic.style.borderColor = couleurRarete(c.itemId); }
        const txt = document.createElement("span");
        txt.textContent = c.texte;
        txt.style.color = couleurRarete(c.itemId);
        el.append(marque, ic, txt);
        el.addEventListener("mouseenter", (e) => montrerInfobulle(c.itemId, e));
        el.addEventListener("mousemove", suivreInfobulle);
        el.addEventListener("mouseleave", cacherInfobulle);
      } else {
        el.textContent = fleche + c.texte;
      }
      el.addEventListener("click", () => {
        if (c.confirmClic) {
          // 1er clic : on sélectionne (aperçu). 2e clic sur la même ligne : on valide.
          if (clicEnAttente === i) { choisir(i); return; }
          sel = i; clicEnAttente = i; rendre();
        } else {
          choisir(i);
        }
      });
      // CLIC DROIT : action SECONDAIRE (ex. « acheter & équiper »). Directe (le clic
      // droit est délibéré : pas de double-clic de confirmation). On ne montre le menu
      // contextuel du navigateur dans aucun cas (preventDefault systématique en boutique).
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (c.actionSecondaire) choisir(i, c.actionSecondaire);
      });
      elChoix.append(el);
    });
    const enAttenteGlobal = clicEnAttente >= 0 && choix[clicEnAttente] && !choix[clicEnAttente].separateur;
    const aide = !choix.length
      ? "[Space] close"
      : enAttenteGlobal
        ? "Click again to buy · [Z/S] choose"
        : "[Z/S] choose · [Space] confirm";
    // Info-bulle du bas : ajoute « acheter & équiper » quand le choix sélectionné le propose.
    const equipHint = choix[sel]?.actionSecondaire ? " · [Right-click / E] buy & equip" : "";
    elAide.textContent = (dialogue.surEchap ? `${aide} · [Esc] back` : aide) + equipHint;
    majApercu(); // bulle du choix sélectionné (navigation clavier)
  }

  // Montre la bulle de l'objet du choix sélectionné, à côté de la ligne (clavier).
  // Et s'assure que l'option est visible dans la zone scrollable.
  function majApercu() {
    const c = choix[sel];
    const el = elChoix.children[sel];
    if (el) el.scrollIntoView({ block: "nearest" });
    if (enChoix && c && c.itemId && el) montrerInfobulleEl(c.itemId, el);
    else cacherInfobulle();
  }

  // Clic sur le panneau → avancer le texte (aucun effet en mode choix,
  // où les options ont déjà leurs propres listeners).
  function surClicDialogue() { if (!enChoix) avancer(); }

  function fermerUI() {
    actif = false;
    rafraichirActif = null;
    fermerActif = null;
    window.removeEventListener("keydown", surTouche, true);
    overlay.removeEventListener("click", surClicDialogue);
    cacherInfobulle();
    overlay.hidden = true;
  }

  // Remplace la liste de choix sans rouvrir le dialogue (clampe la sélection).
  fermerActif = () => { fermerUI(); if (surFin) surFin(); };
  rafraichirActif = (nouveaux) => {
    choix = nouveaux ?? [];
    if (sel >= choix.length) sel = Math.max(0, choix.length - 1);
    if (enChoix) rendre();
  };

  // Valide le choix `i` : on ferme, on exécute son action, puis surFin. `action`
  // peut être forcée (ex. `actionSecondaire` = « acheter & équiper » au clic droit).
  function choisir(i, action = choix[i]?.action) {
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

  // Navigation qui saute les séparateurs (non cliquables).
  function deplacer(dir) {
    clicEnAttente = -1; // changer de ligne au clavier annule un achat en attente
    const n = Math.max(1, choix.length);
    let next = sel;
    do { next = (next + dir + n) % n; } while (choix[next]?.separateur && next !== sel);
    sel = next;
  }

  function surTouche(e) {
    if (confirmationActive()) return; // une confirmation modale est ouverte par-dessus : on lui cède le clavier
    if (!TOUCHES.has(e.code)) return; // on laisse passer le reste
    // En boutique, quand l'INVENTAIRE a le focus clavier (Tab), c'est LUI qui gère
    // la navigation et la prise d'objet : le menu marchand ne doit pas bouger/valider
    // en même temps. On lui cède donc toutes les touches SAUF Échap (qui reste le
    // moyen de quitter la boutique). Sans ça, un ↑/↓ déplaçait les DEUX à la fois.
    if (e.code !== "Escape" && document.querySelector(".inv-panneau.inv-panneau--focus")) return;
    e.preventDefault();
    e.stopPropagation();              // bloque menu pause / déplacement pendant le dialogue
    if (e.code === "Escape") {
      // Échap : si le dialogue propose un RETOUR (sous-menu marchand), on le
      // prépare AVANT la fermeture → surFin rouvre le menu parent au lieu de tout
      // fermer. Sans surEchap, on sort normalement (comportement par défaut).
      if (dialogue.surEchap) dialogue.surEchap();
      fermerUI();
      if (surFin) surFin();
    }
    else if (e.code === "Space" || e.code === "Enter") avancer();
    else if (enChoix && (e.code === "KeyW" || e.code === "ArrowUp")) { deplacer(-1); rendre(); }
    else if (enChoix && (e.code === "KeyS" || e.code === "ArrowDown")) { deplacer(1); rendre(); }
    // [E] : action SECONDAIRE du choix sélectionné (ex. « acheter & équiper »), équivalent
    // clavier du clic droit. Sans effet si le choix n'en propose pas.
    else if (enChoix && e.code === "KeyE" && choix[sel]?.actionSecondaire) choisir(sel, choix[sel].actionSecondaire);
    // Q/D… : simplement bloqués (aucune action)
  }

  window.addEventListener("keydown", surTouche, true); // phase capture : on passe avant le reste
  overlay.addEventListener("click", surClicDialogue);
  overlay.hidden = false;
  rendre();
}
