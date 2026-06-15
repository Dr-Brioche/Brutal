// La fiche de personnage / inventaire (touche B), disposée verticalement :
//   - au centre : le HÉROS avec son stuff (sprite), ses deux slots d'arme dessous,
//     puis ses STATS ;
//   - sur les côtés : les slots d'équipement (armure/cou/mains/pieds/sac à gauche,
//     5 bagues à droite) ;
//   - tout en bas : le SAC (grille de cases façon Diablo, items à empreinte).
//
// 1er jet : icônes placeholder (carré coloré + bordure de rareté). Au clic :
//   - clic sur un item du sac  → on l'équipe ;
//   - clic sur un item équipé  → on le remet dans le sac.

import { itemDef, couleurRarete } from "../data/items.js";
import { rangsInventaire, equiper, desequiper, arme2Bloquee } from "../systems/inventaire.js";
import { bonusTalents } from "../systems/talents.js";
import { montrerInfobulle, suivreInfobulle, cacherInfobulle } from "./infobulle.js";
import { confirmationActive } from "./confirmation.js";
import { dessinerCaseEchelle } from "../core/sprites.js";
import { afficherMessage } from "./effets.js";

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

// Stats de base de la Chaleur de Forge (cf. systems/combat.js)
const FORGE_SEUIL = 3, FORGE_MAX = 8, BASE_PIOCHE = 3; // bases (matchent systems/combat.js)

function essayerEquiper(inventaire, objet, surChangement, rendre) {
  if (equiper(inventaire, objet)) { surChangement(); rendre(); return; }
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
  const canvasHero = document.getElementById("inv-hero");
  document.getElementById("inv-fermer").onclick = () => surFermer();

  // Glisser un objet du sac : un simple clic l'équipe ; le glisser HORS du
  // panneau (dans le vide) le JETTE (via surJeter, qui gère la confirmation).
  let drag = null; // { objet, ic, startX, startY, moved, ghost }
  function surDragMove(ev) {
    if (!drag) return;
    const dx = ev.clientX - drag.startX, dy = ev.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > 6) {
      drag.moved = true;
      cacherInfobulle();
      drag.ic.style.opacity = "0.3";
      const g = drag.ic.cloneNode(true);
      Object.assign(g.style, {
        position: "fixed", zIndex: "50", pointerEvents: "none", opacity: "0.9", margin: "0",
        width: drag.ic.offsetWidth + "px", height: drag.ic.offsetHeight + "px",
      });
      document.body.append(g);
      drag.ghost = g;
    }
    if (drag.ghost) {
      drag.ghost.style.left = (ev.clientX - drag.ghost.offsetWidth / 2) + "px";
      drag.ghost.style.top = (ev.clientY - drag.ghost.offsetHeight / 2) + "px";
    }
  }
  function surDragUp(ev) {
    window.removeEventListener("pointermove", surDragMove);
    window.removeEventListener("pointerup", surDragUp);
    const d = drag; drag = null;
    if (!d) return;
    d.ghost?.remove();
    d.ic.style.opacity = "";
    if (!d.moved) { // pas bougé = simple clic → équiper
      essayerEquiper(inventaire, d.objet, surChangement, rendre);
      return;
    }
    // Relâché HORS du panneau (le vide) → jeter ; à l'intérieur → on annule.
    const r = overlay.querySelector(".inv-panneau").getBoundingClientRect();
    const dehors = ev.clientX < r.left || ev.clientX > r.right ||
                   ev.clientY < r.top || ev.clientY > r.bottom;
    if (dehors && surJeter) surJeter({ objet: d.objet });
  }
  function debutDragSac(o, ic, ev) {
    if (confirmationActive() || ev.button === 2) return;
    ev.preventDefault();
    drag = { objet: o, ic, startX: ev.clientX, startY: ev.clientY, moved: false, ghost: null };
    window.addEventListener("pointermove", surDragMove);
    window.addEventListener("pointerup", surDragUp);
  }

  // -- Menu contextuel (clic droit) : Equip/Unequip + Discard (pour ceux qui ne
  //    pensent pas à glisser l'objet hors du sac) ----------------------------
  const elMenu = document.getElementById("inv-menu");
  function fermerContexte() { elMenu.hidden = true; elMenu.replaceChildren(); }
  function ouvrirContexte(x, y, actions) {
    cacherInfobulle();
    elMenu.replaceChildren(...actions.map((a) => {
      const b = document.createElement("button");
      b.className = "inv-menu-btn" + (a.danger ? " inv-menu-danger" : "");
      b.textContent = a.label;
      b.addEventListener("click", () => { fermerContexte(); a.fn(); });
      return b;
    }));
    elMenu.hidden = false;
    const r = elMenu.getBoundingClientRect(); // clampé à l'écran
    elMenu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + "px";
    elMenu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px";
  }
  // Fermer : clic ailleurs, Échap (avale la touche pour ne pas fermer l'inventaire), molette.
  window.addEventListener("pointerdown", (e) => {
    if (!elMenu.hidden && !elMenu.contains(e.target)) fermerContexte();
  }, true);
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && !elMenu.hidden) { e.stopPropagation(); fermerContexte(); }
  }, true);
  window.addEventListener("wheel", () => { if (!elMenu.hidden) fermerContexte(); });

  function iconeItem(id) {
    const d = itemDef(id);
    const el = document.createElement("div");
    el.className = "inv-item";
    el.style.background = d.icone;
    el.style.borderColor = couleurRarete(id);
    const t = document.createElement("span");
    t.textContent = d.nom;
    el.append(t);
    // Bulle d'info au survol (nom, effets, visuel des cartes) — sauf en plein drag.
    el.addEventListener("mouseenter", (e) => { if (!drag) montrerInfobulle(id, e); });
    el.addEventListener("mousemove", (e) => { if (!drag) suivreInfobulle(e); });
    el.addEventListener("mouseleave", cacherInfobulle);
    return el;
  }

  // Un slot d'équipement (objet équipé → clic pour déséquiper ; sinon libellé).
  function slotEl(slot) {
    const cell = document.createElement("div");
    cell.className = "inv-slot";
    // Slot arme2 verrouillé si arme1 est deux mains.
    if (slot === "arme2" && arme2Bloquee(inventaire)) {
      cell.classList.add("bloque");
      cell.textContent = "2H";
      return cell;
    }
    const id = inventaire.slots[slot];
    if (id) {
      const ic = iconeItem(id);
      ic.onclick = () => { if (desequiper(inventaire, slot)) { surChangement(); rendre(); } };
      ic.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ouvrirContexte(ev.clientX, ev.clientY, [
          { label: "Unequip", fn: () => { if (desequiper(inventaire, slot)) { surChangement(); rendre(); } } },
          { label: "Discard", danger: true, fn: () => surJeter && surJeter({ slot }) },
        ]);
      });
      cell.append(ic);
    } else {
      cell.classList.add("vide");
      cell.textContent = LABELS[slot] ?? "";
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
      ic.style.position = "absolute";
      ic.style.left = o.x * CASE + 1 + "px";
      ic.style.top = o.y * CASE + 1 + "px";
      ic.style.width = d.taille.l * CASE - 4 + "px";
      ic.style.height = d.taille.h * CASE - 4 + "px";
      ic.style.touchAction = "none"; // le drag capte le geste (pas de scroll parasite)
      ic.addEventListener("pointerdown", (ev) => debutDragSac(o, ic, ev));
      ic.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ouvrirContexte(ev.clientX, ev.clientY, [
          { label: "Equip", fn: () => essayerEquiper(inventaire, o, surChangement, rendre) },
          { label: "Discard", danger: true, fn: () => surJeter && surJeter({ objet: o }) },
        ]);
      });
      elGrille.append(ic);
    }
  }

  function rendre() {
    cacherInfobulle(); // une icône survolée peut disparaître (équip/déséquip)
    fermerContexte();
    elOr.textContent = inventaire.or;
    elPv.textContent = `${heros.pv}/${heros.pvMax}`;
    rendreColonne(elGauche, COL_GAUCHE);
    rendreColonne(elDroite, COL_DROITE);
    rendreColonne(elArmes, SLOTS_ARME);
    rendreHero();
    rendreStats();
    rendreGrille();
  }

  return {
    ouvrir() { rendre(); overlay.hidden = false; },
    fermer() {
      cacherInfobulle();
      fermerContexte();
      if (drag) { // un drag en cours : on nettoie
        drag.ghost?.remove();
        window.removeEventListener("pointermove", surDragMove);
        window.removeEventListener("pointerup", surDragUp);
        drag = null;
      }
      overlay.hidden = true;
    },
    rendre,
  };
}
