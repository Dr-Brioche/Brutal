// La fiche de personnage / inventaire (touche B), disposée verticalement :
//   - au centre : le HÉROS avec son stuff (sprite), ses deux slots d'arme dessous,
//     puis ses STATS ;
//   - sur les côtés : les slots d'équipement (armure/cou/mains/pieds/sac à gauche,
//     5 bagues à droite) ;
//   - tout en bas : le SAC (grille de cases façon Diablo, items à empreinte).
//
// Manipulation « prendre / poser » (souris ET clavier) :
//   - on CLIQUE un objet du sac → il se SOULÈVE (suit le curseur) ;
//   - on reclique sur une case du sac → il s'y POSE (réorganisation libre) ;
//   - on reclique sur un slot d'équipement → il s'ÉQUIPE ;
//   - clic droit (ou touche X) → menu Equip / Discard direct.
// Au clavier : flèches/WASD pour bouger le curseur, Entrée pour soulever/poser,
// X pour le menu Equip/Discard, Échap pour reposer l'objet tenu.

import { itemDef, couleurRarete } from "../data/items.js";
import {
  rangsInventaire, equiper, desequiper, arme2Bloquee,
  objetSousCase, peutPlacerA, deplacerObjet,
} from "../systems/inventaire.js";
import { dialogueActif } from "./dialogue.js";
import { bonusTalents } from "../systems/talents.js";
import { montrerInfobulle, suivreInfobulle, cacherInfobulle } from "./infobulle.js";
import { confirmationActive } from "./confirmation.js";
import { dessinerCaseEchelle } from "../core/sprites.js";
import { afficherMessage, montrerToast } from "./effets.js";

const CASE = 34;            // taille d'une case du sac (doit matcher le fond CSS)
const ECHELLE_HERO = 2;     // 64×64 → 128 dans la fiche

const COL_GAUCHE = ["armure", "collier", "gant", "botte", "sac"];
const COL_DROITE = ["bague1", "bague2", "bague3", "bague4", "bague5"];
const SLOTS_ARME = ["arme1", "arme2"];
const LABELS = {
  arme1: "Main", arme2: "Off", armure: "Body", gant: "Hands", botte: "Feet",
  collier: "Neck", sac: "Bag", bague1: "Ring", bague2: "Ring", bague3: "Ring",
  bague4: "Ring", bague5: "Ring",
};
// Label dynamique pour arme2 selon le talent Ambidextrie
function labelArme2(heros) {
  return (heros?.talents?.ambidextrie ?? 0) > 0 ? "Off-hand" : "Off";
}

// Stats de base de la Chaleur de Forge (cf. systems/combat.js)
const FORGE_SEUIL = 3, FORGE_MAX = 8, BASE_PIOCHE = 3; // bases (matchent systems/combat.js)

function essayerEquiper(inventaire, heros, objet, surChangement, rendre) {
  const res = equiper(inventaire, objet, heros);
  if (res === true) { surChangement(); rendre(); return; }
  if (res === "plein") {
    montrerToast("🎒 Bag is full — make some room before swapping gear.");
    return;
  }
  if (arme2Bloquee(inventaire) && itemDef(objet.id).categorie === "bouclier") {
    afficherMessage("⚠ Your two-handed weapon occupies both hands — unequip it first.");
  }
}

export function installerInventaire({ inventaire, heros, surChangement, surFermer, surJeter }) {
  const overlay = document.getElementById("inventaire");
  const elGauche = document.getElementById("inv-gauche");
  const elDroite = document.getElementById("inv-droite");
  const elArmes = document.getElementById("inv-armes");
  const elStats = document.getElementById("inv-stats");
  const elGrille = document.getElementById("inv-grille");
  const elOr = document.getElementById("inv-or");
  const elPv = document.getElementById("inv-pv");
  const elMenu = document.getElementById("inv-menu");
  const canvasHero = document.getElementById("inv-hero");
  const elAide = overlay.querySelector(".inv-aide");
  document.getElementById("inv-fermer").onclick = () => surFermer();

  // L'objet SOULEVÉ (en main), ou null. offX/offY = la sous-case saisie, pour
  // que l'objet retombe sous le curseur comme on l'a pris. cible = case de pose.
  let tenu = null; // { objet, offX, offY, ghost }
  let cibleX = 0, cibleY = 0, refCible = null;

  // Navigation clavier : un curseur (carré) se promène dans la grille.
  let cursorX = 0, cursorY = 0, cursorVisible = false, kbFocus = false;

  // ---- Prendre / poser ------------------------------------------------------

  function caseDepuisClient(cx, cy) {
    const r = elGrille.getBoundingClientRect();
    return { x: Math.floor((cx - r.left) / CASE), y: Math.floor((cy - r.top) / CASE) };
  }

  // Coin haut-gauche de pose, clampé à la grille (à partir d'une case d'ancrage).
  function calculerCible(ancreX, ancreY) {
    const d = itemDef(tenu.objet.id);
    const rangs = rangsInventaire(inventaire);
    return {
      x: Math.max(0, Math.min(inventaire.cols - d.taille.l, ancreX - tenu.offX)),
      y: Math.max(0, Math.min(rangs - d.taille.h, ancreY - tenu.offY)),
    };
  }

  function creerGhost(objet) {
    const d = itemDef(objet.id);
    const g = document.createElement("div");
    g.className = "inv-item inv-ghost";
    g.style.background = d.icone;
    g.style.borderColor = couleurRarete(objet.id);
    g.style.width = d.taille.l * CASE - 4 + "px";
    g.style.height = d.taille.h * CASE - 4 + "px";
    const t = document.createElement("span");
    t.textContent = d.nom;
    g.append(t);
    document.body.append(g);
    return g;
  }

  function ghostVersSouris(cx, cy) {
    if (!tenu) return;
    tenu.ghost.style.left = cx - tenu.ghost.offsetWidth / 2 + "px";
    tenu.ghost.style.top = cy - tenu.ghost.offsetHeight / 2 + "px";
  }
  function ghostVersCase(x, y) {
    if (!tenu) return;
    const r = elGrille.getBoundingClientRect();
    tenu.ghost.style.left = r.left + x * CASE + 1 + "px";
    tenu.ghost.style.top = r.top + y * CASE + 1 + "px";
  }

  // Met à jour (sans tout redessiner) le rectangle d'aperçu de pose : vert si ça
  // tient à (cibleX, cibleY), rouge sinon.
  function majApercuCible() {
    if (!tenu || !refCible) return;
    const d = itemDef(tenu.objet.id);
    refCible.style.left = cibleX * CASE + "px";
    refCible.style.top = cibleY * CASE + "px";
    refCible.style.width = d.taille.l * CASE + "px";
    refCible.style.height = d.taille.h * CASE + "px";
    const ok = peutPlacerA(inventaire, tenu.objet, cibleX, cibleY);
    refCible.classList.toggle("inv-cible--ok", ok);
    refCible.classList.toggle("inv-cible--non", !ok);
  }

  function soulever(objet, offX, offY) {
    cacherInfobulle();
    fermerContexte();
    tenu = { objet, offX, offY, ghost: creerGhost(objet) };
    const c = calculerCible(objet.x + offX, objet.y + offY);
    cibleX = c.x; cibleY = c.y;
    window.addEventListener("pointermove", surSourisDeplace, true);
    rendre();
  }

  function lacher() {
    if (!tenu) return;
    tenu.ghost.remove();
    tenu = null;
    refCible = null;
    window.removeEventListener("pointermove", surSourisDeplace, true);
  }

  function annulerTenu() { lacher(); rendre(); }

  function poserA(x, y) {
    if (!tenu) return;
    if (deplacerObjet(inventaire, tenu.objet, x, y)) { lacher(); rendre(); }
    // Place occupée : on garde l'objet en main (le joueur retente ailleurs).
  }

  function equiperTenu() {
    if (!tenu) return;
    const o = tenu.objet;
    lacher();
    essayerEquiper(inventaire, heros, o, surChangement, rendre);
    rendre();
  }

  // Suivi du ghost à la souris (tant qu'un objet est tenu).
  function surSourisDeplace(ev) {
    if (!tenu) return;
    ghostVersSouris(ev.clientX, ev.clientY);
    const r = elGrille.getBoundingClientRect();
    const surGrille = ev.clientX >= r.left && ev.clientX <= r.right &&
                      ev.clientY >= r.top && ev.clientY <= r.bottom;
    if (surGrille) {
      const c = caseDepuisClient(ev.clientX, ev.clientY);
      const cible = calculerCible(c.x, c.y);
      cibleX = cible.x; cibleY = cible.y;
      if (refCible) refCible.hidden = false;
      majApercuCible();
    } else if (refCible) {
      refCible.hidden = true; // hors grille : pas d'aperçu de pose
    }
  }

  // Clic dans la grille : pose l'objet tenu, ou soulève celui qui est dessous.
  elGrille.addEventListener("click", (ev) => {
    if (confirmationActive()) return;
    const c = caseDepuisClient(ev.clientX, ev.clientY);
    if (tenu) {
      const cible = calculerCible(c.x, c.y);
      poserA(cible.x, cible.y);
    } else {
      const o = objetSousCase(inventaire, c.x, c.y);
      if (o) { soulever(o, c.x - o.x, c.y - o.y); ghostVersSouris(ev.clientX, ev.clientY); }
    }
  });

  // Clic sur le FOND NOIR (en dehors du panneau) pendant qu'on tient un objet :
  // on le repose. On teste `ev.target === overlay` (le clic a atterri sur le
  // fond lui-même) et non `closest(".inv-panneau")` : car soulever() redessine
  // la grille, ce qui DÉTACHE l'icône cliquée du DOM — `closest` renverrait alors
  // null et reposerait l'objet aussitôt soulevé (le bug du déplacement souris).
  overlay.addEventListener("click", (ev) => {
    if (tenu && ev.target === overlay) annulerTenu();
  });

  // Clic droit = menu Equip/Discard. Pendant qu'on tient un objet, il repose.
  window.addEventListener("contextmenu", (ev) => {
    if (!overlay.hidden && tenu) { ev.preventDefault(); annulerTenu(); }
  });

  // ---- Menu contextuel (clic droit / touche X) ------------------------------
  let menuSel = 0;
  function fermerContexte() { elMenu.hidden = true; elMenu.replaceChildren(); }
  function surlignerMenu() {
    [...elMenu.children].forEach((b, i) => b.classList.toggle("inv-menu-btn--sel", i === menuSel));
  }
  function ouvrirContexte(x, y, actions) {
    cacherInfobulle();
    menuSel = 0;
    elMenu.replaceChildren(...actions.map((a, i) => {
      const b = document.createElement("button");
      b.className = "inv-menu-btn" + (a.danger ? " inv-menu-danger" : "");
      b.textContent = a.label;
      b.addEventListener("click", () => { fermerContexte(); a.fn(); });
      b.addEventListener("mouseenter", () => { menuSel = i; surlignerMenu(); });
      return b;
    }));
    elMenu.hidden = false;
    const r = elMenu.getBoundingClientRect(); // clampé à l'écran
    elMenu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + "px";
    elMenu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px";
    surlignerMenu();
  }
  // Actions Equip/Discard pour un objet du SAC.
  function menuSac(o) {
    return [
      { label: "Equip", fn: () => essayerEquiper(inventaire, heros, o, surChangement, rendre) },
      { label: "Discard", danger: true, fn: () => surJeter && surJeter({ objet: o }) },
    ];
  }
  // Ouvre le menu à la position ÉCRAN d'une case (pour la touche X au clavier).
  function ouvrirContexteCase(x, y, actions) {
    const r = elGrille.getBoundingClientRect();
    ouvrirContexte(r.left + (x + 0.5) * CASE, r.top + (y + 0.5) * CASE, actions);
  }
  // Fermer le menu : clic ailleurs, molette.
  window.addEventListener("pointerdown", (e) => {
    if (!elMenu.hidden && !elMenu.contains(e.target)) fermerContexte();
  }, true);
  window.addEventListener("wheel", () => { if (!elMenu.hidden) fermerContexte(); });

  // Interaction souris dans l'inventaire → passer en mode souris (masquer curseur clavier).
  // Le mode clavier revient dès qu'une touche directionnelle est pressée.
  overlay.addEventListener("pointerdown", () => { cursorVisible = false; });

  // ---- Clavier --------------------------------------------------------------

  function surClavier(e) {
    if (overlay.hidden || confirmationActive()) return;

    // Menu contextuel ouvert : on navigue DEDANS (et on avale les touches).
    if (!elMenu.hidden) {
      const n = elMenu.children.length;
      if (["ArrowUp", "KeyW", "KeyZ"].includes(e.code)) { menuSel = (menuSel - 1 + n) % n; surlignerMenu(); }
      else if (["ArrowDown", "KeyS"].includes(e.code)) { menuSel = (menuSel + 1) % n; surlignerMenu(); }
      else if (e.code === "Enter" || e.code === "Space") { elMenu.children[menuSel]?.click(); }
      else if (e.code === "Escape") { fermerContexte(); }
      else return;
      e.preventDefault(); e.stopImmediatePropagation();
      return;
    }

    // Échap pendant qu'on tient un objet : on le repose (sans fermer l'inventaire).
    if (e.code === "Escape" && tenu) {
      e.preventDefault(); e.stopImmediatePropagation();
      annulerTenu();
      return;
    }

    const enBoutique = dialogueActif();
    const enButin = !enBoutique && document.body.classList.contains("en-butin");

    // Tab en mode butin : masque le carré rouge puis laisse le Tab natif basculer
    // le focus sur le panneau butin. Le curseur reparaît à la prochaine flèche.
    if (e.code === "Tab" && enButin) {
      cursorVisible = false;
      rendre();
      return; // pas de preventDefault : le Tab natif reprend la main
    }

    // Tab : bascule le focus clavier entre dialogue et grille (boutique seulement).
    if (e.code === "Tab" && enBoutique) {
      e.preventDefault(); e.stopImmediatePropagation();
      kbFocus = !kbFocus;
      cursorVisible = kbFocus;
      overlay.querySelector(".inv-panneau").classList.toggle("inv-panneau--focus", kbFocus);
      rendre();
      majAide();
      return;
    }

    if (!kbFocus) return;

    // Déplacement du curseur case par case (WASD + ZQSD + flèches).
    const ddx = { ArrowLeft: -1, ArrowRight: 1, KeyA: -1, KeyD: 1, KeyQ: -1 };
    const ddy = { ArrowUp: -1, ArrowDown: 1, KeyW: -1, KeyS: 1, KeyZ: -1 };
    if (e.code in ddx || e.code in ddy) {
      e.preventDefault();
      if (enBoutique) e.stopImmediatePropagation();
      const rangs = rangsInventaire(inventaire);
      cursorX = Math.max(0, Math.min(inventaire.cols - 1, cursorX + (ddx[e.code] || 0)));
      cursorY = Math.max(0, Math.min(rangs - 1, cursorY + (ddy[e.code] || 0)));
      cursorVisible = true;
      if (tenu) { const c = calculerCible(cursorX, cursorY); cibleX = c.x; cibleY = c.y; }
      rendre();
      if (tenu) ghostVersCase(cibleX, cibleY);
      return;
    }

    // Entrée / Espace : soulever l'objet sous le curseur, ou poser celui en main.
    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      if (enBoutique) e.stopImmediatePropagation();
      if (tenu) {
        const c = calculerCible(cursorX, cursorY);
        poserA(c.x, c.y);
      } else {
        const o = objetSousCase(inventaire, cursorX, cursorY);
        if (o) { soulever(o, cursorX - o.x, cursorY - o.y); ghostVersCase(cibleX, cibleY); }
      }
      return;
    }

    // X : menu Equip/Discard (comme le clic droit) sur l'objet tenu ou sous le curseur.
    if (e.code === "KeyX") {
      e.preventDefault();
      if (enBoutique) e.stopImmediatePropagation();
      const o = tenu ? tenu.objet : objetSousCase(inventaire, cursorX, cursorY);
      if (o) {
        if (tenu) lacher();
        ouvrirContexteCase(cursorX, cursorY, menuSac(o));
      }
    }
  }

  function majAide() {
    if (!elAide || overlay.hidden) return;
    const enBoutique = dialogueActif();
    if (tenu) {
      elAide.textContent = "Click a cell to drop · click a slot to equip · X: equip/discard · Esc: cancel";
    } else if (!enBoutique) {
      elAide.textContent = cursorVisible
        ? "Arrows: move · Enter: pick up/drop · X: equip/discard · [B] to close"
        : "Click an item to pick it up · drop it where you want or on a slot · [B] to close · arrows: keyboard mode";
    } else {
      elAide.textContent = kbFocus
        ? "Arrows: move · Enter: pick up / drop · X: equip/discard · [Tab]: back to merchant"
        : "Click items to move them · [Tab]: keyboard mode for inventory";
    }
  }

  // ---- Rendu ----------------------------------------------------------------

  function iconeItem(id) {
    const d = itemDef(id);
    const el = document.createElement("div");
    el.className = "inv-item";
    el.style.background = d.icone;
    el.style.borderColor = couleurRarete(id);
    const t = document.createElement("span");
    t.textContent = d.nom;
    el.append(t);
    // Bulle d'info au survol — sauf quand on tient un objet (geste en cours).
    el.addEventListener("mouseenter", (e) => { if (!tenu) montrerInfobulle(id, e); });
    el.addEventListener("mousemove", (e) => { if (!tenu) suivreInfobulle(e); });
    el.addEventListener("mouseleave", cacherInfobulle);
    return el;
  }

  // Un slot d'équipement. Si on tient un objet → clic = équiper. Sinon, clic sur
  // un objet équipé = le remettre au sac.
  function slotEl(slot) {
    const cell = document.createElement("div");
    cell.className = "inv-slot";
    // Poser un objet tenu sur un slot = l'équiper (le système route vers le bon slot).
    cell.addEventListener("click", () => { if (tenu) equiperTenu(); });

    if (slot === "arme2" && arme2Bloquee(inventaire)) {
      cell.classList.add("bloque");
      cell.textContent = "2H";
      return cell;
    }
    const id = inventaire.slots[slot];
    if (id) {
      const ic = iconeItem(id);
      const essayerDesequiper = (sl) => {
        if (desequiper(inventaire, sl)) { surChangement(); rendre(); }
        else montrerToast("🎒 Bag is full — make some room before unequipping.");
      };
      ic.onclick = () => { if (!tenu) essayerDesequiper(slot); };
      ic.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        if (tenu) return;
        ouvrirContexte(ev.clientX, ev.clientY, [
          { label: "Unequip", fn: () => essayerDesequiper(slot) },
          { label: "Discard", danger: true, fn: () => surJeter && surJeter({ slot }) },
        ]);
      });
      cell.append(ic);
    } else {
      cell.classList.add("vide");
      cell.textContent = slot === "arme2" ? labelArme2(heros) : (LABELS[slot] ?? "");
    }
    return cell;
  }

  function rendreColonne(conteneur, slots) {
    conteneur.replaceChildren(...slots.map(slotEl));
  }

  function rendreHero() {
    const c = canvasHero.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, canvasHero.width, canvasHero.height);
    const x = (canvasHero.width - 64 * ECHELLE_HERO) / 2;
    const y = (canvasHero.height - 64 * ECHELLE_HERO) / 2;
    if (heros.plancheArmure) dessinerCaseEchelle(c, heros.plancheArmure, 0, 0, x, y, ECHELLE_HERO);
    if (heros.plancheArme) dessinerCaseEchelle(c, heros.plancheArme, 0, 0, x, y, ECHELLE_HERO);
  }

  function rendreStats() {
    const t = bonusTalents(heros); // les CHIFFRES viennent de l'arbre (le stuff = cartes)
    const seuil = FORGE_SEUIL + (t.chaleurSeuil || 0);
    const max = FORGE_MAX + (t.chaleurMax || 0);
    const agility = 10 + (t.agilite || 0); // vitesse ATB de base (10) + talents
    const lignes = [
      ["Level",      `${heros.niveau}  (${heros.pointsTalent} pts)`],
      ["Max HP",     heros.pvMax],
      ["Agility",    agility],
      ["Forge Heat", `${seuil} / ${max}`],
      ["Cards/turn", BASE_PIOCHE + (t.pioche || 0)],
    ];
    elStats.replaceChildren(...lignes.map(([nom, val]) => {
      const l = document.createElement("div");
      l.className = "inv-stat";
      l.innerHTML = `<span>${nom}</span><b>${val}</b>`;
      return l;
    }));
  }

  function rendreGrille() {
    elGrille.replaceChildren();
    const rangs = rangsInventaire(inventaire);
    elGrille.style.width = inventaire.cols * CASE + "px";
    elGrille.style.height = rangs * CASE + "px";
    for (const o of inventaire.objets) {
      const d = itemDef(o.id);
      const ic = iconeItem(o.id);
      if (tenu && o === tenu.objet) ic.classList.add("inv-item--tenu"); // grisé (en main)
      ic.style.position = "absolute";
      ic.style.left = o.x * CASE + 1 + "px";
      ic.style.top = o.y * CASE + 1 + "px";
      ic.style.width = d.taille.l * CASE - 4 + "px";
      ic.style.height = d.taille.h * CASE - 4 + "px";
      ic.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        if (tenu) return;
        ouvrirContexte(ev.clientX, ev.clientY, menuSac(o));
      });
      elGrille.append(ic);
    }
    // Aperçu de pose (objet tenu) : rectangle vert/rouge sur la case de dépôt.
    if (tenu) {
      refCible = document.createElement("div");
      refCible.className = "inv-cible";
      elGrille.append(refCible);
      majApercuCible();
    } else if (cursorVisible) {
      // Curseur de navigation clavier : carré rouge sur la case active.
      const cur = document.createElement("div");
      cur.className = "inv-curseur";
      cur.style.left = cursorX * CASE + "px";
      cur.style.top = cursorY * CASE + "px";
      cur.style.width = CASE + "px";
      cur.style.height = CASE + "px";
      elGrille.append(cur);
    }
  }

  function rendre() {
    clamperCurseur();
    if (!tenu) cacherInfobulle(); // une icône survolée peut disparaître (équip/déséquip)
    elOr.textContent = inventaire.or;
    elPv.textContent = `${heros.pv}/${heros.pvMax}`;
    rendreColonne(elGauche, COL_GAUCHE);
    rendreColonne(elDroite, COL_DROITE);
    rendreColonne(elArmes, SLOTS_ARME);
    rendreHero();
    rendreStats();
    rendreGrille();
    majAide();
  }

  function clamperCurseur() {
    const rangs = rangsInventaire(inventaire);
    cursorX = Math.max(0, Math.min(inventaire.cols - 1, cursorX));
    cursorY = Math.max(0, Math.min(rangs - 1, cursorY));
  }

  return {
    ouvrir() {
      // Mode souris par défaut : le curseur clavier (carré rouge) ne s'affiche
      // que si le joueur appuie sur une touche directionnelle.
      kbFocus = !dialogueActif();
      cursorX = 0; cursorY = 0; cursorVisible = false;
      overlay.querySelector(".inv-panneau").classList.toggle("inv-panneau--focus", kbFocus && dialogueActif());
      rendre();
      overlay.hidden = false;
      window.addEventListener("keydown", surClavier, true); // capture : avant le dialogue
    },
    fermer() {
      lacher();
      kbFocus = false; cursorVisible = false;
      overlay.querySelector(".inv-panneau").classList.remove("inv-panneau--focus");
      window.removeEventListener("keydown", surClavier, true);
      cacherInfobulle();
      fermerContexte();
      overlay.hidden = true;
    },
    rendre,
  };
}
