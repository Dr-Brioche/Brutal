// L'écran de l'arbre de talents (touche T) : on y voit son niveau, son XP, ses
// points, et on débloque des nœuds (qui donnent les CHIFFRES du héros).
//
// Les nœuds sont des boutons ronds posés sur une grille, reliés par des traits
// (SVG) de prérequis à nœud. Couleur : débloqué / disponible / bloqué.

import { TALENTS, TALENT_GRILLE, BRANCHES, descEffet } from "../data/talents.js";
import { etatNoeud, debloquer, activerOuBasculer } from "../systems/talents.js";
import { xpPourNiveau } from "../systems/progression.js";

const COL_W = 92, ROW_H = 78, NODE = 46; // pas de la grille + taille d'un nœud
const HEADER_H = 30;                      // bande d'en-têtes des branches (en haut)

// Une petite icône selon le 1er effet du nœud.
function iconeNoeud(n) {
  if (n.action) return "😇";     // talent de TEST « action » (God Mode)
  if (n.legendaire) return "✦";
  const k = Object.keys(n.effet || {})[0];
  return {
    pvMax: "❤", vitesse: "👟", pioche: "🃏", agilite: "⚡", evasion: "🐾",
    chaleurSeuil: "🔥", chaleurMax: "🔥", chaleurDepart: "🔥", chaleurRecharge: "🔥",
    artisanat: "⚒", sacSecondaire: "🎒", noblesse: "👑", sansRencontre: "🚫",
    choixProfondeur: "⛏",
  }[k] || "★";
}

export function installerTalents({ heros, surChangement, surFermer, surAction }) {
  const overlay = document.getElementById("talents");
  const elNiveau = document.getElementById("tal-niveau");
  const elPoints = document.getElementById("tal-points");
  const elXpFill = document.getElementById("tal-xp-fill");
  const elXpTxt = document.getElementById("tal-xp-txt");
  const elArbre = document.getElementById("tal-arbre");
  const elLiens = document.getElementById("tal-liens");
  const elDesc = document.getElementById("tal-desc");
  document.getElementById("tal-fermer").onclick = () => surFermer();

  const W = TALENT_GRILLE.cols * COL_W, H = TALENT_GRILLE.lignes * ROW_H + HEADER_H;
  elArbre.style.width = W + "px";
  elArbre.style.height = H + "px";
  elLiens.setAttribute("viewBox", `0 0 ${W} ${H}`);

  // Fonds + en-têtes des 3 branches (une seule fois). Posés SOUS les liens/nœuds.
  for (const b of Object.values(BRANCHES)) {
    const [c0, c1] = b.cols;
    const x = c0 * COL_W, w = (c1 - c0 + 1) * COL_W;
    const fond = document.createElement("div");
    fond.className = "tal-branche-fond";
    fond.style.cssText =
      `left:${x + 3}px;top:${HEADER_H}px;width:${w - 6}px;height:${H - HEADER_H - 4}px;` +
      `background:${b.couleur}12;border:1px solid ${b.couleur}33;`;
    elArbre.insertBefore(fond, elArbre.firstChild);
    const tete = document.createElement("div");
    tete.className = "tal-branche-tete";
    tete.textContent = `${b.icone} ${b.nom}`;
    tete.style.cssText = `left:${x}px;top:4px;width:${w}px;color:${b.couleur};`;
    elArbre.appendChild(tete);
  }

  // y décalé de HEADER_H pour laisser la bande d'en-têtes en haut.
  const centre = (n) => ({ x: n.x * COL_W + COL_W / 2, y: n.y * ROW_H + ROW_H / 2 + HEADER_H });

  let selection = null; // nœud sélectionné au clavier

  // Sélection d'ouverture : un nœud DISPONIBLE sinon le premier (la racine).
  function premierPertinent() {
    const ids = Object.keys(TALENTS);
    return ids.find((id) => etatNoeud(heros, id) === "disponible") || ids[0];
  }

  // Déplace la sélection vers le nœud voisin le plus proche dans la direction
  // (on privilégie un nœud aligné).
  function voisin(dir) {
    const cur = TALENTS[selection];
    if (!cur) return;
    let best = null, meilleur = Infinity;
    for (const n of Object.values(TALENTS)) {
      if (n.id === selection) continue;
      const dx = n.x - cur.x, dy = n.y - cur.y;
      let ok = false, principal = 0, lateral = 0;
      if (dir === "droite") { ok = dx > 0; principal = dx; lateral = Math.abs(dy); }
      else if (dir === "gauche") { ok = dx < 0; principal = -dx; lateral = Math.abs(dy); }
      else if (dir === "bas") { ok = dy > 0; principal = dy; lateral = Math.abs(dx); }
      else if (dir === "haut") { ok = dy < 0; principal = -dy; lateral = Math.abs(dx); }
      if (!ok) continue;
      const score = principal + lateral * 3;
      if (score < meilleur) { meilleur = score; best = n.id; }
    }
    if (best) { selection = best; rendre(); }
  }

  // Flèches + WASD + ZQSD (AZERTY) → déplacement ; Espace/Entrée → débloquer.
  const DIRS = {
    ArrowLeft: "gauche", KeyA: "gauche", KeyQ: "gauche",
    ArrowRight: "droite", KeyD: "droite",
    ArrowUp: "haut", KeyW: "haut", KeyZ: "haut",
    ArrowDown: "bas", KeyS: "bas",
  };
  // Active un nœud : soit une ACTION de test (God Mode → surAction), soit un
  // déblocage/bascule normal (dépense de points ou toggle).
  function activer(id) {
    const n = TALENTS[id];
    if (!n) return;
    if (n.action) { surAction?.(id); surChangement(); rendre(); decrire(n); return; }
    if (activerOuBasculer(heros, id)) { surChangement(); rendre(); decrire(n); }
  }

  function surTouche(e) {
    if (DIRS[e.code]) {
      e.preventDefault(); e.stopPropagation();
      voisin(DIRS[e.code]);
    } else if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault(); e.stopPropagation();
      activer(selection);
    }
    // Échap : laissé au reste du jeu (ferme l'écran)
  }

  function decrire(n) {
    const etat = etatNoeud(heros, n.id);
    const rang = heros.talents?.[n.id] || 0;
    const rmax = n.rangMax || 1;
    // Talent à rangs (ex. Master Craftsman ×3) : on montre la progression.
    let cout;
    if (rmax > 1) {
      cout = rang >= rmax ? `maxed · ${rang}/${rmax}`
        : rang > 0 ? `rank ${rang}/${rmax} · next ${n.cout} pt`
        : `${n.cout} pt · ${rmax} ranks`;
    } else {
      cout = etat === "debloque" ? "owned" : `${n.cout} pt`;
    }
    const texteEffet = n.description || descEffet(n.effet);
    const badge = n.legendaire ? ' <span class="tal-legendaire">✦ Legendary</span>' : "";
    elDesc.innerHTML = `<b>${n.nom}</b>${badge} — ${texteEffet} <span class="tal-desc-cout">(${cout})</span>`;
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
      b.className = "tal-noeud tal-" + etatNoeud(heros, n.id) + (n.id === selection ? " tal-noeud--sel" : "");
      b.style.left = (c.x - NODE / 2) + "px";
      b.style.top = (c.y - NODE / 2) + "px";
      b.style.width = NODE + "px";
      b.style.height = NODE + "px";
      b.textContent = iconeNoeud(n);
      // Talent à rangs : pastille du rang courant en bas à droite (ex. « 2/3 »).
      const rang = heros.talents?.[n.id] || 0;
      if ((n.rangMax || 1) > 1 && rang > 0) {
        const badge = document.createElement("span");
        badge.textContent = `${rang}/${n.rangMax}`;
        badge.style.cssText =
          "position:absolute;right:-4px;bottom:-4px;font-size:10px;font-weight:700;" +
          "background:#1c1a16;color:#e0b64e;border-radius:8px;padding:0 3px;line-height:14px;";
        b.appendChild(badge);
      }
      b.addEventListener("mouseenter", () => decrire(n));
      b.addEventListener("click", () => {
        selection = n.id;
        activer(n.id);
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
    const sel = TALENTS[selection];
    if (sel) decrire(sel); // la description suit la sélection (clavier)
  }

  return {
    ouvrir() {
      selection = premierPertinent();
      rendre();
      overlay.hidden = false;
      window.addEventListener("keydown", surTouche, true);
    },
    fermer() {
      overlay.hidden = true;
      window.removeEventListener("keydown", surTouche, true);
    },
    rendre,
  };
}
