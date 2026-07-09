// L'ÉCRAN DE VENTE AUX ENCHÈRES (temps réel) — le théâtre du soir.
//
// Les lots passent UN PAR UN. Pour chaque lot :
//  - le prix courant monte par CRANS (increment du lot) ;
//  - les RIVAUX PNJ enchérissent tout seuls (délais aléatoires) tant que leur
//    BUDGET SECRET le permet ;
//  - le joueur surenchérit au bouton ou à [Space] ;
//  - chaque enchère RELANCE le marteau : « going once… going twice… SOLD! ».
// Le lot DU JOUEUR (dépôt) passe EN DERNIER : il regarde la salle se battre
// (il ne peut pas enchérir sur son propre bien).
//
// Le monde est figé pendant la vente (c'est un écran) ; le rythme de l'enchère
// est en TEMPS RÉEL (setInterval), indépendant de l'horloge de jeu.

import { itemDef, couleurRarete, RARETES } from "../data/items.js";
import { genererRivaux, mettreEnAttente } from "../systems/encheres.js";
import { ajouterObjet } from "../systems/inventaire.js";
import { montrerInfobulleEl, cacherInfobulle } from "./infobulle.js";

// Rythme du marteau et des rivaux (secondes RÉELLES — le ressenti de la salle).
const MARTEAU = 4.2;               // s sans enchère avant l'adjudication
const CRANS_MARTEAU = [1.4, 2.8];  // « going once » / « going twice »
const RIVAL_DELAI = [0.5, 2.2];    // un rival réfléchit entre 0,5 et 2,2 s
const PAUSE_ENTRE_LOTS = 2.6;      // s d'entracte entre deux lots
const TICK = 0.1;                  // pas de la boucle interne

let actif = false;
let overlay, elJour, elOr, elScene, elLog, elBoutons, elAide;
let ctx = null;      // { inv, enc, lots, jour, surFin }
let etat = null;     // l'état du lot en cours (prix, tenant, chrono…)
let timer = null;
let resultats = [];  // résumé de fin : [{ texte, classe }]

export function enchereActive() { return actif; }

export function installerEncheres() {
  overlay = document.getElementById("encheres");
  elJour = document.getElementById("ench-jour");
  elOr = document.getElementById("ench-or");
  elScene = document.getElementById("ench-scene");
  elLog = document.getElementById("ench-log");
  elBoutons = document.getElementById("ench-boutons");
  elAide = document.getElementById("ench-aide");
}

// Ouvre la vente : `lots` = lots de la maison (+ le dépôt du joueur ajouté en
// dernier par l'appelant). `surFin(resultats)` est appelé à la fermeture.
export function ouvrirEncheres({ inv, enc, lots, jour, surFin }) {
  if (actif) return;
  actif = true;
  ctx = { inv, enc, lots: [...lots], jour, surFin };
  etat = null;
  resultats = [];
  elJour.textContent = `Evening Auction — Day ${jour}`;
  elLog.replaceChildren();
  journal(`🔔 The bell rings. ${lots.length} lot${lots.length > 1 ? "s" : ""} tonight.`);
  overlay.hidden = false;
  window.addEventListener("keydown", surTouche, true);
  timer = setInterval(tic, TICK * 1000);
  prochainLot(PAUSE_ENTRE_LOTS * 0.6);
  rendre();
}

function fermer() {
  if (!actif) return;
  actif = false;
  clearInterval(timer);
  timer = null;
  window.removeEventListener("keydown", surTouche, true);
  cacherInfobulle();
  overlay.hidden = true;
  const cb = ctx?.surFin;
  const res = resultats;
  ctx = null; etat = null;
  if (cb) cb(res);
}

function surTouche(e) {
  if (!actif) return;
  if (e.code === "Escape") {
    e.preventDefault(); e.stopPropagation();
    // Quitter en pleine vente = renoncer aux lots restants (on prévient).
    if (etat && !etat.finVente) journal("You slip out of the hall…");
    fermer();
  } else if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault(); e.stopPropagation();
    const btn = document.getElementById("ench-encherir");
    if (btn && !btn.disabled) btn.click();
    else { const f = document.getElementById("ench-fermer2"); if (f) f.click(); }
  }
}

// ----- Déroulé -------------------------------------------------------------------

function journal(txt, classe = "") {
  const l = document.createElement("div");
  l.className = "ench-log-ligne " + classe;
  l.textContent = txt;
  elLog.prepend(l);
  while (elLog.children.length > 40) elLog.lastChild.remove();
}

function prochainLot(delai = PAUSE_ENTRE_LOTS) {
  const lot = ctx.lots.shift();
  if (!lot) { finDeVente(); return; }
  etat = {
    lot,
    rivaux: genererRivaux(lot),
    prix: lot.misePrix,
    tenant: null,          // null = personne ; "vous" ; ou le nom d'un rival
    chrono: -delai,        // négatif = entracte avant l'ouverture du lot
    prochainRival: null,   // date (chrono) de la prochaine enchère rivale
    cranAnnonce: 0,        // 0 / 1 (once) / 2 (twice)
    vendu: false,
  };
  const d = itemDef(lot.id);
  const nomLot = lot.type === "paquet" ? `${d.nom} ×${lot.quantite}` : d.nom;
  journal(lot.duJoueur
    ? `🎩 “And now… a piece from a private seller: ${nomLot}!”`
    : `🎩 “Next lot: ${nomLot}. Starting at ${lot.misePrix} 🪙!”`);
}

function finDeVente() {
  etat = { finVente: true };
  journal("🔨 “That concludes tonight's auction. Good night!”");
  rendre();
}

// L'IA de la salle : y a-t-il un rival prêt à surenchérir au prix suivant ?
function rivalCandidat() {
  const suivant = etat.prix + etat.lot.increment;
  const candidats = etat.rivaux.filter((r) => r.nom !== etat.tenant && r.budget >= suivant);
  if (!candidats.length) return null;
  return candidats[Math.floor(Math.random() * candidats.length)];
}

function encherir(qui) { // qui = "vous" ou un rival
  etat.prix += etat.lot.increment;
  etat.tenant = qui === "vous" ? "vous" : qui.nom;
  etat.chrono = 0;
  etat.cranAnnonce = 0;
  etat.prochainRival = null;
  journal(qui === "vous" ? `You bid ${etat.prix} 🪙.` : `${qui.nom} bids ${etat.prix} 🪙.`, qui === "vous" ? "ench-log--vous" : "");
}

function adjuger() {
  const { lot } = etat;
  etat.vendu = true;
  const d = itemDef(lot.id);
  const nomLot = lot.type === "paquet" ? `${d.nom} ×${lot.quantite}` : d.nom;
  if (lot.duJoueur) {
    // Le lot du joueur : l'or lui revient (plancher garanti par la mise à prix).
    // Pas de comparaison à une « valeur » affichée : le joueur ne voit jamais
    // ce chiffre interne, juger le prix obtenu fait partie du jeu.
    const prix = etat.prix;
    ctx.inv.or += prix;
    ctx.enc.depot = null;
    journal(`🔨 SOLD! Your ${nomLot} goes for ${prix} 🪙.`, "ench-log--vendu");
    resultats.push({ texte: `Your ${nomLot} sold for ${prix} 🪙.`, classe: "ok" });
  } else if (etat.tenant === "vous") {
    ctx.inv.or -= etat.prix;
    const ok = ajouterObjet(ctx.inv, lot.id, lot.quantite ?? 1, lot.qualite ? { qualite: lot.qualite } : null);
    if (!ok) mettreEnAttente(ctx.enc, lot);
    journal(`🔨 SOLD to YOU! ${nomLot} for ${etat.prix} 🪙.${ok ? "" : " (Bag full — claim it from Magnar.)"}`, "ench-log--vendu");
    resultats.push({ texte: `Won ${nomLot} for ${etat.prix} 🪙.`, classe: "ok" });
  } else if (etat.tenant) {
    journal(`🔨 SOLD to ${etat.tenant} for ${etat.prix} 🪙.`, "ench-log--vendu");
  } else {
    journal(`🔨 No takers — withdrawn.`);
  }
  etat.chrono = -PAUSE_ENTRE_LOTS; // entracte, puis lot suivant
}

// La boucle interne (10×/s, temps réel).
function tic() {
  if (!etat || etat.finVente) { rendre(); return; }
  etat.chrono += TICK;
  if (etat.vendu) {
    if (etat.chrono >= 0) prochainLot();
    rendre();
    return;
  }
  if (etat.chrono < 0) { rendre(); return; } // entracte d'ouverture du lot
  // Les rivaux réfléchissent puis enchérissent (si leur budget le permet).
  if (etat.prochainRival == null) {
    const c = rivalCandidat();
    etat.prochainRival = c ? etat.chrono + RIVAL_DELAI[0] + Math.random() * (RIVAL_DELAI[1] - RIVAL_DELAI[0]) : Infinity;
    etat.rivalPret = c;
  }
  if (etat.chrono >= etat.prochainRival && etat.rivalPret) {
    // Revalider au moment d'agir (le prix a pu monter entre-temps).
    const suivant = etat.prix + etat.lot.increment;
    if (etat.rivalPret.budget >= suivant && etat.rivalPret.nom !== etat.tenant) encherir(etat.rivalPret);
    else etat.prochainRival = null;
  }
  // Le marteau : annonces puis adjudication (une enchère remet tout à zéro).
  if (etat.chrono >= MARTEAU) adjuger();
  else if (etat.chrono >= CRANS_MARTEAU[1] && etat.cranAnnonce < 2) { etat.cranAnnonce = 2; journal("“Going twice…”", "ench-log--marteau"); }
  else if (etat.chrono >= CRANS_MARTEAU[0] && etat.cranAnnonce < 1) { etat.cranAnnonce = 1; journal("“Going once…”", "ench-log--marteau"); }
  rendre();
}

// ----- Rendu ---------------------------------------------------------------------------

function rendre() {
  elOr.textContent = ctx.inv.or;

  if (etat?.finVente) {
    // Résumé de fin : ce que la soirée a donné.
    elScene.innerHTML =
      `<div class="ench-fin-titre">🔨 Auction closed</div>` +
      (resultats.length
        ? resultats.map((r) => `<div class="ench-fin-ligne ench-fin--${r.classe}">${r.texte}</div>`).join("")
        : `<div class="ench-fin-ligne">You leave empty-handed tonight.</div>`);
    elBoutons.innerHTML = `<button class="bat-btn bat-btn--or" id="ench-fermer2">Leave the hall</button>`;
    document.getElementById("ench-fermer2").addEventListener("click", fermer);
    elAide.textContent = "[Space] leave · [Esc] leave";
    return;
  }
  if (!etat) return;

  const { lot } = etat;
  const d = itemDef(lot.id);
  const nomLot = lot.type === "paquet" ? `${d.nom} ×${lot.quantite}` : d.nom;
  const couleur = lot.type === "paquet" ? "#e8e4d8" : couleurRarete(lot.id);
  const rarete = RARETES[d.rarete]?.nom ?? "";
  const entracte = etat.chrono < 0;

  // La scène : le lot, le prix courant, le tenant, le marteau.
  const marteauTxt = etat.vendu ? "SOLD!" : etat.cranAnnonce === 2 ? "Going twice…" : etat.cranAnnonce === 1 ? "Going once…" : "";
  const pct = etat.vendu || entracte ? 0 : Math.min(1, etat.chrono / MARTEAU);
  elScene.innerHTML =
    `<div class="ench-lot">
      <span class="ench-lot-pastille" id="ench-pastille" style="background:${d.icone ?? "#888"}"></span>
      <div class="ench-lot-txt">
        <div class="ench-lot-nom" style="color:${couleur}">${nomLot}</div>
        <div class="ench-lot-sous">${lot.duJoueur ? "Your item — the room bids, you watch." : rarete}</div>
      </div>
    </div>` +
    (entracte
      ? `<div class="ench-prix-bloc"><div class="ench-attente">The auctioneer readies the next lot…</div></div>`
      : `<div class="ench-prix-bloc">
          <div class="ench-prix">${etat.prix} 🪙</div>
          <div class="ench-tenant">${etat.tenant === "vous" ? "— YOUR bid —" : etat.tenant ? `held by ${etat.tenant}` : "opening price"}</div>
          <div class="ench-marteau"><div class="ench-marteau-fill" style="width:${Math.round(pct * 100)}%"></div>
            <span class="ench-marteau-txt">${marteauTxt}</span></div>
        </div>`) +
    `<div class="ench-rivaux">${etat.rivaux.map((r) => `<span class="ench-rival${etat.tenant === r.nom ? " ench-rival--tenant" : ""}">${r.nom}</span>`).join("")}</div>`;

  // La bulle d'infos de l'objet (survol de la pastille) — on voit ce qu'on achète.
  const pastille = document.getElementById("ench-pastille");
  if (lot.type !== "paquet") {
    pastille.addEventListener("mouseenter", () => montrerInfobulleEl(lot.id, pastille));
    pastille.addEventListener("mouseleave", cacherInfobulle);
  }

  // Le bouton d'enchère (jamais sur son propre lot).
  const suivant = etat.prix + lot.increment;
  const peutEncherir = !entracte && !etat.vendu && !lot.duJoueur &&
    etat.tenant !== "vous" && ctx.inv.or >= suivant;
  elBoutons.innerHTML = lot.duJoueur
    ? `<div class="ench-spectateur">Fingers crossed…</div>`
    : `<button class="bat-btn bat-btn--or" id="ench-encherir" ${peutEncherir ? "" : "disabled"}>
        ✋ Bid ${suivant} 🪙</button>`;
  const btn = document.getElementById("ench-encherir");
  if (btn) btn.addEventListener("click", () => { if (peutEncherir) { encherir("vous"); rendre(); } });
  elAide.textContent = lot.duJoueur
    ? "[Esc] leave the hall"
    : (etat.tenant === "vous" ? "You hold the bid — wait for the hammer… · [Esc] leave"
       : ctx.inv.or < suivant ? "Not enough gold for the next bid · [Esc] leave"
       : "[Space] bid · [Esc] leave");
}
