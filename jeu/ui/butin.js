// La fenêtre de BUTIN, au centre de l'écran à la fin d'un combat gagné. Elle
// liste ce qu'on a looté (XP, or, objets) ; on récupère tout d'un clic ou avec
// Espace. (Le calcul et l'application du butin sont gérés par principal.js : ici
// on n'affiche que la liste et on déclenche la récupération.)
//
// (Un visuel de fond sera ajouté plus tard sur le panneau.)

import { ITEMS, couleurRarete } from "../data/items.js";

export function installerButin() {
  const overlay = document.getElementById("butin");
  const panneau = overlay.querySelector(".butin-panneau");
  const liste = document.getElementById("butin-liste");
  const bouton = document.getElementById("butin-prendre");
  let surCollecte = null; // callback fourni à l'ouverture (applique le butin)

  function ligne(html) {
    const d = document.createElement("div");
    d.className = "butin-ligne";
    d.innerHTML = html;
    return d;
  }

  // Récupère le butin (une seule fois), ferme la fenêtre.
  function collecter() {
    if (!surCollecte) return;
    const cb = surCollecte;
    surCollecte = null;
    overlay.hidden = true;
    window.removeEventListener("keydown", surTouche, true);
    cb();
  }
  function surTouche(e) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      collecter();
    }
  }

  bouton.addEventListener("click", (e) => { e.stopPropagation(); collecter(); });
  panneau.addEventListener("click", collecter); // cliquer la fenêtre récupère aussi

  return {
    // `loot` = { or, xp, items: [idObjet…] }. `cb` applique le butin + reprend le jeu.
    ouvrir({ or = 0, xp = 0, items = [] }, cb) {
      surCollecte = cb;
      liste.replaceChildren();
      if (xp > 0) liste.append(ligne(`✨ <b>+${xp}</b> XP`));
      if (or > 0) liste.append(ligne(`🪙 <b>+${or}</b> Gold`));
      const compte = new Map();
      for (const id of items) compte.set(id, (compte.get(id) || 0) + 1);
      for (const [id, n] of compte) {
        const d = ITEMS[id];
        if (!d) continue;
        liste.append(ligne(
          `<span class="butin-pastille" style="background:${d.icone};border-color:${couleurRarete(id)}"></span>` +
          ` ${d.nom}${n > 1 ? `  ×${n}` : ""}`
        ));
      }
      if (!liste.children.length) liste.append(ligne("Nothing this time…"));
      overlay.hidden = false;
      window.addEventListener("keydown", surTouche, true);
    },
    fermer() {
      surCollecte = null;
      overlay.hidden = true;
      window.removeEventListener("keydown", surTouche, true);
    },
  };
}
