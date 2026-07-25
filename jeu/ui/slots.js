// Petits outils partagés par les écrans qui affichent les emplacements
// de sauvegarde : l'écran de démarrage et le menu pause.

import { NB_SLOTS, SLOT_AUTO, lireSlot } from "../systems/sauvegarde.js";
import { t } from "../systems/langue.js";

// Tous les emplacements : [{ numero, donnees ou null }, ...]
export function tousLesSlots() {
  const liste = [];
  for (let n = 1; n <= NB_SLOTS; n++) {
    liste.push({ numero: n, donnees: lireSlot(n) });
  }
  return liste;
}

// L'emplacement de sauvegarde AUTOMATIQUE (séparé des slots manuels).
export function slotAuto() {
  return { numero: SLOT_AUTO, donnees: lireSlot(SLOT_AUTO) };
}

// Texte affiché pour un emplacement (vide, ou équipement + date)
export function resumeSlot(donnees) {
  if (!donnees) return t("slot.vide");
  const date = new Date(donnees.date).toLocaleString();
  return `${donnees.armureNom} · ${donnees.armeNom}\n${date}`;
}

// Construit une ligne d'emplacement, avec les boutons d'action demandés :
// boutons = [{ texte, desactive, surClic }, ...]
// `label` : intitulé personnalisé (défaut « Slot N ») ; `classe` : classe CSS
// supplémentaire (ex. slot auto, visuellement distinct).
export function creerLigneSlot(numero, donnees, boutons, label = null, classe = "") {
  const ligne = document.createElement("div");
  ligne.className = "menu-slot" + (classe ? " " + classe : "");

  const info = document.createElement("div");
  info.className = "menu-slot-info";
  const nom = document.createElement("span");
  nom.className = "menu-slot-nom";
  nom.textContent = label ?? t("slot.numero", { n: numero });
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
