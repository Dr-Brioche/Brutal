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
//
// Les traductions des DONNÉES (noms/descriptions d'objets, cartes, talents,
// monstres…) vivent dans textes_donnees.js et sont fusionnées ci-dessous.
// ═══════════════════════════════════════════════════════════════════════════

import { TEXTES_DONNEES } from "./textes_donnees.js";

export const TEXTES = {
  ...TEXTES_DONNEES,
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

  // ---- Marchand / boutique ----
  "commun.quitter":     { fr: "Quitter", en: "Leave" },
  "commun.retour":      { fr: "←  Retour", en: "←  Back" },
  "marchand.titre":     { fr: "Marchand de test", en: "Test Merchant" },
  "marchand.vendre":    { fr: "💰  Vendre des objets", en: "💰  Sell items" },
  "marchand.vendreTout": { fr: "💰  Tout vendre…", en: "💰  Sell all…" },
  "marchand.titreVente": { fr: "Marchand de test — Vente", en: "Test Merchant — Sell" },
  "marchand.titreCat":  { fr: "Marchand de test — {cat}", en: "Test Merchant — {cat}" },
  "marchand.gratuit":   { fr: "{nom}  ·  gratuit", en: "{nom}  ·  free" },
  "marchand.vendreLigne": { fr: "Vendre {nom}{q}  ·  +{prix} 🪙", en: "Sell {nom}{q}  ·  +{prix} 🪙" },
  "marchand.toutVendreTitre": { fr: "Tout vendre dans ton sac ?", en: "Sell EVERYTHING in your bag?" },
  "marchand.toutVendreNon": { fr: "←  Non, je garde mes objets", en: "←  No, keep my items" },
  "marchand.vendreConfTitre": { fr: "Vendre {nom}{q} ?", en: "Sell {nom}{q}?" },
  "marchand.vendreConfNon": { fr: "←  Non, je le garde", en: "←  No, keep it" },
  "marchand.vendreConfOui": { fr: "⚠  Oui, vendre · +{prix} 🪙", en: "⚠  Yes, sell · +{prix} 🪙" },
  "marchand.msgSacAjoute": { fr: "🛒 {nom} ajouté à ton sac.", en: "🛒 {nom} added to your bag." },
  "marchand.msgSacEquipe": { fr: "🎒 {nom} équipé.", en: "🎒 {nom} equipped." },
  "marchand.msgSacPlein":  { fr: "Ton sac est plein — équipe ou jette quelque chose d'abord.", en: "Your bag is full — equip or drop something first." },
  "marchand.msgEquipe":    { fr: "⚔️ {nom} équipé.", en: "⚔️ {nom} equipped." },
  "marchand.msgSacPleinEquip": { fr: "Ton sac est plein — fais de la place pour équiper par échange.", en: "Your bag is full — make room to equip by swapping." },
  "marchand.msgDeuxMains": { fr: "🛒 {nom} dans ton sac — nécessite le talent deux mains pour être manié.", en: "🛒 {nom} in your bag — needs the two-handed talent to wield." },
  "marchand.msgPasEchange": { fr: "🛒 {nom} ajouté à ton sac (pas de place pour ranger l'ancien).", en: "🛒 {nom} added to your bag (no room to swap out the old one)." },
  "marchand.msgVendu":     { fr: "💰 {nom} vendu pour {prix} 🪙.", en: "💰 Sold {nom} for {prix} 🪙." },
  "marchand.sacVide":      { fr: "Ton sac est vide — rien à vendre.", en: "Your bag is empty — nothing to sell." },
  "marchand.toutVendreOui": { fr: "⚠  Oui, tout vendre ({n}) · +{prix} 🪙", en: "⚠  Yes, sell all {n} · +{prix} 🪙" },
  "marchand.msgVenduN":    { fr: "💰 {n} objets vendus pour {prix} 🪙.", en: "💰 Sold {n} items for {prix} 🪙." },
  // Catégories & sous-groupes de la boutique
  "cat.armes":     { fr: "Armes", en: "Weapons" },
  "cat.armures":   { fr: "Armures", en: "Armor" },
  "cat.bijoux":    { fr: "Bijoux", en: "Jewelry" },
  "cat.sacs":      { fr: "Sacs", en: "Bags" },
  "cat.ressources": { fr: "Ressources", en: "Resources" },
  "cat.grp.armes1m": { fr: "Armes — 1 main", en: "Weapons — 1 hand" },
  "cat.grp.armes2m": { fr: "Armes — 2 mains", en: "Weapons — 2 hands" },
  "cat.grp.mainGauche": { fr: "Main gauche", en: "Off-hand" },
  "cat.grp.armureCorps": { fr: "Armure de corps", en: "Body armor" },
  "cat.grp.gants":  { fr: "Gants", en: "Gloves" },
  "cat.grp.bottes": { fr: "Bottes", en: "Boots" },
  "cat.grp.amulettes": { fr: "Amulettes", en: "Amulets" },
  "cat.grp.bagues": { fr: "Bagues", en: "Rings" },
  "cat.tresors":    { fr: "Objets de valeur", en: "Valuables" },
  "cat.parchemins": { fr: "Parchemins", en: "Scrolls" },
  "cat.grp.mineraisPierre": { fr: "Minerais & pierre", en: "Ores & stone" },
  "cat.grp.gemmes":  { fr: "Gemmes", en: "Gems" },
  "cat.grp.boisDivers": { fr: "Bois & divers", en: "Wood & misc" },

  // ---- Inventaire ----
  "inv.slot.arme1":  { fr: "Principale", en: "Main" },
  "inv.slot.arme2":  { fr: "2de main", en: "Off" },
  "inv.slot.offhand": { fr: "2de main", en: "Off-hand" },
  "inv.slot.armure": { fr: "Corps", en: "Body" },
  "inv.slot.gant":   { fr: "Mains", en: "Hands" },
  "inv.slot.botte":  { fr: "Pieds", en: "Feet" },
  "inv.slot.collier": { fr: "Cou", en: "Neck" },
  "inv.slot.sac":    { fr: "Sac", en: "Bag" },
  "inv.slot.sac2":   { fr: "Sac 2", en: "Bag 2" },
  "inv.slot.outil":  { fr: "Outil", en: "Tool" },
  "inv.slot.bague":  { fr: "Bague", en: "Ring" },
  "inv.equiper":     { fr: "Équiper", en: "Equip" },
  "inv.lire":        { fr: "📜 Lire", en: "📜 Read" },
  "inv.vendre":      { fr: "Vendre — {prix} 🪙", en: "Sell — {prix} 🪙" },
  "inv.jeter":       { fr: "Jeter", en: "Discard" },
  "inv.sacPleinEchange": { fr: "🎒 Sac plein — fais de la place avant d'échanger ton équipement.", en: "🎒 Bag is full — make some room before swapping gear." },
  "inv.deuxMainsTalent": { fr: "⚠ Les armes à deux mains nécessitent le talent Poigne du géant pour être maniées.", en: "⚠ Two-handed weapons need the Giant's Grip talent before you can wield them." },
  "inv.deuxMainsOccupe": { fr: "⚠ Ton arme à deux mains occupe les deux mains — déséquipe-la d'abord.", en: "⚠ Your two-handed weapon occupies both hands — unequip it first." },
  "inv.aideVendreSlot": { fr: "Lâche sur le marchand pour vendre · sur un emplacement pour équiper · dans le vide pour jeter · Échap : annuler", en: "Drop on the merchant to sell · on a slot to equip · in the void to discard · Esc: cancel" },
  "inv.aideCaseSlot": { fr: "Lâche sur une case pour déplacer · sur un emplacement pour équiper · dans le vide pour jeter · Échap : annuler", en: "Drop on a cell to move · on a slot to equip · in the void to discard · Esc: cancel" },
  "inv.aideClavier":  { fr: "Flèches : déplacer · Entrée : prendre/poser · X : équiper/jeter", en: "Arrows: move · Enter: pick up/drop · X: equip/discard" },
  "inv.aideSouris":   { fr: "Clique un objet pour le prendre · pose-le où tu veux ou sur un emplacement", en: "Click an item to pick it up · drop it where you want or on a slot" },
  "inv.aideClavierMarchand": { fr: "Flèches : déplacer · Entrée : prendre/poser · X : équiper/jeter · [Tab] : retour au marchand", en: "Arrows: move · Enter: pick up/drop · X: equip/discard · [Tab]: back to merchant" },
  "inv.aideSourisMarchand": { fr: "Glisse un objet sur le marchand pour le vendre · [Tab] : mode clavier", en: "Drag an item onto the merchant to sell it · [Tab]: keyboard mode" },
  "inv.aideSwitchBag": { fr: " · [E] changer de sac", en: " · [E] switch bag" },
  "inv.aideClose":     { fr: " · [B] fermer", en: " · [B] to close" },
  "inv.gauntletActif": { fr: "Gantelet de l'infini — ACTIF\nLes 5 emplacements de bague remplis de bagues différentes.\n+1 carte / tour · +4 Force · +5 Agilité", en: "Infinity Gauntlet — ACTIVE\nAll 5 ring slots filled with different rings.\n+1 card / turn · +4 Force · +5 Agility" },
  "inv.gauntletInactif": { fr: "Gantelet de l'infini — INACTIF\nLes 5 bagues doivent être DIFFÉRENTES (pas de doublon).\n+1 carte / tour · +4 Force · +5 Agilité", en: "Infinity Gauntlet — INACTIVE\nAll 5 rings must be DIFFERENT (no duplicates).\n+1 card / turn · +4 Force · +5 Agility" },
  "inv.gauntletPartiel": { fr: "Gantelet de l'infini — {n}/5 bagues\nRemplis les 5 emplacements avec des bagues différentes pour gagner :\n+1 carte / tour · +4 Force · +5 Agilité", en: "Infinity Gauntlet — {n}/5 rings\nFill all 5 slots with different rings to gain:\n+1 card / turn · +4 Force · +5 Agility" },
  "inv.statNiveau":   { fr: "Niveau", en: "Level" },
  "inv.statPvMax":    { fr: "PV max", en: "Max HP" },
  "inv.statAgilite":  { fr: "Agilité", en: "Agility" },
  "inv.statVitesse":  { fr: "Vitesse dépl.", en: "Move Speed" },
  "inv.statChaleur":  { fr: "Chaleur", en: "Forge Heat" },
  "inv.statCartes":   { fr: "Cartes/tour", en: "Cards/turn" },
};
