// Le menu pause (touche Échap) : sauvegarder / charger la partie.
//
// 3 emplacements ("slots") + une reprise rapide de la sauvegarde la plus
// récente. Conçu pour accueillir d'autres options plus tard (Options, etc.).
//
// Le menu est découplé du jeu : on lui fournit trois fonctions.
//   - obtenirEtat()        : renvoie l'état à sauvegarder (objet simple)
//   - appliquerEtat(donnees): applique un état chargé au jeu
//   - surChangementPause(b): prévenu quand le menu s'ouvre (true) / ferme (false)

import { NB_SLOTS, lireSlot, ecrireSlot } from "../systems/sauvegarde.js";

export function installerMenu({ obtenirEtat, appliquerEtat, surChangementPause }) {
  const menu = document.getElementById("menu");
  const conteneurSlots = document.getElementById("menu-slots");
  const boutonContinuer = document.getElementById("menu-continuer");
  const boutonReprendre = document.getElementById("menu-reprendre");
  let ouvert = false;

  // Texte affiché pour un emplacement (vide, ou équipement + date)
  function resume(donnees) {
    if (!donnees) return "Empty";
    const date = new Date(donnees.date).toLocaleString();
    return `${donnees.armureNom} · ${donnees.armeNom}\n${date}`;
  }

  // L'emplacement sauvegardé le plus récemment (pour la reprise rapide)
  function dernierSlot() {
    let meilleur = null;
    for (let n = 1; n <= NB_SLOTS; n++) {
      const d = lireSlot(n);
      if (d && (!meilleur || d.date > meilleur.date)) meilleur = d;
    }
    return meilleur;
  }

  // (Re)construit la liste des emplacements à l'écran
  function rafraichir() {
    conteneurSlots.replaceChildren();
    for (let n = 1; n <= NB_SLOTS; n++) {
      const donnees = lireSlot(n);

      const ligne = document.createElement("div");
      ligne.className = "menu-slot";

      const info = document.createElement("div");
      info.className = "menu-slot-info";
      const nom = document.createElement("span");
      nom.className = "menu-slot-nom";
      nom.textContent = `Slot ${n}`;
      const res = document.createElement("span");
      res.className = "menu-slot-resume";
      res.textContent = resume(donnees);
      info.append(nom, res);

      const actions = document.createElement("div");
      actions.className = "menu-slot-actions";
      const save = document.createElement("button");
      save.textContent = "Save";
      save.addEventListener("click", () => {
        ecrireSlot(n, obtenirEtat());
        rafraichir();
      });
      const load = document.createElement("button");
      load.textContent = "Load";
      load.disabled = !donnees;
      load.addEventListener("click", () => {
        appliquerEtat(lireSlot(n));
        fermer();
      });
      actions.append(save, load);

      ligne.append(info, actions);
      conteneurSlots.append(ligne);
    }
    boutonContinuer.disabled = !dernierSlot();
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
    const d = dernierSlot();
    if (d) {
      appliquerEtat(d);
      fermer();
    }
  });

  return { ouvrir, fermer, basculer };
}
