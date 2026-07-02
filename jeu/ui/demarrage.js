// L'écran de démarrage : Nouvelle partie, ou reprise d'une sauvegarde.
//
// Au clic sur Play :
// - s'il n'existe AUCUNE sauvegarde -> nouvelle partie directement ;
// - sinon -> on propose "New Game" en haut + les emplacements à charger.

import { tousLesSlots, creerLigneSlot } from "./slots.js";
import { effacerSlot } from "../systems/sauvegarde.js";
import { demanderConfirmation } from "./confirmation.js";

export function installerDemarrage({ lancer }) {
  const boutonJouer = document.getElementById("bouton-jouer");
  const panneau = document.getElementById("demarrage");
  const conteneurSlots = document.getElementById("demarrage-slots");
  const boutonNouvelle = document.getElementById("demarrage-nouvelle");
  let lance = false;

  // Le jeu ne doit démarrer qu'une seule fois
  function lancerUneFois(donnees) {
    if (lance) return;
    lance = true;
    lancer(donnees);
  }

  // (Re)construit la liste des emplacements — rappelée après un effacement.
  function remplirSlots() {
    const slots = tousLesSlots();
    const aDesSauvegardes = slots.some(({ donnees }) => donnees);
    conteneurSlots.replaceChildren();
    if (!aDesSauvegardes) return;
    for (const { numero, donnees } of slots) {
      conteneurSlots.append(
        creerLigneSlot(numero, donnees, [
          { texte: "Load", desactive: !donnees, surClic: () => lancerUneFois(donnees) },
          {
            texte: "Delete",
            desactive: !donnees,
            surClic: () => {
              demanderConfirmation(
                {
                  titre: `Delete save — Slot ${numero}?`,
                  message: "This save will be gone for good.",
                  texteOui: "Delete",
                  texteNon: "Keep",
                  danger: true,
                },
                () => { effacerSlot(numero); remplirSlots(); },
              );
            },
          },
        ])
      );
    }
  }

  // Focus automatique : Enter/Espace déclenchent Play sans souris.
  boutonJouer.focus();

  boutonJouer.addEventListener("click", () => {
    // On affiche TOUJOURS le panneau (même sans sauvegarde) pour laisser la
    // musique du titre se lancer avant l'entrée dans le jeu.
    remplirSlots();
    boutonJouer.hidden = true;
    panneau.hidden = false;
    boutonNouvelle.focus();
  });

  boutonNouvelle.addEventListener("click", () => lancerUneFois(null));
}
