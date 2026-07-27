// LE FOU DU ROI — état qui SURVIT aux combats (et à la sauvegarde).
//
// Ce n'est pas un monstre ordinaire : c'est une rencontre à TIROIRS, qui se
// souvient de ce qu'on lui a répondu la fois d'avant.
//
//   1re rencontre : il propose son marché pour    500 🪙
//   2e  (si payé) : le même marché pour         2 000 🪙
//   3e  (si payé) : le même marché pour        10 000 🪙
//   … et là seulement, il RÉCOMPENSE la crédulité (XP + gemmes rares), puis
//     annonce que la prochaine rencontre sera « moins plaisante » : il ne
//     propose plus rien, il faudra l'abattre.
//
// Le TUER met fin à l'histoire : il ne reparaît plus de la partie.
//
// Ce module ne contient que l'ÉTAT et les RÈGLES (pas d'affichage) : le déroulé
// des dialogues vit dans principal.js, la fiche du monstre dans data/ennemis.js.

// Ce qu'il réclame, dans l'ordre des paiements déjà encaissés.
export const PRIX_FOU = [500, 2000, 10000];
// Ce qu'il vole en s'échappant si on l'a frappé sans l'achever.
export const VOL_FOU = 200;
// Sa récompense après le 3e paiement (XP + ressources).
export const CADEAU_FOU = {
  xp: 50000,
  objets: [
    { id: "onyx", n: 10 }, { id: "pierre-solaire", n: 10 },
    { id: "bois-enchante", n: 20 }, { id: "cuir-etrange", n: 20 },
  ],
};
// Probabilité d'apparition, à CHAQUE rencontre de mine et à N'IMPORTE QUELLE
// profondeur (contrairement au Lapin blanc ou à la Tour, qui ont un plancher).
export const CHANCE_FOU = 0.001; // 0,1 %

export function creerFou() {
  return {
    paiements: 0,   // nombre de fois où on a payé (0 → il demande 500)
    tue: false,     // abattu une bonne fois pour toutes ?
    recompense: false, // a-t-il déjà donné son cadeau (après le 3e paiement) ?
  };
}

// Peut-il encore surgir ? Une fois mort, jamais.
export function fouDisponible(fou) { return !fou.tue; }

// Propose-t-il encore un marché ? Non une fois qu'il a récompensé : il a prévenu
// que la rencontre suivante serait « moins plaisante ».
export function fouProposeMarche(fou) { return !fou.recompense && fou.paiements < PRIX_FOU.length; }

// Ce qu'il réclame cette fois-ci (null s'il ne propose plus rien).
export function prixFou(fou) {
  return fouProposeMarche(fou) ? PRIX_FOU[fou.paiements] : null;
}

// Le joueur a payé : on encaisse. Renvoie true si ce paiement DÉCLENCHE la
// récompense (c'était le dernier de la série).
export function payerFou(fou) {
  fou.paiements += 1;
  if (fou.paiements >= PRIX_FOU.length) { fou.recompense = true; return true; }
  return false;
}

export function tuerFou(fou) { fou.tue = true; }

// ----- Sauvegarde ----------------------------------------------------------

export function etatFou(fou) {
  return { paiements: fou.paiements, tue: fou.tue, recompense: fou.recompense };
}

export function chargerFou(fou, donnees) {
  if (!donnees || typeof donnees !== "object") return;
  if (Number.isFinite(donnees.paiements) && donnees.paiements >= 0) {
    fou.paiements = Math.min(PRIX_FOU.length, Math.floor(donnees.paiements));
  }
  fou.tue = Boolean(donnees.tue);
  fou.recompense = Boolean(donnees.recompense);
}
