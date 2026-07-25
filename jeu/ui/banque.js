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
import { t } from "../systems/langue.js";

let actif = false;
export function banqueActif() { return actif; }

const or = (n) => Math.floor(n).toLocaleString("fr-FR");
const etoilesRisque = (r) => "◆".repeat(r) + "◇".repeat(Math.max(0, 3 - r));

export function installerBanque() {
  const panneau    = document.getElementById("banque");
  const elOr       = document.getElementById("banque-or");
  const elCoffre   = document.getElementById("banque-coffre");
  const elSocietes = document.getElementById("banque-societes");
  const boutonFermer = document.getElementById("banque-fermer");

  let inv = null, banque = null, secret = false, surFermer = null;

  // Une ligne d'opération : un CHAMP où saisir le montant soi-même (+ Entrée ou OK
  // pour valider), et un bouton « tout » (All/Max) à côté pour tout mettre/retirer.
  // `plafond` = montant maximum disponible pour cette opération (le champ est plafonné).
  function ligneMontants(faire, plafond, labelTout = "All") {
    const rangee = document.createElement("div");
    rangee.className = "banque-montants";
    const plaf = Math.floor(plafond);

    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.className = "banque-input";
    input.min = "0";
    input.max = String(plaf);
    input.placeholder = plaf > 0 ? `0 – ${or(plaf)}` : "0";
    input.disabled = plaf <= 0;

    const soumettre = () => {
      let v = Math.floor(Number(input.value));
      if (!Number.isFinite(v) || v <= 0) return;
      v = Math.min(v, plaf);
      if (v <= 0) return;
      faire(v);
      input.value = "";
      rendre();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); soumettre(); return; }
      if (e.key === "Escape") return;   // laisse l'Échap global fermer la banque
      e.stopPropagation();              // le reste de la frappe reste dans le champ
    });

    const btnOk = document.createElement("button");
    btnOk.className = "banque-btn banque-btn--ok";
    btnOk.textContent = "OK";
    btnOk.disabled = plaf <= 0;
    btnOk.addEventListener("click", soumettre);

    const btnTout = document.createElement("button");
    btnTout.className = "banque-btn";
    btnTout.textContent = labelTout;
    btnTout.disabled = plaf <= 0;
    btnTout.addEventListener("click", () => { faire("all"); rendre(); });

    rangee.append(input, btnOk, btnTout);
    return rangee;
  }

  function carteCoffre() {
    const c = document.createElement("div");
    c.className = "banque-carte banque-carte--coffre";
    const solde = Math.floor(banque.soldeCoffre);
    c.innerHTML =
      `<div class="banque-carte-titre">${t("banque.vault")}</div>` +
      `<div class="banque-carte-sous">${t("banque.vaultSous")}</div>` +
      `<div class="banque-carte-valeur">${or(solde)} 🪙</div>`;
    const dep = document.createElement("div"); dep.className = "banque-op";
    dep.innerHTML = `<span class="banque-op-label">${t("banque.deposer")}</span>`;
    dep.append(ligneMontants((m) => deposer(banque, inv, m === "all" ? inv.or : m), inv.or, t("banque.tout")));
    const ret = document.createElement("div"); ret.className = "banque-op";
    ret.innerHTML = `<span class="banque-op-label">${t("banque.retirer")}</span>`;
    ret.append(ligneMontants((m) => retirer(banque, inv, m), solde, t("banque.tout")));
    c.append(dep, ret);
    return c;
  }

  function carteSociete(soc) {
    const c = document.createElement("div");
    c.className = "banque-carte banque-carte--soc risque-" + soc.risque;
    const val = Math.floor(banque.invest[soc.id] || 0);
    c.innerHTML =
      `<div class="banque-carte-titre">${soc.nom}</div>` +
      `<div class="banque-carte-sous">${soc.secteur} · <span class="banque-risque">${t("banque.risque",{etoiles: etoilesRisque(soc.risque)})}</span></div>` +
      `<div class="banque-carte-valeur">${val > 0 ? t("banque.investi",{val: or(val)}) : t("banque.nonInvesti")}</div>`;
    const ino = document.createElement("div"); ino.className = "banque-op";
    ino.innerHTML = `<span class="banque-op-label">${t("banque.investir")}</span>`;
    ino.append(ligneMontants((m) => investir(banque, inv, soc.id, m === "all" ? inv.or : m), inv.or, t("banque.max")));
    const out = document.createElement("div"); out.className = "banque-op";
    out.innerHTML = `<span class="banque-op-label">${t("banque.encaisser")}</span>`;
    out.append(ligneMontants((m) => desinvestir(banque, inv, soc.id, m), val, t("banque.tout")));
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
    if (Math.round(resume.coffreGain) > 0) bouts.push(t("banque.resVault",{gain: or(resume.coffreGain)}));
    for (const soc of SOCIETES) {
      const s = resume.societes[soc.id];
      if (!s || s.avant <= 0) continue;
      if (s.faillite) bouts.push(t("banque.resFaillite",{nom: soc.nom}));
      else {
        const delta = Math.round(s.apres - s.avant);
        const kr = s.krachs ? t(s.krachs > 1 ? "banque.resKrachN" : "banque.resKrach1", { n: s.krachs }) : "";
        bouts.push(`${soc.nom} ${delta >= 0 ? "+" : ""}${or(delta)} 🪙${kr}`);
      }
    }
    const jrs = t("banque.resJours",{jours: resume.jours, s: resume.jours > 1 ? "s" : ""});
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
