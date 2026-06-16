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
  // Navigation clavier de l'onglet Maîtrise : carte au curseur + liste à plat.
  let selBiblio = null;   // id de la carte sélectionnée au clavier (null = aucune)
  let cartesNav = [];     // [{ id, el, actionnable }] dans l'ordre d'affichage

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
    cartesNav = []; // reconstruit plus bas si des cartes sont affichées
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
      for (const id of parType.get(t).sort(parProgression)) {
        const wrap = creerCarteMaitrise(id);
        if (!wrap) continue;
        rangee.append(wrap);
        cartesNav.push({ id, el: wrap.querySelector(".combat-carte"),
                         actionnable: carteMaitrisee(maitrise, id) && enVille });
      }
      contenu.push(titre, rangee);
    }
    // Aide clavier (en ville, là où l'on peut modifier sa sélection).
    if (enVille && cartesNav.length) {
      const aide = document.createElement("p");
      aide.className = "maitrise-aide";
      aide.innerHTML = "⌨ <b>Arrows</b> move · <b>Space</b> add/remove · <b>Tab</b> switch tab";
      contenu.push(aide);
    }
    elBiblio.replaceChildren(...contenu);

    if (selBiblio && !cartesNav.some((c) => c.id === selBiblio)) selBiblio = null;
    appliquerCurseur();
  }

  // -- Navigation clavier de l'onglet Maîtrise ------------------------------
  function centreEl(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // Pose le curseur visuel sur la carte sélectionnée (et la garde à l'écran).
  function appliquerCurseur() {
    for (const c of cartesNav) c.el.classList.toggle("maitrise-carte--curseur", c.id === selBiblio);
    const cur = cartesNav.find((c) => c.id === selBiblio);
    if (cur) cur.el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  // Déplace le curseur vers la carte voisine la plus proche dans la direction.
  function naviguer(dir) {
    if (!cartesNav.length) return;
    const cur = cartesNav.find((c) => c.id === selBiblio);
    if (!cur) { selBiblio = cartesNav[0].id; appliquerCurseur(); return; } // 1re flèche
    const o = centreEl(cur.el);
    let best = null, meilleur = Infinity;
    for (const c of cartesNav) {
      if (c.id === selBiblio) continue;
      const p = centreEl(c.el);
      const dx = p.x - o.x, dy = p.y - o.y;
      let ok = false, principal = 0, lateral = 0;
      if (dir === "droite")      { ok = dx > 1;  principal = dx;  lateral = Math.abs(dy); }
      else if (dir === "gauche") { ok = dx < -1; principal = -dx; lateral = Math.abs(dy); }
      else if (dir === "bas")    { ok = dy > 1;  principal = dy;  lateral = Math.abs(dx); }
      else if (dir === "haut")   { ok = dy < -1; principal = -dy; lateral = Math.abs(dx); }
      if (!ok) continue;
      const score = principal + lateral * 3; // on privilégie l'alignement
      if (score < meilleur) { meilleur = score; best = c.id; }
    }
    if (best) { selBiblio = best; appliquerCurseur(); }
  }

  // Espace/Entrée sur la carte au curseur : l'ajoute / la retire du deck.
  function validerSelection() {
    const cur = cartesNav.find((c) => c.id === selBiblio);
    if (!cur || !cur.actionnable) return; // hors ville ou non maîtrisée : rien
    const dejaChoisie = maitrise.choisies.includes(cur.id);
    if (!toggleCarteChoisie(maitrise, cur.id) && !dejaChoisie) {
      cur.el.style.outline = "2px solid #cc4444"; // 3 slots pleins : refus
      setTimeout(() => { cur.el.style.outline = ""; }, 500);
      return;
    }
    rendreMaitrise(); rendreDeck();
  }

  const DIRS = {
    ArrowLeft: "gauche", KeyA: "gauche", KeyQ: "gauche",
    ArrowRight: "droite", KeyD: "droite",
    ArrowUp: "haut", KeyW: "haut", KeyZ: "haut",
    ArrowDown: "bas", KeyS: "bas",
  };
  // Clavier de l'écran deck : Tab change d'onglet ; dans la Maîtrise, les flèches
  // déplacent le curseur et Espace/Entrée ajoute/retire la carte visée.
  function surTouche(e) {
    if (e.code === "Tab") {
      e.preventDefault(); e.stopPropagation();
      basculerOnglet(ongletActif === "deck" ? "maitrise" : "deck");
      return;
    }
    if (ongletActif !== "maitrise") return; // la navigation ne concerne que la Maîtrise
    if (DIRS[e.code]) {
      e.preventDefault(); e.stopPropagation();
      naviguer(DIRS[e.code]);
    } else if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault(); e.stopPropagation();
      validerSelection();
    }
  }

  function rendre() {
    if (ongletActif === "deck") rendreDeck();
    else rendreMaitrise();
  }

  return {
    ouvrir() {
      basculerOnglet("deck");
      overlay.hidden = false;
      window.addEventListener("keydown", surTouche, true);
    },
    fermer() {
      overlay.hidden = true;
      selBiblio = null;
      window.removeEventListener("keydown", surTouche, true);
    },
    rendre,
  };
}
