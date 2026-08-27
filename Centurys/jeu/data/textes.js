// ============================================================
//  TOUS LES TEXTES DU JEU, EN FRANÇAIS ET EN ANGLAIS.
//  Règle absolue : aucun texte affiché au joueur ne doit être
//  écrit en dur dans le code. On ajoute sa clé ici, avec ses
//  DEUX langues, dans le même mouvement.
//  {n}, {or}, {age}… sont remplacés par les paramètres.
// ============================================================

export const TEXTES = {

  // --- Menu d'accueil
  "menu.slogan":     { fr: "Traverse les âges. Rase le château d'en face.",
                       en: "March through the ages. Raze the castle across the field." },
  "menu.jouer":      { fr: "Jouer",            en: "Play" },
  "menu.difficulte": { fr: "Difficulté",       en: "Difficulty" },
  "menu.langue":     { fr: "Langue",           en: "Language" },
  "menu.commandes":  { fr: "Commandes",        en: "Controls" },
  "menu.aideSouris": { fr: "Souris : clique sur les boutons du bas.",
                       en: "Mouse: click the buttons at the bottom." },
  "menu.aideClavier":{ fr: "Clavier : 1 2 3 = troupes · 4 = revenu · E = évoluer · A = attaque spéciale · Retour arrière = annuler · P = pause · M = son",
                       en: "Keyboard: 1 2 3 = troops · 4 = income · E = evolve · A = special attack · Backspace = cancel · P = pause · M = sound" },
  "menu.but":        { fr: "But : détruire le château adverse avant qu'il ne détruise le tien.",
                       en: "Goal: destroy the enemy castle before it destroys yours." },

  "diff.facile":     { fr: "Facile",           en: "Easy" },
  "diff.normal":     { fr: "Normal",           en: "Normal" },
  "diff.difficile":  { fr: "Difficile",        en: "Hard" },

  // --- Barre d'information
  "hud.toi":         { fr: "Ton château",      en: "Your castle" },
  "hud.ennemi":      { fr: "Château ennemi",   en: "Enemy castle" },
  "hud.or":          { fr: "Or",               en: "Gold" },
  "hud.revenu":      { fr: "Revenu",           en: "Income" },
  "hud.file":        { fr: "Entraînement",     en: "Training" },
  "hud.evolution":   { fr: "Évolution",        en: "Evolution" },
  "hud.ageMax":      { fr: "Âge ultime atteint", en: "Final age reached" },

  // --- Boutons d'action
  "bouton.revenu":   { fr: "Revenu",           en: "Income" },
  "bouton.revenuNiv":{ fr: "niveau {n}",       en: "level {n}" },
  "bouton.evoluer":  { fr: "Évoluer",          en: "Evolve" },
  "bouton.pause":    { fr: "Pause",            en: "Pause" },
  "bouton.reprendre":{ fr: "Reprendre",        en: "Resume" },
  "bouton.quitter":  { fr: "Quitter la partie", en: "Quit match" },
  "bouton.max":      { fr: "MAX",              en: "MAX" },
  "bouton.pret":     { fr: "PRÊT",             en: "READY" },

  // --- Petites étiquettes de statistiques
  "stat.cout":       { fr: "Coût",             en: "Cost" },
  "stat.pv":         { fr: "PV",               en: "HP" },
  "stat.degats":     { fr: "Dégâts",           en: "Damage" },
  "stat.portee":     { fr: "Portée",           en: "Range" },
  "stat.vitesse":    { fr: "Vitesse",          en: "Speed" },
  "stat.corpsACorps":{ fr: "corps à corps",    en: "melee" },
  "stat.distance":   { fr: "à distance",       en: "ranged" },

  // --- Messages en jeu
  "info.pasAssezOr": { fr: "Pas assez d'or",   en: "Not enough gold" },
  "info.filePleine": { fr: "File d'entraînement pleine", en: "Training queue is full" },
  "info.recharge":   { fr: "Attaque spéciale en recharge", en: "Special attack recharging" },
  "info.aucuneCible":{ fr: "Aucun ennemi sur le terrain", en: "No enemy on the field" },
  "info.pasAssezXp": { fr: "Pas assez d'expérience pour évoluer", en: "Not enough experience to evolve" },
  "info.nouvelAge":  { fr: "Nouvel âge : {age}", en: "New age: {age}" },
  "info.ageEnnemi":  { fr: "L'ennemi passe à l'âge : {age}", en: "The enemy reaches: {age}" },
  "info.annule":     { fr: "Entraînement annulé, or remboursé", en: "Training cancelled, gold refunded" },
  "info.revenuMax":  { fr: "Revenu au maximum", en: "Income already maxed" },
  "info.sonCoupe":   { fr: "Son coupé",        en: "Sound off" },
  "info.sonActif":   { fr: "Son activé",       en: "Sound on" },

  // --- Écran de pause
  "pause.titre":     { fr: "Pause",            en: "Paused" },

  // --- Fin de partie
  "fin.victoire":    { fr: "VICTOIRE",         en: "VICTORY" },
  "fin.defaite":     { fr: "DÉFAITE",          en: "DEFEAT" },
  "fin.victoireTxt": { fr: "Le château ennemi est en ruines.", en: "The enemy castle lies in ruins." },
  "fin.defaiteTxt":  { fr: "Ton château est tombé.", en: "Your castle has fallen." },
  "fin.duree":       { fr: "Durée",            en: "Duration" },
  "fin.tues":        { fr: "Unités détruites", en: "Units destroyed" },
  "fin.perdues":     { fr: "Unités perdues",   en: "Units lost" },
  "fin.age":         { fr: "Âge atteint",      en: "Age reached" },
  "fin.orGagne":     { fr: "Or récolté",       en: "Gold earned" },
  "fin.rejouer":     { fr: "Rejouer",          en: "Play again" },
  "fin.menu":        { fr: "Menu",             en: "Menu" },
};
