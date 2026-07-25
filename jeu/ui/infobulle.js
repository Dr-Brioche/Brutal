// La bulle d'info d'un OBJET, partagée par l'inventaire ET le marchand : nom,
// rareté/catégorie, infos utiles et surtout un VISUEL des cartes que l'objet
// ajoute au deck (même rendu que dans le deck) — pour savoir d'un coup d'œil ce
// qu'on récupère, achète ou vend.
//
// Singleton : tout passe par l'élément #inv-tip (une seule bulle à la fois). On
// peut la placer SOUS LA SOURIS (montrerInfobulle) ou À CÔTÉ D'UN ÉLÉMENT
// (montrerInfobulleEl) — ce dernier sert à la navigation au CLAVIER.

import { itemDef, couleurRarete, statsLisibles, categorieLisible, RARETES, setDeItem, comboArmeActif } from "../data/items.js";
import { CARTES } from "../data/cartes.js";
import { QUALITES, forceQualite } from "../data/recettes.js";
import { cartesSuppleanceSlot } from "../systems/combat.js";
import { garnirCarte } from "./carte.js";
import { t } from "../systems/langue.js";

let tip = null;
function bulle() {
  return (tip ||= document.getElementById("inv-tip"));
}

let delaiTimer = null;
let pendingId  = null;
let pendingEl  = null;
let pendingQualite = null;
let lastMX = 0, lastMY = 0;

function annulerDelai() {
  if (delaiTimer !== null) { clearTimeout(delaiTimer); delaiTimer = null; }
  pendingId = null;
  pendingEl = null;
  pendingQualite = null;
}

// Source de l'équipement courant (pour colorer les pièces d'un set : vert =
// équipée, gris = manquante). On stocke un GETTER et non l'objet slots, car il
// est recréé au chargement d'une sauvegarde (cf. chargerInventaire).
let sourceEquipement = null;
export function definirSourceEquipement(fn) { sourceEquipement = fn; }
function equipementActuel() {
  try { return sourceEquipement?.() ?? {}; } catch (_) { return {}; }
}

// Construit le bloc « set d'armure » d'un item qui appartient à un set : nom du
// set + ses pièces (vert si équipée, gris sinon) + le bonus (mis en avant quand
// les 3 pièces sont réunies). Renvoie null si l'item n'est dans aucun set.
function blocSet(id) {
  const set = setDeItem(id);
  if (!set) return null;
  const equipes = new Set(Object.values(equipementActuel() || {}).filter(Boolean));
  const nbEq = set.pieces.filter((p) => equipes.has(p)).length;
  const complet = nbEq === set.pieces.length;

  const bloc = document.createElement("div");
  bloc.className = "inv-tip-set" + (complet ? " inv-tip-set--actif" : "");

  const titre = document.createElement("div");
  titre.className = "inv-tip-set-titre";
  titre.textContent = `${set.nom} · ${nbEq}/${set.pieces.length}`;
  bloc.append(titre);

  const liste = document.createElement("div");
  liste.className = "inv-tip-set-pieces";
  for (const pid of set.pieces) {
    const estEquipe = equipes.has(pid);
    const p = document.createElement("div");
    p.className = "inv-tip-set-piece" + (estEquipe ? " inv-tip-set-piece--equipe" : "");
    const def = itemDef(pid);
    p.textContent = (estEquipe ? "✓ " : "• ") + (def ? def.nom : pid);
    liste.append(p);
  }
  bloc.append(liste);

  const bonus = document.createElement("div");
  bonus.className = "inv-tip-set-bonus";
  bonus.textContent = (complet ? "" : t("tip.setComplet")) + (set.bonus?.texte ?? "");
  bloc.append(bonus);

  return bloc;
}

// Bloc « combo d'arme » (ex. Twin Daggers, Basilisk Fang) : le bonus de Force
// permanente, mis en avant si la condition est REMPLIE par l'équipement actuel
// (cette arme en main principale + la bonne arme en off-hand). Null sinon.
function blocCombo(id) {
  const d = itemDef(id);
  if (!d?.comboArme) return null;
  const eq = equipementActuel() || {};
  const actif = eq.arme1 === id && comboArmeActif(eq) != null;

  const bloc = document.createElement("div");
  bloc.className = "inv-tip-set" + (actif ? " inv-tip-set--actif" : "");
  const titre = document.createElement("div");
  titre.className = "inv-tip-set-titre";
  titre.textContent = t("tip.comboArme");
  bloc.append(titre);
  const bonus = document.createElement("div");
  bonus.className = "inv-tip-set-bonus";
  bonus.textContent = (actif ? "" : t("tip.comboCondition")) + d.comboArme.texte;
  bloc.append(bonus);
  return bloc;
}

// Remplit la bulle pour l'objet `id` (sans la positionner). Renvoie false si l'id
// est inconnu.
function construire(id, qualite = null) {
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

  const enfants = [nom, rarete];
  // Qualité de FORGE (exemplaire forgé) : ligne colorée, ex. « ⚒ Master · +2 Force ».
  // Les objets lootés (qualite absente ou "normale") n'en affichent pas.
  const q = qualite && qualite !== "normale" ? QUALITES[qualite] : null;
  if (q) {
    const force = forceQualite(d?.rarete, qualite);
    const ql = document.createElement("div");
    ql.className = "inv-tip-rarete";
    ql.style.color = q.couleur;
    ql.textContent = `⚒ ${q.nom}${force > 0 ? ` · +${force} Force` : ""}`;
    enfants.push(ql);
  }
  enfants.push(...lignes);

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
      const badge = document.createElement("span"); // toujours affiché (×1, ×2, ×3…)
      badge.className = "inv-tip-nombre";
      badge.textContent = `×${n}`;
      carte.append(badge);
      cont.append(carte);
    }
    enfants.push(cont);
  }

  // Bloc « set d'armure » si l'objet en fait partie (pièces équipées en vert).
  const set = blocSet(id);
  if (set) enfants.push(set);

  // Bloc « combo d'arme » (Twin Daggers, Basilisk Fang) si l'objet en a un.
  const combo = blocCombo(id);
  if (combo) enfants.push(combo);

  t.replaceChildren(...enfants);
  t.hidden = false;
  return true;
}

// Affiche la bulle SOUS LA SOURIS (survol) — avec délai de 500 ms.
export function montrerInfobulle(id, e, qualite = null) {
  lastMX = e.clientX; lastMY = e.clientY;
  if (pendingId === id && pendingQualite === qualite) return;
  annulerDelai();
  bulle().hidden = true;
  pendingId = id;
  pendingQualite = qualite;
  delaiTimer = setTimeout(() => {
    delaiTimer = null;
    if (construire(pendingId, pendingQualite)) suivreInfobulle({ clientX: lastMX, clientY: lastMY });
  }, 500);
}

// La bulle suit la souris en restant dans l'écran.
export function suivreInfobulle(e) {
  lastMX = e.clientX; lastMY = e.clientY;
  const t = bulle();
  if (t.hidden) return;
  const m = 14;
  const r = t.getBoundingClientRect();
  let x = e.clientX + m, y = e.clientY + m;
  if (x + r.width + 8 > innerWidth) x = e.clientX - r.width - m;
  if (y + r.height + 8 > innerHeight) y = e.clientY - r.height - m;
  t.style.left = Math.max(8, x) + "px";
  t.style.top = Math.max(8, y) + "px";
}

// Affiche la bulle À CÔTÉ d'un élément (à sa droite, ou à gauche si pas de place)
// — pour la navigation au CLAVIER (le marchand, par ex.) — avec délai de 500 ms.
export function montrerInfobulleEl(id, el, qualite = null) {
  annulerDelai();
  bulle().hidden = true;
  pendingId = id;
  pendingEl = el;
  pendingQualite = qualite;
  delaiTimer = setTimeout(() => {
    delaiTimer = null;
    if (!construire(pendingId, pendingQualite)) return;
    const t = bulle();
    const r = pendingEl.getBoundingClientRect();
    const tr = t.getBoundingClientRect();
    const m = 10;
    let x = r.right + m;
    if (x + tr.width + 8 > innerWidth) x = r.left - tr.width - m;
    let y = r.top;
    if (y + tr.height + 8 > innerHeight) y = innerHeight - tr.height - 8;
    t.style.left = Math.max(8, x) + "px";
    t.style.top = Math.max(8, y) + "px";
  }, 500);
}

// Note affichée au survol d'un SLOT VIDE qui injecte des cartes de SUPPLÉANCE
// (main/off/torse/gants/bottes nus) : montre, comme la bulle d'un objet, le
// visuel de la/les carte(s) que ce slot vide ajoute au deck — pour comprendre
// d'où viennent ces cartes faibles et pourquoi il vaut mieux équiper le slot.
// Ne montre RIEN (et masque la bulle) pour un slot sans suppléance (collier,
// bagues, sac). `label` = intitulé affiché du slot (« Hands », « Body »…).
export function montrerNoteSlotVide(slot, label, e) {
  annulerDelai();
  const supp = cartesSuppleanceSlot(slot);
  const c = supp && CARTES[supp.id];
  if (!c) { cacherInfobulle(); return false; }
  const bl = bulle();

  const nom = document.createElement("div");
  nom.className = "inv-tip-nom";
  nom.textContent = t("tip.slotVide", { label });
  nom.style.color = "#9aa0a6"; // gris : emplacement vide

  const expl = document.createElement("div");
  expl.className = "inv-tip-ligne";
  expl.textContent = t("tip.slotVideExpl");

  const cont = document.createElement("div");
  cont.className = "inv-tip-cartes";
  const carte = document.createElement("div");
  carte.className = "combat-carte";
  garnirCarte(carte, c);
  const badge = document.createElement("span");
  badge.className = "inv-tip-nombre";
  badge.textContent = `×${supp.nb}`;
  carte.append(badge);
  cont.append(carte);

  const astuce = document.createElement("div");
  astuce.className = "inv-tip-ligne";
  astuce.textContent = t("tip.slotVideAstuce");

  bl.replaceChildren(nom, expl, cont, astuce);
  bl.hidden = false;
  suivreInfobulle(e);
  return true;
}

export function cacherInfobulle() {
  annulerDelai();
  bulle().hidden = true;
}
