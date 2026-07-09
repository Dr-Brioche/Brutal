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

import { itemDef, couleurRarete, prixVente } from "../data/items.js";
import { QUALITES } from "../data/recettes.js";
import {
  RESSOURCES_MARCHE, prixRessource, tendanceRessource, prixBaseRessource, variation30min,
  apercuAchat, apercuVente, acheterRessource, vendreRessource,
  valeurReelle, prixConseille, bornesPrixVente, estimerDelaiVente, mettreEnVente, collecterVente,
} from "../systems/marche.js";
import { ajouterObjet, compterRessource, retirerRessource, jeterObjet } from "../systems/inventaire.js";
import { police } from "../core/texte.js";

let overlay, elOr, elBandeau, elRessources, elHisto, elHistoTitre, elAnnonces,
    elBtnVendre, elVente, boutonFermer, elAide, elGraphe, elTri;
let actif = false;
let surFermerActif = null;
let inv = null, marche = null;
let selId = RESSOURCES_MARCHE[0]; // id de la ressource sélectionnée (historique, achat/vente clavier)
let triMode = "defaut";            // "defaut" | "hausse" | "baisse" (tri par variation 30 min)
let aideTimer = 0;         // restauration du texte d'aide après un message furtif
// Sous-fenêtre de mise en vente : null (fermée) | "liste" (choix de l'objet)
// | "prix" (réglage du prix). `venteObjet` = l'exemplaire du sac choisi.
let venteEtape = null;
let venteSel = 0;
let venteObjet = null;
let ventePrix = 0;
let elVenteListe, elVentePrix, elVenteNom, elVenteMontant, elVenteNote,
    elVenteConfirmer, elVenteAide, elVenteTitre;

const AIDE_DEFAUT = "[↑↓] Browse · [A] Buy · [V] Sell · [C] Collect · [Esc] Leave";

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
  elVenteListe = document.getElementById("hv-vente-liste");
  elVentePrix = document.getElementById("hv-vente-prix");
  elVenteNom = document.getElementById("hv-vente-nom");
  elVenteMontant = document.getElementById("hv-vente-montant");
  elVenteNote = document.getElementById("hv-vente-note");
  elVenteConfirmer = document.getElementById("hv-vente-confirmer");
  elVenteAide = document.getElementById("hv-vente-aide");
  elVenteTitre = document.getElementById("hv-vente-titre");
  elGraphe = document.getElementById("hv-graphe");
  elTri = document.getElementById("hv-tri");
  elTri.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".hv-tri-btn");
    if (!btn) return;
    triMode = btn.dataset.tri;
    [...elTri.children].forEach((b) => b.classList.toggle("hv-tri-btn--actif", b === btn));
    rendre();
  });
  boutonFermer.addEventListener("click", fermerHV);
  // Le graphique se recale si la fenêtre change de taille pendant que l'HV est ouvert.
  window.addEventListener("resize", () => { if (actif) rendre(); });
  elBtnVendre.addEventListener("click", ouvrirVente);
  document.getElementById("hv-prix-moins").addEventListener("click", () => bougerPrix(-1));
  document.getElementById("hv-prix-plus").addEventListener("click", () => bougerPrix(+1));
  elVenteConfirmer.addEventListener("click", confirmerVente);
}

export function ouvrirHV(inventaire, marcheJeu, surFermer = null) {
  if (actif) return;
  actif = true;
  inv = inventaire;
  marche = marcheJeu;
  surFermerActif = surFermer;
  venteEtape = null;
  elVente.hidden = true;
  // L'écran doit être VISIBLE avant rendre() : le graphique (canvas) lit
  // clientWidth/clientHeight, qui valent 0 tant que #hv est caché — sinon le
  // tout premier affichage reste vide jusqu'à la prochaine interaction.
  overlay.hidden = false;
  rendre();
  window.addEventListener("keydown", surTouche, true);
}

// Ordre d'affichage des ressources selon le tri choisi. Le tri par défaut
// respecte RESSOURCES_MARCHE (du plus commun au plus rare) ; les deux autres
// trient par le MOMENTUM récent (30 min) — pour repérer d'un coup d'œil ce qui
// grimpe (vendre) ou s'effondre (acheter).
function listeAffichee() {
  if (triMode === "defaut") return RESSOURCES_MARCHE;
  const parVariationDesc = [...RESSOURCES_MARCHE]
    .sort((a, b) => variation30min(marche, b) - variation30min(marche, a));
  return triMode === "hausse" ? parVariationDesc : parVariationDesc.reverse();
}

// Message furtif dans la barre d'aide (« pas assez d'or », « sac plein »…).
// `duree` plus longue pour un résumé à lire (ex. la plus-value d'une vente).
function noter(txt, duree = 2000) {
  elAide.textContent = txt;
  clearTimeout(aideTimer);
  aideTimer = setTimeout(() => { elAide.textContent = AIDE_DEFAUT; }, duree);
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

function rendre() {
  elOr.textContent = inv.or; // l'icône (#hv-or) est un élément statique du HTML — cf. index.html

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

  // Colonne gauche : une ligne par ressource, dans l'ordre choisi par le tri.
  elRessources.replaceChildren();
  listeAffichee().forEach((id) => {
    const d = itemDef(id);
    const prix = prixRessource(marche, id);
    const tend = tendanceRessource(marche, id);
    const var30 = variation30min(marche, id);
    const possede = compterRessource(inv, id);
    const ligne = document.createElement("div");
    ligne.className = "hv-ligne" + (id === selId ? " sel" : "") +
      (e && e.id === id ? " hv-ligne--evt" : "");
    const clTend = tend > 2 ? "haut" : tend < -2 ? "bas" : "plat";
    const fleche = tend > 2 ? "▲" : tend < -2 ? "▼" : "＝";
    const cl30 = var30 > 2 ? "haut" : var30 < -2 ? "bas" : "plat";
    // En tri « Top gainers/losers », le CRITÈRE de classement est la variation
    // 30 min : on la met en avant et on estompe la tendance vs prix normal —
    // sinon l'œil suit le gros % vert et le classement paraît incohérent.
    const triPar30 = triMode !== "defaut";
    ligne.innerHTML =
      `<span class="hv-pastille" style="background:${d.icone}"></span>` +
      `<span class="hv-nom"></span>` +
      `<span class="hv-tendance hv-tendance--${clTend}${triPar30 ? " hv-tendance--estompe" : ""}" title="current price vs. its normal price">${fleche} ${tend > 0 ? "+" : ""}${tend}%</span>` +
      `<span class="hv-var30 hv-tendance--${cl30}${triPar30 ? " hv-var30--tri" : ""}" title="price change over the last 30 min of play">30m: ${var30 > 0 ? "+" : ""}${var30}%</span>` +
      `<span class="hv-prix">${prix} <span class="icone-piece"></span></span>` +
      `<span class="hv-possede">you: ${possede}</span>`;
    ligne.querySelector(".hv-nom").textContent = d.nom;
    const btnA = document.createElement("button");
    btnA.className = "hv-btn";
    btnA.textContent = "Buy";
    btnA.disabled = inv.or < apercuAchat(marche, id, 1);
    btnA.addEventListener("click", (ev) => { ev.stopPropagation(); selId = id; acheter(id); });
    const btnV = document.createElement("button");
    btnV.className = "hv-btn";
    btnV.textContent = "Sell";
    btnV.disabled = possede < 1;
    btnV.addEventListener("click", (ev) => { ev.stopPropagation(); selId = id; vendre(id); });
    ligne.append(btnA, btnV);
    ligne.addEventListener("click", () => { selId = id; rendre(); });
    elRessources.appendChild(ligne);
  });

  // Colonne droite : graphique des prix de la ressource sélectionnée.
  elHistoTitre.textContent = `Price history — ${itemDef(selId)?.nom ?? selId}`;
  rendreGraphe(selId);

  rendreAnnonces();
}

// Graphique « façon trading » : la courbe du prix sur la DERNIÈRE HEURE de jeu
// actif (fenêtre fixe : les points plus vieux sortent par la gauche), ligne
// pointillée du prix de BASE en repère, point + étiquette sur le prix actuel.
// Netteté : le canvas est rendu à devicePixelRatio× sa taille affichée.

// Icône de monnaie en CANVAS (un seul coin, faute de place) : petit carré doré
// avec un trou sombre au centre — pendant canvas de l'icône CSS `.icone-piece`
// (cf. index.html) utilisée partout ailleurs. `x, y` = coin gauche/milieu vertical.
function dessinerIconePiece(ctx, x, y, taille) {
  ctx.save();
  ctx.fillStyle = "#e0a83a";
  ctx.strokeStyle = "#5a3a10";
  ctx.lineWidth = 1;
  ctx.fillRect(x, y - taille / 2, taille, taille);
  ctx.strokeRect(x, y - taille / 2, taille, taille);
  const trou = taille * 0.34;
  ctx.fillStyle = "#1f1710";
  ctx.fillRect(x + (taille - trou) / 2, y - trou / 2, trou, trou);
  ctx.restore();
}

function rendreGraphe(id) {
  const cv = elGraphe;
  const larg = cv.clientWidth, haut = cv.clientHeight;
  if (!larg || !haut) return;
  const dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(larg * dpr) || cv.height !== Math.round(haut * dpr)) {
    cv.width = Math.round(larg * dpr);
    cv.height = Math.round(haut * dpr);
  }
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, larg, haut);

  const FENETRE = 3600; // 1 h de jeu actif
  const now = marche.temps;
  const pts = (marche.histo[id] ?? []).filter((p) => now - p.t <= FENETRE);
  pts.push({ t: now, prix: prixRessource(marche, id) }); // le point « maintenant »

  // Échelle Y : englobe la courbe ET le prix de base, avec une marge de respiration.
  const base = prixBaseRessource(id);
  let yMin = Math.min(base, ...pts.map((p) => p.prix));
  let yMax = Math.max(base, ...pts.map((p) => p.prix));
  const marge = Math.max(1, (yMax - yMin) * 0.18);
  yMin -= marge; yMax += marge;

  const M = { g: 8, d: 44, h: 10, b: 18 }; // marges internes (étiquettes à droite/bas)
  const X = (t) => M.g + (1 - (now - t) / FENETRE) * (larg - M.g - M.d);
  const Y = (p) => M.h + (1 - (p - yMin) / (yMax - yMin)) * (haut - M.h - M.b);

  // Grille horizontale discrète + repères de temps.
  g.strokeStyle = "rgba(58, 74, 122, 0.25)";
  g.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = M.h + (i / 3) * (haut - M.h - M.b);
    g.beginPath(); g.moveTo(M.g, y); g.lineTo(larg - M.d, y); g.stroke();
  }
  g.fillStyle = "#6a7290";
  g.font = police(10);
  g.textAlign = "center"; g.textBaseline = "top";
  const yTxt = haut - M.b + 4;
  g.fillText("-1h", X(now - FENETRE) + 12, yTxt);
  g.fillText("-30m", X(now - 1800), yTxt);
  g.fillText("now", X(now) - 12, yTxt);

  // Ligne pointillée du prix de BASE (le repère « zone normale »). Son étiquette
  // s'efface si le prix actuel est trop proche (les deux partagent la marge droite).
  g.strokeStyle = "rgba(143, 160, 200, 0.5)";
  g.setLineDash([4, 4]);
  g.beginPath(); g.moveTo(M.g, Y(base)); g.lineTo(larg - M.d, Y(base)); g.stroke();
  g.setLineDash([]);
  if (Math.abs(Y(base) - Y(pts[pts.length - 1].prix)) > 13) {
    g.textAlign = "left"; g.textBaseline = "middle";
    g.fillStyle = "#8fa0c8";
    g.fillText(`${base}`, larg - M.d + 6, Y(base));
  }

  // La courbe : aplat dégradé dessous + trait doré + point sur « maintenant ».
  if (pts.length > 1) {
    const degrade = g.createLinearGradient(0, M.h, 0, haut - M.b);
    degrade.addColorStop(0, "rgba(255, 207, 87, 0.28)");
    degrade.addColorStop(1, "rgba(255, 207, 87, 0)");
    g.beginPath();
    g.moveTo(X(pts[0].t), Y(pts[0].prix));
    for (const p of pts) g.lineTo(X(p.t), Y(p.prix));
    g.lineTo(X(now), haut - M.b);
    g.lineTo(X(pts[0].t), haut - M.b);
    g.closePath();
    g.fillStyle = degrade;
    g.fill();
  }
  g.beginPath();
  g.moveTo(X(pts[0].t), Y(pts[0].prix));
  for (const p of pts) g.lineTo(X(p.t), Y(p.prix));
  g.strokeStyle = "#ffcf57";
  g.lineWidth = 2;
  g.lineJoin = "round";
  g.stroke();

  // Le point « maintenant » + son étiquette de prix (dans la marge de droite).
  const xN = X(now), yN = Y(pts[pts.length - 1].prix);
  g.beginPath(); g.arc(xN, yN, 3.2, 0, Math.PI * 2);
  g.fillStyle = "#ffcf57"; g.fill();
  g.font = police(11);
  g.textAlign = "left"; g.textBaseline = "middle";
  g.fillStyle = "#ffcf57";
  const txtPrix = `${pts[pts.length - 1].prix}`;
  const xEtiq = larg - M.d + 6, yEtiq = Math.max(M.h + 6, Math.min(haut - M.b - 6, yN));
  g.fillText(txtPrix, xEtiq, yEtiq);
  dessinerIconePiece(g, xEtiq + g.measureText(txtPrix).width + 4, yEtiq, 9);

  // Peu d'historique (partie fraîche) : petit mot pour expliquer la ligne courte.
  if (pts.length <= 2) {
    g.fillStyle = "#6a7290";
    g.font = police(10);
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillText("History builds up as you play…", (M.g + larg - M.d) / 2, M.h + 14);
  }
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
    l.className = "hv-annonce" + (v.vendu ? " hv-annonce--vendue" : "");
    l.innerHTML = `<span>${d?.nom ?? v.id} · ${v.prix} <span class="icone-piece"></span></span>`;
    if (v.vendu) {
      // Vendue : on vient la RÉCOLTER soi-même (clic). On affiche DÈS ICI (avant de
      // cliquer) la PLUS-VALUE réalisée par la patience : % gagné par rapport à ce
      // que le marchand aurait payé pour le même objet (prixVente). Vert = bonus.
      const prixMarchand = prixVente(v.id, v.qualite ?? null);
      const pvPct = prixMarchand > 0 ? Math.round((v.prix - prixMarchand) / prixMarchand * 100) : 0;
      const actions = document.createElement("div");
      actions.className = "hv-annonce-actions";
      const pv = document.createElement("span");
      pv.className = "hv-annonce-pv " + (pvPct >= 0 ? "hv-annonce-pv--gain" : "hv-annonce-pv--perte");
      pv.textContent = `${pvPct >= 0 ? "+" : ""}${pvPct}%`;
      pv.title = "Plus-value vs. selling this item straight to the merchant";
      const btn = document.createElement("button");
      btn.className = "hv-btn hv-btn--or";
      btn.textContent = "💰 Collect";
      btn.addEventListener("click", () => collecter(v));
      actions.append(pv, btn);
      l.append(actions);
    } else {
      const reste = document.createElement("span");
      reste.className = "hv-annonce-reste";
      reste.textContent = fmtReste(v.reste);
      l.append(reste);
    }
    elAnnonces.appendChild(l);
  }
}

// Récolte une annonce vendue : crédite l'or et rappelle la PLUS-VALUE réalisée
// par la patience (prix obtenu vs ce que le marchand aurait payé).
function collecter(v) {
  const d = itemDef(v.id);
  const prixMarchand = prixVente(v.id, v.qualite ?? null);
  const res = collecterVente(marche, v);
  if (!res) return; // déjà récoltée entre-temps (ne devrait pas arriver, sécurité)
  inv.or += res.prix;
  const pvPct = prixMarchand > 0 ? Math.round((res.prix - prixMarchand) / prixMarchand * 100) : 0;
  noter(`💰 Collected ${res.prix} 🪙 for ${d?.nom ?? v.id} — ${pvPct >= 0 ? "+" : ""}${pvPct}% vs. the merchant.`, 3500);
  rendre();
}

// ----- Mise en vente d'un objet (annonce à prix libre) ----------------------------

// Les objets du sac VENDABLES à l'annonce : tout sauf les ressources (elles ont
// leur marché vivant à gauche) — armes, armures, bijoux…
function objetsVendables() {
  return inv.objets.filter((o) => itemDef(o.id)?.categorie !== "ressource");
}

function ouvrirVente() {
  venteEtape = "liste";
  venteSel = 0;
  venteObjet = null;
  rendreVente();
  elVente.hidden = false;
}

function fermerVente() {
  venteEtape = null;
  elVente.hidden = true;
}

// Formatage d'une durée de jeu actif (estimations & fourchettes).
function fmtEstim(s) {
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`;
  return `${(s / 3600).toFixed(s < 10 * 3600 ? 1 : 0)} h`;
}

function rendreVente() {
  const enListe = venteEtape === "liste";
  elVenteListe.hidden = !enListe;
  elVentePrix.hidden = enListe;
  elVenteTitre.textContent = enListe ? "Sell an item" : "Set your price";
  elVenteAide.textContent = enListe
    ? "[↑↓] Choose · [Enter] Select · [Esc] Back"
    : "[←→] Price ±1 (Shift: ±5) · [Enter] List it · [Esc] Back";

  if (enListe) {
    elVenteListe.replaceChildren();
    objetsVendables().forEach((o, i) => {
      const d = itemDef(o.id);
      const q = o.qualite && o.qualite !== "normale" ? QUALITES[o.qualite] : null;
      const l = document.createElement("div");
      l.className = "hv-vente-item" + (i === venteSel ? " sel" : "");
      l.innerHTML = `<span></span><span style="color:#8fa0c8">value ${valeurReelle(o.id, o.qualite)} <span class="icone-piece"></span></span>`;
      l.children[0].textContent = d.nom + (q ? ` · ⚒ ${q.nom}` : "");
      l.children[0].style.color = couleurRarete(o.id);
      l.addEventListener("click", () => { venteSel = i; choisirObjetVente(); });
      elVenteListe.appendChild(l);
    });
    return;
  }

  // Étape prix : montant, estimation de délai, repères (conseillé / marchand).
  const id = venteObjet.id;
  const ql = venteObjet.qualite ?? null;
  const b = bornesPrixVente(id, ql);
  ventePrix = Math.min(b.max, Math.max(b.min, ventePrix));
  elVenteNom.textContent = itemDef(id).nom;
  elVenteNom.style.color = couleurRarete(id);
  elVenteMontant.innerHTML = `${ventePrix} <span class="icone-piece"></span>`;
  const e = estimerDelaiVente(id, ventePrix, ql);
  const remise = Math.round((1 - ventePrix / valeurReelle(id, ql)) * 100);
  elVenteNote.innerHTML =
    `Estimated sale time: <b>${fmtEstim(e.min)} – ${fmtEstim(e.max)}</b> of play` +
    ` &nbsp;(${remise}% below value)<br>` +
    `Recommended: ${prixConseille(id, ql)} <span class="icone-piece"></span> · Merchant would pay: ${prixVente(id, ql)} <span class="icone-piece"></span>`;
}

function choisirObjetVente() {
  const objets = objetsVendables();
  venteObjet = objets[venteSel] ?? null;
  if (!venteObjet) return;
  ventePrix = prixConseille(venteObjet.id, venteObjet.qualite ?? null);
  venteEtape = "prix";
  rendreVente();
}

function bougerPrix(pas) {
  if (venteEtape !== "prix") return;
  ventePrix += pas;
  rendreVente(); // borné dans rendreVente
}

function confirmerVente() {
  if (venteEtape !== "prix" || !venteObjet) return;
  // L'objet quitte le sac et part à l'annonce (la qualité de forge voyage avec :
  // elle reviendra si on ajoute un jour l'annulation d'annonce).
  jeterObjet(inv, venteObjet);
  mettreEnVente(marche, venteObjet.id, ventePrix, venteObjet.qualite ?? null);
  noter(`📈 ${itemDef(venteObjet.id).nom} listed for ${ventePrix} 🪙.`);
  fermerVente();
  rendre();
}

// ----- Clavier -------------------------------------------------------------------

function surTouche(e) {
  if (!actif) return;

  // Sous-fenêtre de mise en vente ouverte : le clavier lui appartient.
  if (venteEtape) {
    e.preventDefault(); e.stopPropagation();
    if (e.code === "Escape") {
      if (venteEtape === "prix") { venteEtape = "liste"; rendreVente(); }
      else fermerVente();
    } else if (venteEtape === "liste") {
      const n = objetsVendables().length;
      if (e.code === "ArrowUp" && n)   { venteSel = (venteSel - 1 + n) % n; rendreVente(); }
      if (e.code === "ArrowDown" && n) { venteSel = (venteSel + 1) % n; rendreVente(); }
      if ((e.code === "Enter" || e.code === "Space") && n) choisirObjetVente();
    } else if (venteEtape === "prix") {
      const pas = e.shiftKey ? 5 : 1;
      if (e.code === "ArrowLeft")  bougerPrix(-pas);
      if (e.code === "ArrowRight") bougerPrix(+pas);
      if (e.code === "Enter" || e.code === "Space") confirmerVente();
    }
    return;
  }

  if (e.code === "Escape") {
    e.preventDefault(); e.stopPropagation();
    fermerHV();
    return;
  }
  const k = e.key.toLowerCase();
  if (e.code === "ArrowUp" || e.code === "ArrowDown") {
    e.preventDefault(); e.stopPropagation();
    const liste = listeAffichee();
    const n = liste.length;
    const i = Math.max(0, liste.indexOf(selId));
    selId = liste[(i + (e.code === "ArrowDown" ? 1 : -1) + n) % n];
    rendre();
    // garde la ligne sélectionnée visible dans la liste
    elRessources.children[liste.indexOf(selId)]?.scrollIntoView({ block: "nearest" });
  } else if (k === "a") {
    e.preventDefault(); e.stopPropagation();
    acheter(selId);
  } else if (k === "v") {
    e.preventDefault(); e.stopPropagation();
    vendre(selId);
  } else if (k === "c") {
    // Récolte la PREMIÈRE annonce vendue prête à collecter (équivalent clavier
    // du clic sur « 💰 Collect » — appuyer plusieurs fois collecte les suivantes).
    e.preventDefault(); e.stopPropagation();
    const v = marche.ventes.find((v) => v.vendu);
    if (v) collecter(v);
    else noter("Nothing ready to collect yet.");
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
