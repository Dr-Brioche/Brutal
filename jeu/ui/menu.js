// Le menu pause (touche Échap) : sauvegarder / charger la partie.
//
// 3 emplacements ("slots") + une reprise rapide de la sauvegarde la plus
// récente. Conçu pour accueillir d'autres options plus tard (Options, etc.).
//
// Le menu est découplé du jeu : on lui fournit trois fonctions.
//   - obtenirEtat()         : renvoie l'état à sauvegarder (objet simple)
//   - appliquerEtat(donnees): applique un état chargé au jeu
//   - surChangementPause(b) : prévenu quand le menu s'ouvre (true) / ferme (false)

import { lireSlot, ecrireSlot } from "../systems/sauvegarde.js";
import { tousLesSlots, creerLigneSlot } from "./slots.js";
import {
  reglerVolumeMusique, reglerVolumeBruitages, reglerVolumeMusiqueCombat,
  getVolumeMusique, getVolumeBruitages, getVolumeMusiqueCombat,
} from "../core/sons.js";

export function installerMenu({ obtenirEtat, appliquerEtat, surChangementPause }) {
  const menu = document.getElementById("menu");
  const conteneurSlots = document.getElementById("menu-slots");
  const boutonReprendre = document.getElementById("menu-reprendre");
  let ouvert = false;

  // Sliders de volume — initialisés avec les valeurs chargées depuis localStorage.
  const sliderM   = document.getElementById("vol-musique");
  const valM      = document.getElementById("vol-musique-val");
  const sliderMC  = document.getElementById("vol-musique-combat");
  const valMC     = document.getElementById("vol-musique-combat-val");
  const sliderB   = document.getElementById("vol-bruitages");
  const valB      = document.getElementById("vol-bruitages-val");

  function syncSliders() {
    sliderM.value  = Math.round(getVolumeMusique() * 100);
    valM.textContent  = sliderM.value + "%";
    sliderMC.value = Math.round(getVolumeMusiqueCombat() * 100);
    valMC.textContent = sliderMC.value + "%";
    sliderB.value  = Math.round(getVolumeBruitages() * 100);
    valB.textContent  = sliderB.value + "%";
  }
  syncSliders();

  sliderM.addEventListener("input", () => {
    reglerVolumeMusique(sliderM.value / 100);
    valM.textContent = sliderM.value + "%";
  });
  sliderMC.addEventListener("input", () => {
    reglerVolumeMusiqueCombat(sliderMC.value / 100);
    valMC.textContent = sliderMC.value + "%";
  });
  sliderB.addEventListener("input", () => {
    reglerVolumeBruitages(sliderB.value / 100);
    valB.textContent = sliderB.value + "%";
  });

  // (Re)construit la liste des emplacements à l'écran
  function rafraichir() {
    conteneurSlots.replaceChildren();
    for (const { numero, donnees } of tousLesSlots()) {
      conteneurSlots.append(
        creerLigneSlot(numero, donnees, [
          {
            texte: "Save",
            surClic: () => {
              ecrireSlot(numero, obtenirEtat());
              rafraichir();
            },
          },
          {
            texte: "Load",
            desactive: !donnees,
            surClic: () => {
              appliquerEtat(lireSlot(numero));
              fermer();
            },
          },
        ])
      );
    }
  }

  function ouvrir() {
    ouvert = true;
    rafraichir();
    menu.hidden = false;
    surChangementPause(true);
  }

  function fermer() {
    ouvert = false;
    menu.hidden = true;
    surChangementPause(false);
  }

  function basculer() {
    ouvert ? fermer() : ouvrir();
  }

  // La touche Échap est gérée de façon centralisée par principal.js (pour
  // qu'elle ferme d'abord l'inventaire/le deck ouverts avant le menu pause).

  boutonReprendre.addEventListener("click", fermer);

  return { ouvrir, fermer, basculer };
}
