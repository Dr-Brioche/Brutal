// La consultation du deck (touche N) : deux onglets.
//
//  Onglet "Deck" : le miroir de l'équipement + les cartes de maîtrise choisies.
//  Onglet "Ancestral Mastery" : visible dès le talent débloqué — bibliothèque
//    des cartes maîtrisées (≥ 200 usages) + 3 slots de sélection.
//    Modifier la sélection n'est possible qu'en ville.

import { composerDeck } from "../systems/combat.js";
import { cartesEquipees, mainsOccupees } from "../systems/inventaire.js";
import { CARTES } from "../data/cartes.js";
import { garnirCarte } from "./carte.js";
import {
  SEUIL_MAITRISE, compteurMaitrise, carteMaitrisee,
  carteMaitrisable, toggleCarteChoisie,
} from "../systems/maitrise.js";

export function installerDeck({ inventaire, heros, maitrise, estEnVille, surFermer }) {
  const overlay  = document.getElementById("deck");
  const liste    = document.getElementById("deck-liste");
  const total    = document.getElementById("deck-total");
  const ongletDeck     = document.getElementById("deck-onglet-deck");
  const ongletMaitrise = document.getElementById("deck-onglet-maitrise");
  const vueDeck     = document.getElementById("deck-vue-deck");
  const vueMaitrise = document.getElementById("deck-vue-maitrise");
  const elSlots  = document.getElementById("deck-maitrise-slots");
  const elBiblio = document.getElementById("deck-maitrise-biblio");
  document.getElementById("deck-fermer").onclick = () => surFermer();

  let ongletActif = "deck";

  function basculerOnglet(nom) {
    ongletActif = nom;
    ongletDeck.classList.toggle("deck-onglet--actif", nom === "deck");
    ongletMaitrise.classList.toggle("deck-onglet--actif", nom === "maitrise");
    vueDeck.hidden = nom !== "deck";
    vueMaitrise.hidden = nom !== "maitrise";
    if (nom === "maitrise") rendreMaitrise();
    else rendreDeck();
  }
  ongletDeck.addEventListener("click", () => basculerOnglet("deck"));
  ongletMaitrise.addEventListener("click", () => basculerOnglet("maitrise"));

  // -- Onglet Deck ----------------------------------------------------------
  function carteDOM(carte, nombre) {
    const el = document.createElement("div");
    el.className = "combat-carte";
    garnirCarte(el, carte);
    if (nombre > 1) {
      const badge = document.createElement("span");
      badge.className = "deck-nombre";
      badge.textContent = `×${nombre}`;
      el.append(badge);
    }
    return el;
  }

  function rendreDeck() {
    const cartes = composerDeck(
      cartesEquipees(inventaire), maitrise?.choisies ?? [], mainsOccupees(inventaire));
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

  // -- Onglet Maîtrise ------------------------------------------------------
  function rendreMaitrise() {
    const debloque = (heros?.talents?.maitrise1 || 0) > 0;
    ongletMaitrise.textContent = debloque ? "Ancestral Mastery" : "Ancestral Mastery 🔒";

    if (!debloque) {
      elSlots.replaceChildren();
      elBiblio.innerHTML = '<p class="maitrise-vide">🔒 Unlock the <b>Ancestral Mastery</b> legendary talent to access this feature.</p>';
      return;
    }

    const enVille = estEnVille ? estEnVille() : true;

    // 3 slots de sélection
    const slotEls = [0, 1, 2].map((i) => {
      const carteId = maitrise.choisies[i];
      const el = document.createElement("div");
      el.className = "maitrise-slot" + (carteId ? " maitrise-slot--rempli" : "");
      if (carteId) {
        const carte = CARTES[carteId];
        if (carte) {
          const cEl = document.createElement("div");
          cEl.className = "combat-carte";
          garnirCarte(cEl, carte);
          el.append(cEl);
        }
        if (enVille) {
          const retirer = document.createElement("button");
          retirer.className = "maitrise-retirer";
          retirer.textContent = "✕";
          retirer.title = "Remove from deck";
          retirer.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleCarteChoisie(maitrise, carteId);
            rendreMaitrise(); rendreDeck();
          });
          el.append(retirer);
        }
      } else {
        el.textContent = `Empty slot`;
      }
      return el;
    });
    elSlots.replaceChildren(...slotEls);

    if (!enVille) {
      const avert = document.createElement("p");
      avert.className = "maitrise-vide";
      avert.style.marginTop = "8px";
      avert.textContent = "⚔ Return to Brütàl to change your selection.";
      elSlots.after(avert);
    }

    // Bibliothèque (cartes d'équipement seulement : ni base, ni « unique »)
    const idsConnus = Object.keys(maitrise.compteurs).filter(carteMaitrisable);
    if (!idsConnus.length) {
      elBiblio.innerHTML = '<p class="maitrise-vide">Play cards in combat to master them (200 uses each).</p>';
      return;
    }

    // Dans un même type : les cartes maîtrisées d'abord, puis par usages décroissants.
    const parProgression = (a, b) => {
      const ma = carteMaitrisee(maitrise, a), mb = carteMaitrisee(maitrise, b);
      if (ma !== mb) return ma ? -1 : 1;
      return compteurMaitrise(maitrise, b) - compteurMaitrise(maitrise, a);
    };

    // La mini-carte + sa barre de progression (qui se soulève au survol).
    function creerCarteMaitrise(id) {
      const carte = CARTES[id];
      if (!carte) return null;
      const maitrisee = carteMaitrisee(maitrise, id);
      const compte    = compteurMaitrise(maitrise, id);
      const choisie   = maitrise.choisies.includes(id);

      const wrap = document.createElement("div");
      wrap.className = "maitrise-carte-wrap";

      const cEl = document.createElement("div");
      cEl.className = "combat-carte"
        + (maitrisee ? " maitrise-carte--maitrisee" : "")
        + (choisie   ? " maitrise-carte--choisie"   : "");
      garnirCarte(cEl, carte);

      const prog = document.createElement("div");
      prog.className = "maitrise-carte-prog";
      if (maitrisee) {
        prog.innerHTML = `<span class="maitrise-ok">✓ Mastered</span>`;
      } else {
        const pct = Math.min(100, (compte / SEUIL_MAITRISE) * 100);
        prog.innerHTML = `<span class="maitrise-barre"><span style="width:${pct}%"></span></span> ${compte}/${SEUIL_MAITRISE}`;
      }

      wrap.append(cEl, prog);

      if (maitrisee && enVille) {
        cEl.style.cursor = "pointer";
        cEl.title = choisie ? "Remove from deck" : "Add to deck (max 3)";
        cEl.addEventListener("click", () => {
          if (!toggleCarteChoisie(maitrise, id) && !choisie) {
            cEl.style.outline = "2px solid #cc4444";
            setTimeout(() => { cEl.style.outline = ""; }, 500);
            return;
          }
          rendreMaitrise(); rendreDeck();
        });
      }
      return wrap;
    }

    // Rangement PAR TYPE de carte (attaque / défense / buff), chacun sa section.
    const TITRES = { attaque: "⚔ Attack", defense: "🛡 Defense", buff: "✦ Buff" };
    const ORDRE = ["attaque", "defense", "buff"];
    const parType = new Map();
    for (const id of idsConnus) {
      const t = CARTES[id]?.type || "autre";
      if (!parType.has(t)) parType.set(t, []);
      parType.get(t).push(id);
    }
    // Les types connus dans l'ordre voulu, puis tout type imprévu à la fin.
    const types = [...ORDRE.filter((t) => parType.has(t)),
                   ...[...parType.keys()].filter((t) => !ORDRE.includes(t))];

    const contenu = [];
    for (const t of types) {
      const titre = document.createElement("div");
      titre.className = "maitrise-section-titre";
      titre.textContent = TITRES[t] || "Other";
      const rangee = document.createElement("div");
      rangee.className = "maitrise-biblio-rangee";
      rangee.append(...parType.get(t).sort(parProgression).map(creerCarteMaitrise).filter(Boolean));
      contenu.push(titre, rangee);
    }
    elBiblio.replaceChildren(...contenu);
  }

  function rendre() {
    if (ongletActif === "deck") rendreDeck();
    else rendreMaitrise();
  }

  return {
    ouvrir() { rendre(); overlay.hidden = false; },
    fermer() { overlay.hidden = true; },
    rendre,
  };
}
