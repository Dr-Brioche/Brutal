// L'écran de démarrage : Nouvelle partie, ou reprise d'une sauvegarde.
//
// Au clic sur Play :
// - s'il n'existe AUCUNE sauvegarde -> nouvelle partie directement ;
// - sinon -> on propose "New Game" en haut + les emplacements à charger.

import { tousLesSlots, slotAuto, creerLigneSlot } from "./slots.js";
import { effacerSlot, SLOT_AUTO } from "../systems/sauvegarde.js";
import { demanderConfirmation } from "./confirmation.js";
import { t } from "../systems/langue.js";

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
    const auto = slotAuto();
    const aDesSauvegardes = slots.some(({ donnees }) => donnees) || Boolean(auto.donnees);
    conteneurSlots.replaceChildren();
    if (!aDesSauvegardes) return;
    for (const { numero, donnees } of slots) {
      conteneurSlots.append(
        creerLigneSlot(numero, donnees, [
          { texte: t("demarrage.charger"), desactive: !donnees, surClic: () => lancerUneFois(donnees) },
          {
            texte: t("demarrage.supprimer"),
            desactive: !donnees,
            surClic: () => {
              demanderConfirmation(
                {
                  titre: t("demarrage.suppTitre", { n: numero }),
                  message: t("demarrage.suppMsg"),
                  texteOui: t("demarrage.supprimer"),
                  texteNon: t("demarrage.garder"),
                  danger: true,
                },
                () => { effacerSlot(numero); remplirSlots(); },
              );
            },
          },
        ])
      );
    }
    // Sauvegarde AUTO (séparée) : Load uniquement, écrite par le jeu en ville.
    conteneurSlots.append(
      creerLigneSlot(SLOT_AUTO, auto.donnees, [
        { texte: t("demarrage.charger"), desactive: !auto.donnees, surClic: () => lancerUneFois(auto.donnees) },
      ], t("demarrage.autoLabel"), "menu-slot--auto")
    );
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
