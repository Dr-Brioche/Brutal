// L'HÔTEL DES VENTES (« Deep-Market Exchange ») — écran plein écran du pilier
// ÉCONOMIE. Ouvert en parlant à Baldrik le courtier.
//
// Colonne gauche : les RESSOURCES et leur prix VIVANT (tendance vs prix de base,
// quantité possédée, achat/vente à l'unité). Colonne droite : l'HISTORIQUE de la
// ressource sélectionnée + les ANNONCES d'objets en cours.
// Un bandeau signale l'ÉVÉNEMENT en cours (pénurie/surplus) — et Baldrik glisse
// l'indice dans son dialogue d'accueil (cf. phraseCourtier).
//
// ⚠ Pendant que l'écran est ouvert le jeu est en pause → l'horloge du marché est
// FIGÉE (principal.js ne tick pas) : les prix n'évoluent pas sous nos yeux.
//
// API alignée sur la forge : installerHV() / ouvrirHV(inv, marche, surFermer) /
// fermerHV() / hvActive() — plus phraseCourtier(marche) pour le dialogue.

import { itemDef } from "../data/items.js";
import {
  RESSOURCES_MARCHE, prixRessource, tendanceRessource, prixBaseRessource,
  apercuAchat, apercuVente, acheterRessource, vendreRessource,
} from "../systems/marche.js";
import { ajouterObjet, compterRessource, retirerRessource } from "../systems/inventaire.js";

let overlay, elOr, elBandeau, elRessources, elHisto, elHistoTitre, elAnnonces,
    elBtnVendre, elVente, boutonFermer, elAide;
let actif = false;
let surFermerActif = null;
let inv = null, marche = null;
let selRes = 0;            // index de la ressource sélectionnée (historique)
let aideTimer = 0;         // restauration du texte d'aide après un message furtif

const AIDE_DEFAUT = "[↑↓] Browse · [A] Buy · [V] Sell · [Esc] Leave";

export function installerHV() {
  overlay = document.getElementById("hv");
  elOr = document.getElementById("hv-or");
  elBandeau = document.getElementById("hv-bandeau");
  elRessources = document.getElementById("hv-ressources");
  elHisto = document.getElementById("hv-histo");
  elHistoTitre = document.getElementById("hv-histo-titre");
  elAnnonces = document.getElementById("hv-annonces");
  elBtnVendre = document.getElementById("hv-vendre-objet");
  elVente = document.getElementById("hv-vente");
  boutonFermer = document.getElementById("hv-fermer");
  elAide = overlay.querySelector(".forge-aide");
  boutonFermer.addEventListener("click", fermerHV);
  elBtnVendre.hidden = true; // la mise en vente d'objets arrive au commit suivant
}

export function ouvrirHV(inventaire, marcheJeu, surFermer = null) {
  if (actif) return;
  actif = true;
  inv = inventaire;
  marche = marcheJeu;
  surFermerActif = surFermer;
  selRes = 0;
  elVente.hidden = true;
  rendre();
  overlay.hidden = false;
  window.addEventListener("keydown", surTouche, true);
}

// Message furtif dans la barre d'aide (« pas assez d'or », « sac plein »…).
function noter(txt) {
  elAide.textContent = txt;
  clearTimeout(aideTimer);
  aideTimer = setTimeout(() => { elAide.textContent = AIDE_DEFAUT; }, 2000);
}

// ----- Achat / vente d'une ressource -----------------------------------------

function acheter(id) {
  const cout = apercuAchat(marche, id, 1);
  if (inv.or < cout) { noter(`Not enough gold (need ${cout} 🪙).`); return; }
  if (!ajouterObjet(inv, id)) { noter("Your bag is full."); return; }
  inv.or -= acheterRessource(marche, id, 1);
  rendre();
}

function vendre(id) {
  if (compterRessource(inv, id) < 1) { noter("You don't have any."); return; }
  retirerRessource(inv, id, 1);
  inv.or += vendreRessource(marche, id, 1);
  rendre();
}

// ----- Rendu -------------------------------------------------------------------

function fmtDuree(s) {
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m ago`;
}

function rendre() {
  elOr.textContent = `🪙 ${inv.or}`;

  // Bandeau d'événement (pénurie/surplus) avec sa phrase-indice.
  const e = marche.evenement;
  if (e) {
    const nom = itemDef(e.id)?.nom ?? e.id;
    elBandeau.className = `hv-bandeau hv-bandeau--${e.type}`;
    elBandeau.textContent = e.type === "penurie"
      ? `⚠ Shortage — every guild is after ${nom}. Prices are soaring!`
      : `📦 Glut — crates of ${nom} flood the market. Prices are melting!`;
    elBandeau.hidden = false;
  } else {
    elBandeau.hidden = true;
  }

  // Colonne gauche : une ligne par ressource.
  elRessources.replaceChildren();
  RESSOURCES_MARCHE.forEach((id, i) => {
    const d = itemDef(id);
    const prix = prixRessource(marche, id);
    const tend = tendanceRessource(marche, id);
    const possede = compterRessource(inv, id);
    const ligne = document.createElement("div");
    ligne.className = "hv-ligne" + (i === selRes ? " sel" : "") +
      (e && e.id === id ? " hv-ligne--evt" : "");
    const clTend = tend > 2 ? "haut" : tend < -2 ? "bas" : "plat";
    const fleche = tend > 2 ? "▲" : tend < -2 ? "▼" : "＝";
    ligne.innerHTML =
      `<span class="hv-pastille" style="background:${d.icone}"></span>` +
      `<span class="hv-nom"></span>` +
      `<span class="hv-tendance hv-tendance--${clTend}">${fleche} ${tend > 0 ? "+" : ""}${tend}%</span>` +
      `<span class="hv-prix">${prix} 🪙</span>` +
      `<span class="hv-possede">you: ${possede}</span>`;
    ligne.querySelector(".hv-nom").textContent = d.nom;
    const btnA = document.createElement("button");
    btnA.className = "hv-btn";
    btnA.textContent = "Buy";
    btnA.disabled = inv.or < apercuAchat(marche, id, 1);
    btnA.addEventListener("click", (ev) => { ev.stopPropagation(); selRes = i; acheter(id); });
    const btnV = document.createElement("button");
    btnV.className = "hv-btn";
    btnV.textContent = "Sell";
    btnV.disabled = possede < 1;
    btnV.addEventListener("click", (ev) => { ev.stopPropagation(); selRes = i; vendre(id); });
    ligne.append(btnA, btnV);
    ligne.addEventListener("click", () => { selRes = i; rendre(); });
    elRessources.appendChild(ligne);
  });

  // Colonne droite : historique de la ressource sélectionnée (récent en haut).
  const idSel = RESSOURCES_MARCHE[selRes];
  elHistoTitre.textContent = `Price history — ${itemDef(idSel)?.nom ?? idSel}`;
  elHisto.replaceChildren();
  const now = document.createElement("div");
  now.className = "hv-histo-ligne hv-histo-ligne--now";
  now.innerHTML = `<span>now</span><span>${prixRessource(marche, idSel)} 🪙</span>`;
  elHisto.appendChild(now);
  const histo = (marche.histo[idSel] ?? []).slice(-14).reverse();
  for (const pt of histo) {
    const l = document.createElement("div");
    l.className = "hv-histo-ligne";
    l.innerHTML = `<span>${fmtDuree(marche.temps - pt.t)}</span><span>${pt.prix} 🪙</span>`;
    elHisto.appendChild(l);
  }
  if (!histo.length) {
    const l = document.createElement("div");
    l.className = "hv-histo-ligne";
    l.textContent = "No history yet — come back later.";
    elHisto.appendChild(l);
  }

  rendreAnnonces();
}

function fmtReste(s) {
  if (s < 60) return "<1m";
  if (s < 3600) return `~${Math.round(s / 60)}m`;
  return `~${(s / 3600).toFixed(1)}h`;
}

function rendreAnnonces() {
  elAnnonces.replaceChildren();
  for (const v of marche.ventes) {
    const d = itemDef(v.id);
    const l = document.createElement("div");
    l.className = "hv-annonce";
    l.innerHTML = `<span></span><span class="hv-annonce-reste"></span>`;
    l.children[0].textContent = `${d?.nom ?? v.id} · ${v.prix} 🪙`;
    l.children[1].textContent = fmtReste(v.reste);
    elAnnonces.appendChild(l);
  }
}

// ----- Clavier -------------------------------------------------------------------

function surTouche(e) {
  if (!actif) return;
  if (e.code === "Escape") {
    e.preventDefault(); e.stopPropagation();
    fermerHV();
    return;
  }
  const k = e.key.toLowerCase();
  if (e.code === "ArrowUp" || e.code === "ArrowDown") {
    e.preventDefault(); e.stopPropagation();
    const n = RESSOURCES_MARCHE.length;
    selRes = (selRes + (e.code === "ArrowDown" ? 1 : -1) + n) % n;
    rendre();
    // garde la ligne sélectionnée visible dans la liste
    elRessources.children[selRes]?.scrollIntoView({ block: "nearest" });
  } else if (k === "a") {
    e.preventDefault(); e.stopPropagation();
    acheter(RESSOURCES_MARCHE[selRes]);
  } else if (k === "v") {
    e.preventDefault(); e.stopPropagation();
    vendre(RESSOURCES_MARCHE[selRes]);
  }
}

// ----- Ouverture / fermeture --------------------------------------------------------

export function fermerHV() {
  if (!actif) return;
  actif = false;
  overlay.hidden = true;
  window.removeEventListener("keydown", surTouche, true);
  clearTimeout(aideTimer);
  elAide.textContent = AIDE_DEFAUT;
  const cb = surFermerActif;
  surFermerActif = null;
  inv = null; marche = null;
  if (cb) cb();
}

export function hvActive() {
  return actif;
}

// ----- La voix de Baldrik ------------------------------------------------------------

// Les 2 lignes d'accueil du courtier. S'il y a un ÉVÉNEMENT en cours, la seconde
// ligne GLISSE L'INDICE (sans donner les chiffres) — c'est la récompense du
// joueur attentif qui passe lui parler.
export function phraseCourtier(marche) {
  const e = marche?.evenement;
  if (e?.type === "penurie") {
    const nom = itemDef(e.id)?.nom ?? e.id;
    return [
      "Welcome to the Deep-Market Exchange, friend.",
      `Between us… the ${nom} wagons never made it through the tunnels this week. Every guild is paying a fortune for it.`,
    ];
  }
  if (e?.type === "surplus") {
    const nom = itemDef(e.id)?.nom ?? e.id;
    return [
      "Welcome to the Deep-Market Exchange, friend.",
      `A caravan just dumped crates of ${nom} on the market… I wouldn't sell any of it right now, friend.`,
    ];
  }
  return [
    "Welcome to the Deep-Market Exchange, friend.",
    "Ore, gems, timber — everything has a price. And prices… move.",
  ];
}
