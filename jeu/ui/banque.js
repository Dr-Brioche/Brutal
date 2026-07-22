// L'ÉCRAN DE LA BANQUE DE BRÜTÀL (ouvert en parlant à Grimbrück le banquier).
// À gauche : le COFFRE-FORT (dépôt sûr, +0,2 %/jour). À droite : les SOCIÉTÉS où
// investir (rendement meilleur mais risqué). Tout se joue à la souris (boutons)
// OU au clavier (Tab entre les boutons, Entrée/Espace pour activer, Échap ferme).
//
// À l'ouverture, on « rattrape » les jours de jeu écoulés (rendements/krachs) et on
// résume au joueur ce qui s'est passé pendant son absence.

import { SOCIETES } from "../data/banque.js";
import {
  resoudreJours, deposer, retirer, investir, desinvestir, valeurBanque,
} from "../systems/banque.js";
import { afficherMessage } from "./effets.js";

let actif = false;
export function banqueActif() { return actif; }

const or = (n) => Math.floor(n).toLocaleString("fr-FR");
const etoilesRisque = (r) => "◆".repeat(r) + "◇".repeat(3 - r);

export function installerBanque() {
  const panneau    = document.getElementById("banque");
  const elOr       = document.getElementById("banque-or");
  const elCoffre   = document.getElementById("banque-coffre");
  const elSocietes = document.getElementById("banque-societes");
  const boutonFermer = document.getElementById("banque-fermer");

  let inv = null, banque = null, secret = false, surFermer = null;

  // Un bouton d'action (montant fixe ou « tout »). `dispo` = montant réellement
  // disponible pour l'opération ; le bouton est grisé si l'action ne peut rien faire.
  function bouton(label, action, actif = true) {
    const b = document.createElement("button");
    b.className = "banque-btn";
    b.textContent = label;
    b.disabled = !actif;
    b.addEventListener("click", () => { if (actif) { action(); rendre(); } });
    return b;
  }

  function ligneMontants(faire, plafond, labelTout = "All") {
    const rangee = document.createElement("div");
    rangee.className = "banque-montants";
    for (const m of [100, 1000, 10000]) {
      rangee.append(bouton(or(m), () => faire(m), plafond >= m));
    }
    rangee.append(bouton(labelTout, () => faire("all"), plafond > 0));
    return rangee;
  }

  function carteCoffre() {
    const c = document.createElement("div");
    c.className = "banque-carte banque-carte--coffre";
    const solde = Math.floor(banque.soldeCoffre);
    c.innerHTML =
      `<div class="banque-carte-titre">🏦 Vault</div>` +
      `<div class="banque-carte-sous">Safe · +0.2% / game-day</div>` +
      `<div class="banque-carte-valeur">${or(solde)} 🪙</div>`;
    const dep = document.createElement("div"); dep.className = "banque-op";
    dep.innerHTML = `<span class="banque-op-label">Deposit</span>`;
    dep.append(ligneMontants((m) => deposer(banque, inv, m === "all" ? inv.or : m), inv.or, "All"));
    const ret = document.createElement("div"); ret.className = "banque-op";
    ret.innerHTML = `<span class="banque-op-label">Withdraw</span>`;
    ret.append(ligneMontants((m) => retirer(banque, inv, m), solde, "All"));
    c.append(dep, ret);
    return c;
  }

  function carteSociete(soc) {
    const c = document.createElement("div");
    c.className = "banque-carte banque-carte--soc risque-" + soc.risque;
    const val = Math.floor(banque.invest[soc.id] || 0);
    c.innerHTML =
      `<div class="banque-carte-titre">${soc.nom}</div>` +
      `<div class="banque-carte-sous">${soc.secteur} · <span class="banque-risque">Risk ${etoilesRisque(soc.risque)}</span></div>` +
      `<div class="banque-carte-valeur">${val > 0 ? or(val) + " 🪙 invested" : "<span class=\"banque-vide\">Not invested</span>"}</div>`;
    const ino = document.createElement("div"); ino.className = "banque-op";
    ino.innerHTML = `<span class="banque-op-label">Invest</span>`;
    ino.append(ligneMontants((m) => investir(banque, inv, soc.id, m === "all" ? inv.or : m), inv.or, "Max"));
    const out = document.createElement("div"); out.className = "banque-op";
    out.innerHTML = `<span class="banque-op-label">Cash out</span>`;
    out.append(ligneMontants((m) => desinvestir(banque, inv, soc.id, m), val, "All"));
    c.append(ino, out);
    return c;
  }

  function rendre() {
    elOr.textContent = or(inv.or);
    elCoffre.replaceChildren(carteCoffre());
    elSocietes.replaceChildren(...SOCIETES.map(carteSociete));
  }

  // Résumé de ce qui s'est passé pendant l'absence (rendements, krachs, faillites).
  function annoncerResume(resume) {
    if (!resume || resume.jours <= 0) return;
    const bouts = [];
    if (Math.round(resume.coffreGain) > 0) bouts.push(`vault +${or(resume.coffreGain)} 🪙`);
    for (const soc of SOCIETES) {
      const s = resume.societes[soc.id];
      if (!s || s.avant <= 0) continue;
      if (s.faillite) bouts.push(`${soc.nom} went BANKRUPT — funds lost`);
      else {
        const delta = Math.round(s.apres - s.avant);
        const kr = s.krachs ? ` (${s.krachs} crash${s.krachs > 1 ? "es" : ""})` : "";
        bouts.push(`${soc.nom} ${delta >= 0 ? "+" : ""}${or(delta)} 🪙${kr}`);
      }
    }
    const jrs = `${resume.jours} game-day${resume.jours > 1 ? "s" : ""} passed`;
    afficherMessage(`🏦 ${jrs}${bouts.length ? " · " + bouts.join(" · ") : ""}.`);
  }

  function surClavier(e) {
    if (!actif) return;
    if (e.code === "Escape") { e.preventDefault(); fermer(); }
  }

  function ouvrir({ inventaire, banque: b, jour, secret: sec, surFermer: sf }) {
    inv = inventaire; banque = b; secret = !!sec; surFermer = sf;
    const resume = resoudreJours(banque, jour, secret); // rattrape les jours écoulés
    panneau.hidden = false;
    actif = true;
    rendre();
    annoncerResume(resume);
    window.addEventListener("keydown", surClavier, true);
    boutonFermer.focus();
  }

  function fermer() {
    if (!actif) return;
    actif = false;
    panneau.hidden = true;
    window.removeEventListener("keydown", surClavier, true);
    if (surFermer) surFermer();
  }

  boutonFermer.addEventListener("click", fermer);
  return { ouvrir, fermer, actif: () => actif, valeurBanque: () => valeurBanque(banque) };
}
