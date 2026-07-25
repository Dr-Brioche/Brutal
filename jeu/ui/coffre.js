// L'ÉCRAN DU COFFRE DE VILLE : le SAC du héros à gauche, le COFFRE à droite.
// Deux façons de déplacer un objet d'un côté à l'autre :
//   - GLISSER-DÉPOSER (souris, façon Windows) : appuyer sur un objet, déplacer en
//     gardant enfoncé (l'objet suit), relâcher sur la grille voulue pour le poser
//     (case précise si libre, sinon rangé automatiquement). Lâché ailleurs = il
//     revient à sa place.
//   - CLIC SIMPLE : envoie l'objet dans l'autre contenant (rangé auto).
//   - CLAVIER : ←↑→↓ déplacent un curseur, Tab change de grille, Entrée/Espace
//     envoie l'objet sous le curseur dans l'autre contenant. Échap ferme.
// (Règle du projet : tout est jouable souris OU clavier.)
//
// La grille et les icônes réutilisent le style de l'inventaire (classes .inv-*).

import { itemDef, couleurRarete } from "../data/items.js";
import { t } from "../systems/langue.js";
import { rangsInventaire, colsInventaire, nbSacs, objetSousCase, peutPlacerA, deplacerObjet } from "../systems/inventaire.js";
import { transfererObjet, coffreCols, coffreRangs } from "../systems/coffre.js";
import { montrerToast } from "./effets.js";
import { montrerInfobulle, suivreInfobulle, cacherInfobulle } from "./infobulle.js";

const CASE = 34;      // même taille de case que l'inventaire (doit matcher le fond CSS)
const SEUIL_DRAG = 5; // px de mouvement avant de passer du « clic » au « glisser »

let actif = false;
export function coffreActif() { return actif; }

export function installerCoffre() {
  const panneau     = document.getElementById("coffre");
  const elSac       = document.getElementById("coffre-sac");
  const elCoffre    = document.getElementById("coffre-grille");
  const elOnglets   = document.getElementById("coffre-onglets");
  const boutonFermer = document.getElementById("coffre-fermer");

  let inv = null, cof = null, surChangement = null, surFermer = null;
  let ongletSac = 0;                 // onglet de sac affiché (0 = principal)
  let focusGrille = "sac";           // "sac" ou "coffre" (navigation clavier)
  let curX = 0, curY = 0;            // curseur clavier
  let curVisible = false;            // le curseur n'apparaît qu'au clavier
  let pending = null;                // clic enfoncé, pas encore un drag { objet, depuis, offX, offY, sx, sy }
  let tenu = null;                   // drag en cours { objet, depuis, offX, offY, ghost }

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
    el.addEventListener("mouseenter", (e) => { if (!tenu) montrerInfobulle(o.id, e, o.qualite); });
    el.addEventListener("mousemove", (e) => { if (!tenu) suivreInfobulle(e); });
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

  // ---- Glisser-déposer -------------------------------------------------------
  function creerGhost(o) {
    const d = itemDef(o.id);
    const g = document.createElement("div");
    g.className = "inv-item inv-ghost";
    g.style.borderColor = couleurRarete(o.id);
    g.style.width = d.taille.l * CASE - 4 + "px";
    g.style.height = d.taille.h * CASE - 4 + "px";
    if (d.image) { g.classList.add("inv-item--img"); g.style.backgroundImage = `url("${d.image}")`; }
    else { g.style.background = d.icone; const t = document.createElement("span"); t.textContent = d.nom; t.style.color = couleurRarete(o.id); g.append(t); }
    document.body.append(g);
    return g;
  }
  function ghostSuit(cx, cy) {
    if (!tenu) return;
    tenu.ghost.style.left = cx - tenu.ghost.offsetWidth / 2 + "px";
    tenu.ghost.style.top  = cy - tenu.ghost.offsetHeight / 2 + "px";
  }
  function finDrag() {
    if (tenu) { tenu.ghost.remove(); tenu = null; }
    rendre();
  }

  // Case (x,y) d'une grille sous un point écran.
  function caseDe(el, cx, cy) {
    const r = el.getBoundingClientRect();
    return { x: Math.floor((cx - r.left) / CASE), y: Math.floor((cy - r.top) / CASE) };
  }

  // Pose l'objet tenu sur la grille `nom` à la case (x,y) : repositionnement dans
  // le même contenant, sinon transfert (case exacte si libre, sinon rangé auto).
  function deposer(nom, x, y) {
    const src = tenu.depuis === "sac" ? inv : cof;
    const dst = nom === "sac" ? inv : cof;
    const dstTab = nom === "sac" ? ongletSac : 0;
    const dim = nom === "sac" ? dimsSac() : dimsCoffre();
    const d = itemDef(tenu.objet.id);
    x = Math.max(0, Math.min(dim.cols - d.taille.l, x - tenu.offX));
    y = Math.max(0, Math.min(dim.rangs - d.taille.h, y - tenu.offY));
    let ok;
    if (src === dst) {
      ok = deplacerObjet(src, tenu.objet, x, y, dstTab);          // réorganiser
    } else if (peutPlacerA(dst, { id: tenu.objet.id, sac: dstTab }, x, y, dstTab)) {
      const i = src.objets.indexOf(tenu.objet);                   // case exacte libre
      if (i !== -1) { src.objets.splice(i, 1); dst.objets.push({ ...tenu.objet, x, y, sac: dstTab }); ok = true; }
    } else {
      ok = transfererObjet(src, dst, tenu.objet);                 // case prise → rangé auto
      if (!ok) montrerToast(nom === "sac" ? "🎒 Bag is full." : "📦 Chest is full.");
    }
    if (ok && surChangement) surChangement();
  }

  function surPointerMove(ev) {
    if (tenu) { ghostSuit(ev.clientX, ev.clientY); return; }
    if (pending && Math.hypot(ev.clientX - pending.sx, ev.clientY - pending.sy) > SEUIL_DRAG) {
      cacherInfobulle();
      tenu = { objet: pending.objet, depuis: pending.depuis, offX: pending.offX, offY: pending.offY, ghost: creerGhost(pending.objet) };
      pending = null;
      rendre();                    // grise l'objet source
      ghostSuit(ev.clientX, ev.clientY);
    }
  }
  function surPointerUp(ev) {
    if (ev.button !== 0) return;
    if (tenu) {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const surSac    = el && el.closest && el.closest("#coffre-sac");
      const surCoffre = el && el.closest && el.closest("#coffre-grille");
      if (surSac || surCoffre) {
        const nom = surSac ? "sac" : "coffre";
        const c = caseDe(surSac ? elSac : elCoffre, ev.clientX, ev.clientY);
        deposer(nom, c.x, c.y);
      }
      finDrag();                   // lâché hors grille = l'objet revient à sa place
    } else if (pending) {
      envoyer(pending.objet, pending.depuis); // simple clic (pas de mouvement) = transfert
    }
    pending = null;
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
      if (tenu && o === tenu.objet) ic.classList.add("inv-item--tenu"); // grisé pendant le drag
      ic.style.position = "absolute";
      ic.style.left = o.x * CASE + 1 + "px";
      ic.style.top  = o.y * CASE + 1 + "px";
      ic.style.width  = d.taille.l * CASE - 4 + "px";
      ic.style.height = d.taille.h * CASE - 4 + "px";
      if ((o.quantite ?? 1) > 1) {
        const q = document.createElement("span");
        q.className = "inv-item-qte"; q.textContent = o.quantite; ic.append(q);
      }
      ic.title = t("coffre.deplacer");
      // Appui = début d'un drag potentiel (ou d'un clic si on ne bouge pas).
      ic.addEventListener("pointerdown", (ev) => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        const c = caseDe(el, ev.clientX, ev.clientY);
        pending = { objet: o, depuis, offX: c.x - o.x, offY: c.y - o.y, sx: ev.clientX, sy: ev.clientY };
      });
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
    for (let ti = 0; ti < n; ti++) {
      const b = document.createElement("button");
      b.className = "inv-onglet" + (ti === ongletSac ? " inv-onglet--actif" : "");
      b.textContent = ti === 0 ? t("inv.slot.sac") : t("inv.slot.sac2");
      b.addEventListener("click", () => { ongletSac = ti; clamperCurseur(); rendre(); });
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
    pending = null; tenu = null;
    panneau.hidden = false;
    actif = true;
    rendre();
    window.addEventListener("keydown", surClavier, true);
    window.addEventListener("pointermove", surPointerMove, true);
    window.addEventListener("pointerup", surPointerUp, true);
    boutonFermer.focus();
  }

  function fermer() {
    if (!actif) return;
    actif = false;
    if (tenu) { tenu.ghost.remove(); tenu = null; }
    pending = null;
    panneau.hidden = true;
    cacherInfobulle();
    window.removeEventListener("keydown", surClavier, true);
    window.removeEventListener("pointermove", surPointerMove, true);
    window.removeEventListener("pointerup", surPointerUp, true);
    if (surFermer) surFermer();
  }

  boutonFermer.addEventListener("click", fermer);

  return { ouvrir, fermer, actif: () => actif };
}
