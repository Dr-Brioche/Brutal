// La consultation du deck (touche N + bouton dans l'inventaire).
//
// Le deck est le MIROIR de l'équipement : on l'étudie ici, à tête reposée,
// hors combat. EN COMBAT ce menu reste fermé — se souvenir de son deck fait
// partie du jeu (effort de mémoire voulu).
//
// On réutilise la composition exacte du combat (composerDeck) pour ne jamais
// montrer un deck différent de celui réellement joué.

import { composerDeck } from "../systems/combat.js";
import { cartesEquipees } from "../systems/inventaire.js";
import { garnirCarte } from "./carte.js";

export function installerDeck({ inventaire, surFermer }) {
  const overlay = document.getElementById("deck");
  const liste = document.getElementById("deck-liste");
  const total = document.getElementById("deck-total");
  document.getElementById("deck-fermer").onclick = () => surFermer();

  // Une carte affichée (même rendu qu'en combat) + un badge ×N quand la même
  // carte est présente en plusieurs exemplaires.
  function carteDOM(carte, nombre) {
    const el = document.createElement("div");
    el.className = "combat-carte";
    garnirCarte(el, carte); // coût + (illustration OU nom/texte)
    if (nombre > 1) {
      const badge = document.createElement("span");
      badge.className = "deck-nombre";
      badge.textContent = `×${nombre}`;
      el.append(badge);
    }
    return el;
  }

  function rendre() {
    const cartes = composerDeck(cartesEquipees(inventaire));
    // Regrouper par carte en conservant l'ordre d'apparition (base puis stuff).
    const groupes = new Map();
    for (const c of cartes) {
      const g = groupes.get(c.id);
      if (g) g.nombre++;
      else groupes.set(c.id, { carte: c, nombre: 1 });
    }
    liste.replaceChildren(
      ...[...groupes.values()].map(({ carte, nombre }) => carteDOM(carte, nombre))
    );
    total.textContent = cartes.length;
  }

  return {
    ouvrir() { rendre(); overlay.hidden = false; },
    fermer() { overlay.hidden = true; },
  };
}
