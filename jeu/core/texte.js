// ─────────────────────────────────────────────────────────────────────────────
// RÉGLAGES CENTRAUX DU TEXTE — un seul endroit pour toute la lisibilité du jeu.
//
// Tout le texte DESSINÉ SUR LE CANVAS (noms de PNJ, niveau/HP des monstres,
// dégâts qui montent, badges de combat…) tire sa POLICE et sa NETTETÉ d'ICI.
// Modifier une valeur de ce fichier change TOUS les textes liés d'un coup.
//
// ┌─ RÈGLE pour tout NOUVEAU texte canvas ────────────────────────────────────┐
// │ 1. Police : utiliser police(taille) — JAMAIS une famille en dur.          │
// │ 2. Netteté : ne rien faire de spécial. Le canvas est déjà rendu à RES×     │
// │    (cf. ajusterEchelle, principal.js) → le navigateur anti-aliase le texte.│
// │ (Le texte d'INTERFACE — HUD, cartes, menus, bulles — est en HTML/CSS :     │
// │  déjà net, il ne dépend PAS de ce fichier.)                                │
// └────────────────────────────────────────────────────────────────────────────┘

// Suréchantillonnage du canvas : il rend à RES× la résolution logique (960×540).
// Plus grand = texte plus net, mais RES² fois plus de pixels à dessiner.
export const RES = 2;

// Police par DÉFAUT du texte de jeu (chiffres, HP, dégâts, badges de combat…).
export const POLICE = 'ui-monospace, "Cascadia Mono", Consolas, monospace';
// Police des NOMS / titres (PNJ, niveau d'ennemi) : un peu plus « lisible ».
export const POLICE_NOM = 'system-ui, sans-serif';

// Construit une chaîne CSS `font` en gras. police(12) → 'bold 12px <POLICE>'.
export function police(taille, famille = POLICE) {
  return `bold ${taille}px ${famille}`;
}
