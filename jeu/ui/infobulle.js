// La bulle d'info d'un OBJET, partagée par l'inventaire ET le marchand : nom,
// rareté/catégorie, infos utiles et surtout un VISUEL des cartes que l'objet
// ajoute au deck (même rendu que dans le deck) — pour savoir d'un coup d'œil ce
// qu'on récupère, achète ou vend.
//
// Singleton : tout passe par l'élément #inv-tip (une seule bulle à la fois). On
// peut la placer SOUS LA SOURIS (montrerInfobulle) ou À CÔTÉ D'UN ÉLÉMENT
// (montrerInfobulleEl) — ce dernier sert à la navigation au CLAVIER.

import { itemDef, couleurRarete, statsLisibles, categorieLisible, RARETES } from "../data/items.js";
import { CARTES } from "../data/cartes.js";
import { garnirCarte } from "./carte.js";

let tip = null;
function bulle() {
  return (tip ||= document.getElementById("inv-tip"));
}

// Remplit la bulle pour l'objet `id` (sans la positionner). Renvoie false si l'id
// est inconnu.
function construire(id) {
  const d = itemDef(id);
  if (!d) return false;
  const t = bulle();

  const nom = document.createElement("div");
  nom.className = "inv-tip-nom";
  nom.textContent = d.nom;
  nom.style.color = couleurRarete(id);

  const rarete = document.createElement("div");
  rarete.className = "inv-tip-rarete";
  rarete.textContent = `${RARETES[d.rarete]?.nom ?? ""} · ${categorieLisible(id)}`;

  const lignes = statsLisibles(id).map((txt) => {
    const l = document.createElement("div");
    l.className = "inv-tip-ligne";
    l.textContent = txt;
    return l;
  });

  const enfants = [nom, rarete, ...lignes];

  // Le visuel des cartes ajoutées par l'objet (comme dans le deck, en mini).
  // On regroupe les exemplaires d'une même carte → badge « ×N » en haut à droite.
  const cartes = d.cartes ?? [];
  if (cartes.length) {
    const cont = document.createElement("div");
    cont.className = "inv-tip-cartes";
    const groupes = new Map();
    for (const cid of cartes) groupes.set(cid, (groupes.get(cid) || 0) + 1);
    for (const [cid, n] of groupes) {
      const c = CARTES[cid];
      if (!c) continue;
      const carte = document.createElement("div");
      carte.className = "combat-carte";
      garnirCarte(carte, c);
      if (n > 1) {
        const badge = document.createElement("span");
        badge.className = "inv-tip-nombre";
        badge.textContent = `×${n}`;
        carte.append(badge);
      }
      cont.append(carte);
    }
    enfants.push(cont);
  }

  t.replaceChildren(...enfants);
  t.hidden = false;
  return true;
}

// Affiche la bulle SOUS LA SOURIS (survol).
export function montrerInfobulle(id, e) {
  if (construire(id)) suivreInfobulle(e);
}

// La bulle suit la souris en restant dans l'écran.
export function suivreInfobulle(e) {
  const t = bulle();
  const m = 14;
  const r = t.getBoundingClientRect();
  let x = e.clientX + m, y = e.clientY + m;
  if (x + r.width + 8 > innerWidth) x = e.clientX - r.width - m;
  if (y + r.height + 8 > innerHeight) y = e.clientY - r.height - m;
  t.style.left = Math.max(8, x) + "px";
  t.style.top = Math.max(8, y) + "px";
}

// Affiche la bulle À CÔTÉ d'un élément (à sa droite, ou à gauche si pas de place)
// — pour la navigation au CLAVIER (le marchand, par ex.).
export function montrerInfobulleEl(id, el) {
  if (!construire(id)) return;
  const t = bulle();
  const r = el.getBoundingClientRect();
  const tr = t.getBoundingClientRect();
  const m = 10;
  let x = r.right + m;
  if (x + tr.width + 8 > innerWidth) x = r.left - tr.width - m; // pas de place à droite → à gauche
  let y = r.top;
  if (y + tr.height + 8 > innerHeight) y = innerHeight - tr.height - 8;
  t.style.left = Math.max(8, x) + "px";
  t.style.top = Math.max(8, y) + "px";
}

export function cacherInfobulle() {
  bulle().hidden = true;
}
