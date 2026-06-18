// L'écran de démarrage : Nouvelle partie, ou reprise d'une sauvegarde.
//
// Au clic sur Play :
// - s'il n'existe AUCUNE sauvegarde -> nouvelle partie directement ;
// - sinon -> on propose "New Game" en haut + les emplacements à charger.

import { tousLesSlots, creerLigneSlot } from "./slots.js";

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

  // Focus automatique : Enter/Espace déclenchent Play sans souris.
  boutonJouer.focus();

  boutonJouer.addEventListener("click", () => {
    const slots = tousLesSlots();
    const aDesSauvegardes = slots.some(({ donnees }) => donnees);

    // On affiche TOUJOURS le panneau (même sans sauvegarde) pour laisser la
    // musique du titre se lancer avant l'entrée dans le jeu.
    conteneurSlots.replaceChildren();
    if (aDesSauvegardes) {
      for (const { numero, donnees } of slots) {
        conteneurSlots.append(
          creerLigneSlot(numero, donnees, [
            { texte: "Load", desactive: !donnees, surClic: () => lancerUneFois(donnees) },
          ])
        );
      }
    }
    boutonJouer.hidden = true;
    panneau.hidden = false;
    boutonNouvelle.focus();
  });

  boutonNouvelle.addEventListener("click", () => lancerUneFois(null));
}
