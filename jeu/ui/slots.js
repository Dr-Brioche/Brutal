// Petits outils partagés par les écrans qui affichent les emplacements
// de sauvegarde : l'écran de démarrage et le menu pause.

import { NB_SLOTS, lireSlot } from "../systems/sauvegarde.js";

// Tous les emplacements : [{ numero, donnees ou null }, ...]
export function tousLesSlots() {
  const liste = [];
  for (let n = 1; n <= NB_SLOTS; n++) {
    liste.push({ numero: n, donnees: lireSlot(n) });
  }
  return liste;
}

// La sauvegarde la plus récente (tous emplacements confondus), ou null
export function slotLePlusRecent() {
  let meilleur = null;
  for (const { donnees } of tousLesSlots()) {
    if (donnees && (!meilleur || donnees.date > meilleur.date)) meilleur = donnees;
  }
  return meilleur;
}

// Texte affiché pour un emplacement (vide, ou équipement + date)
export function resumeSlot(donnees) {
  if (!donnees) return "Empty";
  const date = new Date(donnees.date).toLocaleString();
  return `${donnees.armureNom} · ${donnees.armeNom}\n${date}`;
}

// Construit une ligne d'emplacement, avec les boutons d'action demandés :
// boutons = [{ texte, desactive, surClic }, ...]
export function creerLigneSlot(numero, donnees, boutons) {
  const ligne = document.createElement("div");
  ligne.className = "menu-slot";

  const info = document.createElement("div");
  info.className = "menu-slot-info";
  const nom = document.createElement("span");
  nom.className = "menu-slot-nom";
  nom.textContent = `Slot ${numero}`;
  const res = document.createElement("span");
  res.className = "menu-slot-resume";
  res.textContent = resumeSlot(donnees);
  info.append(nom, res);

  const actions = document.createElement("div");
  actions.className = "menu-slot-actions";
  for (const { texte, desactive, surClic } of boutons) {
    const bouton = document.createElement("button");
    bouton.textContent = texte;
    bouton.disabled = Boolean(desactive);
    bouton.addEventListener("click", surClic);
    actions.append(bouton);
  }

  ligne.append(info, actions);
  return ligne;
}
