// Le système d'équipement : ce que le héros porte, et comment en changer.
//
// L'équipement ne retient que des POSITIONS dans les bibliothèques de
// jeu/data/ (armes, armures). Les planches d'images correspondantes sont
// appliquées au héros par appliquerEquipement().

import { ARMES } from "../data/armes.js";
import { ARMURES } from "../data/armures.js";

export function creerEquipement() {
  return { arme: 0, armure: 0 }; // on démarre : 1re arme, 1re armure
}

export function armeActuelle(equipement) {
  return ARMES[equipement.arme];
}

export function armureActuelle(equipement) {
  return ARMURES[equipement.armure];
}

// Passe à l'arme / l'armure suivante (et reboucle à la fin de la liste)
export function changerArme(equipement) {
  equipement.arme = (equipement.arme + 1) % ARMES.length;
}

export function changerArmure(equipement) {
  equipement.armure = (equipement.armure + 1) % ARMURES.length;
}

// Reporte l'équipement choisi sur le héros (ses planches de sprites).
// `planches` : les images déjà chargées, rangées par chemin de fichier.
export function appliquerEquipement(heros, equipement, planches) {
  heros.plancheArmure = planches.get(armureActuelle(equipement).planche);
  heros.plancheArme = planches.get(armeActuelle(equipement).planche);
}
