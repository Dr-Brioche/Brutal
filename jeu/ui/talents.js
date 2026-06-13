// L'écran de l'arbre de talents (touche T) : on y voit son niveau, son XP, ses
// points, et on débloque des nœuds (qui donnent les CHIFFRES du héros).
//
// Les nœuds sont des boutons ronds posés sur une grille, reliés par des traits
// (SVG) de prérequis à nœud. Couleur : débloqué / disponible / bloqué.

import { TALENTS, TALENT_GRILLE, descEffet } from "../data/talents.js";
import { etatNoeud, debloquer } from "../systems/talents.js";
import { xpPourNiveau } from "../systems/progression.js";

const COL_W = 92, ROW_H = 78, NODE = 46; // pas de la grille + taille d'un nœud

// Une petite icône selon le 1er effet du nœud.
function iconeNoeud(n) {
  const k = Object.keys(n.effet || {})[0];
  return {
    pvMax: "❤", vitesse: "👟", pioche: "🃏",
    chaleurSeuil: "🔥", chaleurMax: "🔥", chaleurDepart: "🔥", chaleurRecharge: "🔥",
  }[k] || "★";
}

export function installerTalents({ heros, surChangement, surFermer }) {
  const overlay = document.getElementById("talents");
  const elNiveau = document.getElementById("tal-niveau");
  const elPoints = document.getElementById("tal-points");
  const elXpFill = document.getElementById("tal-xp-fill");
  const elXpTxt = document.getElementById("tal-xp-txt");
  const elArbre = document.getElementById("tal-arbre");
  const elLiens = document.getElementById("tal-liens");
  const elDesc = document.getElementById("tal-desc");
  document.getElementById("tal-fermer").onclick = () => surFermer();

  const W = TALENT_GRILLE.cols * COL_W, H = TALENT_GRILLE.lignes * ROW_H;
  elArbre.style.width = W + "px";
  elArbre.style.height = H + "px";
  elLiens.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const centre = (n) => ({ x: n.x * COL_W + COL_W / 2, y: n.y * ROW_H + ROW_H / 2 });

  function decrire(n) {
    const etat = etatNoeud(heros, n.id);
    const cout = etat === "debloque" ? "owned" : `${n.cout} pt`;
    elDesc.innerHTML = `<b>${n.nom}</b> — ${descEffet(n.effet)} <span class="tal-desc-cout">(${cout})</span>`;
  }

  function rendreLiens() {
    elLiens.replaceChildren();
    for (const n of Object.values(TALENTS)) {
      const c = centre(n);
      for (const r of n.requis || []) {
        const p = TALENTS[r];
        if (!p) continue;
        const pc = centre(p);
        const ligne = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ligne.setAttribute("x1", pc.x); ligne.setAttribute("y1", pc.y);
        ligne.setAttribute("x2", c.x);  ligne.setAttribute("y2", c.y);
        ligne.setAttribute("class",
          "tal-lien" + (etatNoeud(heros, n.id) === "debloque" ? " tal-lien--actif" : ""));
        elLiens.append(ligne);
      }
    }
  }

  function rendreNoeuds() {
    for (const el of [...elArbre.querySelectorAll(".tal-noeud")]) el.remove();
    for (const n of Object.values(TALENTS)) {
      const c = centre(n);
      const b = document.createElement("button");
      b.className = "tal-noeud tal-" + etatNoeud(heros, n.id);
      b.style.left = (c.x - NODE / 2) + "px";
      b.style.top = (c.y - NODE / 2) + "px";
      b.style.width = NODE + "px";
      b.style.height = NODE + "px";
      b.textContent = iconeNoeud(n);
      b.addEventListener("mouseenter", () => decrire(n));
      b.addEventListener("click", () => {
        if (debloquer(heros, n.id)) { surChangement(); rendre(); decrire(n); }
      });
      elArbre.append(b);
    }
  }

  function rendre() {
    elNiveau.textContent = heros.niveau;
    elPoints.textContent = heros.pointsTalent;
    const seuil = xpPourNiveau(heros.niveau);
    elXpFill.style.width = Math.max(0, Math.min(1, heros.xp / seuil)) * 100 + "%";
    elXpTxt.textContent = `${heros.xp} / ${seuil} XP`;
    rendreLiens();
    rendreNoeuds();
  }

  return {
    ouvrir() { rendre(); elDesc.textContent = "Hover a talent to see its effect."; overlay.hidden = false; },
    fermer() { overlay.hidden = true; },
    rendre,
  };
}
