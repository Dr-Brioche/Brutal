// ═══════════════════════════════════════════════════════════════════════════
// DICTIONNAIRE DE TRADUCTION (FR / EN) — cf. systems/langue.js
//
// Chaque clé porte ses deux versions : { fr: "…", en: "…" }.
// Convention de clés : "ecran.element" (ex. "combat.finTour", "menu.reprendre").
// Les marqueurs {nom} sont remplacés par `t(cle, { nom: … })`.
//
// ⚠ Traduction PROGRESSIVE : on remplit par lots (cœur du jeu d'abord). Une clé
// manquante retombe sur l'anglais. Pour ajouter un écran : ajouter ses clés ici,
// puis poser des `data-i18n` (HTML) ou des `t()` (JS) aux points d'affichage.
// ═══════════════════════════════════════════════════════════════════════════

export const TEXTES = {
  // ---- Menu de choix de la langue (au démarrage) ----
  "langue.titre":   { fr: "Langue / Language", en: "Language / Langue" },
  "langue.fr":      { fr: "Français", en: "Français" },
  "langue.en":      { fr: "English", en: "English" },
  "langue.bouton":  { fr: "Langue", en: "Language" },

  // ---- Écran de titre / démarrage ----
  "titre.jouer":        { fr: "Jouer", en: "Play" },
  "titre.chargeScripts": { fr: "Chargement des scripts…", en: "Loading scripts…" },
  "titre.chargeAssets": { fr: "Chargement des ressources…", en: "Loading assets…" },
  "titre.chargePct":    { fr: "Chargement… {pct}%", en: "Loading… {pct}%" },
  "demarrage.nouvelle": { fr: "Nouvelle partie", en: "New Game" },
  "demarrage.charger":  { fr: "Charger", en: "Load" },
  "demarrage.supprimer": { fr: "Supprimer", en: "Delete" },
  "demarrage.suppTitre": { fr: "Supprimer la sauvegarde — Emplacement {n} ?", en: "Delete save — Slot {n}?" },
  "demarrage.suppMsg":  { fr: "Cette sauvegarde sera perdue définitivement.", en: "This save will be gone for good." },
  "demarrage.garder":   { fr: "Garder", en: "Keep" },
  "demarrage.autoLabel": { fr: "Sauvegarde auto (auto uniquement)", en: "Auto-save (auto only)" },

  // ---- Menu pause ----
  "menu.pause":       { fr: "Pause", en: "Paused" },
  "menu.reprendre":   { fr: "Reprendre", en: "Resume" },
  "menu.ongletSons":  { fr: "Son", en: "Sound" },
  "menu.ongletInterface": { fr: "Interface", en: "Interface" },
  "menu.musique":     { fr: "Musique", en: "Music" },
  "menu.combat":      { fr: "Combat", en: "Combat" },
  "menu.effets":      { fr: "Effets", en: "Effects" },
  "menu.prefVente":   { fr: "Demander avant de vendre un objet rare ou +", en: "Confirm before selling rare+ items" },
  "menu.prefRapide":  { fr: "Jeu rapide (combats accélérés — pour joueurs aguerris)", en: "Fast gameplay (quicker combat — for players who know the game)" },
  "menu.prefCibleAuto": { fr: "Cibler automatiquement le dernier ennemi (pas de ciblage manuel quand il n'en reste qu'un)", en: "Auto-target the last enemy (skip manual targeting when one enemy remains)" },
  "menu.aide":        { fr: "Tab / ↑↓ pour naviguer  ·  ←→ pour régler le volume  ·  Échap pour fermer", en: "Tab / ↑↓ to navigate  ·  ←→ to adjust volume  ·  Esc to close" },

  // ---- Barre de menu (bas-droite) ----
  "barre.sac":       { fr: "Sac", en: "Bag" },
  "barre.sacTitre":  { fr: "Inventaire (B)", en: "Inventory (B)" },
  "barre.talents":   { fr: "Talents", en: "Talents" },
  "barre.talentsTitre": { fr: "Talents (T)", en: "Talents (T)" },
  "barre.deck":      { fr: "Deck", en: "Deck" },
  "barre.deckTitre": { fr: "Deck (N)", en: "Deck (N)" },
  "barre.livre":     { fr: "Livre", en: "Book" },
  "barre.livreTitre": { fr: "Livre de l'artisan (L)", en: "Craftsman's Book (L)" },
  "barre.menu":      { fr: "Menu", en: "Menu" },
  "barre.menuTitre": { fr: "Menu (Échap)", en: "Menu (Esc)" },

  // ---- Combat ----
  "combat.finTour":   { fr: "Fin du tour", en: "End Turn" },
  "combat.fuite":     { fr: "Fuir", en: "Flee" },
  "combat.fuiteTitre": { fr: "Fuir le combat (aucune récompense)", en: "Flee the battle (no rewards)" },
  "combat.continuer": { fr: "Continuer", en: "Continue" },
  "combat.victoire":  { fr: "Victoire !", en: "Victory!" },
  "combat.defaite":   { fr: "Défaite", en: "Defeat" },
  "combat.fuiteRatee": { fr: "✗ Fuite ratée !", en: "✗ Escape failed!" },
  "combat.fuiteConfTitre": { fr: "Fuir le combat ?", en: "Flee the battle?" },
  "combat.fuiteConfMsg": { fr: "Vous partez SANS récompense. Chance de fuite : {pct}% (plus d'ennemis = moins) — sinon vous perdez juste votre tour.", en: "You'll leave with NO rewards. Escape chance: {pct}% (more enemies = lower) — otherwise you just lose your turn." },
  "combat.fuiteOui":  { fr: "Fuir", en: "Flee" },
  "combat.fuiteNon":  { fr: "Rester", en: "Stay" },

  // ---- Dialogue / marchand (aides du bas) ----
  "dialogue.continuer": { fr: "Clic ou [Espace] pour continuer", en: "Click or [Space] to continue" },
  "dialogue.fermer":    { fr: "[Espace] fermer", en: "[Space] close" },
  "dialogue.acheterEncore": { fr: "Recliquer pour acheter · [Z/S] choisir", en: "Click again to buy · [Z/S] choose" },
  "dialogue.choisir":   { fr: "[Z/S] choisir · [Espace] valider", en: "[Z/S] choose · [Space] confirm" },
  "dialogue.retour":    { fr: "[Échap] retour", en: "[Esc] back" },
  "dialogue.acheterEquiper": { fr: "[Clic droit / E] acheter & équiper", en: "[Right-click / E] buy & equip" },
};
