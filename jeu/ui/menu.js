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
import { tousLesSlots, slotLePlusRecent, creerLigneSlot } from "./slots.js";

export function installerMenu({ obtenirEtat, appliquerEtat, surChangementPause }) {
  const menu = document.getElementById("menu");
  const conteneurSlots = document.getElementById("menu-slots");
  const boutonContinuer = document.getElementById("menu-continuer");
  const boutonReprendre = document.getElementById("menu-reprendre");
  let ouvert = false;

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
    boutonContinuer.disabled = !slotLePlusRecent();
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

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
      e.preventDefault();
      basculer();
    }
  });

  boutonReprendre.addEventListener("click", fermer);
  boutonContinuer.addEventListener("click", () => {
    const donnees = slotLePlusRecent();
    if (donnees) {
      appliquerEtat(donnees);
      fermer();
    }
  });

  return { ouvrir, fermer, basculer };
}
