// L'écran BÂTIMENT : la fiche claire d'un bâtiment (à vendre ou possédé),
// ouverte depuis son panneau en ville. Tout y est organisé et lisible :
// prix, revenu, plafond, jauges de trésorerie et de prochain versement.
//
// ⏱ PARTICULARITÉ UNIQUE : le temps de jeu CONTINUE de s'écouler pendant que
// cet écran est ouvert (contrairement aux autres écrans qui figent l'horloge).
// On peut donc regarder la jauge du prochain versement se remplir en direct.
// C'est principal.js qui applique la règle (batimentActif() maintient le tick) ;
// aucun abus possible : la trésorerie plafonnée arrête la production toute seule.
//
// Entrées : souris (boutons) OU clavier ([Space/Enter] action, [Esc] fermer).

import {
  BATIMENTS, possede, etatBatiment, acheterBatiment,
  tempsAvantVersement, collecterTresorerie, stockTotal,
} from "../systems/batiments.js";
import { itemDef } from "../data/items.js";

// Nom lisible d'une ressource ; « stock » (map) → « 3 Wood + 1 Dark Wood ».
const resNom = (rid) => itemDef(rid)?.nom ?? rid;
const stockTexte = (stock) => Object.entries(stock ?? {})
  .filter(([, n]) => n > 0).map(([rid, n]) => `${n} ${resNom(rid)}`).join(" + ");
import { afficherMessage } from "./effets.js";

let actif = false;
let overlay, elTitre, elSous, elEtat, elLignes, elBoutons, elAide;
let inv = null, bats = null, batId = null, surFermerActif = null;
let timer = null;      // rafraîchissement des jauges (l'horloge tourne !)
let modeAffiche = null; // "vente" | "possede" : reconstruire si l'état change

export function batimentActif() { return actif; }

export function installerBatiment() {
  overlay = document.getElementById("batiment");
  elTitre = document.getElementById("bat-titre");
  elSous = document.getElementById("bat-sous");
  elEtat = document.getElementById("bat-etat");
  elLignes = document.getElementById("bat-lignes");
  elBoutons = document.getElementById("bat-boutons");
  elAide = document.getElementById("bat-aide");
  document.getElementById("bat-fermer").addEventListener("click", fermer);
  // Cliquer le fond sombre (hors panneau) ferme aussi — réflexe souris naturel.
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fermer(); });
}

export function ouvrirBatiment(id, batiments, inventaire, surFermer = null) {
  if (actif || !BATIMENTS[id]) return;
  actif = true;
  batId = id;
  bats = batiments;
  inv = inventaire;
  surFermerActif = surFermer;
  modeAffiche = null; // force la construction
  rafraichir();
  overlay.hidden = false;
  window.addEventListener("keydown", surTouche, true); // capture : avant le reste du jeu
  // Le temps s'écoule pendant que l'écran est ouvert → les jauges vivent.
  timer = setInterval(rafraichir, 250);
}

function fermer() {
  if (!actif) return;
  actif = false;
  clearInterval(timer);
  timer = null;
  window.removeEventListener("keydown", surTouche, true);
  overlay.hidden = true;
  const cb = surFermerActif;
  surFermerActif = null;
  if (cb) cb();
}

// ----- Actions -----------------------------------------------------------------

function acheter() {
  const def = BATIMENTS[batId];
  if (acheterBatiment(bats, inv, batId)) {
    afficherMessage(`🪚 The ${def.nom} is yours! First payout in 1 h of play.`);
    modeAffiche = null; // la fiche passe en mode « possédé »
    rafraichir();
  } else {
    afficherMessage(`Not enough gold — it costs ${def.prix} 🪙 and you have ${inv.or} 🪙.`);
  }
}

function collecter() {
  const def = BATIMENTS[batId];
  const r = collecterTresorerie(bats, inv, batId);
  if (!r) return;
  let msg = `💰 +${r.or} 🪙 from the ${def.nom}`;
  const pris = r.bonus.map((x) => `+${x.pris} ${resNom(x.id)}`).join(", ");
  if (pris) msg += `, ${pris}`;
  if (r.reste > 0) msg += ` — bag full: ${r.reste} left at the building`;
  afficherMessage(msg + ".");
  rafraichir();
}

// L'action « principale » du moment (bouton doré) : acheter ou récolter.
function actionPrincipale() {
  const btn = elBoutons.querySelector(".bat-btn--or");
  if (btn && !btn.disabled) btn.click();
}

function surTouche(e) {
  if (!actif) return;
  if (e.code === "Escape") { e.preventDefault(); e.stopPropagation(); fermer(); }
  else if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); e.stopPropagation(); actionPrincipale(); }
}

// ----- Rendu ---------------------------------------------------------------------

// Petites briques de construction (une rangée label→valeur, une jauge).
function ligne(label, valeurHtml, classe = "") {
  return `<div class="bat-ligne ${classe}"><span class="bat-ligne-label">${label}</span><span class="bat-ligne-valeur">${valeurHtml}</span></div>`;
}
function jauge(idFill, classe = "") {
  return `<div class="bat-jauge ${classe}"><div class="bat-jauge-fill" id="${idFill}"></div><span class="bat-jauge-txt" id="${idFill}-txt"></span></div>`;
}
const fmtMin = (s) => (s < 90 ? `${Math.max(1, Math.round(s))} s` : `${Math.ceil(s / 60)} min`);

// Reconstruit (si le mode a changé) puis met à jour les valeurs vivantes.
function rafraichir() {
  const def = BATIMENTS[batId];
  const aNous = possede(bats, batId);
  const mode = aNous ? "possede" : "vente";
  // Le produit de base = 1er bonus (chance 1) ; les suivants sont des drops rares.
  const base = def.bonus?.[0] ?? null;
  const baseNom = base ? resNom(base.id) : null;
  const rares = (def.bonus ?? []).slice(1);

  if (mode !== modeAffiche) {
    modeAffiche = mode;
    elTitre.textContent = `${def.icone ?? "🏠"} ${def.nom}`;
    elSous.textContent = def.description ?? "";
    if (mode === "vente") {
      const raresTexte = rares.map((d) => `${Math.round(d.chance * 100)}% ${resNom(d.id)}`).join(", ");
      elLignes.innerHTML =
        ligne("Price (one-time)", `<b class="bat-or">${def.prix} 🪙</b>`) +
        ligne("Your gold", `<span id="bat-v-or"></span>`) +
        ligne("Income", `+${def.revenu} 🪙${base ? ` and +${base.parVersement} ${baseNom}` : ""} <small>every hour of play</small>`) +
        (raresTexte ? ligne("Rare finds", `<small>chance each hour: ${raresTexte}</small>`) : "") +
        ligne("Treasury cap", `${def.tresorerieMax} 🪙 <small>(≈ ${Math.round(def.tresorerieMax / def.revenu)} h of income)</small>`) +
        `<div class="bat-note">⚠ When the treasury is FULL, production <b>stops</b> — nothing more is earned.
         Walk back to the sign and <b>collect regularly</b>. Time keeps flowing while you play
         (only the pause menu stops the clock).</div>`;
      elBoutons.innerHTML =
        `<button class="bat-btn bat-btn--or" id="bat-acheter">🪙 Buy — ${def.prix} 🪙</button>` +
        `<button class="bat-btn bat-btn--gris" id="bat-quitter">Leave</button>`;
      document.getElementById("bat-acheter").addEventListener("click", acheter);
    } else {
      elLignes.innerHTML =
        ligne("Treasury", jauge("bat-j-treso", "bat-jauge--or")) +
        ligne("Next payout", `<span id="bat-v-prochain"></span>`) +
        ligne("", jauge("bat-j-prochain")) +
        (def.bonus ? ligne("Materials stored", `<span id="bat-v-stock"></span>`) : "") +
        `<div class="bat-note">The saw keeps working while you play — even with this window open.
         ⚠ Full treasury = production <b>stops</b>. Collect regularly!</div>`;
      elBoutons.innerHTML =
        `<button class="bat-btn bat-btn--or" id="bat-collecter"></button>` +
        `<button class="bat-btn bat-btn--gris" id="bat-quitter">Close</button>`;
      document.getElementById("bat-collecter").addEventListener("click", collecter);
    }
    document.getElementById("bat-quitter").addEventListener("click", fermer);
    elAide.textContent = mode === "vente"
      ? "[Space] buy · [Esc] leave · click outside to close"
      : "[Space] collect · [Esc] close · click outside to close";
  }

  // --- Valeurs vivantes (mises à jour 4×/s : le temps s'écoule ici !) ---
  if (mode === "vente") {
    const vOr = document.getElementById("bat-v-or");
    vOr.innerHTML = `<b class="${inv.or >= def.prix ? "bat-ok" : "bat-manque"}">${inv.or} 🪙</b>`;
    elEtat.className = "bat-etat bat-etat--vente";
    elEtat.textContent = "🪧 FOR SALE";
    const btn = document.getElementById("bat-acheter");
    btn.disabled = inv.or < def.prix;
    return;
  }

  const b = etatBatiment(bats, batId);
  const plein = b.tresorerie >= def.tresorerieMax;
  elEtat.className = "bat-etat " + (plein ? "bat-etat--stop" : "bat-etat--ok");
  elEtat.textContent = plein
    ? "⛔ PRODUCTION STOPPED — treasury full, collect now!"
    : "● Producing…";

  // Jauge de trésorerie.
  const jt = document.getElementById("bat-j-treso");
  jt.style.width = Math.round((b.tresorerie / def.tresorerieMax) * 100) + "%";
  document.getElementById("bat-j-treso-txt").textContent = `${b.tresorerie} / ${def.tresorerieMax} 🪙`;

  // Prochain versement : texte + jauge de progression (elle se remplit en direct).
  const attente = tempsAvantVersement(bats, batId);
  document.getElementById("bat-v-prochain").innerHTML = plein
    ? `<b class="bat-manque">halted</b>`
    : `+${def.revenu} 🪙${base ? ` and +${base.parVersement} ${baseNom}` : ""} <small>in ${fmtMin(attente)} of play</small>`;
  const jp = document.getElementById("bat-j-prochain");
  jp.style.width = plein ? "0%" : Math.round((1 - attente / def.periode) * 100) + "%";
  document.getElementById("bat-j-prochain-txt").textContent = "";

  if (def.bonus) {
    const txt = stockTexte(b.stock);
    document.getElementById("bat-v-stock").innerHTML = `<b>${txt || "—"}</b>`;
  }

  const btn = document.getElementById("bat-collecter");
  const stockTxt = stockTexte(b.stock);
  const rien = b.tresorerie <= 0 && stockTotal(b) <= 0;
  btn.disabled = rien;
  btn.textContent = rien
    ? "💰 Nothing to collect yet"
    : `💰 Collect ${b.tresorerie} 🪙${stockTxt ? ` + ${stockTxt}` : ""}`;
}
