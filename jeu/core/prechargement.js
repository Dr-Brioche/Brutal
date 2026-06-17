// Préchargement des images du jeu, AVEC rapport de progression — pour afficher
// une barre de chargement sur l'écran-titre. Sans elle, l'écran reste figé
// pendant le téléchargement et on a l'impression que « ça bug ».
//
// On précharge EXACTEMENT les planches que demarrerJeu attend avant de lancer
// (héros, ennemis, PNJ, équipement). Les fonds de combat (lourds, ~2 Mo pièce)
// NE sont PAS inclus : ils se chargent en arrière-plan pendant l'exploration
// (cf. prechargerFonds), bien avant le premier combat.

import { ITEMS } from "../data/items.js";
import { ENNEMIS } from "../data/ennemis.js";
import { FANATIQUE, MARCHAND } from "../data/pnj.js";

// La liste DÉDOUBLONNÉE des planches nécessaires pour afficher le jeu.
// (Même calcul que dans demarrerJeu — c'est ce qui doit être prêt avant de lancer.)
export function planchesDuJeu() {
  const avecPlanche = [...Object.values(ITEMS), ...ENNEMIS, FANATIQUE, MARCHAND]
    .filter((o) => o.planche);
  return [...new Set(avecPlanche.map((o) => o.planche))];
}

// Charge toutes les images de `chemins`, en appelant `onProgress(faits, total)`
// après CHAQUE image — chargée OU en échec (la barre avance quand même : une
// image manquante ne doit jamais figer le chargement). Résout quand tout est
// tenté ; le navigateur garde les images en cache pour le lancement qui suit.
export function prechargerImages(chemins, onProgress) {
  const total = chemins.length;
  let faits = 0;
  onProgress?.(0, total);
  if (total === 0) return Promise.resolve();
  return Promise.all(chemins.map((chemin) => new Promise((resoudre) => {
    const img = new Image();
    const fini = () => { faits += 1; onProgress?.(faits, total); resoudre(); };
    img.onload = fini;
    img.onerror = fini; // échec : on avance quand même (pas de blocage)
    img.src = chemin;
  })));
}
