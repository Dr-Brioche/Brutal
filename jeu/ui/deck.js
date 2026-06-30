// La consultation du deck (touche N) : deux onglets.
//
//  Onglet "Deck" : le miroir de l'équipement + les cartes de maîtrise choisies.
//  Onglet "Ancestral Mastery" : visible dès le talent débloqué — bibliothèque
//    des cartes maîtrisées (≥ 200 usages) + 3 slots de sélection.
//    Modifier la sélection n'est possible qu'en ville.

import { composerDeck } from "../systems/combat.js";
import { cartesEquipees, slotsOccupes } from "../systems/inventaire.js";
import { CARTES } from "../data/cartes.js";
import { garnirCarte } from "./carte.js";
import {
  SEUIL_MAITRISE, MAX_SLOTS, compteurMaitrise, carteMaitrisee,
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
  const preview  = document.getElementById("deck-carte-preview");
  document.getElementById("deck-fermer").onclick = () => surFermer();

  let ongletActif = "deck";
  // Navigation clavier de l'onglet Maîtrise : carte au curseur + liste à plat.
  let selBiblio = null;   // id de la carte sélectionnée au clavier (null = aucune)
  let cartesNav = [];     // [{ id, el, actionnable }] dans l'ordre d'affichage
  // Navigation clavier de l'onglet Deck
  let selDeck = null;     // index dans cartesNavDeck, null = aucun
  let cartesNavDeck = []; // [{ carte, el }] dans l'ordre d'affichage

  // ---- Aperçu grande carte ------------------------------------------------
  function montrerApercu(carte, ancreEl) {
    preview.innerHTML = "";
    const carteEl = document.createElement("div");
    carteEl.className = "combat-carte";
    garnirCarte(carteEl, carte);
    preview.append(carteEl);
    preview.hidden = false;

    const r = ancreEl.getBoundingClientRect();
    const PW = 262, PH = Math.round(262 * 1.45);
    let left = r.right + 16;
    let top  = r.top + r.height / 2 - PH / 2;
    if (left + PW > window.innerWidth - 8) left = r.left - PW - 16;
    if (left < 8) left = Math.max(8, r.right + 4); // dernier recours
    top = Math.max(8, Math.min(top, window.innerHeight - PH - 8));
    preview.style.left = left + "px";
    preview.style.top  = top + "px";
  }

  function cacherApercu() { preview.hidden = true; }

  // ---- Changement d'onglet ------------------------------------------------
  function basculerOnglet(nom) {
    cacherApercu();
    if (ongletActif === "deck") { selDeck = null; appliquerCurseurDeck(); }
    else                        { selBiblio = null; }
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
    el.addEventListener("mouseenter", () => montrerApercu(carte, el));
    el.addEventListener("mouseleave", cacherApercu);
    const badge = document.createElement("span");
    badge.className = "deck-nombre";
    badge.textContent = `×${nombre}`;
    el.append(badge);
    return el;
  }

  function rendreDeck() {
    const cartes = composerDeck(
      cartesEquipees(inventaire), maitrise?.choisies ?? [], slotsOccupes(inventaire));
    const groupes = new Map();
    for (const c of cartes) {
      const g = groupes.get(c.id);
      if (g) g.nombre++;
      else groupes.set(c.id, { carte: c, nombre: 1 });
    }
    cartesNavDeck = [];
    liste.replaceChildren(
      ...[...groupes.values()].map(({ carte, nombre }) => {
        const el = carteDOM(carte, nombre);
        cartesNavDeck.push({ carte, el });
        return el;
      })
    );
    total.textContent = cartes.length;
    if (selDeck !== null && selDeck >= cartesNavDeck.length) selDeck = null;
    appliquerCurseurDeck();
  }

  // Navigation clavier dans l'onglet Deck
  function appliquerCurseurDeck() {
    cartesNavDeck.forEach((item, i) => {
      item.el.classList.toggle("deck-carte--sel", i === selDeck);
    });
    if (selDeck !== null) {
      const item = cartesNavDeck[selDeck];
      item.el.scrollIntoView({ block: "nearest" });
      montrerApercu(item.carte, item.el);
    } else if (ongletActif === "deck") {
      cacherApercu();
    }
  }

  function naviguerDeck(dir) {
    if (!cartesNavDeck.length) return;
    if (selDeck === null) { selDeck = 0; appliquerCurseurDeck(); return; }
    const o = centreEl(cartesNavDeck[selDeck].el);
    let best = null, bestScore = Infinity;
    cartesNavDeck.forEach((item, i) => {
      if (i === selDeck) return;
      const p = centreEl(item.el);
      const dx = p.x - o.x, dy = p.y - o.y;
      let ok = false, principal = 0, lateral = 0;
      if (dir === "droite")      { ok = dx > 1;  principal = dx;  lateral = Math.abs(dy); }
      else if (dir === "gauche") { ok = dx < -1; principal = -dx; lateral = Math.abs(dy); }
      else if (dir === "bas")    { ok = dy > 1;  principal = dy;  lateral = Math.abs(dx); }
      else if (dir === "haut")   { ok = dy < -1; principal = -dy; lateral = Math.abs(dx); }
      if (!ok) return;
      const score = principal + lateral * 3;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best !== null) { selDeck = best; appliquerCurseurDeck(); }
  }

  // La souris reprend la main sur le deck : on efface le curseur clavier.
  function surSourisDeck() {
    if (selDeck === null) return;
    selDeck = null;
    cacherApercu();
    appliquerCurseurDeck();
  }

  // -- Onglet Maîtrise ------------------------------------------------------
  function montrerAvert(msg) {
    document.querySelectorAll(".maitrise-toast").forEach((t) => t.remove());
    const toast = document.createElement("div");
    toast.className = "maitrise-toast";
    toast.textContent = msg;
    document.getElementById("deck").append(toast);
    setTimeout(() => toast.remove(), 2600);
  }

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
    const nbSlots = heros?.slotsMaitrise || 0; // emplacements débloqués (3 ou 5)

    // MAX_SLOTS emplacements affichés ; ceux au-delà des débloqués sont verrouillés
    // (cadenas) jusqu'au talent « Ancestral Legacy ».
    const slotEls = Array.from({ length: MAX_SLOTS }, (_, i) => {
      const el = document.createElement("div");
      if (i >= nbSlots) {
        el.className = "maitrise-slot maitrise-slot--verrou";
        el.innerHTML = '<span class="maitrise-slot-cadenas">🔒</span>';
        el.title = "Unlock the « Ancestral Legacy » talent for 2 more slots.";
        return el;
      }
      const carteId = maitrise.choisies[i];
      el.className = "maitrise-slot" + (carteId ? " maitrise-slot--rempli" : "");
      if (carteId) {
        const carte = CARTES[carteId];
        if (carte) {
          const cEl = document.createElement("div");
          cEl.className = "combat-carte";
          garnirCarte(cEl, carte);
          cEl.addEventListener("mouseenter", () => montrerApercu(carte, cEl));
          cEl.addEventListener("mouseleave", cacherApercu);
          el.append(cEl);
        }
        if (enVille) {
          const retirer = document.createElement("button");
          retirer.className = "maitrise-retirer";
          retirer.textContent = "✕";
          retirer.title = "Remove from deck";
          retirer.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleCarteChoisie(maitrise, carteId, nbSlots);
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
      // Aperçu grande carte au survol souris
      cEl.addEventListener("mouseenter", () => montrerApercu(carte, cEl));
      cEl.addEventListener("mouseleave", cacherApercu);
      if (!maitrisee) {
        const cadenas = document.createElement("span");
        cadenas.className = "maitrise-cadenas";
        cadenas.textContent = "🔒";
        cEl.append(cadenas);
      }

      const prog = document.createElement("div");
      prog.className = "maitrise-carte-prog";
      if (maitrisee) {
        prog.innerHTML = `<span class="maitrise-ok">✓ Mastered</span>`;
      } else {
        const pct = Math.min(100, (compte / SEUIL_MAITRISE) * 100);
        prog.innerHTML = `<span class="maitrise-barre"><span style="width:${pct}%"></span></span> ${compte}/${SEUIL_MAITRISE}`;
      }

      wrap.append(cEl, prog);

      if (maitrisee) {
        cEl.style.cursor = "pointer";
        if (enVille) {
          cEl.title = choisie ? "Remove from deck" : `Add to deck (max ${nbSlots})`;
          cEl.addEventListener("click", () => {
            if (!toggleCarteChoisie(maitrise, id, nbSlots) && !choisie) {
              cEl.style.outline = "2px solid #cc4444";
              setTimeout(() => { cEl.style.outline = ""; }, 500);
              return;
            }
            rendreMaitrise(); rendreDeck();
          });
        } else {
          cEl.addEventListener("click", () => {
            montrerAvert("⚔ Return to Brütàl to change your selection.");
          });
        }
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
                         maitrisee: carteMaitrisee(maitrise, id),
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
    if (cur) {
      cur.el.scrollIntoView({ block: "nearest", inline: "nearest" });
      montrerApercu(CARTES[cur.id], cur.el);
    } else if (ongletActif === "maitrise") {
      cacherApercu();
    }
  }

  // Déplace le curseur vers la carte voisine la plus proche dans la direction.
  function naviguer(dir) {
    if (!cartesNav.length) return;
    const cur = cartesNav.find((c) => c.id === selBiblio);
    if (!cur) {
      selBiblio = cartesNav[0].id;
      elBiblio.classList.add("maitrise-biblio--clavier");
      appliquerCurseur();
      return;
    } // 1re flèche
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
    if (best) {
      selBiblio = best;
      elBiblio.classList.add("maitrise-biblio--clavier"); // désactive :hover
      appliquerCurseur();
    }
  }

  // La souris reprend la main : on efface le curseur clavier et on réactive :hover.
  function surSourisBiblio() {
    if (!selBiblio) return;
    selBiblio = null;
    cacherApercu();
    elBiblio.classList.remove("maitrise-biblio--clavier");
    appliquerCurseur();
  }

  // Espace/Entrée sur la carte au curseur : l'ajoute / la retire du deck.
  function validerSelection() {
    const cur = cartesNav.find((c) => c.id === selBiblio);
    if (!cur) return;
    if (!cur.actionnable) {
      if (cur.maitrisee) montrerAvert("⚔ Return to Brütàl to change your selection.");
      return;
    }
    const dejaChoisie = maitrise.choisies.includes(cur.id);
    if (!toggleCarteChoisie(maitrise, cur.id, heros?.slotsMaitrise || 0) && !dejaChoisie) {
      cur.el.style.outline = "2px solid #cc4444"; // tous les slots pleins : refus
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
  // Clavier de l'écran deck : Tab change d'onglet ; les flèches déplacent le
  // curseur dans l'onglet actif ; Espace/Entrée valide (Maîtrise seulement).
  function surTouche(e) {
    if (e.code === "Tab") {
      e.preventDefault(); e.stopPropagation();
      basculerOnglet(ongletActif === "deck" ? "maitrise" : "deck");
      return;
    }
    if (DIRS[e.code]) {
      e.preventDefault(); e.stopPropagation();
      if (ongletActif === "deck") naviguerDeck(DIRS[e.code]);
      else naviguer(DIRS[e.code]);
    } else if ((e.code === "Space" || e.code === "Enter") && ongletActif === "maitrise") {
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
      elBiblio.addEventListener("mousemove", surSourisBiblio);
      liste.addEventListener("mousemove", surSourisDeck);
    },
    fermer() {
      overlay.hidden = true;
      selBiblio = null;
      selDeck = null;
      cartesNavDeck = [];
      cacherApercu();
      elBiblio.classList.remove("maitrise-biblio--clavier");
      window.removeEventListener("keydown", surTouche, true);
      elBiblio.removeEventListener("mousemove", surSourisBiblio);
      liste.removeEventListener("mousemove", surSourisDeck);
    },
    rendre,
  };
}
