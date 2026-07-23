// ⚠ ÉCRAN DE TEST (à retirer avant l'export final) : le SIMULATEUR DE COMBAT du
// Maître d'arène. On y voit TOUS les monstres du jeu (avec leur niveau), on en
// choisit jusqu'à 5 PLACES (un GRAND monstre en prend 2), un compteur se remplit,
// puis on lance un combat simulé (aucun enjeu : ni butin, ni XP, ni mort).
//
// Souris OU clavier : Tab entre les éléments, Entrée/Espace pour ajouter/lancer,
// Échap ferme.

import { ENNEMIS } from "../data/ennemis.js";

const PLACES_MAX = 5;
const placesDe = (def) => (def.grand ? 2 : 1);

let actif = false;
export function testeurActif() { return actif; }

export function installerTesteur() {
  const panneau   = document.getElementById("testeur");
  const elListe   = document.getElementById("testeur-liste");
  const elChoix   = document.getElementById("testeur-choix");
  const elCompteur = document.getElementById("testeur-compteur");
  const boutonLancer = document.getElementById("testeur-lancer");
  const boutonVider  = document.getElementById("testeur-vider");
  const boutonFermer = document.getElementById("testeur-fermer");

  let choisis = [];          // liste d'ids de monstres sélectionnés (répétitions permises)
  let onLancer = null, onFermer = null;

  // Monstres triés par NIVEAU puis par nom, pour une liste lisible. On EXCLUT l'équipage
  // « spawnOnly » (gobelins de la tour de siège) : ils n'apparaissent qu'à la mort de la tour.
  const MOBS = [...ENNEMIS]
    .filter((e) => !e.spawnOnly)
    .sort((a, b) => (a.niveau - b.niveau) || a.nom.localeCompare(b.nom));

  function placesUtilisees() {
    return choisis.reduce((s, id) => s + placesDe(ENNEMIS.find((e) => e.id === id)), 0);
  }

  function peutAjouter(def) {
    // Monstre SOLO-UNIQUEMENT (Tour de siège) : ne se combine avec AUCUN autre.
    if (choisis.length) {
      if (choisis.some((id) => ENNEMIS.find((e) => e.id === id)?.soloUniquement)) return false;
      if (def.soloUniquement) return false;
    }
    return placesUtilisees() + placesDe(def) <= PLACES_MAX;
  }

  function rendre() {
    const used = placesUtilisees();
    elCompteur.textContent = `${used} / ${PLACES_MAX} places`;
    elCompteur.classList.toggle("testeur-compteur--plein", used >= PLACES_MAX);

    // Liste des monstres (boutons « + »).
    elListe.replaceChildren();
    for (const def of MOBS) {
      const p = placesDe(def);
      const b = document.createElement("button");
      b.className = "testeur-mob";
      b.disabled = !peutAjouter(def);
      const n = choisis.filter((id) => id === def.id).length;
      b.innerHTML =
        `<span class="testeur-mob-nom">${def.nom}</span>` +
        `<span class="testeur-mob-niv">Lv ${def.niveau}</span>` +
        `<span class="testeur-mob-places">${p === 2 ? "▮▮ big" : "▮"}</span>` +
        (n > 0 ? `<span class="testeur-mob-n">×${n}</span>` : "");
      b.addEventListener("click", () => {
        if (peutAjouter(def)) { choisis.push(def.id); rendre(); }
      });
      elListe.append(b);
    }

    // Zone des sélectionnés (puces retirables).
    elChoix.replaceChildren();
    if (choisis.length === 0) {
      const vide = document.createElement("span");
      vide.className = "testeur-vide";
      vide.textContent = "Pick up to 5 places of monsters…";
      elChoix.append(vide);
    } else {
      choisis.forEach((id, i) => {
        const def = ENNEMIS.find((e) => e.id === id);
        const chip = document.createElement("button");
        chip.className = "testeur-chip";
        chip.title = "Remove";
        chip.innerHTML = `${def.nom} <span class="testeur-chip-lv">Lv ${def.niveau}</span> ✕`;
        chip.addEventListener("click", () => { choisis.splice(i, 1); rendre(); });
        elChoix.append(chip);
      });
    }

    boutonLancer.disabled = choisis.length === 0;
  }

  function lancer() {
    if (choisis.length === 0) return;
    const ids = [...choisis];
    fermer();
    onLancer?.(ids);
  }

  function surClavier(e) {
    if (!actif) return;
    if (e.code === "Escape") { e.preventDefault(); fermer(); }
  }

  function ouvrir({ surLancer, surFermer }) {
    onLancer = surLancer; onFermer = surFermer;
    choisis = [];
    panneau.hidden = false;
    actif = true;
    rendre();
    window.addEventListener("keydown", surClavier, true);
    boutonLancer.focus();
  }

  function fermer() {
    if (!actif) return;
    actif = false;
    panneau.hidden = true;
    window.removeEventListener("keydown", surClavier, true);
    onFermer?.();
  }

  boutonLancer.addEventListener("click", lancer);
  boutonVider.addEventListener("click", () => { choisis = []; rendre(); });
  boutonFermer.addEventListener("click", fermer);

  return { ouvrir, fermer, actif: () => actif };
}
