// La MORT et les CACHES de butin perdu.
//
// Quand le héros tombe dans les profondeurs, il ne meurt pas VRAIMENT : il se
// réveille en ville, près du Fanatique (qui le soigne, pour l'instant). Mais la
// Mort prélève son tribut :
//   • la MOITIÉ de sa barre d'XP en cours (jamais son niveau — on ne redescend pas),
//   • la MOITIÉ (au hasard) des objets de son SAC (jamais l'équipement porté),
//   • 30% de son OR.
// Ce butin perdu n'est pas détruit : il tombe quelque part dans les profondeurs,
// sous forme de CACHE. Chaque mort crée une cache qui s'AJOUTE aux précédentes
// (mémoire persistante, sauvegardée).
//
// Ensuite, en explorant les mines, chaque étage a 1% de chance PAR CACHE de faire
// resurgir cette cache (tirage INDÉPENDANT : deux caches peuvent apparaître sur le
// même étage). La ramasser rend son butin et l'efface de la mémoire pour toujours.

import { ajouterObjet, ajouterOr } from "./inventaire.js";
import { gagnerXp } from "./progression.js";
import { itemDef } from "../data/items.js";

const PERTE_XP = 0.5;              // moitié de la barre d'XP en cours
const PERTE_OBJETS = 0.5;         // moitié des objets du sac (au hasard)
const PERTE_OR = 0.30;            // 30% de l'or
export const PROBA_CACHE_ETAGE = 0.01; // 1% par cache et par étage de profondeur

export function creerMort() {
  return { caches: [], prochainId: 1 };
}

// Mélange (Fisher-Yates) une COPIE d'un tableau — pour tirer des objets au hasard.
function melanger(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Recopie proprement un objet du sac vers la cache (id + éventuelle pile/qualité).
function copierObjet(o) {
  return {
    id: o.id,
    ...(o.quantite ? { quantite: o.quantite } : {}),
    ...(o.qualite ? { qualite: o.qualite } : {}),
  };
}

// Applique la mort : prélève le tribut sur le héros et le sac, crée une CACHE
// (ajoutée à la mémoire) et la renvoie — ou null si le héros n'avait rien à perdre.
// Ne touche PAS aux PV ni à la position : la réapparition + le soin sont gérés par
// l'appelant (principal.js). Les slots d'équipement portés sont épargnés.
export function appliquerMort(mort, heros, inventaire) {
  const cache = { id: mort.prochainId, xp: 0, or: 0, objets: [] };

  // XP : la moitié de la barre EN COURS (heros.xp). On ne perd jamais de niveau.
  const xpPerdue = Math.floor((heros.xp || 0) * PERTE_XP);
  if (xpPerdue > 0) { heros.xp -= xpPerdue; cache.xp = xpPerdue; }

  // Or : 30% de la bourse.
  const orPerdu = Math.floor((inventaire.or || 0) * PERTE_OR);
  if (orPerdu > 0) { inventaire.or -= orPerdu; cache.or = orPerdu; }

  // Objets du SAC : la moitié au hasard (un objet empilable part avec toute sa pile).
  const sac = inventaire.objets || [];
  const nbAPerdre = Math.floor(sac.length * PERTE_OBJETS);
  if (nbAPerdre > 0) {
    const victimes = melanger(sac).slice(0, nbAPerdre);
    for (const o of victimes) cache.objets.push(copierObjet(o));
    inventaire.objets = sac.filter((o) => !victimes.includes(o));
  }

  // Rien perdu du tout ? pas de cache fantôme (l'id reste dispo pour la prochaine).
  if (cache.xp === 0 && cache.or === 0 && cache.objets.length === 0) return null;
  mort.prochainId += 1;
  mort.caches.push(cache);
  return cache;
}

// Tire, pour un étage de mine, les caches qui y refont surface. Chaque cache de la
// mémoire est testée INDÉPENDAMMENT (1% chacune). Renvoie la liste des ids sortis.
export function tirerCachesEtage(mort) {
  const sortis = [];
  for (const c of mort.caches) if (Math.random() < PROBA_CACHE_ETAGE) sortis.push(c.id);
  return sortis;
}

// Y a-t-il encore une cache portant cet id en mémoire ? (sécurité au ramassage)
export function cacheExiste(mort, id) {
  return mort.caches.some((c) => c.id === id);
}

// Ramasse la cache `id` : rend son butin au héros/au sac et l'efface de la mémoire.
// Les objets qui NE RENTRENT PAS dans un sac plein restent dans la cache (le butin
// n'est jamais détruit) — l'XP et l'or, eux, sont toujours rendus. Renvoie un
// résumé { xp, or, objets, complet } (complet = false si le sac a débordé).
export function ramasserCache(mort, id, heros, inventaire) {
  const i = mort.caches.findIndex((c) => c.id === id);
  if (i === -1) return null;
  const cache = mort.caches[i];
  const resume = { xp: cache.xp, or: cache.or, objets: [], complet: true };
  if (cache.xp > 0) gagnerXp(heros, cache.xp);
  if (cache.or > 0) ajouterOr(inventaire, cache.or);
  const restants = [];
  for (const o of cache.objets) {
    const ok = ajouterObjet(inventaire, o.id, o.quantite ?? 1, o.qualite ? { qualite: o.qualite } : null);
    if (ok) resume.objets.push(o); else restants.push(o);
  }
  if (restants.length === 0) {
    mort.caches.splice(i, 1);          // tout rendu → effacée pour toujours
  } else {
    cache.xp = 0; cache.or = 0; cache.objets = restants; // sac plein : le reste attend
    resume.complet = false;
  }
  return resume;
}

// ---- Sauvegarde ----------------------------------------------------------

export function etatMort(mort) {
  return {
    prochainId: mort.prochainId,
    caches: mort.caches.map((c) => ({ id: c.id, xp: c.xp, or: c.or, objets: c.objets.map((o) => ({ ...o })) })),
  };
}

export function chargerMort(mort, etat) {
  mort.caches = [];
  mort.prochainId = 1;
  if (!etat) return;
  if (Array.isArray(etat.caches)) {
    for (const c of etat.caches) {
      const objets = Array.isArray(c.objets)
        ? c.objets.filter((o) => itemDef(o?.id)).map(copierObjet)
        : [];
      mort.caches.push({
        id: c.id,
        xp: Math.max(0, Math.floor(c.xp || 0)),
        or: Math.max(0, Math.floor(c.or || 0)),
        objets,
      });
    }
  }
  if (Number.isFinite(etat.prochainId)) mort.prochainId = Math.floor(etat.prochainId);
  // Garantit un prochainId strictement supérieur à tous les ids existants.
  for (const c of mort.caches) if (c.id >= mort.prochainId) mort.prochainId = c.id + 1;
}
