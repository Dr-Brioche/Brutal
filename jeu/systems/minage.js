// ─────────────────────────────────────────────────────────────────────────────
// LES RÈGLES DU MINAGE — combien de minerai tombe par coup, à quelle vitesse, et
// ce qu'une pioche a le droit d'attaquer.
//
// Tout part d'une seule stat : l'EFFICACITÉ, portée par la PIOCHE équipée (et
// par quelques bijoux). Avant, deux mécanismes se marchaient dessus : un bonus
// « par rareté du minerai » codé en dur dans principal.js, et le passif
// `minageDouble` de l'Anneau de chance. Ils sont remplacés par cette stat unique.
//
// ⚠ RÈGLE : à 0 d'efficacité, on ramasse EXACTEMENT 1 minerai par coup. Jamais
// plus. Tout supplément se mérite avec une meilleure pioche.

import { itemDef, RARETES } from "../data/items.js";

// ---------------------------------------------------------------------------
// 1) COMBIEN de minerai par coup
// ---------------------------------------------------------------------------

// L'efficacité est un POURCENTAGE cumulatif de minerai supplémentaire :
//     0   → 1 minerai, toujours
//    10   → 1, et 10 % de chance d'un 2e
//   100   → 2 garantis
//   150   → 2 garantis, et 50 % de chance d'un 3e
//   250   → 3 garantis, et 50 % de chance d'un 4e
// Autrement dit : chaque tranche pleine de 100 ajoute un minerai SÛR, et le
// reste est une chance. `alea` est injectable pour rendre la fonction testable.
export function minerauxParCoup(efficacite, alea = Math.random) {
  const eff = Math.max(0, efficacite || 0);
  const garantis = Math.floor(eff / 100);
  const chance = (eff % 100) / 100;
  return 1 + garantis + (alea() < chance ? 1 : 0);
}

// L'efficacité TOTALE du héros : celle de sa pioche (avec le bonus de qualité
// gagné à la forge) plus celle de son autre équipement. Agrégée dans
// appliquerEquipement() → `heros.efficacite`.
export function efficaciteDesItems(ids, qualites = null) {
  return ids.reduce((somme, id) => {
    const d = itemDef(id);
    if (!d) return somme;
    return somme + (d.efficacite || 0);
  }, 0);
}

// ---------------------------------------------------------------------------
// 2) QUELLE pioche peut miner QUOI
// ---------------------------------------------------------------------------

// Une pioche entame les minerais de SA rareté et d'UN cran au-dessus — pas plus.
// La pioche de fer (commune) prend donc le commun et l'uncommon ; il faut la
// pioche de fer renforcée (uncommon) pour toucher au rare. C'est ce qui donne
// une raison d'en forger de meilleures.
export const PORTEE_RARETE = 1;

// Rang de rareté (0 = commun … 4 = légendaire), pour comparer sans citer les noms.
export function rangRarete(id) {
  return RARETES[itemDef(id)?.rarete]?.rang ?? 0;
}

// Rareté maximale que cette pioche peut miner. `null` (aucune pioche équipée)
// renvoie -1 : les mains nues ne cassent rien.
export function rareteMaxMinable(idPioche) {
  if (!idPioche || !itemDef(idPioche)) return -1;
  return rangRarete(idPioche) + PORTEE_RARETE;
}

// Peut-on miner ce filon avec cette pioche ?
export function peutMiner(idPioche, idMinerai) {
  return rangRarete(idMinerai) <= rareteMaxMinable(idPioche);
}

// ---------------------------------------------------------------------------
// 3) COMBIEN DE TEMPS un coup de pioche prend
// ---------------------------------------------------------------------------

// Plus le minerai est rare, plus il résiste : le temps de base est multiplié par
// ce coefficient. Un diamant demande donc deux fois plus de patience qu'un
// charbon — et une bonne pioche (vitesseMinage élevée) rattrape cet écart.
export const DURETE_PAR_RARETE = [1, 1.25, 1.55, 1.9, 2.3]; // commun → légendaire

// Durée d'un coup de pioche, en secondes. `dureeBase` est le réglage général du
// jeu (onglet « Général » de l'Excel) ; `vitesseMinage` est la stat de la pioche,
// exprimée en % (100 = vitesse de référence, 150 = une fois et demie plus vite).
export function dureeCoup(dureeBase, idMinerai, vitesseMinage) {
  const durete = DURETE_PAR_RARETE[rangRarete(idMinerai)] ?? 1;
  const vitesse = Math.max(10, vitesseMinage || 100) / 100;
  return dureeBase * durete / vitesse;
}
