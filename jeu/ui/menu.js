// Le menu pause (touche Échap) : sauvegarder / charger la partie.
//
// 3 emplacements ("slots") + une reprise rapide de la sauvegarde la plus
// récente. Conçu pour accueillir d'autres options plus tard (Options, etc.).
//
// Le menu est découplé du jeu : on lui fournit trois fonctions.
//   - obtenirEtat()         : renvoie l'état à sauvegarder (objet simple)
//   - appliquerEtat(donnees): applique un état chargé au jeu
//   - surChangementPause(b) : prévenu quand le menu s'ouvre (true) / ferme (false)

import { lireSlot, ecrireSlot, effacerSlot, SLOT_AUTO } from "../systems/sauvegarde.js";
import { tousLesSlots, slotAuto, creerLigneSlot } from "./slots.js";
import { demanderConfirmation } from "./confirmation.js";
import {
  reglerVolumeMusique, reglerVolumeBruitages, reglerVolumeMusiqueCombat,
  getVolumeMusique, getVolumeBruitages, getVolumeMusiqueCombat,
} from "../core/sons.js";
import { getPreference, setPreference } from "../systems/preferences.js";
import { t } from "../systems/langue.js";

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

  // Onglets Son / Interface
  const ongletSons        = document.getElementById("menu-onglet-sons");
  const ongletInterface   = document.getElementById("menu-onglet-interface");
  const vueSons           = document.getElementById("menu-vue-sons");
  const vueInterface      = document.getElementById("menu-vue-interface");
  const checkConfirmVente = document.getElementById("pref-confirm-vente");
  const checkGameplayRapide = document.getElementById("pref-gameplay-rapide");
  const checkCibleAuto = document.getElementById("pref-cible-auto");

  checkConfirmVente.checked = getPreference("confirmVente");
  checkConfirmVente.addEventListener("change", () => {
    setPreference("confirmVente", checkConfirmVente.checked);
  });

  checkGameplayRapide.checked = getPreference("gameplayRapide");
  checkGameplayRapide.addEventListener("change", () => {
    setPreference("gameplayRapide", checkGameplayRapide.checked);
  });

  checkCibleAuto.checked = getPreference("cibleAuto");
  checkCibleAuto.addEventListener("change", () => {
    setPreference("cibleAuto", checkCibleAuto.checked);
  });

  function basculerOnglet(nom) {
    ongletSons.classList.toggle("deck-onglet--actif", nom === "sons");
    ongletInterface.classList.toggle("deck-onglet--actif", nom === "interface");
    vueSons.hidden = nom !== "sons";
    vueInterface.hidden = nom !== "interface";
  }
  ongletSons.addEventListener("click", () => basculerOnglet("sons"));
  ongletInterface.addEventListener("click", () => basculerOnglet("interface"));

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
            texte: t("menu.sauver"),
            surClic: () => {
              ecrireSlot(numero, obtenirEtat());
              rafraichir();
            },
          },
          {
            texte: t("demarrage.charger"),
            desactive: !donnees,
            surClic: () => {
              appliquerEtat(lireSlot(numero));
              fermer();
            },
          },
          {
            texte: t("demarrage.supprimer"),
            desactive: !donnees,
            surClic: () => {
              // Action destructrice → confirmation (bouton sûr présélectionné).
              demanderConfirmation(
                {
                  titre: t("demarrage.suppTitre", { n: numero }),
                  message: t("demarrage.suppMsg"),
                  texteOui: t("demarrage.supprimer"),
                  texteNon: t("demarrage.garder"),
                  danger: true,
                },
                () => { effacerSlot(numero); rafraichir(); },
              );
            },
          },
        ])
      );
    }
    // Emplacement de SAUVEGARDE AUTO (séparé) : Load uniquement — on n'y sauvegarde
    // jamais à la main. Le jeu l'écrit tout seul en entrant/sortant de la cité.
    const { donnees: donneesAuto } = slotAuto();
    conteneurSlots.append(
      creerLigneSlot(SLOT_AUTO, donneesAuto, [
        {
          texte: t("demarrage.charger"),
          desactive: !donneesAuto,
          surClic: () => { appliquerEtat(lireSlot(SLOT_AUTO)); fermer(); },
        },
      ], t("demarrage.autoLabel"), "menu-slot--auto")
    );
  }

  // `sansSauvegarde` (true en COMBAT) masque les emplacements Save/Load : on ne
  // garde que Reprendre + les réglages de son. Sauvegarder en plein combat n'a pas
  // de sens (l'état du combat n'est pas sérialisé) et Charger casserait la partie.
  function ouvrir({ sansSauvegarde = false } = {}) {
    ouvert = true;
    // `.menu-slots` a `display:flex` en CSS → l'attribut `hidden` ne suffirait pas ;
    // on pilote `display` directement (none en combat, flex sinon).
    conteneurSlots.style.display = sansSauvegarde ? "none" : "flex";
    if (!sansSauvegarde) rafraichir();
    syncSliders();           // les curseurs reflètent les volumes courants
    basculerOnglet("sons");  // toujours ouvrir sur l'onglet Son
    menu.hidden = false;
    surChangementPause(true);
    boutonReprendre.focus(); // Enter/Espace ferment le menu sans souris
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

  // Navigation clavier dans le menu : Tab et ↑↓ cyclent le focus parmi les
  // éléments actifs ; ←→ laissent le navigateur ajuster la valeur des sliders.
  menu.addEventListener("keydown", (e) => {
    if (!ouvert) return;
    // Inclut boutons, sliders et checkboxes — seulement les éléments visibles.
    const focusables = Array.from(
      menu.querySelectorAll('button:not(:disabled), input[type="range"], input[type="checkbox"]')
    ).filter(estAffiche);
    if (!focusables.length) return;
    const idx = focusables.indexOf(document.activeElement);

    if (e.code === "Tab") {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      focusables[((idx < 0 ? 0 : idx) + dir + focusables.length) % focusables.length].focus();
    } else if (e.code === "ArrowUp" || e.code === "ArrowDown") {
      e.preventDefault(); // empêche les sliders d'ajuster leur valeur avec ↑↓
      const dir = e.code === "ArrowDown" ? 1 : -1;
      focusables[((idx < 0 ? 0 : idx) + dir + focusables.length) % focusables.length].focus();
    }
  });

  return { ouvrir, fermer, basculer };
}

// True si l'élément est affiché (ni lui-même ni aucun ancêtre n'est masqué).
function estAffiche(el) {
  let n = el;
  while (n && n !== document.body) {
    if (n.hidden || n.style.display === "none") return false;
    n = n.parentElement;
  }
  return true;
}
