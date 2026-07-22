// LA BANQUE DE BRÜTÀL — logique.
//
// État persistant : l'or au COFFRE-FORT (sûr) + les montants INVESTIS par société
// (risqués) + le dernier jour de jeu résolu. Les rendements sont appliqués
// PARESSEUSEMENT : à l'ouverture de la banque, on « rattrape » tous les jours de
// jeu écoulés depuis la dernière visite (cf. resoudreJours), pour chaque société
// et le coffre. Rien ne tourne image par image.

import { RENDEMENT_COFFRE, SOCIETES, BONUS_TALENT } from "../data/banque.js";

const CAP_JOURS = 400; // garde-fou : on ne résout jamais plus de 400 jours d'un coup

export function creerBanque() {
  const invest = {};
  for (const s of SOCIETES) invest[s.id] = 0;
  return { soldeCoffre: 0, invest, dernierJour: 1 };
}

export function etatBanque(b) {
  return { soldeCoffre: b.soldeCoffre, invest: { ...b.invest }, dernierJour: b.dernierJour };
}

export function chargerBanque(b, etat) {
  // Réinitialise proprement (save absente = banque vide).
  b.soldeCoffre = 0;
  for (const s of SOCIETES) b.invest[s.id] = 0;
  b.dernierJour = 1;
  if (!etat) return;
  if (Number.isFinite(etat.soldeCoffre)) b.soldeCoffre = Math.max(0, etat.soldeCoffre);
  if (etat.invest) for (const s of SOCIETES) {
    const v = etat.invest[s.id];
    if (Number.isFinite(v) && v > 0) b.invest[s.id] = v;
  }
  if (Number.isInteger(etat.dernierJour) && etat.dernierJour >= 1) b.dernierJour = etat.dernierJour;
}

// Réglages d'une société, éventuellement bonifiés par le talent « Secret d'investisseur ».
export function parametresSociete(soc, secret = false) {
  if (!secret) return soc;
  return {
    ...soc,
    rendementMoyen: soc.rendementMoyen * BONUS_TALENT.rendementMoyen,
    volatilite:     soc.volatilite     * BONUS_TALENT.volatilite,
    probaKrach:     soc.probaKrach     * BONUS_TALENT.probaKrach,
    pertesKrach:    soc.pertesKrach    * BONUS_TALENT.pertesKrach,
    probaFaillite:  soc.probaFaillite  * BONUS_TALENT.probaFaillite,
  };
}

// Fait « tourner » un jour de jeu sur un capital investi dans une société.
// Renvoie le nouveau capital et l'événement marquant du jour (faillite / krach / rien).
function unJour(capital, p) {
  if (capital <= 0) return { capital: 0, evt: null };
  if (Math.random() < p.probaFaillite) return { capital: 0, evt: "faillite" };
  if (Math.random() < p.probaKrach) return { capital: capital * (1 - p.pertesKrach), evt: "krach" };
  const variation = p.rendementMoyen + (Math.random() * 2 - 1) * p.volatilite;
  return { capital: Math.max(0, capital * (1 + variation)), evt: null };
}

// Rattrape tous les jours de jeu écoulés depuis la dernière visite. Met à jour la
// banque en place et renvoie un RÉSUMÉ par société (avant/après + krachs/faillites),
// pour l'afficher au joueur. `secret` = talent « Secret d'investisseur » actif.
export function resoudreJours(b, jourActuel, secret = false) {
  const jours = Math.min(CAP_JOURS, Math.max(0, jourActuel - b.dernierJour));
  b.dernierJour = jourActuel;
  const resume = { jours, coffreGain: 0, societes: {} };
  if (jours <= 0) return resume;

  // Coffre-fort : intérêts composés, sûrs.
  const avantCoffre = b.soldeCoffre;
  b.soldeCoffre = b.soldeCoffre * Math.pow(1 + RENDEMENT_COFFRE, jours);
  resume.coffreGain = b.soldeCoffre - avantCoffre;

  // Sociétés : on déroule jour par jour (les krachs/faillites sont des tirages quotidiens).
  for (const soc of SOCIETES) {
    const avant = b.invest[soc.id] || 0;
    resume.societes[soc.id] = { avant, apres: avant, krachs: 0, faillite: false };
    if (avant <= 0) continue;
    const p = parametresSociete(soc, secret);
    let cap = avant, krachs = 0, faillite = false;
    for (let j = 0; j < jours && cap > 0; j++) {
      const r = unJour(cap, p);
      cap = r.capital;
      if (r.evt === "krach") krachs++;
      if (r.evt === "faillite") { faillite = true; break; }
    }
    b.invest[soc.id] = cap;
    resume.societes[soc.id] = { avant, apres: cap, krachs, faillite };
  }
  return resume;
}

// ---- Opérations du joueur (l'or vit dans inventaire.or) ---------------------

// Dépose `montant` d'or (de l'inventaire vers le coffre-fort). Renvoie le montant réel.
export function deposer(b, inv, montant) {
  const m = Math.min(Math.max(0, Math.floor(montant)), inv.or);
  inv.or -= m; b.soldeCoffre += m; return m;
}

// Retire `montant` du coffre-fort vers l'inventaire ("all" = tout). Renvoie le réel.
export function retirer(b, inv, montant) {
  const dispo = Math.floor(b.soldeCoffre);
  const m = montant === "all" ? dispo : Math.min(Math.max(0, Math.floor(montant)), dispo);
  b.soldeCoffre -= m; inv.or += m; return m;
}

// Investit `montant` d'or dans la société `id`. Renvoie le montant réel investi.
export function investir(b, inv, id, montant) {
  if (!(id in b.invest)) return 0;
  const m = Math.min(Math.max(0, Math.floor(montant)), inv.or);
  inv.or -= m; b.invest[id] += m; return m;
}

// Retire de la société `id` vers l'inventaire ("all" = toute la valeur actuelle).
export function desinvestir(b, inv, id, montant) {
  if (!(id in b.invest)) return 0;
  const dispo = Math.floor(b.invest[id]);
  const m = montant === "all" ? dispo : Math.min(Math.max(0, Math.floor(montant)), dispo);
  b.invest[id] -= m; inv.or += m; return m;
}

// Or total confié à la banque (coffre + sociétés), pour l'affichage.
export function valeurBanque(b) {
  let t = b.soldeCoffre;
  for (const s of SOCIETES) t += b.invest[s.id] || 0;
  return Math.floor(t);
}
