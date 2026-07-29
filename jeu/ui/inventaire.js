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
//   - DOUBLE-CLIC sur un objet du sac → il s'ÉQUIPE directement ;
//   - on peut aussi GLISSER un objet PORTÉ vers le sac (ou vers un autre
//     emplacement, ou le marchand) — le trajet marche dans les deux sens ;
//   - clic droit (ou touche X) → menu Equip / Discard direct.
// Au clavier : flèches/WASD pour bouger le curseur, Entrée pour soulever/poser,
// X pour le menu Equip/Discard, Échap pour reposer l'objet tenu.

import { itemDef, couleurRarete, prixVente, SLOT_PAR_CATEGORIE } from "../data/items.js";
import { t } from "../systems/langue.js";

// Un objet est-il équipable ? (sa catégorie va sur un slot). Les trésors et les
// ressources n'en ont pas → pas de « Equip » proposé pour eux.
function estEquipable(id) {
  return Boolean(SLOT_PAR_CATEGORIE[itemDef(id)?.categorie]);
}
import { xpPourNiveau } from "../systems/progression.js";
import {
  rangsInventaire, colsInventaire, equiper, desequiper, arme2Bloquee,
  objetSousCase, peutPlacerA, deplacerObjet, nbSacs,
} from "../systems/inventaire.js";
import { dialogueActif } from "./dialogue.js";
import { bonusTalents } from "../systems/talents.js";
import { STATS_HEROS_BASE } from "../data/heros_base.js"; // agilité de base (Excel, onglet Héros)
import { montrerInfobulle, montrerNoteSlotVide, suivreInfobulle, cacherInfobulle } from "./infobulle.js";
import { tailleCaseInventaire } from "../core/style.js";
import { confirmationActive } from "./confirmation.js";
import { dessinerCaseEchelle } from "../core/sprites.js";
import { afficherMessage, montrerToast } from "./effets.js";
import { jouerSonObjet } from "../core/sons.js";

// Taille d'une case du sac, LUE dans le CSS (`--case-inv` dans index.html) : le
// quadrillage est dessiné par un dégradé CSS, les positions sont calculées ici.
// Les deux DOIVENT tomber pile ; en lisant la même variable, ils ne peuvent plus
// diverger (avant, le chiffre était recopié ici, dans le coffre et dans le CSS).
const CASE = tailleCaseInventaire();
// Déplacement (px) au-delà duquel un appui devient un GLISSER et non un clic.
const SEUIL_GLISSER = 5;
// Délai (ms) sous lequel deux clics sur le MÊME objet comptent pour un double.
const DELAI_DOUBLE_CLIC = 350;
const ECHELLE_HERO = 2;     // 64×64 → 128 dans la fiche

const COL_GAUCHE = ["armure", "collier", "gant", "botte", "outil", "sac", "sac2"];
const COL_DROITE = ["bague1", "bague2", "bague3", "bague4", "bague5"];
const SLOTS_ARME = ["arme1", "arme2"];
// Chaque slot → sa CLÉ de traduction (cf. systems/langue.js).
const LABELS = {
  arme1: "inv.slot.arme1", arme2: "inv.slot.arme2", armure: "inv.slot.armure", gant: "inv.slot.gant", botte: "inv.slot.botte",
  collier: "inv.slot.collier", sac: "inv.slot.sac", sac2: "inv.slot.sac2", outil: "inv.slot.outil",
  bague1: "inv.slot.bague", bague2: "inv.slot.bague", bague3: "inv.slot.bague", bague4: "inv.slot.bague", bague5: "inv.slot.bague",
};
// Label dynamique pour arme2 selon le talent Ambidextrie
function labelArme2(heros) {
  return (heros?.talents?.ambidextrie ?? 0) > 0 ? t("inv.slot.offhand") : t("inv.slot.arme2");
}

// Stats de base de la Chaleur de Forge (cf. systems/combat.js)
const FORGE_SEUIL = 3, FORGE_MAX = 8, BASE_PIOCHE = 3; // bases (matchent systems/combat.js)

function essayerEquiper(inventaire, heros, objet, surChangement, rendre, slotForce = null) {
  const res = equiper(inventaire, objet, heros, slotForce);
  if (res === true) { surChangement(); rendre(); return; }
  if (res === "plein") {
    montrerToast(t("inv.sacPleinEchange"));
    return;
  }
  if (res === "deux-mains") {
    afficherMessage(t("inv.deuxMainsTalent"));
    return;
  }
  if (arme2Bloquee(inventaire) && itemDef(objet.id).categorie === "bouclier") {
    afficherMessage(t("inv.deuxMainsOccupe"));
  }
}

export function installerInventaire({ inventaire, heros, surChangement, surFermer, surJeter, surVendre, surLire }) {
  const overlay = document.getElementById("inventaire");
  const elGauche = document.getElementById("inv-gauche");
  const elDroite = document.getElementById("inv-droite");
  const elArmes = document.getElementById("inv-armes");
  const elStats = document.getElementById("inv-stats");
  const elXpFill = document.getElementById("inv-xp-fill");
  const elXpTxt  = document.getElementById("inv-xp-txt");
  const elGrille = document.getElementById("inv-grille");
  const elOnglets = document.getElementById("inv-onglets");
  const elOr = document.getElementById("inv-or");
  const elPv = document.getElementById("inv-pv");
  const elPvFill = document.getElementById("inv-pv-fill");
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
  // ONGLET de sac affiché (0 = sac principal, 1 = 2e sac). Chaque sac est une
  // grille séparée → on n'en montre qu'UNE à la fois (jamais trop large).
  let ongletActif = 0;
  // La barre d'onglets contient les SACS, puis un onglet STATS (29/07/2026). Les
  // stats étaient tassées sous le héros ; elles ont maintenant toute la largeur
  // du sac pour elles. `ongletActif === STATS` = on affiche les stats à la place
  // de la grille. C'est un indice à part plutôt qu'un booléen : les onglets sont
  // une seule liste, au clavier comme à la souris.
  const STATS = "stats";
  const enStats = () => ongletActif === STATS;
  // Les onglets, dans l'ordre : un par sac, puis « Stats ».
  const listeOnglets = () => [...Array(nbSacs(inventaire)).keys(), STATS];

  // Change d'onglet. Si on TIENT un objet, il reste en main : le poser dans le
  // nouvel onglet l'y déplace (déplacement inter-onglets).
  function setOnglet(t) {
    ongletActif = listeOnglets().includes(t) ? t : 0;
    cursorX = 0; cursorY = 0;
    rendre();
    if (tenu?.objet && !enStats()) { const c = calculerCible(cursorX, cursorY); cibleX = c.x; cibleY = c.y; ghostVersCase(cibleX, cibleY); }
  }

  // Onglet suivant / précédent (cycle sur toute la liste, stats comprises).
  function decalerOnglet(pas) {
    const l = listeOnglets();
    const i = Math.max(0, l.indexOf(ongletActif));
    setOnglet(l[(i + pas + l.length) % l.length]);
  }

  // Le sac AFFICHÉ : en vue stats, on garde le dernier sac consulté pour que
  // revenir aux onglets de sac ne perde pas sa place, et pour que tout le code de
  // grille (placement, curseur…) continue de parler d'un numéro de sac valide.
  let dernierSac = 0;
  const sacAffiche = () => (enStats() ? dernierSac : ongletActif);

  // ---- Prendre / poser ------------------------------------------------------

  function caseDepuisClient(cx, cy) {
    const r = elGrille.getBoundingClientRect();
    return { x: Math.floor((cx - r.left) / CASE), y: Math.floor((cy - r.top) / CASE) };
  }

  // Coin haut-gauche de pose, clampé à la grille (à partir d'une case d'ancrage).
  function calculerCible(ancreX, ancreY) {
    const d = itemDef(tenu.objet.id);
    const rangs = rangsInventaire(inventaire, sacAffiche());
    const cols = colsInventaire(inventaire, sacAffiche());
    return {
      x: Math.max(0, Math.min(cols - d.taille.l, ancreX - tenu.offX)),
      y: Math.max(0, Math.min(rangs - d.taille.h, ancreY - tenu.offY)),
    };
  }

  function creerGhost(objet) {
    const d = itemDef(objet.id);
    const g = document.createElement("div");
    g.className = "inv-item inv-ghost";
    g.style.borderColor = couleurRarete(objet.id);
    g.style.width = d.taille.l * CASE - 4 + "px";
    g.style.height = d.taille.h * CASE - 4 + "px";
    if (d.image) {
      g.classList.add("inv-item--img");
      g.style.backgroundImage = `url("${d.image}")`;
    } else {
      g.style.background = d.icone;
      const t = document.createElement("span");
      t.textContent = d.nom;
      t.style.color = couleurRarete(objet.id);
      g.append(t);
    }
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
    const ok = peutPlacerA(inventaire, tenu.objet, cibleX, cibleY, sacAffiche());
    refCible.classList.toggle("inv-cible--ok", ok);
    refCible.classList.toggle("inv-cible--non", !ok);
  }

  function soulever(objet, offX, offY) {
    jouerSonObjet();
    cacherInfobulle();
    fermerContexte();
    tenu = { objet, offX, offY, ghost: creerGhost(objet) };
    const c = calculerCible(objet.x + offX, objet.y + offY);
    cibleX = c.x; cibleY = c.y;
    window.addEventListener("pointermove", surSourisDeplace, true);
    rendre();
  }

  // SOULEVER UN OBJET ÉQUIPÉ (29/07/2026). Un objet porté n'est pas un objet du
  // sac : c'est un simple identifiant rangé dans `inventaire.slots`, sans case ni
  // position. Le `tenu` a donc deux formes — `{ objet }` pour le sac, `{ slot }`
  // pour l'équipement — et tout ce qui manipule l'objet tenu doit regarder
  // laquelle (cf. `tenuId`).
  function souleverDepuisSlot(slot) {
    const id = inventaire.slots[slot];
    if (!id) return;
    jouerSonObjet();
    cacherInfobulle();
    fermerContexte();
    tenu = { slot, id, qualite: inventaire.qualites?.[slot] ?? null, ghost: creerGhost({ id }) };
    window.addEventListener("pointermove", surSourisDeplace, true);
    rendre();
  }

  // L'identifiant de ce qu'on tient, quelle que soit sa provenance.
  const tenuId = () => (tenu ? (tenu.objet ? tenu.objet.id : tenu.id) : null);

  // Appui en cours sur un emplacement ÉQUIPÉ, en attente de savoir si c'est un
  // clic (déséquiper) ou un glisser. Rempli au pointerdown de l'icône, consommé
  // par les deux écouteurs de fenêtre ci-dessous.
  let pretAGlisser = null;
  // Dernier clic dans la grille, pour reconnaître un double-clic.
  let dernierClic = null;

  window.addEventListener("pointermove", (ev) => {
    if (!pretAGlisser || tenu) return;
    if (Math.hypot(ev.clientX - pretAGlisser.x, ev.clientY - pretAGlisser.y) < SEUIL_GLISSER) return;
    const slot = pretAGlisser.slot;
    pretAGlisser = null;
    souleverDepuisSlot(slot);
    ghostVersSouris(ev.clientX, ev.clientY);
  }, true);

  window.addEventListener("pointerup", () => {
    // Relâché sans avoir bougé → c'était un clic : on déséquipe (geste d'avant).
    if (pretAGlisser && !tenu) pretAGlisser.desequiper(pretAGlisser.slot);
    pretAGlisser = null;
  }, true);

  function lacher() {
    if (!tenu) return;
    jouerSonObjet();          // l'objet retrouve une place (case, emplacement, sol…)
    tenu.ghost.remove();
    tenu = null;
    refCible = null;
    window.removeEventListener("pointermove", surSourisDeplace, true);
  }

  function annulerTenu() { lacher(); rendre(); }

  function poserA(x, y) {
    if (!tenu) return;
    if (deplacerObjet(inventaire, tenu.objet, x, y, sacAffiche())) { lacher(); rendre(); }
    // Place occupée : on garde l'objet en main (le joueur retente ailleurs).
  }

  function equiperTenu(slotForce = null) {
    if (!tenu) return;
    const o = tenu.objet;
    lacher();
    essayerEquiper(inventaire, heros, o, surChangement, rendre, slotForce);
    rendre();
  }

  // Suivi du ghost à la souris (tant qu'un objet est tenu).
  function surSourisDeplace(ev) {
    if (!tenu) return;
    ghostVersSouris(ev.clientX, ev.clientY);
    // Un objet venu d'un SLOT n'a pas de case d'origine : pas d'aperçu de pose à
    // calculer, il ira simplement dans le sac au relâchement.
    if (tenu.slot) return;
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

  // DRAG À LA SOURIS (comme un fichier Windows) : on APPUIE sur un objet pour le
  // saisir, on le déplace en gardant le bouton enfoncé (le ghost suit), et on
  // RELÂCHE pour le déposer là où pointe la souris. La saisie se fait ici, au
  // pointerdown ; le dépôt/routage se fait au pointerup global (plus bas).
  elGrille.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0 || confirmationActive() || tenu) return;
    const c = caseDepuisClient(ev.clientX, ev.clientY);
    const o = objetSousCase(inventaire, c.x, c.y, sacAffiche());
    if (!o) return;
    ev.preventDefault(); // pas de sélection de texte pendant le drag

    // DOUBLE-CLIC = ÉQUIPER (29/07/2026). C'est le geste que tout le monde
    // essaie en premier, et il évite de viser un petit emplacement à la souris.
    //
    // ⚠ On le détecte À LA MAIN plutôt qu'avec l'événement `dblclick` : le
    // `preventDefault()` ci-dessus, indispensable au glisser, empêche le
    // navigateur d'émettre les événements souris de compatibilité — donc
    // `dblclick` n'arrive jamais. (Essayé, et c'est bien ce qui se passait.)
    const maintenant = performance.now();
    if (dernierClic && dernierClic.objet === o &&
        maintenant - dernierClic.t < DELAI_DOUBLE_CLIC) {
      dernierClic = null;
      if (estEquipable(o.id)) { essayerEquiper(inventaire, heros, o, surChangement, rendre); rendre(); }
      return;   // ressource ou trésor : le double-clic ne fait simplement rien
    }
    dernierClic = { objet: o, t: maintenant };

    soulever(o, c.x - o.x, c.y - o.y);
    ghostVersSouris(ev.clientX, ev.clientY);
  });

  // RELÂCHEMENT (fin de drag souris) : on regarde ce qui est SOUS le pointeur
  // (le ghost est `pointer-events:none`, donc `elementFromPoint` voit à travers)
  // et on route le dépôt : slot d'équipement, grille (déplacer), fenêtre du
  // marchand (vendre), ou le vide (jeter). Lâché ailleurs = l'objet REVIENT à sa
  // place (annulation propre, façon glisser-déposer). La confirmation des objets
  // rares (jeter/vendre) est gérée par surJeter/surVendre.
  window.addEventListener("pointerup", (ev) => {
    if (!tenu || ev.button !== 0) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const slotCell = el && el.closest ? el.closest(".inv-slot") : null;

    // L'objet vient d'un EMPLACEMENT ÉQUIPÉ : il repasse d'abord par le sac
    // (c'est `desequiper` qui sait gérer les cas tordus — sac plein, retrait du
    // 2e sac qui ferait déborder ses objets…), puis on l'emmène où on l'a lâché.
    if (tenu.slot) {
      const slotDepart = tenu.slot;
      const cible = slotCell?.dataset.slot;
      if (cible === slotDepart) { annulerTenu(); return; }   // reposé sur lui-même
      const avant = new Set(inventaire.objets);
      const res = desequiper(inventaire, slotDepart);
      if (res !== true) {
        montrerToast(res === "overflow"
          ? "🎒 Empty the extra bag rows before removing this bag."
          : "🎒 Bag is full — make some room before unequipping.");
        annulerTenu();
        return;
      }
      // L'exemplaire que `desequiper` vient d'ajouter au sac (on le retrouve par
      // différence : c'est plus sûr que de parier sur sa position dans la liste).
      const neuf = inventaire.objets.find((o) => !avant.has(o));
      lacher();
      if (cible) {                       // lâché sur un AUTRE emplacement → on l'y équipe
        if (neuf) essayerEquiper(inventaire, heros, neuf, surChangement, rendre, cible);
      } else if (el && el.closest && el.closest("#inv-grille")) {
        // lâché dans le sac : on tente la case visée, sinon il reste où il est tombé
        if (neuf) deplacerObjet(inventaire, neuf, cibleX, cibleY, sacAffiche());
      } else if (surVendre && document.body.classList.contains("en-boutique") &&
                 el && el.closest && el.closest(".dialogue-boite")) {
        if (neuf) { surChangement(); rendre(); surVendre(neuf); return; }
      } else if (el === overlay && surJeter) {
        if (neuf) { surChangement(); rendre(); surJeter({ objet: neuf }); return; }
      }
      surChangement();
      rendre();
      return;
    }

    if (slotCell && slotCell.dataset.slot) { equiperTenu(slotCell.dataset.slot); return; }
    if (el && el.closest && el.closest("#inv-grille")) {
      if (deplacerObjet(inventaire, tenu.objet, cibleX, cibleY, sacAffiche())) { lacher(); rendre(); }
      else { annulerTenu(); } // case occupée → l'objet retourne à sa place
      return;
    }
    if (surVendre && document.body.classList.contains("en-boutique") &&
        el && el.closest && el.closest(".dialogue-boite")) {
      const o = tenu.objet; lacher(); surVendre(o); return;
    }
    if (el === overlay) { const o = tenu.objet; lacher(); if (surJeter) surJeter({ objet: o }); return; }
    annulerTenu(); // lâché hors de toute cible valide → on annule (l'objet revient)
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
  // Actions Equip/Sell/Discard pour un objet du SAC. « Sell » n'apparaît QUE
  // pendant qu'on est chez le marchand (raccourci au clic droit, en plus du
  // glisser-déposer déjà possible sur sa fenêtre) — même action (`surVendre`)
  // que le lâcher-déposer, donc même confirmation pour les objets rares.
  function menuSac(o) {
    // « Equip » seulement pour un objet équipable (pas pour un trésor / une ressource).
    const actions = estEquipable(o.id)
      ? [{ label: t("inv.equiper"), fn: () => essayerEquiper(inventaire, heros, o, surChangement, rendre) }]
      : [];
    // « Read » pour un parchemin : ouvre la recette + le lore.
    if (surLire && itemDef(o.id)?.categorie === "parchemin") {
      actions.push({ label: t("inv.lire"), fn: () => surLire(o) });
    }
    if (surVendre && document.body.classList.contains("en-boutique")) {
      actions.push({ label: t("inv.vendre", { prix: prixVente(o.id, o.qualite ?? null) * (o.quantite ?? 1) }), fn: () => surVendre(o) });
    }
    actions.push({ label: t("inv.jeter"), danger: true, fn: () => surJeter && surJeter({ objet: o }) });
    return actions;
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

  // Gestionnaire clavier PRIORITAIRE pour le menu contextuel (Equip / Discard).
  // Il est enregistré ICI, au démarrage du jeu, AVANT que tout dialogue marchand ne
  // s'ouvre. En phase de capture, l'ordre d'enregistrement détermine l'ordre
  // d'exécution : ce handler passe donc avant le dialogue (qui s'enregistre plus tard)
  // et stoppe la propagation pour qu'il n'interfère pas avec les touches de navigation.
  window.addEventListener("keydown", (e) => {
    if (overlay.hidden || elMenu.hidden) return;
    const n = elMenu.children.length;
    let traite = true;
    if (["ArrowUp", "KeyW", "KeyZ"].includes(e.code))   { menuSel = (menuSel - 1 + n) % n; surlignerMenu(); }
    else if (["ArrowDown", "KeyS"].includes(e.code))     { menuSel = (menuSel + 1) % n; surlignerMenu(); }
    else if (e.code === "Enter" || e.code === "Space")   { elMenu.children[menuSel]?.click(); }
    else if (e.code === "Escape")                        { fermerContexte(); }
    else traite = false;
    if (traite) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

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

    // Tab en mode butin OU boutique : bascule le focus clavier entre le panneau
    // actif (butin/marchand) et la grille d'inventaire.
    if (e.code === "Tab" && (enButin || enBoutique)) {
      e.preventDefault(); e.stopImmediatePropagation();
      kbFocus = !kbFocus;
      cursorVisible = kbFocus;
      overlay.querySelector(".inv-panneau").classList.toggle("inv-panneau--focus", kbFocus);
      rendre();
      majAide();
      return;
    }

    if (!kbFocus) return;

    // Changer d'ONGLET de sac au clavier (A/E = onglet précédent/suivant), quand
    // il y a un 2e sac. Marche aussi en tenant un objet (pour le poser dans l'autre sac).
    // (Il y a TOUJOURS au moins deux onglets depuis l'ajout de « Stats » : le
    // raccourci n'est donc plus conditionné à la présence d'un 2e sac.)
    if (e.code === "KeyE" || e.code === "BracketRight") {
      e.preventDefault(); if (enBoutique) e.stopImmediatePropagation();
      decalerOnglet(1);
      return;
    }
    if (e.code === "BracketLeft") {
      e.preventDefault(); if (enBoutique) e.stopImmediatePropagation();
      decalerOnglet(-1);
      return;
    }
    // En vue STATS il n'y a pas de grille : le curseur, la prise d'objet et le
    // menu contextuel n'ont plus de sens. On laisse passer le reste (Échap, B…).
    if (enStats()) return;

    // Déplacement du curseur case par case (WASD + ZQSD + flèches).
    const ddx = { ArrowLeft: -1, ArrowRight: 1, KeyA: -1, KeyD: 1, KeyQ: -1 };
    const ddy = { ArrowUp: -1, ArrowDown: 1, KeyW: -1, KeyS: 1, KeyZ: -1 };
    if (e.code in ddx || e.code in ddy) {
      e.preventDefault();
      if (enBoutique) e.stopImmediatePropagation();
      const rangs = rangsInventaire(inventaire, sacAffiche());
      cursorX = Math.max(0, Math.min(colsInventaire(inventaire, sacAffiche()) - 1, cursorX + (ddx[e.code] || 0)));
      cursorY = Math.max(0, Math.min(rangs - 1, cursorY + (ddy[e.code] || 0)));
      cursorVisible = true;
      if (tenu?.objet) { const c = calculerCible(cursorX, cursorY); cibleX = c.x; cibleY = c.y; }
      rendre();
      if (tenu?.objet) ghostVersCase(cibleX, cibleY);
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
        const o = objetSousCase(inventaire, cursorX, cursorY, sacAffiche());
        if (o) { soulever(o, cursorX - o.x, cursorY - o.y); ghostVersCase(cibleX, cibleY); }
      }
      return;
    }

    // X : menu Equip/Discard (comme le clic droit) sur l'objet tenu ou sous le curseur.
    if (e.code === "KeyX") {
      e.preventDefault();
      if (enBoutique) e.stopImmediatePropagation();
      const o = tenu ? tenu.objet : objetSousCase(inventaire, cursorX, cursorY, sacAffiche());
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
      // En tenant un objet : en boutique on le VEND en le lâchant sur le marchand ;
      // partout, le lâcher dans le VIDE le jette (Échap reste le moyen sûr d'annuler).
      elAide.textContent = enBoutique
        ? t("inv.aideVendreSlot")
        : t("inv.aideCaseSlot");
    } else if (!enBoutique) {
      // [E] change d'ONGLET — et il y a toujours au moins « Sac » + « Stats »,
      // donc l'astuce est utile même sans 2e sac.
      const bagHint = t("inv.aideSwitchBag");
      elAide.textContent = (cursorVisible
        ? t("inv.aideClavier")
        : t("inv.aideSouris")) + bagHint + t("inv.aideClose");
    } else {
      elAide.textContent = kbFocus
        ? t("inv.aideClavierMarchand")
        : t("inv.aideSourisMarchand");
    }
  }

  // ---- Rendu ----------------------------------------------------------------

  function iconeItem(id, qualite = null) {
    const d = itemDef(id);
    const el = document.createElement("div");
    el.className = "inv-item";
    el.style.borderColor = couleurRarete(id);
    if (d.image) {
      // Vraie icône (ressource détourée) : image en fond, pas de nom (l'image parle).
      el.classList.add("inv-item--img");
      el.style.backgroundImage = `url("${d.image}")`;
    } else {
      el.style.background = d.icone;
      const t = document.createElement("span");
      t.textContent = d.nom;
      t.style.color = couleurRarete(id);
      el.append(t);
    }
    // Bulle d'info au survol — sauf quand on tient un objet (geste en cours).
    el.addEventListener("mouseenter", (e) => { if (!tenu) montrerInfobulle(id, e, qualite); });
    el.addEventListener("mousemove", (e) => { if (!tenu) suivreInfobulle(e); });
    el.addEventListener("mouseleave", cacherInfobulle);
    return el;
  }

  // Un slot d'équipement. Si on tient un objet → clic = équiper. Sinon, clic sur
  // un objet équipé = le remettre au sac.
  function slotEl(slot) {
    const cell = document.createElement("div");
    cell.className = "inv-slot";
    cell.dataset.slot = slot; // repéré au relâchement du drag (équiper en lâchant dessus)

    if (slot === "arme2" && arme2Bloquee(inventaire)) {
      cell.classList.add("bloque");
      cell.textContent = "2H";
      return cell;
    }
    if (slot === "sac2" && !(heros?.talents?.sacBonus ?? 0)) {
      cell.classList.add("bloque");
      cell.textContent = "🔒";
      return cell;
    }
    const id = inventaire.slots[slot];
    if (id) {
      const ic = iconeItem(id, inventaire.qualites?.[slot]);
      const essayerDesequiper = (sl) => {
        const res = desequiper(inventaire, sl);
        if (res === true) { surChangement(); rendre(); }
        else if (res === "overflow") montrerToast("🎒 Empty the extra bag rows before removing this bag.");
        else montrerToast("🎒 Bag is full — make some room before unequipping.");
      };
      // CLIC ou GLISSER, sur le même bouton (29/07/2026) :
      //   • appuyer-relâcher sans bouger  → déséquiper (le geste d'avant) ;
      //   • appuyer et DÉPLACER            → on emporte l'objet, et on le lâche
      //     où on veut (une case du sac, un autre emplacement, le marchand…).
      // Sans le seuil de déplacement, le moindre tremblement de souris pendant
      // un clic aurait déclenché un glisser et le clic n'aurait plus rien fait.
      // ⚠ Le suivi se fait sur la FENÊTRE, pas sur l'icône : dès le premier
      // déplacement la souris a déjà quitté ce petit carré de 46 px, et un
      // `pointermove` posé sur l'icône ne se déclencherait jamais.
      ic.addEventListener("pointerdown", (ev) => {
        if (ev.button !== 0 || confirmationActive() || tenu) return;
        ev.preventDefault();
        pretAGlisser = { slot, x: ev.clientX, y: ev.clientY, desequiper: essayerDesequiper };
      });
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
      const label = slot === "arme2" ? labelArme2(heros) : (LABELS[slot] ? t(LABELS[slot]) : "");
      cell.textContent = label;
      // Survol d'un slot VIDE → note montrant les cartes de suppléance qu'il ajoute
      // au deck (rien si le slot n'en a pas). Pas quand on tient un objet (geste en cours).
      cell.addEventListener("mouseenter", (e) => { if (!tenu) montrerNoteSlotVide(slot, label, e); });
      cell.addEventListener("mousemove", (e) => { if (!tenu) suivreInfobulle(e); });
      cell.addEventListener("mouseleave", cacherInfobulle);
    }
    return cell;
  }

  function rendreColonne(conteneur, slots) {
    conteneur.replaceChildren(...slots.map(slotEl));
  }

  // Colonne des 5 bagues : les slots reliés par un trait qui se DORE au fur et à
  // mesure qu'on équipe (jauge de progression), puis un rectangle « Infinity
  // Gauntlet » sous la dernière bague, doré quand les 5 sont remplies (bonus actif).
  function segIG(actif) {
    const s = document.createElement("div");
    s.className = "inv-ig-seg" + (actif ? " inv-ig-seg--on" : "");
    return s;
  }
  function rendreBagues() {
    const pleins = COL_DROITE.map((s) => Boolean(inventaire.slots[s]));
    const n = pleins.filter(Boolean).length;
    // `slots[s]` = un ID (chaîne), pas un objet → on déduplique les ids directement
    // (avant, `.map(b => b.id)` donnait 5× undefined → jamais « toutes uniques »).
    const baguesItems = COL_DROITE.map(s => inventaire.slots[s]).filter(Boolean);
    const toutesUniques = baguesItems.length === 5 && new Set(baguesItems).size === 5;
    const complet = toutesUniques;
    const enfants = [];
    COL_DROITE.forEach((slot, i) => {
      enfants.push(slotEl(slot));
      // Segment entre deux bagues : doré si les DEUX bagues reliées sont posées.
      if (i < COL_DROITE.length - 1) enfants.push(segIG(pleins[i] && pleins[i + 1]));
    });
    // Trait descendant + rectangle du bonus (dorés une fois les 5 bagues posées).
    enfants.push(segIG(complet));
    const bonus = document.createElement("div");
    bonus.className = "inv-ig-bonus" + (complet ? " inv-ig-bonus--actif" : "");
    bonus.textContent = t("combat.infinityNom");
    const doublons = n === 5 && !toutesUniques;
    bonus.dataset.tooltip = complet
      ? t("inv.gauntletActif")
      : doublons
        ? t("inv.gauntletInactif")
        : t("inv.gauntletPartiel", { n });
    enfants.push(bonus);
    elDroite.className = "inv-colonne inv-colonne--bagues";
    elDroite.replaceChildren(...enfants);
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
    const bt = bonusTalents(heros); // les CHIFFRES viennent de l'arbre (le stuff = cartes)
    const seuil = FORGE_SEUIL + (bt.chaleurSeuil || 0);
    const max = FORGE_MAX + (bt.chaleurMax || 0);
    // Agilité TOTALE = base du héros (Excel, onglet « Héros ») + talents + bottes.
    // ⚠ La base se LIT, elle ne se recopie pas : un « 10 » en dur traînait ici depuis
    // une ancienne échelle et affichait 10 à un nain qui en avait 100.
    const agility = STATS_HEROS_BASE.vitesseCombat + (bt.agilite || 0) + (heros.agiliteEquip || 0);
    const moveSpeed = Math.round(100 * (1 + (heros.vitesseEquipPct || 0) / 100));
    // D'OÙ VIENT LE CHIFFRE : une stat vaut « base + talents + équipement », et
    // seul le total était affiché — impossible de retrouver son compte (250
    // d'agilité avec des bottes à +100, c'est le talent Fleet Strikes qui pose
    // les 50 manquants). On écrit donc le détail sous la ligne, dès qu'il y a
    // au moins un bonus. `detail` = [[valeur, d'où ça vient], …].
    const lignes = [
      [t("inv.statNiveau"),  `${heros.niveau}  (${heros.pointsTalent} pts)`],
      [t("inv.statPvMax"),   heros.pvMax,
        [[STATS_HEROS_BASE.pv, "inv.srcBase"], [bt.pvMax || 0, "inv.srcTalents"]]],
      [t("inv.statAgilite"), agility,
        [[STATS_HEROS_BASE.vitesseCombat, "inv.srcBase"], [bt.agilite || 0, "inv.srcTalents"],
         [heros.agiliteEquip || 0, "inv.srcEquipement"]]],
      [t("inv.statVitesse"), moveSpeed],
      [t("inv.statChaleur"), `${seuil} / ${max}`],
      [t("inv.statCartes"),  BASE_PIOCHE + (bt.pioche || 0),
        [[BASE_PIOCHE, "inv.srcBase"], [bt.pioche || 0, "inv.srcTalents"]]],
    ];
    // MINAGE : n'a de sens qu'avec une pioche équipée. On montre ce qu'elle
    // rapporte (efficacité) et à quelle vitesse elle creuse — les deux stats qui
    // font choisir une pioche plutôt qu'une autre.
    if (inventaire.slots?.outil) {
      lignes.push([t("inv.statEfficacite"), `${heros.efficacite || 0} %`]);
      lignes.push([t("inv.statVitesseMinage"), `${heros.vitesseMinage || 100} %`]);
    }
    elStats.replaceChildren(...lignes.map(([nom, val, detail]) => {
      const l = document.createElement("div");
      l.className = "inv-stat";
      l.innerHTML = `<span>${nom}</span><b>${val}</b>`;
      // Le détail n'apparaît qu'AU SURVOL (data-tooltip, même mécanique que les
      // bonus du gantelet plus haut) : la fiche reste épurée, l'explication est
      // là quand on la cherche. Seulement s'il y a vraiment à décomposer — un
      // « 4 de base » sous un 4 ne servirait à rien.
      const parts = (detail ?? []).filter(([v]) => v > 0);
      if (parts.length >= 2) {
        l.dataset.tooltip = parts.map(([v, cle]) => `${v} ${t(cle)}`).join("\n+ ");
      }
      return l;
    }));

    const seuilXp = xpPourNiveau(heros.niveau);
    const pct = seuilXp > 0 ? Math.max(0, Math.min(100, heros.xp / seuilXp * 100)) : 0;
    elXpFill.style.width = pct + "%";
    elXpTxt.textContent = `${heros.xp} / ${seuilXp} XP`;
  }

  function rendreGrille() {
    elGrille.replaceChildren();
    const rangs = rangsInventaire(inventaire, sacAffiche());
    const cols  = colsInventaire(inventaire, sacAffiche());
    elGrille.style.width  = cols  * CASE + "px";
    elGrille.style.height = rangs * CASE + "px";

    // Item sous le curseur clavier (null si case vide ou pas de curseur).
    const objetSousCurseur = (cursorVisible && !tenu)
      ? objetSousCase(inventaire, cursorX, cursorY, sacAffiche())
      : null;

    for (const o of inventaire.objets) {
      if ((o.sac ?? 0) !== sacAffiche()) continue; // seulement les objets de l'onglet affiché
      const d = itemDef(o.id);
      const ic = iconeItem(o.id, o.qualite);
      if (tenu && o === tenu.objet) ic.classList.add("inv-item--tenu"); // grisé (en main)
      if (o === objetSousCurseur) ic.classList.add("inv-item--focus"); // focus clavier
      ic.style.position = "absolute";
      ic.style.left = o.x * CASE + 1 + "px";
      ic.style.top = o.y * CASE + 1 + "px";
      ic.style.width = d.taille.l * CASE - 4 + "px";
      ic.style.height = d.taille.h * CASE - 4 + "px";
      if (o.quantite > 1) { // pile de ressources : badge ×N en bas à droite
        const q = document.createElement("span");
        q.className = "inv-item-qte";
        q.textContent = o.quantite;
        ic.append(q);
      }
      ic.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        if (tenu) return;
        ouvrirContexte(ev.clientX, ev.clientY, menuSac(o));
      });
      elGrille.append(ic);
    }
    // Aperçu de pose (objet tenu) : rectangle vert/rouge sur la case de dépôt.
    // Aperçu de pose : seulement pour un objet venu du SAC. Celui venu d'un
    // emplacement équipé n'a pas d'empreinte à projeter — il ira où il pourra.
    if (tenu?.objet) {
      refCible = document.createElement("div");
      refCible.className = "inv-cible";
      elGrille.append(refCible);
      majApercuCible();
    } else if (cursorVisible && !objetSousCurseur) {
      // Curseur de navigation clavier : carré rouge sur la case active (case vide seulement).
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
    if (!enStats()) dernierSac = ongletActif;   // mémorise le sac avant d'aller aux stats
    clamperCurseur();
    if (!tenu) cacherInfobulle(); // une icône survolée peut disparaître (équip/déséquip)
    elOr.textContent = inventaire.or;
    // La VIE : chiffres + barre rouge sous le héros.
    elPv.textContent = `${heros.pv}/${heros.pvMax}`;
    if (elPvFill) {
      const pct = heros.pvMax > 0 ? Math.max(0, Math.min(100, heros.pv / heros.pvMax * 100)) : 0;
      elPvFill.style.width = pct + "%";
    }
    // Sac OU stats : jamais les deux (ils occupent la même place).
    elGrille.hidden = enStats();
    elStats.hidden = !enStats();
    rendreColonne(elGauche, COL_GAUCHE);
    rendreBagues();
    rendreColonne(elArmes, SLOTS_ARME);
    rendreHero();
    rendreStats();
    rendreOnglets();
    rendreGrille();
    majAide();
  }

  function clamperCurseur() {
    // 2e sac retiré alors qu'on le regardait → retour au sac principal. Le test
    // ne vaut que pour les onglets de SAC : « stats » n'est pas un numéro.
    if (typeof ongletActif === "number" && ongletActif >= nbSacs(inventaire)) ongletActif = 0;
    if (dernierSac >= nbSacs(inventaire)) dernierSac = 0;
    const rangs = rangsInventaire(inventaire, sacAffiche());
    cursorX = Math.max(0, Math.min(colsInventaire(inventaire, sacAffiche()) - 1, cursorX));
    cursorY = Math.max(0, Math.min(rangs - 1, cursorY));
  }

  // Barre d'ONGLETS de sac (au-dessus de la grille). Un onglet par sac équipé ;
  // clic pour basculer (souris). En tenant un objet, basculer permet de le poser
  // dans l'autre sac. Toujours au moins l'onglet « Bag ».
  function rendreOnglets() {
    if (!elOnglets) return;
    const nb = nbSacs(inventaire);
    const boutons = listeOnglets().map((id) => {
      const b = document.createElement("button");
      b.className = "inv-onglet" + (id === ongletActif ? " inv-onglet--actif" : "");
      // ⚠ Les libellés étaient ÉCRITS EN DUR en anglais ici — ils restaient donc
      // « Bag » même en français. Ils passent par les textes comme le reste.
      b.textContent = id === STATS ? t("inv.ongletStats")
                    : nb > 1 ? t(id === 0 ? "inv.slot.sac" : "inv.slot.sac2")
                    : t("inv.slot.sac");
      b.addEventListener("click", () => setOnglet(id));
      return b;
    });
    elOnglets.replaceChildren(...boutons);
  }

  return {
    ouvrir() {
      // Focus clavier : inventaire actif seulement en mode solo. En boutique ou
      // en butin, le focus démarre dans le panneau externe (dialogue / butin) ;
      // Tab bascule vers l'inventaire (et retour).
      const enButinNow = document.body.classList.contains("en-butin");
      kbFocus = !dialogueActif() && !enButinNow;
      cursorX = 0; cursorY = 0; cursorVisible = false; ongletActif = 0;
      overlay.querySelector(".inv-panneau").classList.toggle("inv-panneau--focus", kbFocus);
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
