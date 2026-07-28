// LA FORGE — espace plein écran du crafting. Ouverte en parlant au forgeron (Ferran).
//
// Table de craft 5×5 « façon Minecraft » : on prend une ressource dans la palette
// (les ressources du sac) puis on la POSE sur les cases pour dessiner un motif.
// Quand le motif correspond à une recette (cf. systems/craft.js), l'objet créé
// s'affiche à droite. « Forger » lance le MINI-JEU de forge.
//
// Mini-jeu : une jauge orange, un curseur qui fait des va-et-vient. On frappe
// ([Espace]/clic) quand il est sur le MARQUEUR (3 bandes concentriques) :
//   cœur (or) → Exceptional (+3) · milieu (bleu) → Master (+2) · large (vert) → Artisan (+1)
//   zone orange (hors marqueur) → Normal (0, objet créé quand même)
//   ZONES ROUGES aux extrémités → ratage EXTRÊME : composants perdus, aucun objet.
// Les ingrédients sont TOUJOURS consommés à la frappe (sauf si on annule avec Échap).
//
// API alignée sur le combat : ouvrirForge(inv, surFermer) / fermerForge() / forgeActive().

import { itemDef, couleurRarete } from "../data/items.js";
import { QUALITES, forceQualite, efficaciteQualite, carburantRequis, valeurCarburant } from "../data/recettes.js";
import { t } from "../systems/langue.js";
import {
  trouverRecette, ingredientsPoses,
  centreMarqueur, outcomeFrappe, QUALITE_PAR_MARQUEUR, MJ, periodeMiniJeu, ralentiAgilite, rougeRarete,
} from "../systems/craft.js";
import { compterRessource, retirerRessource, ajouterObjet, placePourFabrication } from "../systems/inventaire.js";
import { ouvrirLivre } from "./livre.js";
import { afficherMessage } from "./effets.js";

const TAILLE = 5;         // table 5×5

let overlay, boutonFermer, elPalette, elTable, elSortie, elForger;
let elMiniJeu, elCurseur, elMGrand, elMMoyen, elMPetit, elMJTitre, elMJAide, elMJInfo;
let elMJRougeG, elMJRougeD;
let elLivreBtn, elRef;
let elFeuJauge, elFeuFill, elFeuCharbon, elFeuBois, elFeuVider;

// CARBURANT : ressources qui NOURRISSENT le feu (case auxiliaire de la forge).
const CARBURANTS = ["charbon", "bois"];
let carburant = { charbon: 0, bois: 0 }; // quantités CHARGÉES dans le feu (réservées du sac)
let actif = false;
let surFermerActif = null;
let surDecouverteActif = null;  // prévenir principal.js d'une recette forgée par hasard
let biblioRef = null;           // le livre (pour le mode « choisir une recette-modèle »)
let refCourante = null;         // la recette choisie comme référence à recopier
let inv = null;
let heros = null;         // pour lire le rang du talent « Master Craftsman »
let grille = [];          // 5×5 d'ids de ressource (ou null)
let ressourceSel = null;  // id de la ressource « en main » (clic pour poser)
// FANTÔME : le tas qu'on tient, avec sa quantité, collé au curseur. Sans lui, la
// sélection n'était qu'un liseré doré sur une tuile de la palette — on posait
// « à l'aveugle » sans voir ce qu'on tenait ni combien il en restait.
let fantome = null;
// GLISSER : suivi du geste depuis la palette. `aBouge` distingue le GLISSER du
// simple CLIC — les deux doivent marcher, et ne pas se déclencher l'un l'autre.
let drag = { actif: false, aBouge: false, x: 0, y: 0 };
const SEUIL_DRAG = 5; // px de mouvement avant de considérer que c'est un glisser
let recetteCourante = null;
// Navigation CLAVIER : la forge est découpée en ZONES ; Tab passe de l'une à
// l'autre, les flèches se déplacent DANS la zone, Espace/Entrée valide.
//   recherche → palette → table → actions (les boutons du bas/droite)
const ZONES = ["recherche", "palette", "table", "actions"];
let zone = "table";       // zone qui a le focus clavier
let palIdx = 0;           // ressource surlignée dans la palette
let actIdx = 0;           // bouton d'action surligné
let curLig = 0, curCol = 0, curseurVisible = false;
let paletteIds = [];
let recherche = "";       // filtre de recherche de la palette (par nom)
let elRecherche = null;
// État du mini-jeu.
let miniActif = false, mjRaf = 0, mjCentre = 0.5, mjDebut = 0, mjPos = 0, mjPeriode = 1300;
let mjRouge = MJ.ROUGE;    // largeur des zones rouges de la frappe en cours (selon rareté)

export function installerForge() {
  overlay = document.getElementById("forge");
  boutonFermer = document.getElementById("forge-fermer");
  elPalette = document.getElementById("forge-palette");
  elRecherche = document.getElementById("forge-recherche");
  // Recherche rapide par nom : filtre la palette à la frappe (n'interfère pas avec
  // les raccourcis clavier de la forge tant qu'on tape dans le champ).
  if (elRecherche) {
    elRecherche.addEventListener("input", () => { recherche = elRecherche.value.trim().toLowerCase(); rafraichir(); });
    // Cliquer dans le champ = on entre dans la zone « recherche » (Tab en sort).
    elRecherche.addEventListener("focus", () => { zone = "recherche"; rafraichir(); });
  }
  elTable = document.getElementById("forge-table");
  elSortie = document.getElementById("forge-sortie");
  elForger = document.getElementById("forge-forger");
  elMiniJeu = document.getElementById("forge-minijeu");
  elCurseur = document.getElementById("forge-mj-curseur");
  elMGrand = document.getElementById("forge-mj-grand");
  elMMoyen = document.getElementById("forge-mj-moyen");
  elMPetit = document.getElementById("forge-mj-petit");
  elMJTitre = document.getElementById("forge-mj-titre");
  elMJAide = document.getElementById("forge-mj-aide");
  elMJInfo = document.getElementById("forge-mj-info");
  elMJRougeG = document.getElementById("forge-mj-rouge-g");
  elMJRougeD = document.getElementById("forge-mj-rouge-d");
  elLivreBtn = document.getElementById("forge-livre");
  elRef = document.getElementById("forge-ref");
  elFeuJauge = document.getElementById("forge-feu-jauge");
  elFeuFill = document.getElementById("forge-feu-fill");
  elFeuCharbon = document.getElementById("forge-feu-charbon");
  elFeuBois = document.getElementById("forge-feu-bois");
  elFeuVider = document.getElementById("forge-feu-vider");
  boutonFermer.addEventListener("click", fermerForge);
  // Le tas suit le curseur tant qu'on tient quelque chose (glissé OU sélectionné).
  window.addEventListener("pointermove", (ev) => {
    if (!fantome) return;
    if (drag.actif && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) > SEUIL_DRAG) {
      drag.aBouge = true;
    }
    bougerFantome(ev);
  });
  // Fin d'un GLISSER : si on lâche sur une case, on y pose. Un simple clic (sans
  // mouvement) ne pose rien ici — le tas reste en main et c'est le clic sur la
  // case qui posera, comme avant.
  window.addEventListener("pointerup", (ev) => {
    if (!drag.actif) return;
    const glisse = drag.aBouge;
    drag.actif = false;
    if (!glisse || !ressourceSel) return;
    const pos = caseSous(ev.clientX, ev.clientY);
    if (pos) cliquerCase(pos.r, pos.c);
    drag.aBouge = false;
  });
  elForger.addEventListener("click", forger);
  elMiniJeu.addEventListener("click", () => { if (miniActif) validerFrappe(); });
  elLivreBtn.addEventListener("click", ouvrirLivrePick);
  // Feu : clic gauche = +1 (charge depuis le sac), clic droit = −1 (rend).
  elFeuCharbon.addEventListener("click", () => ajouterCarburant("charbon"));
  elFeuCharbon.addEventListener("contextmenu", (e) => { e.preventDefault(); retirerCarburant("charbon"); });
  elFeuBois.addEventListener("click", () => ajouterCarburant("bois"));
  elFeuBois.addEventListener("contextmenu", (e) => { e.preventDefault(); retirerCarburant("bois"); });
  elFeuVider.addEventListener("click", viderCarburant);
}

// `opts` : { surDecouverte(resultatId), bibliotheque } — pour apprendre les
// recettes forgées « par hasard » et ouvrir le livre en mode « choisir ».
export function ouvrirForge(inventaire, herosRef = null, surFermer = null, opts = {}) {
  if (actif) return;
  actif = true;
  inv = inventaire;
  heros = herosRef;
  surFermerActif = surFermer;
  surDecouverteActif = opts.surDecouverte ?? null;
  biblioRef = opts.bibliotheque ?? null;
  refCourante = null;
  elRef.hidden = true;
  elLivreBtn.hidden = !biblioRef;    // pas de livre → pas de bouton
  grille = Array.from({ length: TAILLE }, () => Array(TAILLE).fill(null));
  ressourceSel = null;
  zone = "table"; palIdx = 0; actIdx = 0;          // navigation clavier au repos
  curLig = 0; curCol = 0; curseurVisible = false; // curseur clavier au repos
  carburant = { charbon: 0, bois: 0 }; // feu vide à l'ouverture
  recherche = ""; if (elRecherche) elRecherche.value = ""; // recherche vide à l'ouverture
  miniActif = false;                 // sécurité : jamais de mini-jeu « collé » d'une session précédente
  cancelAnimationFrame(mjRaf);
  elMiniJeu.hidden = true;
  construireTable();
  rafraichir();
  overlay.hidden = false;
  // Capture + stopPropagation : Échap ferme la FORGE (et n'ouvre pas le menu pause).
  window.addEventListener("keydown", surTouche, true);
}

function construireTable() {
  elTable.replaceChildren();
  for (let r = 0; r < TAILLE; r++) {
    for (let c = 0; c < TAILLE; c++) {
      const cell = document.createElement("div");
      cell.className = "forge-case";
      cell.addEventListener("click", () => cliquerCase(r, c));
      elTable.appendChild(cell);
    }
  }
}

// Combien d'exemplaires de `id` sont DÉJÀ posés sur la table.
function posesSurTable(id) {
  let n = 0;
  for (const ligne of grille) for (const cell of ligne) if (cell === id) n++;
  return n;
}

// Exemplaires de `id` RÉSERVÉS (table + feu) : ils comptent contre le stock du sac
// (le bois peut servir à la fois d'ingrédient du motif ET de carburant).
function posesTotal(id) {
  return posesSurTable(id) + (carburant[id] ?? 0);
}

function cliquerCase(r, c) {
  if (miniActif) return;
  if (grille[r][c]) {
    grille[r][c] = null;                 // case pleine → on retire
  } else if (ressourceSel) {
    // on ne pose que si le sac en a encore (réservés < possédés)
    if (posesTotal(ressourceSel) < compterRessource(inv, ressourceSel)) {
      grille[r][c] = ressourceSel;
    }
  }
  majFantome();   // le tas fond d'une unité (et disparaît quand il est vide)
  rafraichir();
}

// ----- Feu (carburant) ------------------------------------------------------

// Valeur de feu chargée (en unités de charbon : 1 charbon = 2 bois).
function feuCharge() {
  return CARBURANTS.reduce((s, id) => s + (carburant[id] ?? 0) * valeurCarburant(id), 0);
}
// Carburant requis pour l'objet en cours (0 si aucun motif reconnu).
function feuRequis() {
  return recetteCourante ? carburantRequis(itemDef(recetteCourante.resultat)?.rarete) : 0;
}
function ajouterCarburant(id) {
  if (miniActif) return;
  if (posesTotal(id) < compterRessource(inv, id)) { carburant[id] = (carburant[id] ?? 0) + 1; rafraichir(); }
}
function retirerCarburant(id) {
  if (miniActif) return;
  if ((carburant[id] ?? 0) > 0) { carburant[id] -= 1; rafraichir(); }
}
function viderCarburant() {
  if (miniActif) return;
  carburant = { charbon: 0, bois: 0 };
  rafraichir();
}

function choisirRessource(id) {
  ressourceSel = ressourceSel === id ? null : id; // re-cliquer désélectionne
  majFantome();
  rafraichir();
}

// Combien il reste de `id` à poser (possédé − déjà réservé sur la table et au feu).
function restantDe(id) {
  return compterRessource(inv, id) - posesTotal(id);
}

// Crée / met à jour / retire le tas qui suit le curseur. Il porte la MÊME pastille
// que la palette et la quantité RESTANTE : on voit le tas fondre à chaque pose.
function majFantome() {
  const reste = ressourceSel ? restantDe(ressourceSel) : 0;
  if (!ressourceSel || reste <= 0) {
    if (ressourceSel && reste <= 0) ressourceSel = null; // stock épuisé : on lâche
    fantome?.remove();
    fantome = null;
    return;
  }
  const d = itemDef(ressourceSel);
  if (!fantome) {
    fantome = document.createElement("div");
    fantome.className = "forge-fantome";
    fantome.innerHTML = '<span class="forge-pastille"></span><span class="forge-fantome-qte"></span>';
    document.body.append(fantome);
  }
  pastilleFond(fantome.querySelector(".forge-pastille"), d);
  fantome.querySelector(".forge-fantome-qte").textContent = `×${reste}`;
}

function bougerFantome(ev) {
  if (!fantome) return;
  fantome.style.left = ev.clientX + "px";
  fantome.style.top = ev.clientY + "px";
}

// La case de la table sous un point de l'écran, ou null.
function caseSous(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest?.(".forge-case");
  if (!cell || cell.parentElement !== elTable) return null;
  const i = [...elTable.children].indexOf(cell);
  return i < 0 ? null : { r: Math.floor(i / TAILLE), c: i % TAILLE };
}

// Fond d'une pastille : vraie IMAGE (ressource détourée) si dispo, sinon la couleur.
function pastilleFond(el, d) {
  if (d?.image) {
    el.style.backgroundImage = `url('${d.image}')`;
    el.style.backgroundSize = "contain";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = "center";
    el.style.backgroundColor = "#e6d9bd";
  } else {
    el.style.background = d?.icone;
  }
}

function rafraichir() {
  // 1) PALETTE : les ressources du sac, avec le « restant » (possédé − déjà posé).
  elPalette.replaceChildren();
  const compte = {};
  for (const o of inv.objets) {
    if (itemDef(o.id)?.categorie !== "ressource") continue;
    compte[o.id] = (compte[o.id] ?? 0) + (o.quantite ?? 1);
  }
  // Filtre de recherche (par nom) : n'affiche que les composants qui matchent.
  paletteIds = Object.keys(compte)
    .filter((id) => !recherche || (itemDef(id)?.nom ?? "").toLowerCase().includes(recherche)); // touches 1-9 = Nᵉ affiché
  if (palIdx >= paletteIds.length) palIdx = Math.max(0, paletteIds.length - 1); // la recherche a pu réduire la liste
  paletteIds.forEach((id, i) => {
    const d = itemDef(id);
    const restant = compte[id] - posesTotal(id);
    const tuile = document.createElement("div");
    tuile.className = "forge-palette-tuile"
      + (id === ressourceSel ? " sel" : "")
      + (zone === "palette" && i === palIdx ? " clavier" : "");
    const styleP = d.image
      ? `background-image:url('${d.image}');background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#e6d9bd`
      : `background:${d.icone}`;
    tuile.innerHTML =
      `<span class="forge-pastille" style="${styleP}"></span>` +
      `<span class="forge-palette-nom"></span>` +
      `<span class="forge-palette-qte">${restant}</span>` +
      (i < 9 ? `<span class="forge-palette-touche">${i + 1}</span>` : "");
    tuile.querySelector(".forge-palette-nom").textContent = d.nom;
    // DEUX gestes pour la même chose :
    //  · CLIC simple → on « prend » le tas, il suit le curseur, on clique une case ;
    //  · GLISSER → on l'amène directement sur une case et on lâche.
    // `pointerdown` amorce les deux ; c'est le mouvement qui les départage.
    tuile.addEventListener("pointerdown", (ev) => {
      if (miniActif || ev.button !== 0) return;
      ev.preventDefault();
      if (ressourceSel !== id) choisirRessource(id);   // prendre (sans re-basculer)
      drag = { actif: true, aBouge: false, x: ev.clientX, y: ev.clientY };
      bougerFantome(ev);
    });
    // Reclic sur la MÊME tuile alors qu'on la tenait déjà : on repose le tas.
    tuile.addEventListener("click", () => {
      if (!drag.aBouge && ressourceSel === id && !fantome) choisirRessource(id);
    });
    elPalette.appendChild(tuile);
  });

  // 2) TABLE : dessiner les pastilles posées + le curseur clavier.
  const cases = elTable.children;
  for (let r = 0; r < TAILLE; r++) {
    for (let c = 0; c < TAILLE; c++) {
      const cell = cases[r * TAILLE + c];
      cell.replaceChildren();
      cell.classList.toggle("forge-case--curseur", curseurVisible && r === curLig && c === curCol);
      const id = grille[r][c];
      if (id) {
        const p = document.createElement("span");
        p.className = "forge-pastille";
        pastilleFond(p, itemDef(id));
        cell.appendChild(p);
      }
    }
  }

  // 3) RÉSULTAT : recette reconnue → aperçu + bouton actif.
  recetteCourante = trouverRecette(grille);
  elSortie.replaceChildren();
  if (recetteCourante) {
    const d = itemDef(recetteCourante.resultat);
    elSortie.classList.add("pleine");
    const p = document.createElement("span");
    p.className = "forge-pastille";
    pastilleFond(p, d);
    const nom = document.createElement("span");
    nom.className = "forge-sortie-nom";
    nom.textContent = d.nom;
    elSortie.append(p, nom);
    elForger.disabled = false;
  } else {
    elSortie.classList.remove("pleine");
    elSortie.textContent = "?";
    elForger.disabled = true;
  }

  rendreFeu();

  // 4) FOCUS clavier des boutons d'action (surligne celui pointé quand on est
  // dans la zone « actions »).
  const acts = actionsDispo();
  if (actIdx >= acts.length) actIdx = Math.max(0, acts.length - 1);
  acts.forEach((a, i) => a.el?.classList.toggle("forge-btn--clavier", zone === "actions" && i === actIdx));
}

// Affiche l'état du feu : jauge chargé / requis + les deux tuiles de carburant
// (avec ce qui est chargé et ce qui reste dans le sac).
function rendreFeu() {
  const charge = feuCharge();
  const requis = feuRequis();
  const assez = charge >= requis;
  // Jauge (arrondie à l'affichage : le bois donne des demi-unités).
  elFeuJauge.textContent = `${Math.round(charge * 10) / 10} / ${requis}`;
  elFeuJauge.classList.toggle("forge-feu-jauge--ok", requis > 0 && assez);
  elFeuJauge.classList.toggle("forge-feu-jauge--faible", requis > 0 && !assez);
  elFeuFill.style.width = (requis > 0 ? Math.min(1, charge / requis) : 0) * 100 + "%";
  elFeuFill.classList.toggle("forge-feu-fill--ok", requis > 0 && assez);
  // Tuiles : « chargé » (dans le feu) + « reste » (dispo dans le sac).
  const info = (id) => {
    const dispo = compterRessource(inv, id) - posesTotal(id); // encore prenable
    return { charge: carburant[id] ?? 0, dispo };
  };
  const c = info("charbon"), b = info("bois");
  elFeuCharbon.innerHTML = t("forge.charbonBtn", { charge: c.charge, dispo: c.dispo });
  elFeuBois.innerHTML = t("forge.boisBtn", { charge: b.charge, dispo: b.dispo });
  elFeuCharbon.classList.toggle("forge-feu-btn--vide", c.charge === 0 && c.dispo === 0);
  elFeuBois.classList.toggle("forge-feu-btn--vide", b.charge === 0 && b.dispo === 0);
}

// ----- Livre d'artisanat : choisir une recette-modèle -----------------------

// Ouvre le livre en mode « choisir ». Pendant ce temps, on retire le clavier de
// la forge (le livre gère Esc/L lui-même) puis on le rebranche à la fermeture.
function ouvrirLivrePick() {
  if (!biblioRef || miniActif) return;
  window.removeEventListener("keydown", surTouche, true);
  ouvrirLivre(biblioRef, {
    surChoix: (rec) => { refCourante = rec; rendreReference(); },
    surFermer: () => { if (actif) window.addEventListener("keydown", surTouche, true); },
  });
}

// Pastille d'un ingrédient (image si dispo, sinon carré de couleur).
function pastilleRef(id) {
  const d = itemDef(id);
  if (!d) return "";
  const bord = couleurRarete(id);
  if (d.image) return `<img class="forge-ref-past" style="border-color:${bord}" src="${d.image}" alt="">`;
  return `<span class="forge-ref-past" style="background:${d.icone};border-color:${bord}"></span>`;
}

// Affiche la recette choisie en petit (motif + légende), comme modèle à recopier.
function rendreReference() {
  if (!refCourante) { elRef.hidden = true; return; }
  const d = itemDef(refCourante.resultat);
  const forme = refCourante.forme;
  const cols = Math.max(...forme.map((r) => r.length));
  const compte = {};
  let cells = "";
  for (const ligne of forme) {
    for (let c = 0; c < cols; c++) {
      const car = ligne[c] ?? ".";
      if (car === "." || !refCourante.legende[car]) {
        cells += `<span class="forge-ref-case forge-ref-case--vide"></span>`;
      } else {
        const id = refCourante.legende[car];
        compte[id] = (compte[id] ?? 0) + 1;
        cells += `<span class="forge-ref-case">${pastilleRef(id)}</span>`;
      }
    }
  }
  const legende = Object.entries(compte)
    .map(([id, n]) => `<span class="forge-ref-ingr">${pastilleRef(id)}×${n}</span>`).join("");
  elRef.innerHTML =
    `<div class="forge-ref-nom" style="color:${couleurRarete(refCourante.resultat)}">${d?.nom ?? refCourante.resultat}</div>` +
    `<div class="forge-ref-grille" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>` +
    `<div class="forge-ref-legende">${legende}</div>`;
  elRef.hidden = false;
}

// ----- Mini-jeu de forge ---------------------------------------------------

// Le carburant RÉELLEMENT brûlé : juste ce qu'il faut pour atteindre le requis.
// Le SURPLUS chargé n'est PAS perdu (il reste dans le feu). On brûle le BOIS en
// premier (moins précieux + granularité ½ → moins de gaspillage), puis le charbon.
function carburantAConsommer() {
  let reste = feuRequis();
  const brule = { charbon: 0, bois: 0 };
  for (const id of ["bois", "charbon"]) {
    const v = valeurCarburant(id);
    while (reste > 1e-9 && (carburant[id] ?? 0) > brule[id]) { brule[id]++; reste -= v; }
  }
  return brule;
}

// Ce que le craft va CONSOMMER : les ingrédients du motif + le carburant brûlé
// (le juste nécessaire, PAS tout le carburant chargé).
function besoinCraft() {
  const besoin = {};
  for (const id of ingredientsPoses(grille)) besoin[id] = (besoin[id] ?? 0) + 1;
  const brule = carburantAConsommer();
  for (const id of CARBURANTS) if (brule[id]) besoin[id] = (besoin[id] ?? 0) + brule[id];
  return besoin;
}

function forger() {
  if (!recetteCourante || miniActif) return;
  // 1) Le FEU doit être assez nourri pour la rareté (charbon/bois dans la case feu).
  const requis = feuRequis();
  if (feuCharge() < requis) {
    afficherMessage(`🔥 Feu trop faible — il faut ${requis} charbon (le bois vaut ½ : 1 charbon = 2 bois).`);
    return;
  }
  // 2) Contrôle « sac plein » AVANT le mini-jeu : y aura-t-il la place pour l'objet
  // une fois ingrédients + carburant consommés ? Sinon on ne lance rien.
  if (!placePourFabrication(inv, recetteCourante.resultat, besoinCraft())) {
    afficherMessage("🎒 Sac plein — fais de la place avant de forger (rien n'est consommé).");
    return;
  }
  lancerMiniJeu();
}

// Place une bande du marqueur : `left` = centre (%), `width` = 2×demi-largeur (%).
function placerBande(el, centre, demi) {
  el.style.left = centre * 100 + "%";
  el.style.width = demi * 2 * 100 + "%";
}

function lancerMiniJeu() {
  // Vitesse du curseur = selon la RARETÉ de l'objet, RALENTIE par l'AGILITÉ totale
  // du héros (talents + équipement) : plus agile = meilleur forgeron.
  const rarete = itemDef(recetteCourante.resultat)?.rarete;
  const agilite = (heros?.agiliteTalent ?? 0) + (heros?.agiliteEquip ?? 0);
  mjPeriode = periodeMiniJeu(rarete, agilite);
  // Zones rouges : plus larges pour les objets rares (plus risqué). On règle les
  // deux bandes rouges de la jauge et on les prend en compte dans le placement/verdict.
  mjRouge = rougeRarete(rarete);
  if (elMJRougeG) elMJRougeG.style.width = mjRouge * 100 + "%";
  if (elMJRougeD) elMJRougeD.style.width = mjRouge * 100 + "%";
  // Barre info : rappelle que l'agilité ralentit la forge (et de combien).
  if (elMJInfo) {
    const pct = Math.round(ralentiAgilite(agilite) * 100);
    elMJInfo.textContent = agilite > 0
      ? t("forge.agiliteInfo", { agilite, pct })
      : t("forge.agiliteZero");
  }
  mjCentre = centreMarqueur(Math.random(), mjRouge);
  placerBande(elMGrand, mjCentre, MJ.HG);
  placerBande(elMMoyen, mjCentre, MJ.HM);
  placerBande(elMPetit, mjCentre, MJ.HP);
  elMJTitre.textContent = t("forge.mjTitre");
  elMJAide.hidden = false;
  miniActif = true;
  mjDebut = performance.now();
  elMiniJeu.hidden = false;
  mjRaf = requestAnimationFrame(boucleMiniJeu);
}

function boucleMiniJeu() {
  const t = performance.now() - mjDebut;
  const phase = (t % mjPeriode) / mjPeriode;         // 0..1
  mjPos = phase < 0.5 ? phase * 2 : 2 - phase * 2;  // triangle : 0 → 1 → 0
  elCurseur.style.left = mjPos * 100 + "%";
  mjRaf = requestAnimationFrame(boucleMiniJeu);
}

function validerFrappe() {
  if (!miniActif) return;
  miniActif = false;
  cancelAnimationFrame(mjRaf);
  resoudreCraft(outcomeFrappe(mjPos, mjCentre, mjRouge));
}

function resoudreCraft(marqueur) {
  // Les ingrédients ET le carburant NÉCESSAIRE sont consommés à la frappe (le feu a
  // brûlé). Le surplus de carburant chargé n'est PAS perdu : il RESTE dans le feu.
  const brule = carburantAConsommer();
  const besoin = besoinCraft();
  for (const id of Object.keys(besoin)) retirerRessource(inv, id, besoin[id]);
  for (const id of CARBURANTS) carburant[id] = Math.max(0, (carburant[id] ?? 0) - brule[id]);

  const qualite = QUALITE_PAR_MARQUEUR[marqueur]; // undefined si "rouge"
  const d = itemDef(recetteCourante.resultat);
  if (qualite) {
    if (ajouterObjet(inv, recetteCourante.resultat, 1, { qualite })) {
      const q = QUALITES[qualite];
      // Le bonus dépend de CE QU'ON FORGE : sur une arme ou une armure c'est de la
      // FORCE, sur une PIOCHE c'est de l'EFFICACITÉ — la Force ne sert à rien à un
      // outil. Même geste, récompense adaptée.
      const estOutil = d.categorie === "outil";
      const gain = estOutil ? efficaciteQualite(qualite) : forceQualite(d.rarete, qualite);
      const bonus = gain > 0
        ? t(estOutil ? "forge.bonusEfficacite" : "forge.bonusForce", estOutil ? { eff: gain } : { force: gain })
        : "";
      elMJTitre.textContent = t("forge.resultat", { nom: d.nom, qualite: q.nom, bonus });
      // Forger un objet « par hasard » APPREND sa recette (livre d'artisanat).
      if (surDecouverteActif) surDecouverteActif(recetteCourante.resultat);
    } else {
      // Sac plein : impossible de placer l'objet forgé. On REND les ingrédients
      // (leurs cases viennent d'être libérées, la place ne manquera pas) plutôt
      // que de faire disparaître l'objet dans le vide.
      for (const id of Object.keys(besoin)) ajouterObjet(inv, id, besoin[id]);
      elMJTitre.textContent = t("forge.mjSacPlein");
    }
  } else {
    elMJTitre.textContent = t("forge.mjRate");
  }
  elMJAide.hidden = true;
  grille = Array.from({ length: TAILLE }, () => Array(TAILLE).fill(null));
  ressourceSel = null;
  // On laisse le message un instant, puis retour à la table.
  setTimeout(() => {
    if (!actif) return;               // forge fermée entre-temps
    elMiniJeu.hidden = true;
    rafraichir();
  }, 1500);
}

function annulerMiniJeu() {
  miniActif = false;
  cancelAnimationFrame(mjRaf);
  elMiniJeu.hidden = true;            // ingrédients gardés, motif intact
}

// Directions clavier (flèches + WASD + ZQSD) → [dLigne, dCol].
const DIRS_FORGE = {
  ArrowUp: [-1, 0], KeyW: [-1, 0], KeyZ: [-1, 0],
  ArrowDown: [1, 0], KeyS: [1, 0],
  ArrowLeft: [0, -1], KeyA: [0, -1], KeyQ: [0, -1],
  ArrowRight: [0, 1], KeyD: [0, 1],
};

// Les BOUTONS d'action de la zone « actions », dans l'ordre de navigation. Le
// bouton Livre n'existe que si un livre a été fourni. Chaque entrée sait quoi
// faire quand on valide (Espace/Entrée) dessus.
function actionsDispo() {
  const acts = [
    { el: elFeuCharbon, run: () => ajouterCarburant("charbon") },
    { el: elFeuBois, run: () => ajouterCarburant("bois") },
    { el: elFeuVider, run: viderCarburant },
    { el: elForger, run: forger },
  ];
  if (biblioRef) acts.push({ el: elLivreBtn, run: ouvrirLivrePick });
  acts.push({ el: boutonFermer, run: fermerForge });
  return acts;
}

// Tab : passe à la zone suivante (Maj+Tab : précédente). En entrant dans la
// recherche on lui donne le focus texte ; en sortant on le retire.
function changerZone(dir) {
  let i = ZONES.indexOf(zone);
  i = (i + dir + ZONES.length) % ZONES.length;
  zone = ZONES[i];
  if (zone === "recherche") elRecherche?.focus();
  else elRecherche?.blur();
  rafraichir();
}

// Forge JOUABLE AU CLAVIER autant qu'à la souris (règle du projet) :
//   [Tab] change de zone (recherche · palette · table · boutons) ·
//   [flèches] se déplacent DANS la zone · [Espace]/[Entrée] valide ·
//   1-9 : prendre la Nᵉ ressource · F : Forger · C/V : charbon/bois (Maj = retirer) ·
//   B : livre · Échap : annuler/quitter. Pendant le mini-jeu, Espace/Entrée = frappe.
function surTouche(e) {
  const dansRecherche = document.activeElement === elRecherche;

  // Échap est prioritaire partout : quitte le mini-jeu, ou la recherche, ou la forge.
  if (e.code === "Escape") {
    e.preventDefault(); e.stopPropagation();
    if (miniActif) annulerMiniJeu();
    else if (dansRecherche) { elRecherche.blur(); zone = "table"; rafraichir(); }
    else fermerForge();
    return;
  }
  if (miniActif) {
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); e.stopPropagation(); validerFrappe(); }
    return;
  }

  // Tab : changer de zone (fonctionne aussi depuis le champ de recherche).
  if (e.code === "Tab") {
    e.preventDefault(); e.stopPropagation();
    changerZone(e.shiftKey ? -1 : 1);
    return;
  }

  // On tape dans la recherche : la frappe est du TEXTE, jamais un raccourci forge.
  // (On ne fait rien ici : la touche remonte normalement jusqu'à l'input.)
  if (dansRecherche) return;

  // ---- Flèches : navigation DANS la zone active ----
  if (DIRS_FORGE[e.code]) {
    e.preventDefault(); e.stopPropagation();
    const [dl, dc] = DIRS_FORGE[e.code];
    const pas = dc !== 0 ? dc : dl; // palette/actions = listes → un seul axe
    if (zone === "table") {
      curLig = Math.max(0, Math.min(TAILLE - 1, curLig + dl));
      curCol = Math.max(0, Math.min(TAILLE - 1, curCol + dc));
      curseurVisible = true;
    } else if (zone === "palette") {
      if (paletteIds.length) palIdx = Math.max(0, Math.min(paletteIds.length - 1, palIdx + pas));
    } else if (zone === "actions") {
      const n = actionsDispo().length;
      actIdx = Math.max(0, Math.min(n - 1, actIdx + pas));
    }
    rafraichir();
    return;
  }

  // ---- Espace/Entrée : valider selon la zone ----
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault(); e.stopPropagation();
    if (zone === "table") { curseurVisible = true; cliquerCase(curLig, curCol); }
    else if (zone === "palette") { const id = paletteIds[palIdx]; if (id) choisirRessource(id); }
    else if (zone === "actions") { actionsDispo()[actIdx]?.run(); }
    else rafraichir();
    return;
  }

  // ---- Raccourcis lettres/chiffres, actifs partout (hors recherche) ----
  if (/^Digit[1-9]$/.test(e.code)) {
    e.preventDefault(); e.stopPropagation();
    const n = Number(e.code.slice(5)) - 1;
    if (n < paletteIds.length) { ressourceSel = paletteIds[n]; palIdx = n; curseurVisible = true; rafraichir(); }
  } else if (e.code === "KeyF") {
    e.preventDefault(); e.stopPropagation(); forger(); // lance le mini-jeu si prêt
  } else if (e.code === "KeyC") {
    e.preventDefault(); e.stopPropagation(); e.shiftKey ? retirerCarburant("charbon") : ajouterCarburant("charbon");
  } else if (e.code === "KeyV") {
    e.preventDefault(); e.stopPropagation(); e.shiftKey ? retirerCarburant("bois") : ajouterCarburant("bois");
  } else if (e.code === "KeyB") {
    e.preventDefault(); e.stopPropagation(); ouvrirLivrePick(); // livre d'artisanat (référence)
  }
}

export function fermerForge() {
  // On ne laisse pas un tas orphelin collé à l'écran après la fermeture.
  ressourceSel = null;
  fantome?.remove(); fantome = null;
  drag = { actif: false, aBouge: false, x: 0, y: 0 };
  if (!actif) return;
  actif = false;
  miniActif = false;
  cancelAnimationFrame(mjRaf);
  elMiniJeu.hidden = true;
  overlay.hidden = true;
  window.removeEventListener("keydown", surTouche, true);
  const cb = surFermerActif;
  surFermerActif = null;
  surDecouverteActif = null;
  biblioRef = null;
  refCourante = null;
  carburant = { charbon: 0, bois: 0 };
  inv = null;
  if (cb) cb();
}

export function forgeActive() {
  return actif;
}
