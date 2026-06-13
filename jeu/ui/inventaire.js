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

import { itemDef, couleurRarete, statsLisibles, categorieLisible, RARETES } from "../data/items.js";
import { rangsInventaire, equiper, desequiper } from "../systems/inventaire.js";
import { bonusTalents } from "../systems/talents.js";
import { dessinerCaseEchelle } from "../core/sprites.js";

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
const FORGE_SEUIL = 3, FORGE_MAX = 8, BASE_PIOCHE = 5; // bases (matchent systems/combat.js)

export function installerInventaire({ inventaire, heros, surChangement, surFermer }) {
  const overlay = document.getElementById("inventaire");
  const elGauche = document.getElementById("inv-gauche");
  const elDroite = document.getElementById("inv-droite");
  const elArmes = document.getElementById("inv-armes");
  const elStats = document.getElementById("inv-stats");
  const elGrille = document.getElementById("inv-grille");
  const elOr = document.getElementById("inv-or");
  const elPv = document.getElementById("inv-pv");
  const canvasHero = document.getElementById("inv-hero");
  const tip = document.getElementById("inv-tip");
  document.getElementById("inv-fermer").onclick = () => surFermer();

  // -- La bulle d'info (nom + rareté + stats), affichée au survol d'un objet --
  function montrerTip(id, e) {
    const d = itemDef(id);
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
    tip.replaceChildren(nom, rarete, ...lignes);
    tip.hidden = false;
    placerTip(e);
  }
  // La bulle suit la souris, en restant dans l'écran.
  function placerTip(e) {
    const m = 14;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + m, y = e.clientY + m;
    if (x + r.width + 8 > innerWidth) x = e.clientX - r.width - m;
    if (y + r.height + 8 > innerHeight) y = e.clientY - r.height - m;
    tip.style.left = Math.max(8, x) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }
  function cacherTip() { tip.hidden = true; }

  function iconeItem(id) {
    const d = itemDef(id);
    const el = document.createElement("div");
    el.className = "inv-item";
    el.style.background = d.icone;
    el.style.borderColor = couleurRarete(id);
    const t = document.createElement("span");
    t.textContent = d.nom;
    el.append(t);
    el.addEventListener("mouseenter", (e) => montrerTip(id, e));
    el.addEventListener("mousemove", placerTip);
    el.addEventListener("mouseleave", cacherTip);
    return el;
  }

  // Un slot d'équipement (objet équipé → clic pour déséquiper ; sinon libellé).
  function slotEl(slot) {
    const cell = document.createElement("div");
    cell.className = "inv-slot";
    const id = inventaire.slots[slot];
    if (id) {
      const ic = iconeItem(id);
      ic.onclick = () => { if (desequiper(inventaire, slot)) { surChangement(); rendre(); } };
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
    const lignes = [
      ["Level", `${heros.niveau}  (${heros.pointsTalent} pts)`],
      ["Max HP", heros.pvMax],
      ["Move speed", heros.vitesse],
      ["Forge Heat", `${seuil} / ${max}`],
      ["Cards / turn", BASE_PIOCHE + (t.pioche || 0)],
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
      ic.onclick = () => { if (equiper(inventaire, o)) { surChangement(); rendre(); } };
      elGrille.append(ic);
    }
  }

  function rendre() {
    cacherTip(); // une icône survolée peut disparaître (équip/déséquip)
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
    fermer() { cacherTip(); overlay.hidden = true; },
    rendre,
  };
}
