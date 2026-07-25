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
import { t } from "../systems/langue.js";

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
    afficherMessage(t("bat.achat",{nom: def.nom}));
    modeAffiche = null; // la fiche passe en mode « possédé »
    rafraichir();
  } else {
    afficherMessage(t("bat.pasAssez",{prix: def.prix, or: inv.or}));
  }
}

function collecter() {
  const def = BATIMENTS[batId];
  const r = collecterTresorerie(bats, inv, batId);
  if (!r) return;
  let msg = t("bat.msgVersement",{or: r.or, nom: def.nom});
  const pris = r.bonus.map((x) => `+${x.pris} ${resNom(x.id)}`).join(", ");
  if (pris) msg += `, ${pris}`;
  if (r.reste > 0) msg += t("bat.msgReste",{reste: r.reste});
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
      const raresTexte = rares.map((d) => t("bat.pourcentRes",{pct: Math.round(d.chance * 100), res: resNom(d.id)})).join(", ");
      elLignes.innerHTML =
        ligne(t("bat.prixUnique"), `<b class="bat-or">${def.prix} 🪙</b>`) +
        ligne(t("bat.tonOr"), `<span id="bat-v-or"></span>`) +
        ligne(t("bat.revenu"), t("bat.revenuVal",{revenu: def.revenu, plus: base ? t("bat.etBase",{n: base.parVersement, res: baseNom}) : ""})) +
        (raresTexte ? ligne(t("bat.raresTrouvailles"), t("bat.raresVal",{txt: raresTexte})) : "") +
        ligne(t("bat.tresorCap"), t("bat.tresorCapVal",{max: def.tresorerieMax, h: Math.round(def.tresorerieMax / def.revenu)})) +
        `<div class="bat-note">${t("bat.noteVente")}</div>`;
      elBoutons.innerHTML =
        `<button class="bat-btn bat-btn--or" id="bat-acheter">${t("bat.acheter",{prix: def.prix})}</button>` +
        `<button class="bat-btn bat-btn--gris" id="bat-quitter">${t("bat.quitter")}</button>`;
      document.getElementById("bat-acheter").addEventListener("click", acheter);
    } else {
      elLignes.innerHTML =
        ligne(t("bat.tresorerie"), jauge("bat-j-treso", "bat-jauge--or")) +
        ligne(t("bat.prochainVersement"), `<span id="bat-v-prochain"></span>`) +
        ligne("", jauge("bat-j-prochain")) +
        (def.bonus ? ligne(t("bat.materielStocke"), `<span id="bat-v-stock"></span>`) : "") +
        `<div class="bat-note">${t("bat.notePossede")}</div>`;
      elBoutons.innerHTML =
        `<button class="bat-btn bat-btn--or" id="bat-collecter"></button>` +
        `<button class="bat-btn bat-btn--gris" id="bat-quitter">${t("bat.fermer")}</button>`;
      document.getElementById("bat-collecter").addEventListener("click", collecter);
    }
    document.getElementById("bat-quitter").addEventListener("click", fermer);
    elAide.textContent = mode === "vente"
      ? t("bat.aideAchat")
      : t("bat.aideCollecte");
  }

  // --- Valeurs vivantes (mises à jour 4×/s : le temps s'écoule ici !) ---
  if (mode === "vente") {
    const vOr = document.getElementById("bat-v-or");
    vOr.innerHTML = `<b class="${inv.or >= def.prix ? "bat-ok" : "bat-manque"}">${inv.or} 🪙</b>`;
    elEtat.className = "bat-etat bat-etat--vente";
    elEtat.textContent = t("bat.aVendre");
    const btn = document.getElementById("bat-acheter");
    btn.disabled = inv.or < def.prix;
    return;
  }

  const b = etatBatiment(bats, batId);
  const plein = b.tresorerie >= def.tresorerieMax;
  elEtat.className = "bat-etat " + (plein ? "bat-etat--stop" : "bat-etat--ok");
  elEtat.textContent = plein
    ? t("bat.prodStop")
    : t("bat.prodEnCours");

  // Jauge de trésorerie.
  const jt = document.getElementById("bat-j-treso");
  jt.style.width = Math.round((b.tresorerie / def.tresorerieMax) * 100) + "%";
  document.getElementById("bat-j-treso-txt").textContent = `${b.tresorerie} / ${def.tresorerieMax} 🪙`;

  // Prochain versement : texte + jauge de progression (elle se remplit en direct).
  const attente = tempsAvantVersement(bats, batId);
  document.getElementById("bat-v-prochain").innerHTML = plein
    ? `<b class="bat-manque">halted</b>`
    : t("bat.revenuAttente",{revenu: def.revenu, plus: base ? t("bat.etBase",{n: base.parVersement, res: baseNom}) : "", temps: fmtMin(attente)});
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
    : t("bat.collecter",{or: b.tresorerie, stock: stockTxt ? ` + ${stockTxt}` : ""});
}
