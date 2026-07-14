// L'écran de combat : la mise en scène (dessinée dans le canvas) + les cartes
// et boutons (en HTML, par-dessus). La logique pure est dans systems/combat.js.
//
// Combat à PLUSIEURS ennemis : chacun a son sprite, sa barre de vie (chiffrée),
// ses états et son intention. Les cartes d'attaque visent UNE cible :
//   - au clavier : on « arme » la carte (Espace), puis on choisit la cible avec
//     les flèches (une flèche rouge animée pointe la cible), Espace confirme,
//     Échap annule.
//   - à la souris : on tire la carte vers le monstre. Un RÉTICULE rouge (croix +
//     rond) suit le pointeur ; le monstre visé s'illumine en jaune et sa barre de
//     vie clignote. On lâche sur lui pour jouer la carte.
//
// On renvoie { mettreAJour(dt), dessiner() } : la boucle principale appelle ces
// deux fonctions tant que le combat est actif.

import {
  creerCombat, jouerCarte, degatsSurchauffe, necessiteCiblage,
  ennemiVivant, agirEnnemi, commencerTourHeros, finirTourHeros, avancerInitiative,
  simulerFile, ratioInitiativeHeros, ratioInitiativeEnnemi, cibleSoinVerrou,
  appliquerResultatAleatoire, fuirCombat,
} from "../systems/combat.js";
import { cartesEquipees, slotsOccupes } from "../systems/inventaire.js";
import { setsActifs, itemDef, comboArmeActif } from "../data/items.js";
import { forceQualite } from "../data/recettes.js";
import { bonusTalents } from "../systems/talents.js";
import { incrementerMaitrise } from "../systems/maitrise.js";
import { dessinerCaseEchelle } from "../core/sprites.js";
import { police, POLICE_NOM } from "../core/texte.js"; // polices centrales (cf. core/texte.js)
import { cheminArrondi, RAYON } from "../core/style.js"; // coins arrondis centraux (cf. core/style.js)
import { garnirCarte } from "./carte.js";
import { alerteVie } from "./effets.js";
import { getPreference } from "../systems/preferences.js";
import { demanderConfirmation, confirmationActive } from "./confirmation.js";
import {
  jouerSonCoup, jouerSonCoupArmure, jouerSonSortilege, jouerSonPierre, jouerSonPioche,
  jouerSonNegatif,
} from "../core/sons.js";

// ----- Placement sur la scène (canvas 640×360) -----------------------------
const ECHELLE_HEROS = 3;            // 64×64 → 192×192 (avant dézoom de scène)
const SOL_Y = 224;                  // pieds des sprites (abaissés : bien sur la zone de combat)
const SOL_FOND = 268;               // séparateur visuel fond PNG / interface
const ECHELLE_SCENE = 0.36;          // dézoom de référence (avant-plan)
const ECHELLE_AVANT   = ECHELLE_SCENE;        // rang avant  : taille normale
const ECHELLE_ARRIERE = ECHELLE_SCENE * 0.85; // rang arrière : 15 % plus petit
const RATIO_ARRIERE   = ECHELLE_ARRIERE / ECHELLE_AVANT; // facteur UI arrière (0.85)
const SOL_ARRIERE = SOL_Y - 18;              // pieds des ennemis arrière, 18 px plus hauts
const PIVOT_SCENE = { x: 320, y: SOL_Y };
const HEROS_ECRAN_CX = 140;         // centre du héros à l'écran (scène)
// Le nain est REMONTÉ de quelques px pour se placer EN HAUTEUR entre les deux rangs
// de mobs (avant SOL_Y=224, arrière SOL_ARRIERE=206) → ses pieds visent ~213.
const DECAL_HEROS = 11;             // remontée du nain à l'écran (px)
const ECHELLE_HEROS_ILLU = 1.30;   // illustration du nain agrandie de 30 %
// Le groupe d'ennemis est centré à droite ; ils s'étalent autour de ce centre.
const ENNEMIS_CX = 425;
const ENNEMIS_ESPACE = 78;          // écart horizontal entre deux ennemis (scène)
function versOrigine(cxEcran) {
  return PIVOT_SCENE.x + (cxEcran - PIVOT_SCENE.x) / ECHELLE_SCENE;
}
// Centres horizontaux (écran) de N ennemis, centrés sur ENNEMIS_CX.
// Au-delà de 3 monstres, on RESSERRE l'écart pour que 4-5 sprites tiennent dans
// le cadre (640 px) sans déborder à droite. À 1-3 monstres, l'écart est inchangé.
const ENNEMIS_LARGEUR = 205;        // largeur max occupée par le groupe (écran)
function poserEnnemis(n) {
  const espace = Math.min(ENNEMIS_ESPACE, ENNEMIS_LARGEUR / Math.max(1, n - 1));
  const x0 = ENNEMIS_CX - ((n - 1) * espace) / 2;
  return Array.from({ length: n }, (_, i) => x0 + i * espace);
}
// Barre de vie sous chaque perso (unités SCÈNE, taille réelle, PV chiffrés dedans).
const BAR_L = 56, BAR_H = 8;
const VIE_SOUS = 11;           // écart pieds (sol) → haut de la barre (loge la rangée de BONUS au-dessus de la barre, sous les pieds)
const ETATS_SOUS = 11;         // écart bas de la barre → rangée d'états (laisse place à l'init)
// File d'ordre des tours (en haut) : carrés-portraits des prochains acteurs.
const FILE_N = 5, FILE_TAILLE = 40, FILE_ESPACE = 8, FILE_Y = 12;
// Portrait du héros dans la file des tours : on découpe la TÊTE dans l'illustration
// de combat (images/heros/nain-combat.png) — même image que le héros affiché en
// scène, donc plus cohérent que l'ancienne vignette pixel-art de la planche.
const TETE_HEROS_COMBAT = { sx: 72, sy: 2, sw: 60, sh: 60 };
// Repli : ancienne zone de tête dans la planche du nain (si l'illustration n'est
// pas encore chargée au tout premier rendu).
const PORTRAIT_HEROS = { sx: 17, sy: 4, sw: 30, sh: 30 };
// ---------------------------------------------------------------------------

// `ennemis` : tableau de définitions d'ennemis (data/ennemis.js).
export function demarrerCombat({ ctx, heros, inventaire, planches, ennemis, maitrise, fond, surFin, surPause, bonusRun }) {
  // Buffs de RUN de profondeur (accumulés en descendant, cf. systems/profondeur.js) :
  // s'ajoutent à l'équipement pour ce combat. Nuls hors mine.
  const run = bonusRun ?? { forcePerm: 0, celeritePct: 0, armureDepart: 0 };
  const fondCombat = document.getElementById("fond-combat");
  // Fond de la zone (tiré dans sa bibliothèque) ; sinon dégradé de secours (none).
  fondCombat.style.setProperty("--fond-url", fond ? `url("${fond}")` : "none");
  fondCombat.hidden = false;

  // Items équipés (slots armure, bottes, gants… + armes, bijoux).
  const itemsEquipes = Object.values(inventaire.slots ?? {}).filter(Boolean).map(itemDef).filter(Boolean);
  // Arme à DEUX MAINS équipée ? → choisit l'illustration « poings tendus » du héros.
  const armeDeuxMains = itemDef(inventaire.slots?.arme1)?.mains === 2;
  // Skin d'arme à poser dans les mains (si l'arme 2 mains équipée en a un défini).
  const skinArme = armeDeuxMains ? (SKINS_ARME_2M[inventaire.slots?.arme1] ?? null) : null;
  // Armure de départ : somme des armureDepart de tous les items équipés (+ run).
  const armureDepart = itemsEquipes.reduce((s, d) => s + (d.armureDepart ?? 0), 0) + (run.armureDepart ?? 0);
  // Célérité passive (% d'initiative de combat) des items (+ run). Le « move speed »
  // des bottes, lui, agit en EXPLORATION (cf. appliquerEquipement), pas en combat.
  const celeritePct = itemsEquipes.reduce((s, d) => s + (d.celeritePct ?? 0), 0) + (run.celeritePct ?? 0);
  // Force permanente : bonus de dégâts fixe pour TOUT le combat (déclaré par items),
  // + le combo d'arme actif (ex. Twin Daggers en double, Basilisk Fang + dague off-hand).
  const forcePerm = itemsEquipes.reduce((s, d) => s + (d.forcePerm ?? 0), 0)
    + (comboArmeActif(inventaire.slots)?.forcePerm ?? 0)
    + (run.forcePerm ?? 0); // buff de run « Pierre de force »
  // Force de QUALITÉ de forge : chaque équipement FORGÉ ajoute la Force de sa
  // qualité, MODULÉE par la rareté de l'objet (cf. FORCE_QUALITE) — un épique
  // Master rapporte bien plus qu'un commun. Les loots = normale (0).
  const forceQualiteTotale = Object.entries(inventaire.qualites ?? {})
    .reduce((s, [slot, q]) => s + forceQualite(itemDef(inventaire.slots?.[slot])?.rarete, q), 0);
  // Pierre permanente par tour : passif des armures lourdes (Blood/Crusader/Mail/Onyx)
  // et du Siege Maul. +N Pierre au début de CHAQUE tour, tant que l'item est équipé.
  const pierreParTour = itemsEquipes.reduce((s, d) => s + (d.pierreParTour ?? 0), 0);
  // Agilité (vitesse d'attaque ATB) donnée par les items (surtout les bottes) :
  // s'ajoute à l'agilité des talents (base 10).
  const agiliteItems = itemsEquipes.reduce((s, d) => s + (d.agilite ?? 0), 0);
  // Passifs individuels (ex. Tower Shield : +2 Pierre par frappe).
  const passifsItems = itemsEquipes.flatMap((d) => d.passifPropre ? [d.passifPropre] : []);

  const bt = bonusTalents(heros);
  // Infinity Gauntlet : 5 slots de bague remplis ET tous différents (pas de doublon).
  // Les slots contiennent des IDS (chaînes), pas des objets → on déduplique les ids
  // directement (avant, `.map(b => b.id)` donnait 5× undefined → jamais activé).
  const _bagues5 = ["bague1","bague2","bague3","bague4","bague5"]
    .map(s => inventaire.slots?.[s]).filter(Boolean);
  const toutesBagues = _bagues5.length === 5 && new Set(_bagues5).size === 5;
  const combat = creerCombat(ennemis, {
    pv: heros.pv, pvMax: heros.pvMax,
    cartes: cartesEquipees(inventaire),
    cartesSupp: maitrise?.choisies ?? [],
    slots: slotsOccupes(inventaire), // cartes de suppléance pour les slots vides (mains + armure)
    stats: {
      ...bt,
      agilite:  (bt.agilite  ?? 0) + agiliteItems + (toutesBagues ? 5 : 0),
      armureDepart,
      celeritePct,
      forcePerm: forcePerm + forceQualiteTotale + (toutesBagues ? 4 : 0),
      pierreParTour,
      pioche:   (bt.pioche   ?? 0) + (toutesBagues ? 1 : 0),
      infinityGauntlet: toutesBagues,
    },
    passifs: [...setsActifs(inventaire.slots).map((s) => s.bonus), ...passifsItems],
  });

  // Héros : coin haut-gauche du sprite (pieds sur le sol) + repère écran.
  const HEROS = { x: versOrigine(HEROS_ECRAN_CX) - (64 * ECHELLE_HEROS) / 2, y: SOL_Y - 64 * ECHELLE_HEROS };
  const heroEcran = { cx: HEROS_ECRAN_CX, sol: SOL_Y - DECAL_HEROS, haut: SOL_Y - DECAL_HEROS - 64 * ECHELLE_HEROS * ECHELLE_SCENE };
  heroEcran.milieu = (heroEcran.haut + heroEcran.sol) / 2;
  heroEcran.sommet = heroEcran.haut - 10; // au-dessus de la tête du héros (nombres flottants)

  // RYTHME DU COMBAT : par défaut posé/lisible ; l'option « Fast gameplay »
  // (menu → Interface) rétablit le rythme rapide (×1). `lenteur` multiplie TOUTES
  // les pauses (entre actions ennemies, entre dégâts, durées d'animation) → au
  // combat de groupe, on suit mieux ce qui se passe.
  const lenteur = getPreference("gameplayRapide") ? 1.0 : 1.8;
  // Petit délai entre « carte jouée » et l'apparition de son effet (dégâts/statuts) :
  // le temps que la carte agrandie s'écarte, pour qu'on VOIE ce qui se passe.
  const DELAI_CARTE = Math.round(220 * lenteur);

  // État d'AFFICHAGE de chaque ennemi (le moteur tient l'état de jeu dans
  // combat.ennemis ; ici on tient le sprite, la position, les animations).
  // Quinconce STRICT par position : indices pairs = avant-plan, impairs =
  // arrière-plan (1 devant, 1 derrière, 1 devant…), quel que soit l'affixe.
  // Placement par EMPLACEMENTS : un GRAND monstre (def.grand) occupe 2 places et se
  // CENTRE dessus ; un normal, 1 place. On assigne chaque monstre à ses places.
  const spans = combat.ennemis.map((e) => (e.def.grand ? 2 : 1));
  const placeCx = poserEnnemis(spans.reduce((a, b) => a + b, 0));
  let _place = 0;
  const cxs = spans.map((span) => {
    const c = (placeCx[_place] + placeCx[_place + span - 1]) / 2;
    _place += span;
    return c;
  });
  const ennemisUI = combat.ennemis.map((e, i) => {
    const spr = e.def.sprite;
    const avant   = (i % 2 === 0) || !!e.def.grand; // un GRAND monstre est toujours à l'AVANT
    const echelle = avant ? ECHELLE_AVANT : ECHELLE_ARRIERE;
    const solEcran = avant ? SOL_Y : SOL_ARRIERE;
    // Calcul en coordonnées monde à partir de l'échelle propre à cet ennemi.
    const solMonde = PIVOT_SCENE.y + (solEcran - PIVOT_SCENE.y) / echelle;
    const ecran = { cx: cxs[i], sol: solEcran, haut: solEcran - spr.caseH * echelle };
    ecran.milieu = (ecran.haut + ecran.sol) / 2;
    ecran.sommet = ecran.haut - 22;
    return {
      e, spr, avant, echelle,
      planche: planches?.get(e.def.planche) ?? null,
      localX: PIVOT_SCENE.x + (cxs[i] - PIVOT_SCENE.x) / echelle - spr.caseL / 2,
      localY: solMonde - spr.caseH,
      ecran,
      vitAnim: facteurAnimVitesse(e.def.vitesse ?? 10) * lenteur, // rythme ∝ vitesse × lenteur
      anim: { nom: "idle", t: 0 },
      secousse: 0,
      affPv: e.pv,
      affInit: 0,
      mort: { actif: false, t: 0 },
      partis: false,
    };
  });

  // Éléments d'interface (présents dans index.html)
  const overlay = document.getElementById("combat");
  const conteneurMain = document.getElementById("combat-main");
  // Souris : quand le pointeur QUITTE la main, on RANGE la carte survolée (elle ne
  // reste plus agrandie en permanence). N'affecte pas un bouton sélectionné (End
  // Turn / Flee, hors de la main) ni un drag en cours. (Retiré dans fermer() :
  // conteneurMain est PERSISTANT — sinon un écouteur s'empilerait par combat.)
  function surSortieMain() {
    if (!drag && selection >= 0 && selection < combat.main.length) { selection = -1; majSelection(); }
  }
  conteneurMain.addEventListener("pointerleave", surSortieMain);
  const overlayPioche = document.getElementById("combat-pioche-anim");
  // CLIC (souris) pendant une animation de pioche/défausse : passe l'animation, comme
  // Espace au clavier. On écoute pointerdown (plus fiable que click, non « mangé » par
  // la gestion pointer du drag de cartes) et on déclenche le saut posé sur `onclick`.
  overlayPioche.addEventListener("pointerdown", (e) => { e.preventDefault(); overlayPioche.onclick?.(); });
  const boutonFin = document.getElementById("combat-fin");
  const boutonFuite = document.getElementById("combat-fuite");
  const panneauResultat = document.getElementById("combat-resultat");
  const texteResultat = document.getElementById("combat-resultat-texte");
  const elPermBuff = document.getElementById("combat-permanents");
  const boutonContinuer = document.getElementById("combat-continuer");
  // La jauge de Chaleur (barre HTML horizontale)
  const jauge = document.getElementById("combat-jauge");
  const jaugeBar = document.getElementById("combat-jauge-bar");
  const jaugeFill = document.getElementById("combat-jauge-fill");
  const jaugeSeuil = document.getElementById("combat-jauge-seuil");
  const jaugeValeur = document.getElementById("combat-jauge-valeur");
  const jaugeBrulure = document.getElementById("combat-jauge-brulure");
  const jaugeDivisions = document.getElementById("combat-jauge-divisions");
  const elPiocheNb = document.getElementById("combat-pioche-nb");
  const elDefausseNb = document.getElementById("combat-defausse-nb");
  jaugeSeuil.style.left = (combat.chaleurSeuil / combat.chaleurMax) * 100 + "%";
  // Divisions : un trait vertical par cran d'énergie (le nombre suit le max
  // courant ; un item qui monte le max ajoute des crans, sans changer la taille).
  jaugeDivisions.replaceChildren();
  for (let k = 1; k < combat.chaleurMax; k++) {
    const trait = document.createElement("div");
    trait.className = "combat-jauge-div";
    trait.style.left = (k / combat.chaleurMax) * 100 + "%";
    jaugeDivisions.append(trait);
  }

  // Valeurs « affichées » côté héros (glissent vers les vraies)
  const aff = { pvHeros: combat.pvHeros, pierre: 0, chaleur: combat.chaleur, initHeros: 0 };
  let animAttaque = 0;   // le nain pousse son arme vers l'avant
  let secousseHeros = 0;
  let temps = 0;         // horloge (animation de la flèche de cible)
  const flottants = [];  // nombres de dégâts qui montent et s'estompent
  const particules = []; // braises de mort (partagées, positionnées par ennemi)
  let delaiFin = -1, termine = false;
  let minuterie = 0;          // compte à rebours entre les pas de la timeline (ATB)
  let acteurCourant = null;   // qui agit en ce moment (pour la file des tours)

  // Ciblage clavier : carte « armée » en attente de cible.
  let phaseCiblage = false;
  let carteEnAttente = -1;

  // Menu pause ouvert (Échap) : fige les animations (mettreAJour) et neutralise le
  // clavier du combat. Piloté depuis principal.js via setPause() (voir le return).
  let enPause = false;

  function ajouterFlottant(texte, x, y, couleur) {
    flottants.push({ texte, x, y, couleur, t: 1 });
  }
  const jouerAnim = (u, nom) => { u.anim = { nom, t: 0 }; };

  // -- Ennemis : vivants, cible, animations -------------------------------
  function indicesVivants() {
    return combat.ennemis.map((_, i) => i).filter((i) => combat.ennemis[i].pv > 0);
  }
  // Si la cible est morte, on revient sur le premier ennemi vivant.
  function recalerCible() {
    if (combat.ennemis[combat.cible]?.pv > 0) return;
    const v = indicesVivants();
    if (v.length) combat.cible = v[0];
  }
  // Déplace la cible au prochain ennemi vivant (dir = -1 gauche, +1 droite).
  function cycleCible(dir) {
    const v = indicesVivants();
    if (v.length === 0) return;
    const pos = v.indexOf(combat.cible);
    combat.cible = v[(pos < 0 ? 0 : pos + dir + v.length) % v.length];
  }

  // Explosion de braises quand un ennemi meurt (positionnée à son sprite).
  function exploser(u) {
    u.mort.actif = true;
    u.mort.t = 0;
    jouerAnim(u, "ko");
    // Conversion centre du sprite : coords monde → coords écran (espace virtuel 640×360).
    const e = u.echelle;
    const wx = u.localX + u.spr.caseL / 2, wy = u.localY + u.spr.caseH * 0.5;
    const ox = PIVOT_SCENE.x + (wx - PIVOT_SCENE.x) * e;
    const oy = PIVOT_SCENE.y + (wy - PIVOT_SCENE.y) * e;
    particules.push({ type: "flash", x: ox, y: oy, vx: 0, vy: 0,
      taille: 12 * e, g: 180 * e, vie: 0.18, vieMax: 0.18 });
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (40 + Math.random() * 130) * e;
      particules.push({
        type: "braise",
        x: ox + (Math.random() - 0.5) * 40 * e, y: oy + (Math.random() - 0.5) * 50 * e,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50 * e,
        taille: (2 + Math.random() * 2) * e, g: 90 * e, vie: 0.5 + Math.random() * 0.6, vieMax: 1.1,
      });
    }
    for (let i = 0; i < 8; i++) {
      particules.push({
        type: "fumee",
        x: ox + (Math.random() - 0.5) * 30 * e, y: oy + (Math.random() - 0.5) * 40 * e,
        vx: (Math.random() - 0.5) * 24 * e, vy: (-22 - Math.random() * 28) * e,
        taille: (8 + Math.random() * 10) * e, g: 6 * e, gs: 14 * e,
        vie: 0.7 + Math.random() * 0.5, vieMax: 1.2,
      });
    }
  }

  // Petit nuage de POUSSIÈRE d'impact (au point de contact d'un coup). Réutilise
  // les particules « fumée » (grises). Sert à « claquer » le coup reçu.
  function poufImpact(cx, sol) {
    for (let i = 0; i < 7; i++) {
      particules.push({
        type: "fumee",
        x: cx + (Math.random() - 0.5) * 42, y: sol - 8 + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 80, vy: -18 - Math.random() * 26,
        taille: 4 + Math.random() * 6, g: 8, gs: 12,
        vie: 0.3 + Math.random() * 0.25, vieMax: 0.55,
      });
    }
  }

  // Programme l'écran de fin après un court délai (laisse jouer le poof / coup fatal)
  function verifierFin() {
    if (combat.fini && delaiFin < 0) {
      delaiFin = combat.resultat === "victoire" ? 0.7 : 0.45;
    }
  }

  // -- La jauge de Chaleur (barre HTML) -------------------------------------
  function majJauge() {
    const pct = Math.max(0, Math.min(1, aff.chaleur / combat.chaleurMax)) * 100;
    jaugeFill.style.width = pct + "%";
    jaugeBar.classList.toggle("surchauffe", combat.chaleur > combat.chaleurSeuil);
    jaugeValeur.textContent = combat.chaleur;
    const brulure = degatsSurchauffe(combat);
    jaugeBrulure.textContent = brulure > 0 ? `🔥 -${brulure}/turn` : "";
  }
  function pulserJauge() {
    jauge.classList.remove("brule");
    void jauge.offsetWidth;
    jauge.classList.add("brule");
  }

  // -- Main + sélection clavier ---------------------------------------------
  let selection = 0; // index dans [cartes…, bouton Fin du tour], ou -1 = rien
  let enAnimPioche = false; // bloque jouer/finDeTour + masque la surbrillance pendant l'animation de pioche
  let premiereMainCombat = true; // 1re main du combat : petite pause avant la pioche (ouverture moins abrupte)
  let carteJouee = false; // a-t-on joué une carte CE tour ? (si oui : fuite interdite, bouton grisé)

  function elementsNavigables() {
    return [...conteneurMain.children, boutonFin, boutonFuite];
  }
  function majSelection() {
    const els = elementsNavigables();
    if (selection >= els.length) selection = els.length - 1;
    // Pendant une animation de pioche : aucune carte surlignée, pour garder le
    // regard sur la pioche au centre (le deck est de toute façon verrouillé).
    // Pendant le CIBLAGE : pas de carte agrandie (.sel) non plus — on veut voir
    // les monstres. La carte armée est juste RANGÉE + surlignée (classe .armee).
    els.forEach((el, i) =>
      el.classList.toggle("sel", i === selection && !enAnimPioche && !phaseCiblage));
    [...conteneurMain.children].forEach((el, i) =>
      el.classList.toggle("armee", phaseCiblage && i === carteEnAttente));
  }
  function rafraichir() {
    conteneurMain.replaceChildren();
    combat.main.forEach((carte, i) => {
      const el = creerCarteDOM(carte, combat);
      el.addEventListener("pointerdown", (ev) => debutDrag(i, el, ev));
      // Survol souris : la surbrillance « clavier » saute sur cette carte.
      el.addEventListener("pointerenter", () => { if (!drag) { selection = i; majSelection(); } });
      conteneurMain.append(el);
    });
    disposerEventail();
    boutonFin.disabled = combat.fini || !combat.tourJoueur;
    // Fuite possible seulement si AUCUNE carte n'a été jouée ce tour (sinon grisé).
    boutonFuite.disabled = combat.fini || !combat.tourJoueur || carteJouee;
    elPiocheNb.textContent = combat.pioche.length;
    elDefausseNb.textContent = combat.defausse.length;
    majSelection();
    rendrePermanents();
  }

  // Affiche les bonus PERMANENTS (tout le combat) en haut à gauche de l'écran.
  // Chaque entrée est un bouton avec un tooltip au survol.
  function rendrePermanents() {
    elPermBuff.replaceChildren();
    // Bonus de SET actif (armure complète) : nom + effet en info-bulle. En haut à
    // gauche, avec les autres bonus permanents.
    for (const s of setsActifs(inventaire.slots)) {
      const el = document.createElement("div");
      el.className = "combat-perm-buff combat-perm-buff--set";
      el.textContent = `✦ ${s.nom}`;
      el.dataset.tooltip = s.bonus.texte;
      elPermBuff.append(el);
    }
    if (combat.forcePerm > 0) {
      const el = document.createElement("div");
      el.className = "combat-perm-buff";
      el.textContent = `💪 +${combat.forcePerm}`;
      el.dataset.tooltip = `Permanent Force: every hit deals +${combat.forcePerm} bonus damage for the whole combat.`;
      elPermBuff.append(el);
    }
    if (combat.pierreParTour > 0) {
      const el = document.createElement("div");
      el.className = "combat-perm-buff combat-perm-buff--armure";
      el.textContent = `🛡 +${combat.pierreParTour}`;
      el.dataset.tooltip = `Permanent armor: gain ${combat.pierreParTour} Stone at the start of every turn for the whole combat.`;
      elPermBuff.append(el);
    }
    if (combat.infinityGauntlet) {
      const el = document.createElement("div");
      el.className = "combat-perm-buff combat-perm-buff--infinity";
      el.textContent = "♾ Infinity Gauntlet";
      el.dataset.tooltip = "All 5 ring slots filled: +1 card/turn · +4 Force · +5 Agility";
      elPermBuff.append(el);
    }
    elPermBuff.hidden = elPermBuff.childElementCount === 0;
  }

  function disposerEventail() {
    const cartes = [...conteneurMain.children];
    resserrerMain(cartes);
    const milieu = (cartes.length - 1) / 2;
    cartes.forEach((el, i) => {
      const ecart = i - milieu;
      el.style.setProperty("--rot", (ecart * 4).toFixed(2) + "deg");
      el.style.setProperty("--dy", (ecart * ecart * 5).toFixed(1) + "px");
    });
  }

  // Resserre les cartes (chevauchement adaptatif) pour que la main, CENTRÉE, ne
  // déborde JAMAIS sur la jauge de Chaleur — quel que soit le nombre de cartes.
  function resserrerMain(cartes) {
    const n = cartes.length;
    if (n === 0) return;
    const carteL = cartes[0].offsetWidth || 150;
    const zone = conteneurMain.parentElement.getBoundingClientRect();
    const jaugeR = jauge.getBoundingClientRect();
    const centre = zone.left + zone.width / 2;
    // Demi-largeur max : le bord gauche de la main doit rester à droite de la jauge.
    const demiMax = Math.max(carteL / 2, centre - jaugeR.right - 20);
    let avance = carteL * 0.82; // pas par défaut (léger chevauchement)
    if (n > 1) {
      avance = Math.min(avance, (2 * demiMax - carteL) / (n - 1));
      avance = Math.max(avance, carteL * 0.2); // garde au moins le coin (le coût) visible
    }
    const margeH = (avance - carteL) / 2; // négatif = chevauchement
    for (const el of cartes) el.style.margin = `0 ${margeH.toFixed(1)}px`;
  }

  // Navigation clavier (phase capture + stopPropagation : pas de menu/déplacement).
  function surTouche(e) {
    // Menu pause ouvert : le combat laisse FILER le clavier (sans preventDefault ni
    // stopPropagation) → les touches vont au menu (sliders, Échap pour fermer).
    if (enPause) return;
    // Modale de confirmation ouverte (ex. « Fuir ? ») : on laisse FILER le clavier
    // vers elle — sinon la navigation gauche/droite déplacerait les cartes derrière.
    if (confirmationActive()) return;
    if (!["KeyA", "KeyD", "ArrowLeft", "ArrowRight", "Space", "Enter", "Escape", "KeyE", "KeyF"].includes(e.code)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!panneauResultat.hidden) {                 // écran de fin : Espace = Continue
      if (e.code === "Space" || e.code === "Enter") fermer();
      return;
    }

    // Échap : pendant le ciblage on ANNULE (retour à la main). Sinon, si on est SUR
    // UNE CARTE (tour du joueur), Échap la RANGE et pose le curseur sur « End Turn »
    // (sans l'activer) → on revoit toute la scène. Une 2e pression (curseur plus sur
    // une carte) ouvre le menu pause. Géré AVANT le verrou « tour du joueur » pour
    // qu'on puisse aussi mettre en pause pendant le tour ennemi (quand ça « gueule »).
    if (e.code === "Escape") {
      if (phaseCiblage) { phaseCiblage = false; majSelection(); return; }
      if (!combat.fini && combat.tourJoueur && !enAnimPioche &&
          selection >= 0 && selection < combat.main.length) {
        selection = combat.main.length; // index du bouton « End Turn » (juste surligné)
        majSelection();
        return;
      }
      surPause?.();
      return;
    }
    if (combat.fini || !combat.tourJoueur) return;

    // Pendant l'animation de pioche : Espace/Entrée PASSE l'animation, puis on ignore
    // les jeux pendant 0,5 s (évite de lancer une carte si Espace reste enfoncé).
    if (enAnimPioche) {
      if (e.code === "Space" || e.code === "Enter") {
        overlayPioche.onclick?.();               // passe l'animation en cours
        _blocageJusqu = performance.now() + 500; // 0,5 s sans jouer
      }
      return; // aucune autre action clavier pendant la pioche
    }

    // Phase CIBLAGE : on choisit l'ennemi visé par la carte armée.
    if (phaseCiblage) {
      if (e.code === "KeyA" || e.code === "ArrowLeft") cycleCible(-1);
      else if (e.code === "KeyD" || e.code === "ArrowRight") cycleCible(+1);
      else if (e.code === "Space" || e.code === "Enter") jouer(carteEnAttente, combat.cible);
      return;
    }

    // Phase MAIN : navigation de la main.
    const els = elementsNavigables();
    if (e.code === "KeyA" || e.code === "ArrowLeft") {
      selection = selection < 0 ? els.length - 1 : (selection - 1 + els.length) % els.length;
      majSelection();
    } else if (e.code === "KeyD" || e.code === "ArrowRight") {
      selection = selection < 0 ? 0 : (selection + 1) % els.length;
      majSelection();
    } else if (e.code === "Space" || e.code === "Enter") {
      if (selection < 0) return;
      if (selection < combat.main.length) tenterJouer(selection);
      else if (selection === combat.main.length) finDeTour();
      else tenterFuite();
    } else if (e.code === "KeyE") {
      finDeTour(); // raccourci direct : fin de tour sans naviguer jusqu'au bouton
    } else if (e.code === "KeyF") {
      tenterFuite(); // raccourci direct : tenter de fuir
    }
  }

  // -- Actions du joueur ----------------------------------------------------

  let _tsDerniereCarteJouee = 0; // anti-double-clic : 200 ms entre deux cartes
  let _blocageJusqu = 0;         // on ignore les jeux jusqu'à ce temps (anti-clic après skip de pioche)

  // Affiche chaque carte piochée en grand au centre pendant 800 ms.
  // `ajouterAMain` (optionnel) révèle les cartes une par une dans la main : chaque
  // carte ne rejoint la main qu'APRÈS son passage au centre (au moment où la
  // suivante s'affiche), pour un effet « la carte tombe dans la main ».
  // Cliquer l'overlay passe immédiatement à la fin.
  function animerPioche(cartes, callback, ajouterAMain = null) {
    if (!cartes || cartes.length === 0) { callback?.(); return; }
    enAnimPioche = true;
    let idx = 0, timer = 0, carteAuCentre = null;
    // La carte actuellement au centre rejoint la main (puis on l'oublie).
    function deposerAuCentre() {
      if (carteAuCentre && ajouterAMain) { ajouterAMain(carteAuCentre); rafraichir(); }
      carteAuCentre = null;
    }
    function suivante() {
      deposerAuCentre(); // la précédente tombe dans la main avant d'afficher la suivante
      if (idx >= cartes.length) {
        overlayPioche.onclick = null;
        overlayPioche.hidden = true;
        overlayPioche.innerHTML = "";
        enAnimPioche = false;
        majSelection(); // pioche finie : la surbrillance clavier réapparaît
        callback?.();
        return;
      }
      const carte = cartes[idx++];
      carteAuCentre = carte;
      overlayPioche.innerHTML = "";
      const el = document.createElement("div");
      el.className = "combat-carte";
      garnirCarte(el, carte);
      overlayPioche.appendChild(el);
      overlayPioche.hidden = false;
      jouerSonPioche();
      timer = setTimeout(suivante, 800);
    }
    overlayPioche.onclick = () => {
      clearTimeout(timer);
      deposerAuCentre(); // dépose la carte au centre, puis verse le reste d'un coup
      if (ajouterAMain) { while (idx < cartes.length) ajouterAMain(cartes[idx++]); rafraichir(); }
      else idx = cartes.length;
      overlayPioche.onclick = null;
      overlayPioche.hidden = true;
      overlayPioche.innerHTML = "";
      enAnimPioche = false;
      majSelection();
      callback?.();
    };
    suivante();
  }

  // Anime la DÉFAUSSE de cartes (Bare Hands) : chaque carte jetée s'affiche au centre,
  // puis glisse vers le bas en se ternissant (elle part à la pile de défausse). Rend
  // LISIBLE le « je jette une carte » avant la pioche qui suit. Même structure que
  // animerPioche : overlay central, clic pour accélérer, verrou `enAnimPioche`.
  function animerDefausse(cartes, callback) {
    if (!cartes || cartes.length === 0) { callback?.(); return; }
    enAnimPioche = true;
    let idx = 0, timer = 0;
    function suivante() {
      if (idx >= cartes.length) {
        overlayPioche.onclick = null;
        overlayPioche.hidden = true;
        overlayPioche.innerHTML = "";
        enAnimPioche = false;
        majSelection();
        callback?.();
        return;
      }
      const carte = cartes[idx++];
      overlayPioche.innerHTML = "";
      const el = document.createElement("div");
      el.className = "combat-carte combat-carte--defaussee";
      garnirCarte(el, carte);
      overlayPioche.appendChild(el);
      overlayPioche.hidden = false;
      jouerSonPioche();
      timer = setTimeout(suivante, 620);
    }
    overlayPioche.onclick = () => {
      clearTimeout(timer);
      idx = cartes.length;
      overlayPioche.onclick = null;
      overlayPioche.hidden = true;
      overlayPioche.innerHTML = "";
      enAnimPioche = false;
      majSelection();
      callback?.();
    };
    suivante();
  }

  // Anime Lucky Draw (pioche-filtre) : chaque carte apparaît au centre.
  // Retenues (garde=true) → glow vert + son de pioche, puis ajout à la main APRÈS
  //   le passage au centre (comme la pioche normale : la carte tombe dans la main).
  // Rejetées (garde=false) → animation de brûlure + son négatif (jamais dans la main).
  // `surGardee` = (carte) => void, appelé pour chaque carte retenue (ajoute à main + rafraichir).
  function animerPiocheFiltre(resultats, callback, surGardee) {
    if (!resultats || resultats.length === 0) { callback?.(); return; }
    enAnimPioche = true;
    let idx = 0, timer = 0, gardeeAuCentre = null;
    // La carte retenue affichée au centre rejoint la main (au passage à la suivante).
    function deposerGardee() {
      if (gardeeAuCentre && surGardee) surGardee(gardeeAuCentre);
      gardeeAuCentre = null;
    }
    function suivante() {
      deposerGardee(); // la retenue précédente tombe dans la main avant la suivante
      if (idx >= resultats.length) {
        overlayPioche.onclick = null;
        overlayPioche.hidden = true;
        overlayPioche.innerHTML = "";
        enAnimPioche = false;
        majSelection(); // pioche finie : la surbrillance clavier réapparaît
        callback?.();
        return;
      }
      const { carte, garde } = resultats[idx++];
      overlayPioche.innerHTML = "";
      const el = document.createElement("div");
      el.className = "combat-carte";
      garnirCarte(el, carte);
      overlayPioche.appendChild(el);
      overlayPioche.hidden = false;
      if (garde) {
        el.classList.add("combat-carte--filtre-ok");
        jouerSonPioche();
        gardeeAuCentre = carte; // rejoindra la main au passage à la suivante
        timer = setTimeout(suivante, 800);
      } else {
        // Court délai puis la carte brûle
        timer = setTimeout(() => {
          el.classList.add("combat-carte--brule");
          jouerSonNegatif();
          timer = setTimeout(suivante, 600);
        }, 350);
      }
    }
    overlayPioche.onclick = () => {
      clearTimeout(timer);
      deposerGardee(); // dépose la retenue au centre, puis verse le reste d'un coup
      while (idx < resultats.length) {
        const { carte: c, garde: g } = resultats[idx++];
        if (g) surGardee?.(c);
      }
      overlayPioche.onclick = null;
      overlayPioche.hidden = true;
      overlayPioche.innerHTML = "";
      enAnimPioche = false;
      majSelection();
      callback?.();
    };
    suivante();
  }

  // Anime le résultat d'un lancer de dés (effet chaleur-aleatoire).
  // Les chiffres défilent rapidement, puis ralentissent et s'arrêtent sur le résultat.
  // `mauvais` : le gain est inférieur au coût de la carte → son négatif joué APRÈS
  // que le résultat final s'affiche (pas au lancement, sinon on l'entend trop tôt).
  function animerDes({ min, max, gain, mauvais = false }) {
    enAnimPioche = true;
    const zone = overlay.querySelector(".combat-zone");
    const div = document.createElement("div");
    div.className = "combat-des-overlay";
    const emoji = document.createElement("div");
    emoji.className = "combat-des-emoji";
    emoji.textContent = "🎲";
    const num = document.createElement("div");
    num.className = "combat-des-num";
    div.append(emoji, num);
    zone.appendChild(div);
    let frame = 0;
    const FRAMES = 10;
    function roll() {
      frame++;
      if (frame < FRAMES) {
        num.textContent = min + Math.floor(Math.random() * (max - min + 1));
        setTimeout(roll, 40 + frame * 16); // commence vite, ralentit
      } else {
        num.textContent = gain;
        num.classList.add("combat-des-num--final");
        // Le dé s'arrête : MAINTENANT seulement on applique le gain (la jauge monte
        // ici, pas pendant le roulement) et on sonne l'échec éventuel.
        appliquerResultatAleatoire(combat);
        majJauge();
        rafraichir(); // l'énergie a changé → recolorer les coûts (rouge ↔ jouable)
        if (mauvais) jouerSonNegatif();
        setTimeout(() => {
          div.remove();
          enAnimPioche = false;
          // Floater montrant le gain de Chaleur obtenu.
          ajouterFlottant(`🔥+${gain}`, heroEcran.cx, heroEcran.sommet - 16, "#ffb454");
        }, 700);
      }
    }
    roll();
  }

  // Espace sur une carte : si plusieurs ennemis vivants ET carte ciblée (non-AOE)
  // → phase de ciblage. Sinon (1 ennemi, AOE, ou carte défensive) → joue directement.
  function tenterJouer(i) {
    const carte = combat.main[i];
    if (!carte || carte.cout > combat.chaleur) return; // injouable (coût en rouge)
    if (necessiteCiblage(carte, indicesVivants().length)) {
      phaseCiblage = true;
      carteEnAttente = i;
      recalerCible();
      majSelection(); // range la carte armée dans la main + la surligne (.armee)
    } else {
      jouer(i);
    }
  }

  // Joue la carte `i` sur l'ennemi `cible` (par défaut : la cible courante).
  // Pour les cartes AOE, `cible` est ignoré : tous les ennemis vivants sont touchés.
  function jouer(i, cible = combat.cible) {
    const maintenant = performance.now();
    if (maintenant - _tsDerniereCarteJouee < 200) return; // anti-double-clic
    if (maintenant < _blocageJusqu) return;   // 0,5 s sans jouer après un skip de pioche
    if (enAnimPioche) return; // bloque pendant l'anim de pioche
    _tsDerniereCarteJouee = maintenant;
    const carte = combat.main[i];
    if (!carte) return;
    const elJouee = conteneurMain.children[i] || null; // carte à animer
    // Snapshot AVANT jouerCarte (pour calculer les deltas d'animation).
    const nbAvant = combat.main.length; // pour détecter les cartes piochées en cours de tour
    const pvAvants     = combat.ennemis.map((e) => e.pv);
    const stunAvants   = combat.ennemis.map((e) => e.stun);
    const gelAvants    = combat.ennemis.map((e) => e.gel);
    const confusAvants = combat.ennemis.map((e) => e.confusion);
    const feuAvants    = combat.ennemis.map((e) => e.feu);
    const poisonAvants = combat.ennemis.map((e) => e.poison);
    const sangAvants   = combat.ennemis.map((e) => e.sang);
    const pierreAvant = combat.pierre;
    const hateAvant = combat.hate;
    const pvHerosAvant = combat.pvHeros;
    // Réinitialiser les compteurs d'overkill/over-heal/chaîne avant la résolution.
    combat.ennemis.forEach(e => { e.dernierDegats = 0; e.hitLog = []; });
    combat.dernierSoinCarte = 0;
    combat.dernierGainAleatoire = null;
    combat.dernierEchangeMain = null; // Bare Hands : échanges main à animer
    if (!jouerCarte(combat, i, cible)) return; // pas assez de Chaleur, etc.
    carteJouee = true; // une carte a été jouée → on ne pourra plus fuir ce tour
    if (maitrise) incrementerMaitrise(maitrise, heros, carte.id);

    // Cartes PIOCHÉES par la carte jouée (effet « piocher ») : on les retire de la
    // main IMMÉDIATEMENT (synchrone) et on verrouille l'agrandissement. Sinon,
    // pendant le délai carte→effet, une de ces cartes s'affichait en grand dans la
    // main (~0,5 s) avant sa vraie révélation au centre. On les révélera plus bas.
    // (Les autres formes de pioche — dés, Lucky Draw, échange — gèrent leur cas.)
    let piocheDifferee = null;
    if (!combat.dernierGainAleatoire && !combat.dernieresPiochesFiltre && !combat.dernierEchangeMain) {
      const drawn = combat.main.length - nbAvant + 1;
      if (drawn > 0) {
        piocheDifferee = combat.main.splice(combat.main.length - drawn, drawn);
        enAnimPioche = true; // plus aucune carte de main agrandie pendant l'attente
      }
    }

    if (elJouee) animerCarteJouee(elJouee); // la carte sort, grandit, puis disparaît

    // Input réactivé TOUT DE SUITE (ciblage, main) ; la résolution VISUELLE des
    // effets, elle, est différée de DELAI_CARTE (le temps que la carte s'écarte).
    phaseCiblage = false;
    recalerCible();
    // Après avoir joué (clavier OU souris), on ne relève AUCUNE carte par défaut :
    // l'écran reste lisible pendant l'action. Une carte ne se relève qu'à une action
    // explicite du joueur — flèche clavier (surTouche) ou survol souris de la main
    // (pointerenter, ligne ~373). Même principe qu'après « Fin du tour ».
    selection = -1;
    rafraichir();

    setTimeout(() => {
    // Animer TOUS les ennemis touchés (fonctionne pour 1 cible ET pour AOE).
    // `sonJoue` : on ne joue qu'un son par carte (priorité : dégâts > pierre > buff).
    let quelquUnTouche = false;
    let sonJoue = false;

    // --- Effets non-dégâts (synchrones) : statuts, feu/poison/sang --------
    for (let idx = 0; idx < ennemisUI.length; idx++) {
      const u = ennemisUI[idx];
      const e = combat.ennemis[idx];
      if (!u || !e) continue;
      if (e.stun > stunAvants[idx]) {
        u.secousse = Math.max(u.secousse, 0.3);
        ajouterFlottant(`💫 ${e.stun}`, u.ecran.cx, u.ecran.sommet - 16, "#ffd966");
        if (!sonJoue) { jouerSonSortilege(); sonJoue = true; }
      }
      if (e.gel > gelAvants[idx]) {
        u.secousse = Math.max(u.secousse, 0.3);
        ajouterFlottant(`❄ ${e.gel}`, u.ecran.cx, u.ecran.sommet - 32, "#9fdfff");
        if (!sonJoue) { jouerSonSortilege(); sonJoue = true; }
      }
      if (e.confusion > confusAvants[idx]) {
        u.secousse = Math.max(u.secousse, 0.3);
        ajouterFlottant(`✨ ${e.confusion}`, u.ecran.cx, u.ecran.sommet - 48, "#ffe9a8");
        if (!sonJoue) { jouerSonSortilege(); sonJoue = true; }
      }
      if (!sonJoue && (e.feu > feuAvants[idx] || e.poison > poisonAvants[idx] || e.sang > sangAvants[idx])) {
        jouerSonSortilege(); sonJoue = true;
      }
    }

    // --- Dégâts : staggerés si plusieurs coups (non-AOE), sinon immédiats --
    // Cartes comme Double Strike, Rusty Cleave, Frost Cascade → délai de 120 ms
    // entre chaque coup pour lire ce qui se passe.
    const totalHits = combat.ennemis.reduce((s, e) => s + (e.hitLog?.length || 0), 0);
    const useStagger = !carte.aoe && totalHits > 1;
    if (useStagger) {
      let delay = 0;
      let firstHit = true;
      for (let idx = 0; idx < ennemisUI.length; idx++) {
        const u = ennemisUI[idx];
        const e = combat.ennemis[idx];
        if (!u || !e || !e.hitLog?.length) continue;
        for (let h = 0; h < e.hitLog.length; h++) {
          const hitVal = e.hitLog[h];
          const isLastHitForEnemy = h === e.hitLog.length - 1;
          const isFirstHit = firstHit; firstHit = false;
          const d = delay;
          setTimeout(() => {
            if (isFirstHit) animAttaque = 0.25;
            jouerSonCoup();
            u.secousse = 0.3;
            ajouterFlottant(`-${hitVal}`, u.ecran.cx, u.ecran.sommet, "#ffe27a");
            if (isLastHitForEnemy) { if (e.pv <= 0) exploser(u); else jouerAnim(u, "touche"); }
            else jouerAnim(u, "touche");
          }, d);
          delay += 120 * lenteur; // dégâts multiples plus espacés (lisibilité)
        }
      }
      if (totalHits > 0) { quelquUnTouche = true; sonJoue = true; } // pour la logique pierre/hâte
    } else {
      for (let idx = 0; idx < ennemisUI.length; idx++) {
        const u = ennemisUI[idx];
        const e = combat.ennemis[idx];
        if (!u || !e) continue;
        // Affiche les VRAIS dégâts infligés (overkill inclus), pas juste la perte de PV.
        const dmgAffiche = Math.max(pvAvants[idx] - e.pv, e.dernierDegats || 0);
        if (dmgAffiche > 0) {
          if (!quelquUnTouche) { animAttaque = 0.25; quelquUnTouche = true; jouerSonCoup(); sonJoue = true; }
          u.secousse = 0.3;
          if (e.pv <= 0) exploser(u);
          else jouerAnim(u, "touche");
          ajouterFlottant(`-${dmgAffiche}`, u.ecran.cx, u.ecran.sommet, "#ffe27a");
        }
      }
    }
    if (combat.pierre > pierreAvant) {
      ajouterFlottant(`+${combat.pierre - pierreAvant}`, heroEcran.cx, heroEcran.sommet, "#9cd3ff");
      if (!sonJoue) { jouerSonPierre(); sonJoue = true; }
    }
    if (combat.hate > hateAvant) {
      ajouterFlottant(`⚡ ${combat.hate}`, heroEcran.cx, heroEcran.sommet, "#dff4ff");
      if (!sonJoue) jouerSonSortilege();
    }
    // Soin : afficher le soin brut (over-heal inclus) s'il vient d'une carte.
    if (combat.dernierSoinCarte > 0) {
      ajouterFlottant(`💚+${combat.dernierSoinCarte}`, heroEcran.cx, heroEcran.sommet - 16, "#7edf82");
    } else if (combat.pvHeros > pvHerosAvant) { // soin induit (ex. set Sang vampirique via regen)
      ajouterFlottant(`💚+${combat.pvHeros - pvHerosAvant}`, heroEcran.cx, heroEcran.sommet - 16, "#7edf82");
    }
    // (Pas de rafraichir() ici : la main a déjà été re-rendue juste après le jeu de
    // la carte. Un 2e rafraichir recréerait le DOM → la carte survolée « resauterait ».)
    verifierFin();
    if (!combat.fini) {
      // Lancer de dés (chaleur-aleatoire) : animation qui roule avant de s'arrêter sur le résultat.
      // Le son négatif éventuel est joué PAR animerDes, à la révélation du résultat.
      if (combat.dernierGainAleatoire) {
        animerDes(combat.dernierGainAleatoire);
      } else if (combat.dernieresPiochesFiltre) {
        // Lucky Draw : on retire temporairement les cartes retenues pour les révéler une à une.
        const resultats = combat.dernieresPiochesFiltre;
        combat.dernieresPiochesFiltre = null;
        for (const { carte, garde } of resultats) {
          if (garde) {
            const i = combat.main.indexOf(carte);
            if (i >= 0) combat.main.splice(i, 1);
          }
        }
        rafraichir(); // main sans les cartes Lucky Draw (elles arrivent une à une)
        animerPiocheFiltre(resultats, null, (c) => { combat.main.push(c); rafraichir(); });
      } else if (combat.dernierEchangeMain) {
        // Défausse + pioche d'une même carte (Bare Hands, Forge from Ashes…). On
        // retire les cartes piochées de la main, on montre d'abord la/les carte(s)
        // JETÉE(s) partir, PUIS la/les nouvelle(s) arriver — défausse AVANT pioche.
        const { defaussees, piochees } = combat.dernierEchangeMain;
        combat.dernierEchangeMain = null;
        for (const c of piochees) {
          const k = combat.main.indexOf(c);
          if (k >= 0) combat.main.splice(k, 1);
        }
        rafraichir(); // la main n'affiche pas encore les cartes piochées
        animerDefausse(defaussees, () =>
          animerPioche(piochees, null, (c) => combat.main.push(c))
        );
      } else if (piocheDifferee) {
        // Cartes piochées EN COURS DE TOUR, déjà retirées de la main plus haut (dès
        // le jeu de la carte). Petite PAUSE (~0,3 s) — piocher instantané est trop
        // sec — puis on les révèle EN GRAND une à une, comme la pioche de début de
        // tour. Le verrou enAnimPioche est déjà posé (aucune carte agrandie entre-temps).
        setTimeout(() => animerPioche(piocheDifferee, null, (c) => combat.main.push(c)), 300);
      }
    }
    }, DELAI_CARTE); // fin de la résolution visuelle différée (délai « carte → effet »)
  }

  // -- Ciblage SOURIS : on saisit une carte et on tire une flèche vers un monstre.
  let drag = null; // { i, el, vise, depart{x,y}, x, y (scène), cibleSurvol }

  // Convertit un point ÉCRAN (clientX/Y) en coords de la SCÈNE (640×360).
  function pointerVersScene(clientX, clientY) {
    const r = ctx.canvas.getBoundingClientRect();
    const bx = (clientX - r.left) * (ctx.canvas.width / r.width);
    const by = (clientY - r.top) * (ctx.canvas.height / r.height);
    const s = Math.min(ctx.canvas.width / 640, ctx.canvas.height / 360);
    const offX = (ctx.canvas.width - 640 * s) / 2;
    const offY = (ctx.canvas.height - 360 * s) / 2;
    return { x: (bx - offX) / s, y: (by - offY) / s };
  }
  function elementVersScene(el) {
    const r = el.getBoundingClientRect();
    return pointerVersScene(r.left + r.width / 2, r.top); // haut-centre de la carte
  }
  // Quel ennemi vivant est sous ce point (coords scène) ? -1 sinon.
  function ennemiSousPoint(sx, sy) {
    for (let i = 0; i < ennemisUI.length; i++) {
      const u = ennemisUI[i];
      if (u.e.pv <= 0 || u.partis) continue;
      const dl = (u.spr.caseL * u.echelle) / 2 + 8;
      if (Math.abs(sx - u.ecran.cx) <= dl && sy >= u.ecran.haut - 12 && sy <= u.ecran.sol + 12) return i;
    }
    return -1;
  }

  function debutDrag(i, el, ev) {
    if (combat.fini || !combat.tourJoueur || phaseCiblage) return;
    const carte = combat.main[i];
    if (!carte || carte.cout > combat.chaleur) return; // injouable
    ev.preventDefault();
    const p = pointerVersScene(ev.clientX, ev.clientY);
    drag = {
      i, el,
      // Flèche de ciblage UNIQUEMENT si la carte est offensive, non-AOE, et que
      // plusieurs ennemis sont en vie (sinon un simple clic suffit).
      vise: necessiteCiblage(carte, indicesVivants().length),
      depart: elementVersScene(el),
      x: p.x, y: p.y,
      cibleSurvol: -1,
    };
    if (drag.vise) {
      drag.cibleSurvol = ennemiSousPoint(p.x, p.y);
      ctx.canvas.style.cursor = "none"; // le réticule rouge dessiné REMPLACE le curseur
      el.classList.add("armee");        // la carte se RANGE (bas + surlignée) le temps du ciblage
    }
    window.addEventListener("pointermove", surDragMove);
    window.addEventListener("pointerup", surDragUp);
  }
  function surDragMove(ev) {
    if (!drag) return;
    const p = pointerVersScene(ev.clientX, ev.clientY);
    drag.x = p.x; drag.y = p.y;
    if (drag.vise) drag.cibleSurvol = ennemiSousPoint(p.x, p.y);
  }
  function surDragUp(ev) {
    window.removeEventListener("pointermove", surDragMove);
    window.removeEventListener("pointerup", surDragUp);
    ctx.canvas.style.cursor = ""; // fin du drag → on rend le vrai curseur
    const d = drag; drag = null;
    if (!d) return;
    d.el.classList.remove("armee"); // la carte revient en main (jouée ou annulée)
    if (d.vise) {
      if (d.cibleSurvol >= 0) jouer(d.i, d.cibleSurvol); // lâché SUR un ennemi → joue
      // lâché ailleurs → annulé (la carte reste en main)
    } else {
      // Carte sans cible (défense) : jouée par un clic dessus OU en la tirant
      // vers le haut (lâcher au niveau de la carte ou plus haut). Vers le bas = annulé.
      const r = d.el.getBoundingClientRect();
      if (ev.clientY <= r.bottom) jouer(d.i);
    }
  }

  // Boucle de combat ATB : l'initiative (jauges de vitesse) désigne QUI agit.
  // Héros désigné → on attend qu'il joue (End Turn) ; ennemi désigné → il agit,
  // puis on enchaîne après une courte pause (lisibilité).
  const PAS_AVANT = 0.7 * lenteur;   // pause après End Turn AVANT le 1er ennemi (respire un peu)
  const PAS_ENNEMI = 0.55 * lenteur; // pause après CHAQUE action ennemie (× lenteur)
  const PAUSE_AVANT_PIOCHE = 500;    // pause (ms) après la fin des attaques ennemies AVANT la pioche du héros

  function finDeTour() {
    if (phaseCiblage || combat.fini || !combat.tourJoueur) return;
    if (enAnimPioche) return;
    const feuAvants = combat.ennemis.map((e) => e.feu);
    finirTourHeros(combat); // défausse la main + propage le Feu → l'initiative reprend
    // Propagation du Feu (fin de tour) : un floater 🔥 sur chaque voisin qui en reçoit.
    let propage = false;
    combat.ennemis.forEach((e, idx) => {
      const u = ennemisUI[idx];
      if (!u || !e || e.pv <= 0) return;
      const gain = e.feu - feuAvants[idx];
      if (gain > 0) {
        u.secousse = 0.3;
        ajouterFlottant(`🔥+${gain}`, u.ecran.cx, u.ecran.sommet - 16, "#ff8a2c");
        propage = true;
      }
    });
    if (propage) jouerSonSortilege();
    minuterie = PAS_AVANT;
    rafraichir();           // main vide, boutons grisés
  }

  // Tenter de FUIR. Confirmation d'abord (action sans retour : aucune récompense).
  // À la validation : 1 chance sur 5 d'ÉCHOUER → message « raté » + on passe juste
  // le tour (comme End Turn). Sinon la fuite réussit → fin du combat sans butin.
  function tenterFuite() {
    if (phaseCiblage || combat.fini || !combat.tourJoueur || enAnimPioche) return;
    if (carteJouee) return; // déjà joué une carte ce tour → fuite interdite (raccourci clavier)
    if (confirmationActive()) return;
    // Plus il y a de monstres VIVANTS, plus la fuite est dure (chance de réussite).
    const nMobs = combat.ennemis.filter(ennemiVivant).length;
    const CHANCE_FUITE = { 1: 1 / 2, 2: 1 / 3, 3: 1 / 4, 4: 1 / 4, 5: 1 / 5 };
    const reussite = CHANCE_FUITE[nMobs] ?? 1 / 5;
    demanderConfirmation(
      {
        titre: "Flee the battle?",
        message: `You'll leave with NO rewards. Escape chance: ${Math.round(reussite * 100)}% (more enemies = lower) — otherwise you just lose your turn.`,
        texteOui: "Flee",
        texteNon: "Stay",
        danger: true,
      },
      () => {
        if (combat.fini || !combat.tourJoueur) return; // l'état a pu changer entre-temps
        if (Math.random() < reussite) {
          // Réussite : fin du combat sans vainqueur. Côté principal.js, surFin("fuite")
          // restaure l'exploration SANS butin et rafraîchit la grâce.
          fuirCombat(combat);
          jouerSonPioche();
          verifierFin(); // amorce le délai → la boucle ferme le combat (comme une victoire)
        } else {
          // Échec : on signale et on passe le tour comme un End Turn.
          ajouterFlottant("✗ Escape failed!", heroEcran.cx, heroEcran.sommet - 24, "#ff6a58");
          jouerSonNegatif();
          finDeTour();
        }
      },
    );
  }

  // Un pas de la timeline : désigne le prochain acteur et le fait agir.
  function traiterProchain() {
    if (combat.fini) { verifierFin(); return; }
    const acteur = avancerInitiative(combat);
    acteurCourant = acteur; // pour la file des tours (1re case = acteur courant)
    if (acteur.id === "heros") {
      const nbAvantTour = combat.main.length; // snapshot avant la pioche (= 0 normalement)
      carteJouee = false;         // nouveau tour du héros → la fuite redevient possible
      selection = -1;             // nouveau tour : AUCUNE carte levée par défaut
                                  // (sinon une carte reste en surbrillance même souris ailleurs)
      commencerTourHeros(combat); // recharge Chaleur + statuts du héros + pioche
      if (combat.tourSaute) {     // glace brisée : le héros est gelé solide, il saute son tour
        animerGelExplosionHeros();
        minuterie = PAS_ENNEMI;   // courte pause, puis l'initiative reprend
        rafraichir();
        if (combat.fini) verifierFin();
        return;
      }
      animerDebutTourHeros();
      recalerCible();
      // Extraire les nouvelles cartes pour les révéler une à une dans la main pendant
      // l'animation (avant rafraichir, la main ne les contient pas encore).
      const cartesAReveler = combat.main.splice(nbAvantTour);
      rafraichir();               // main partielle/vide, input réactivé
      if (combat.fini) { verifierFin(); return; } // mort de surchauffe/poison au début du tour
      // Montre les cartes piochées en grand au centre (800 ms chacune) et les ajoute
      // une à une dans la main au fur et à mesure de l'animation.
      const lancerPioche = () => animerPioche(cartesAReveler, null, (c) => combat.main.push(c));
      if (premiereMainCombat) {
        // Tout 1er tour : on patiente 1 s (scène figée, main vide) avant de lancer la
        // pioche — l'ouverture du combat est moins brutale qu'un jaillissement instantané.
        premiereMainCombat = false;
        enAnimPioche = true; // verrouille la main pendant l'attente
        setTimeout(lancerPioche, 1000);
      } else {
        // Pause AVANT la pioche : laisse respirer entre la fin des attaques des
        // monstres et l'arrivée de la nouvelle main (+0,5 s, cf. PAUSE_AVANT_PIOCHE).
        enAnimPioche = true; // verrouille la main pendant l'attente
        setTimeout(lancerPioche, PAUSE_AVANT_PIOCHE);
      }
    } else {
      const pierreAvantTour = combat.pierre;
      animerEnnemi(acteur.i, agirEnnemi(combat, acteur.i), pierreAvantTour);
      minuterie = PAS_ENNEMI;
      if (combat.fini) { rafraichir(); verifierFin(); }
    }
  }

  // Statuts du héros au début de SON tour (surchauffe / poison / feu).
  function animerDebutTourHeros() {
    if (combat.derniereBrulure > 0) { secousseHeros = 0.3; pulserJauge(); }
    if (combat.dernierPoisonHeros > 0) { secousseHeros = 0.3; ajouterFlottant(`☠${combat.dernierPoisonHeros}`, heroEcran.cx, heroEcran.sommet - 32, "#7ec850"); }
    if (combat.dernierFeuHeros > 0) { secousseHeros = 0.3; ajouterFlottant(`🔥${combat.dernierFeuHeros}`, heroEcran.cx, heroEcran.sommet - 48, "#ff8a2c"); }
    if (combat.dernierSoin > 0) ajouterFlottant(`❤+${combat.dernierSoin}`, heroEcran.cx, heroEcran.sommet - 16, "#7edf82"); // régénération
    if (combat.dernierGainPierrePerm > 0) ajouterFlottant(`🛡+${combat.dernierGainPierrePerm}`, heroEcran.cx, heroEcran.sommet - 64, "#ffd24a"); // pierre permanente par tour (armures lourdes)
  }

  // Glace brisée sur le HÉROS : il a atteint 5 stacks de Gel → dégâts + tour sauté.
  function animerGelExplosionHeros() {
    secousseHeros = 0.4;
    ajouterFlottant(`❄💥 -${combat.gelExplosionHeros}`, heroEcran.cx, heroEcran.sommet - 48, "#9fdfff");
    jouerSonCoup();
  }

  // Anime l'action d'UN ennemi (statuts, mort, ou attaque/sort). Étourdi → rien.
  // `pierreAvantTour` : valeur de Pierre du héros avant l'action (pour choisir son métallique).
  function animerEnnemi(i, evt, pierreAvantTour = 0) {
    const u = ennemisUI[i];
    if (!u) return;
    if (evt.poison > 0) { u.secousse = 0.3; ajouterFlottant(`☠${evt.poison}`, u.ecran.cx, u.ecran.sommet, "#7ec850"); }
    if (evt.feu > 0) { u.secousse = 0.3; ajouterFlottant(`🔥${evt.feu}`, u.ecran.cx, u.ecran.sommet - 16, "#ff8a2c"); }
    if (evt.sang > 0) { u.secousse = 0.3; ajouterFlottant(`🩸${evt.sang}`, u.ecran.cx, u.ecran.sommet - 32, "#e05a5a"); }
    // Glace brisée : 5 stacks de Gel atteints → l'ennemi se brise (dégâts + tour sauté).
    if (evt.gelExplosion > 0) {
      u.secousse = 0.4;
      ajouterFlottant(`❄💥 -${evt.gelExplosion}`, u.ecran.cx, u.ecran.sommet - 48, "#9fdfff");
      jouerSonCoup();
    }
    if (evt.soin > 0) ajouterFlottant(`+${evt.soin}`, heroEcran.cx, heroEcran.sommet - 16, "#86e08a");
    if (evt.mortStatut) { if (!u.mort.actif && !u.partis) exploser(u); return; }
    if (evt.attaque > 0 || evt.armureAbsorbe > 0) { // il frappe : PV perdus OU armure entamée
      jouerAnim(u, "attaque");
      // SYNCHRO : tout l'IMPACT (poussière, secousse + flash blanc du héros, chiffre
      // de dégât, son, rétorsions) est retardé jusqu'au CONTACT — le pic du bond
      // (p≈0.56 de l'anim d'attaque, cf. dessinerEnnemiStatique) — pour qu'il tombe
      // pile quand le monstre touche vraiment le héros, et non pendant sa phase
      // d'armement (où il RECULE encore). Le délai suit la vitesse du monstre.
      const delaiImpact = DUREE_ATTAQUE_PROC * 0.56 * (u.vitAnim ?? 1) * 1000; // ms
      setTimeout(() => {
        poufImpact(heroEcran.cx, heroEcran.sol);
        secousseHeros = 0.3;
        // PV perdus → chiffre rouge ; coup entièrement encaissé par la Pierre → chiffre bleu.
        if (evt.attaque > 0) ajouterFlottant(`-${evt.attaque}`, heroEcran.cx, heroEcran.sommet, "#ff7a7a");
        else ajouterFlottant(`-${evt.armureAbsorbe}`, heroEcran.cx, heroEcran.sommet, "#9cd3ff");
        if (pierreAvantTour > 0) jouerSonCoupArmure(); else jouerSonCoup();
        // Set Onyx : l'attaquant prend du feu de rétorsion → chiffre sur LUI.
        if (evt.brulureRetour > 0) ajouterFlottant(`🔥${evt.brulureRetour}`, u.ecran.cx, u.ecran.sommet - 16, "#ff8a2c");
        // Set Croisé : l'attaquant est ébloui (confusion) → étoiles sur LUI.
        if (evt.confusionRetour > 0) ajouterFlottant(`✨${evt.confusionRetour}`, u.ecran.cx, u.ecran.sommet - 32, "#ffe9a8");
      }, delaiImpact);
    }
    if (evt.attaqueAllie > 0) { // Confusion : il frappe un allié (ou lui-même) au lieu du héros
      jouerAnim(u, "attaque");
      const victime = ennemisUI[evt.idxAttaqueAllie];
      if (victime) {
        victime.secousse = Math.max(victime.secousse, 0.3);
        if (combat.ennemis[evt.idxAttaqueAllie]?.pv <= 0) exploser(victime);
        else jouerAnim(victime, "touche");
        ajouterFlottant(`-${evt.attaqueAllie}`, victime.ecran.cx, victime.ecran.sommet, "#ff7a7a");
        ajouterFlottant(`✨`, u.ecran.cx, u.ecran.sommet - 16, "#ffe9a8"); // signale la frappe confuse
      }
      jouerSonCoup();
    }
    if (evt.soin_allie > 0) { // le chaman soigne un allié
      jouerAnim(u, "attaque");
      const cible = ennemisUI[evt.idx_soin];
      const cx = cible ? cible.ecran.cx : u.ecran.cx;
      const cy = cible ? cible.ecran.sommet : u.ecran.sommet;
      ajouterFlottant(`💚+${evt.soin_allie}`, cx, cy, "#7edf82");
      jouerSonSortilege();
    }
    if (evt.soin_heros > 0) { // soin CONFUS qui atterrit sur le HÉROS (erreur du caster)
      jouerAnim(u, "attaque");
      ajouterFlottant(`💚+${evt.soin_heros}`, heroEcran.cx, heroEcran.sommet - 16, "#7edf82");
      jouerSonSortilege();
    }
    if (evt.haste_allie > 0) { // le chaman accélère ses alliés
      jouerAnim(u, "attaque");
      ajouterFlottant(`⚡×${evt.haste_allie}`, u.ecran.cx, u.ecran.sommet, "#dff4ff");
      jouerSonSortilege();
    }
    // evt.stun → on n'affiche AUCUNE animation
    // Filet de sécurité : si l'ennemi est MORT au cours de sa propre action sans que
    // son explosion ait déjà été déclenchée (cas des dégâts de rétorsion d'un passif
    // comme le Warding Shield / Épines, qui ne posent pas evt.mortStatut), on l'anime
    // ici. Les dégâts qu'il a infligés au héros ont déjà été affichés au-dessus.
    // Sans ça, l'ennemi restait figé à l'écran alors qu'il était bel et bien mort.
    if (u.e.pv <= 0 && !u.mort.actif && !u.partis) exploser(u);
  }

  function terminer() {
    texteResultat.textContent = combat.resultat === "victoire" ? "Victory!" : "Defeat";
    panneauResultat.hidden = false;
  }

  function fermer() {
    fondCombat.hidden = true;
    overlay.hidden = true;
    panneauResultat.hidden = true;
    boutonFin.removeEventListener("click", finDeTour);
    boutonFuite.removeEventListener("click", tenterFuite);
    boutonContinuer.removeEventListener("click", fermer);
    window.removeEventListener("keydown", surTouche, true);
    window.removeEventListener("pointermove", surDragMove); // au cas où un drag traîne
    window.removeEventListener("pointerup", surDragUp);
    conteneurMain.removeEventListener("pointerleave", surSortieMain);
    ctx.canvas.style.cursor = ""; // au cas où on ferme pendant un ciblage souris
    heros.pv = combat.pvHeros; // la vie persiste vers la carte
    surFin(combat.resultat);
  }

  boutonFin.addEventListener("click", finDeTour);
  boutonFin.addEventListener("pointerenter", () => {
    if (!drag) { selection = elementsNavigables().length - 2; majSelection(); } // avant-dernier = End Turn
  });
  boutonFuite.addEventListener("click", tenterFuite);
  boutonFuite.addEventListener("pointerenter", () => {
    if (!drag) { selection = elementsNavigables().length - 1; majSelection(); } // dernier = Flee
  });
  boutonContinuer.addEventListener("click", fermer);
  window.addEventListener("keydown", surTouche, true);
  panneauResultat.hidden = true;
  overlay.hidden = false;
  traiterProchain(); // l'initiative désigne le 1er acteur (le héros au départ) → 1re main
  rafraichir();
  majJauge();

  // -- Boucle : animations + dessin ----------------------------------------
  function mettreAJour(dt) {
    // Pendant une animation de pioche : on neutralise l'agrandissement au SURVOL
    // (le clavier est déjà masqué via majSelection) → plus de « flash » de carte
    // survolée juste avant que la pioche prenne le relais.
    conteneurMain.classList.toggle("anim-pioche", enAnimPioche);
    if (enPause) return; // menu pause ouvert : tout est figé (initiative, anims…)
    aff.pvHeros += (combat.pvHeros - aff.pvHeros) * Math.min(1, dt * 8);
    aff.pierre += (combat.pierre - aff.pierre) * Math.min(1, dt * 10);
    aff.chaleur += (combat.chaleur - aff.chaleur) * Math.min(1, dt * 9);
    aff.initHeros += (ratioInitiativeHeros(combat) - aff.initHeros) * Math.min(1, dt * 6);
    majJauge();
    temps += dt;

    for (const u of ennemisUI) {
      u.affPv += (u.e.pv - u.affPv) * Math.min(1, dt * 8);
      u.affInit += (ratioInitiativeEnnemi(u.e) - u.affInit) * Math.min(1, dt * 6);
      u.anim.t += dt;
      if (u.spr.statique) {
        // Monstre « image fixe + effets » : pas de frames, on borne juste la
        // DURÉE de l'action procédurale (cf. dessinerEnnemiStatique). Les durées
        // sont modulées par la vitesse du monstre (rapide = anim plus courte).
        const base = { attaque: DUREE_ATTAQUE_PROC, touche: DUREE_TOUCHE_PROC }[u.anim.nom];
        if (base && u.anim.t >= base * u.vitAnim) u.anim = { nom: "idle", t: 0 };
      } else {
        const def = u.spr.anims[u.anim.nom] ?? u.spr.anims.idle;
        if (!def.boucle && u.anim.t * def.ips >= def.frames.length &&
            (u.anim.nom === "touche" || u.anim.nom === "attaque")) {
          u.anim = { nom: "idle", t: 0 };
        }
      }
      u.secousse = Math.max(0, u.secousse - dt);
      if (u.mort.actif) { u.mort.t += dt; if (u.mort.t > 0.35) u.partis = true; }
    }

    animAttaque = Math.max(0, animAttaque - dt);
    secousseHeros = Math.max(0, secousseHeros - dt);
    for (const f of flottants) f.t -= dt * 0.9;
    for (let i = flottants.length - 1; i >= 0; i--) {
      if (flottants[i].t <= 0) flottants.splice(i, 1);
    }

    for (const p of particules) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === "braise") { p.vy += (p.g ?? 36) * dt; p.vx *= 0.96; }
      else if (p.type === "fumee") { p.vy -= (p.g ?? 2.4) * dt; p.taille += (p.gs ?? 5.6) * dt; }
      else if (p.type === "flash") { p.taille += (p.g ?? 72) * dt; }
      p.vie -= dt;
    }
    for (let i = particules.length - 1; i >= 0; i--) {
      if (particules[i].vie <= 0) particules.splice(i, 1);
    }

    // Timeline ATB : tant que ce n'est pas au héros de jouer, on enchaîne les
    // acteurs (ennemis) après une courte pause.
    if (!combat.fini && !combat.tourJoueur && panneauResultat.hidden) {
      minuterie -= dt;
      if (minuterie <= 0) traiterProchain();
    }

    if (delaiFin >= 0 && !termine) {
      delaiFin -= dt;
      if (delaiFin <= 0) {
        termine = true;
        // Victoire : on enchaîne direct sur la fenêtre de butin (côté principal,
        // via surFin). Défaite : on montre l'écran « Defeat ».
        if (combat.resultat === "victoire" || combat.resultat === "fuite") fermer();
        else terminer();
      }
    }
    alerteVie(combat.pvHeros / combat.pvHerosMax);
  }

  // États sous la barre (poison/feu). L'armure (Pierre, héros) = bouclier bleu.
  // Chaque état porte une `nature` : "buff" (bonus, pastille verte, rangée du
  // HAUT) ou "malus" (debuff, pastille rouge, rangée du BAS) — cf. dessinerEtats.
  function etatsHeros() {
    const l = [];
    if (combat.hate > 0) l.push({ texte: `⚡${combat.hate}`, couleur: "#dff4ff", nature: "buff" });
    if (combat.hatePerm > 0) l.push({ texte: `⚡+${combat.hatePerm}`, couleur: "#b0e8ff", nature: "buff" }); // Hâte permanente (Long Run)
    if (combat.force > 0) l.push({ texte: `💪${combat.force}`, couleur: "#ffb070", nature: "buff" });
    if (combat.regen > 0) l.push({ texte: `❤${combat.regen}`, couleur: "#7edf82", nature: "buff" });
    if (combat.riposte > 0) l.push({ texte: `🛡${combat.riposte}`, couleur: "#c0e0ff", nature: "buff" }); // Riposte : renvoie les dégâts de mêlée
    if (combat.toursBonus > 0) l.push({ texte: `⏩${combat.toursBonus}`, couleur: "#ffe9a8", nature: "buff" }); // Tours bonus (Unstoppable)
    if (combat.poisonHeros > 0) l.push({ texte: `☠${combat.poisonHeros}`, couleur: "#7ec850", nature: "malus" });
    if (combat.feuHeros > 0) l.push({ texte: `🔥${combat.feuHeros}`, couleur: "#ff8a2c", nature: "malus" });
    if (combat.gelHeros > 0) l.push({ texte: combat.gelHeros >= 5 ? `❄💥${combat.gelHeros}` : `❄${combat.gelHeros}`, couleur: "#9fdfff", nature: "malus" });
    return l;
  }
  function etatsEnnemi(e) {
    const l = [];
    if (e.haste > 0) l.push({ texte: `⚡${e.haste}`, couleur: "#dff4ff", nature: "buff" }); // Hâte (+30% vitesse)
    if (e.poison > 0) l.push({ texte: `☠${e.poison}`, couleur: "#7ec850", nature: "malus" });
    if (e.feu > 0) l.push({ texte: `🔥${e.feu}`, couleur: "#ff8a2c", nature: "malus" });
    if (e.sang > 0) l.push({ texte: `🩸${e.sang}`, couleur: "#e05a5a", nature: "malus" });
    if (e.stun > 0) l.push({ texte: `💫${e.stun}`, couleur: "#ffd966", nature: "malus" }); // tours d'étourdissement restants
    // Gel (−30% vitesse) ; à 5 stacks la glace va se briser au prochain tour → 💥 télégraphe.
    if (e.gel > 0) l.push({ texte: e.gel >= 5 ? `❄💥${e.gel}` : `❄${e.gel}`, couleur: "#9fdfff", nature: "malus" });
    if (e.confusion > 0) l.push({ texte: `✨${e.confusion}`, couleur: "#ffe9a8", nature: "malus" }); // Confusion (frappe au hasard)
    return l;
  }

  // Index de l'ennemi vivant qui agira le prochain (premier dans la file après
  // l'acteur courant). Renvoie -1 si aucun ennemi n'est en file.
  function prochainEnnemiIndex() {
    const file = acteurCourant
      ? [acteurCourant, ...simulerFile(combat, FILE_N)]
      : simulerFile(combat, FILE_N);
    const prochain = file.slice(1).find((a) => a.id === "ennemi");
    return prochain ? prochain.i : -1;
  }

  // La file d'ordre des tours, en haut : acteur courant + prochains (initiative).
  function dessinerFile(ctx) {
    const file = [acteurCourant, ...simulerFile(combat, FILE_N - 1)].filter(Boolean);
    if (!file.length) return;
    const largeur = file.length * FILE_TAILLE + (file.length - 1) * FILE_ESPACE;
    let x = 320 - largeur / 2;
    file.forEach((a, k) => {
      let planche = null, portrait = null, teinte = null, lisse = false;
      if (a.id === "heros") {
        // Tête découpée dans l'illustration de combat (lissée : c'est une image, pas
        // du pixel-art). Repli sur l'ancienne planche tant qu'elle n'est pas chargée.
        if (imgHeroCombat.complete && imgHeroCombat.naturalWidth) {
          planche = imgHeroCombat; portrait = TETE_HEROS_COMBAT; lisse = true;
        } else { planche = heros.plancheArmure; portrait = PORTRAIT_HEROS; }
      } else { const u = ennemisUI[a.i]; if (u) { planche = u.planche; portrait = u.e.def.portrait; teinte = u.e.def.teinte; } }
      dessinerCarreTete(ctx, x, FILE_Y, FILE_TAILLE, planche, portrait, k === 0, teinte, lisse);
      x += FILE_TAILLE + FILE_ESPACE;
    });
  }

  function dessiner() {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H); // transparent → le PNG derrière transparaît (ciel + bandes)
    const s = Math.min(W / 640, H / 360);
    ctx.setTransform(s, 0, 0, s, Math.round((W - 640 * s) / 2), Math.round((H - 360 * s) / 2));

    dessinerFond(ctx);
    dessinerFile(ctx); // l'ordre des tours, en haut

    // SPRITES ennemis : du plus loin au plus proche (arrière-plan d'abord).
    // Chaque ennemi a sa propre échelle — on ne peut pas utiliser un transform global.
    const ordreDessin = [...ennemisUI].sort((a, b) => a.ecran.sol - b.ecran.sol);
    for (const u of ordreDessin) {
      if (u.partis) continue;
      // Halo jaune de CIBLAGE derrière le monstre survolé à la souris : il pulse
      // doucement pour montrer quelle cible sera touchée (dessiné AVANT le sprite).
      if (drag && drag.vise && u.e.pv > 0 && drag.cibleSurvol === ennemisUI.indexOf(u))
        dessinerLueurCible(ctx, u, temps);
      const def = u.spr.anims[u.anim.nom] ?? u.spr.anims.idle;
      const frame = frameAnim(def, u.anim.t);
      const tr = u.secousse > 0 ? (Math.random() - 0.5) * 6 : 0;
      const alpha = u.mort.actif ? Math.max(0, 1 - u.mort.t / 0.35) : 1;
      if (alpha > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(PIVOT_SCENE.x, PIVOT_SCENE.y);
        ctx.scale(u.echelle, u.echelle);
        ctx.translate(-PIVOT_SCENE.x, -PIVOT_SCENE.y);
        dessinerOmbreSol(ctx, u); // ombre au sol (sous les pieds, avant le sprite)
        if (u.spr.statique)
          dessinerEnnemiStatique(ctx, u, temps, tr);
        else
          dessinerEnnemi(ctx, u.planche, u.spr, frame, u.localX + tr, u.localY, u.e.def.teinte);
        ctx.restore();
      }
    }

    // SPRITE héros (avant-plan, ECHELLE_AVANT inchangée).
    ctx.save();
    ctx.translate(PIVOT_SCENE.x, PIVOT_SCENE.y);
    ctx.scale(ECHELLE_AVANT, ECHELLE_AVANT);
    ctx.translate(-PIVOT_SCENE.x, -PIVOT_SCENE.y);
    ctx.translate(0, -DECAL_HEROS / ECHELLE_AVANT); // remonte le nain entre les 2 rangs de mobs
    const avance = Math.sin((1 - animAttaque / 0.25) * Math.PI) * 14;
    const trHeros = secousseHeros > 0 ? (Math.random() - 0.5) * 8 : 0;
    const hx = HEROS.x + (animAttaque > 0 ? avance : 0) + trHeros;
    // Le héros aussi respire (léger étirement) et FLASHE en blanc quand il encaisse.
    const brH = Math.sin(temps * 2.4);
    const flashH = Math.min(1, secousseHeros / 0.3);
    const solHeros = HEROS.y + 64 * ECHELLE_HEROS; // ligne de sol (pieds)
    // Pose selon l'arme : poings tendus si arme à 2 mains, sinon mains vides.
    const imgHero = (armeDeuxMains && imgHeroCombat2Mains.complete && imgHeroCombat2Mains.naturalWidth)
      ? imgHeroCombat2Mains : imgHeroCombat;
    ctx.save();
    if (imgHero.complete && imgHero.naturalWidth) {
      // Héros = ILLUSTRATION. Pieds au sol, centré, rendu lisse.
      // Agrandi de 30 % (ECHELLE_HEROS_ILLU) ; les pieds restent posés sur solHeros.
      const HH = 150 * ECHELLE_HEROS_ILLU, HW = HH * imgHero.naturalWidth / imgHero.naturalHeight;
      const hxI = HEROS.x + 64 * ECHELLE_HEROS / 2 - HW / 2 + (animAttaque > 0 ? avance : 0) + trHeros;
      const hyI = solHeros - HH;
      const aX = hxI + HW / 2, aY = solHeros;
      // OMBRE au sol sous le nain (comme les monstres) : ovale calé sous ses pieds
      // réels. Dessinée AVANT la respiration → elle reste posée au sol (pas de secousse).
      const mHero = scanPieds(imgHero, imgHero.naturalWidth, imgHero.naturalHeight);
      const hxBase = HEROS.x + 64 * ECHELLE_HEROS / 2 - HW / 2; // sans secousse/avance
      const ombreCx = hxBase + (mHero ? mHero.cx / imgHero.naturalWidth : 0.5) * HW;
      const ombreDemi = (mHero ? mHero.demi / imgHero.naturalWidth : 0.35) * HW;
      ombreOvale(ctx, ombreCx, solHeros - 1, Math.max(ombreDemi * 1.5, HW * 0.42));
      ctx.translate(aX, aY); ctx.scale(1 - 0.015 * brH, 1 + 0.025 * brH); ctx.translate(-aX, -aY);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      // 1) Le NAIN (base). 2) L'ARME par-dessus : la lame passe devant le corps et la
      //    main arrière. 3) On REPOSE les POINGS (partie droite du sprite) par-dessus
      //    l'arme → les mains tiennent vraiment l'arme (doigts devant, la lame traverse
      //    la prise). Effet « calques » sans redessiner de bras à la main.
      ctx.drawImage(imgHero, hxI, hyI, HW, HH);
      if (skinArme && skinArme.img.complete && skinArme.img.naturalWidth) {
        const gX = hxI + skinArme.fx * HW, gY = hyI + skinArme.fy * HH;
        const sArme = skinArme.echelle * HH / imgHero.naturalHeight;
        ctx.save();
        ctx.translate(gX, gY);
        ctx.rotate(-skinArme.angle * Math.PI / 180); // + = lame vers le haut
        ctx.scale(sArme, sArme);
        ctx.drawImage(skinArme.img, -skinArme.gcx, -skinArme.gcy); // point de prise à l'origine
        ctx.restore();
        // Re-pose les poings (fraction DROITE du sprite) au-dessus de l'arme, mais PAS
        // au-dessus de poingsTopFrac (le dessus de la main reste derrière la lame → l'épée
        // semble sortir de la main).
        ctx.save();
        const fracX = hxI + skinArme.poingsFrac * HW;
        const yTop = hyI + (skinArme.poingsTopFrac ?? 0) * HH;
        ctx.beginPath();
        ctx.rect(fracX, yTop, hxI + HW - fracX, hyI + HH - yTop);
        ctx.clip();
        ctx.drawImage(imgHero, hxI, hyI, HW, HH);
        ctx.restore();
      }
      if (flashH > 0.05) {
        const ga = ctx.globalAlpha;
        ctx.globalAlpha = ga * flashH * 0.6;
        ctx.filter = "brightness(0) invert(1)";
        ctx.drawImage(imgHero, hxI, hyI, HW, HH);
        ctx.filter = "none"; ctx.globalAlpha = ga;
      }
    } else {
      // Repli : ancien sprite pixel (le temps que l'illustration charge).
      const hAX = hx + 64 * ECHELLE_HEROS / 2, hAY = solHeros;
      ctx.translate(hAX, hAY); ctx.scale(1 - 0.015 * brH, 1 + 0.025 * brH); ctx.translate(-hAX, -hAY);
      if (heros.plancheArmure) dessinerCaseEchelle(ctx, heros.plancheArmure, 0, 2, hx, HEROS.y, ECHELLE_HEROS);
      if (heros.plancheArme) dessinerCaseEchelle(ctx, heros.plancheArme, 0, 2, hx, HEROS.y, ECHELLE_HEROS);
      if (flashH > 0.05) {
        const ga = ctx.globalAlpha;
        ctx.globalAlpha = ga * flashH * 0.6;
        ctx.filter = "brightness(0) invert(1)";
        if (heros.plancheArmure) dessinerCaseEchelle(ctx, heros.plancheArmure, 0, 2, hx, HEROS.y, ECHELLE_HEROS);
        if (heros.plancheArme) dessinerCaseEchelle(ctx, heros.plancheArme, 0, 2, hx, HEROS.y, ECHELLE_HEROS);
        ctx.filter = "none"; ctx.globalAlpha = ga;
      }
    }
    ctx.restore();
    ctx.restore();

    // PARTICULES (braises, fumée) : stockées en coords écran → pas de transform.
    dessinerParticules(ctx, particules);

    // Télégraphe des SORTS à cible alliée unique (ex. soin) : un fil VERT relie le
    // lanceur à sa cible. Dessiné EN ARRIÈRE-PLAN (avant les annotations) → l'action
    // et le tag NEXT au-dessus des têtes passent PAR-DESSUS le fil. La cible est
    // VERROUILLÉE à la préparation du sort : le fil ne suit PAS le plus blessé du
    // moment ; il ne bascule que si la cible verrouillée MEURT avant le lancement
    // (sinon le sort partirait dans le vide). Les sorts de GROUPE n'ont pas de fil :
    // leur intention porte un badge « ALL » — cf. dessinerIntention.
    for (let ci = 0; ci < ennemisUI.length; ci++) {
      const cham = ennemisUI[ci];
      if (!ennemiVivant(cham.e) || cham.e.stun > 0) continue;
      if (cham.e.intention?.type === "soigner") {
        const cible = cibleSoinVerrou(combat, cham.e);
        const idx = cible ? combat.ennemis.indexOf(cible) : ci;
        dessinerLienSort(ctx, cham.ecran, ennemisUI[idx].ecran, temps, "#7edf82");
      }
    }

    // Vie + états + intention + tag NEXT de chaque ennemi vivant.
    // Les ennemis « arrière » (impairs) reçoivent un léger zoom-out de leur UI
    // (même ratio 0.78 que leur sprite) pour renforcer l'effet de perspective.
    // Le pivot du scale est au centre de leurs pieds (ecran.cx, ecran.sol).
    const prochainIdx = combat.fini ? -1 : prochainEnnemiIndex();
    ennemisUI.forEach((u) => {
      if (u.e.pv <= 0 || u.mort.actif) return;
      ctx.save();
      if (!u.avant) {
        ctx.translate(u.ecran.cx, u.ecran.sol);
        ctx.scale(RATIO_ARRIERE, RATIO_ARRIERE);
        ctx.translate(-u.ecran.cx, -u.ecran.sol);
      }
      // La barre de vie de la cible survolée à la souris CLIGNOTE (indique la cible).
      const estCibleSouris = drag && drag.vise && drag.cibleSurvol === ennemisUI.indexOf(u);
      const alphaAvantBarre = ctx.globalAlpha;
      if (estCibleSouris)
        ctx.globalAlpha = alphaAvantBarre * (0.28 + 0.72 * (0.5 + 0.5 * Math.sin(temps * 11)));
      barreVieAuSol(ctx, u.ecran, u.affPv / u.e.pvMax,
        `${Math.round(u.e.pv)}/${u.e.pvMax}`, "#c0392b", etatsEnnemi(u.e), 0, u.affInit);
      ctx.globalAlpha = alphaAvantBarre;
      // Pill de niveau (rectangle arrondi doré) à droite de la barre de vie.
      const lvlEnn = u.e.def?.niveau;
      if (lvlEnn != null) {
        const txt = `lvl ${lvlEnn}`;
        ctx.font = police(6, POLICE_NOM);
        const tw = ctx.measureText(txt).width;
        const pw = tw + 9, ph = 9; // largeur et hauteur de la pill
        let cx = u.ecran.cx + BAR_L / 2 + 6 + pw / 2;
        if (cx + pw / 2 > 638) cx = u.ecran.cx - BAR_L / 2 - 6 - pw / 2;
        const cy = u.ecran.sol + VIE_SOUS + BAR_H / 2;
        ctx.fillStyle = "rgba(12, 9, 6, 0.90)";
        ctx.beginPath();
        ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
        ctx.fill();
        ctx.strokeStyle = "#ffcf57"; ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(txt, cx, cy + 0.5);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      }
      ctx.restore();
      // Intention et tag NEXT hors du transform d'échelle : ecran.haut est déjà en
      // espace écran, la perspective est donc correcte pour avant et arrière-plan.
      if (u.e.stun <= 0) dessinerIntention(ctx, u.e.intention, u.ecran.cx, u.ecran.haut - 8);
      if (prochainIdx === ennemisUI.indexOf(u) && !u.partis)
        dessinerTagProchain(ctx, u.ecran, temps);
    });

    // Flèche rouge au-dessus de la cible : UNIQUEMENT quand une carte d'attaque
    // est armée au clavier (sinon rien). La souris a sa propre flèche (drag).
    if (!drag && phaseCiblage && combat.tourJoueur && !combat.fini) {
      const u = ennemisUI[combat.cible];
      if (u && u.e.pv > 0) dessinerFlecheCible(ctx, u.ecran, temps, true);
    }

    // Curseur de CIBLAGE souris : une CROIX ROUGE avec un rond au centre, dessinée
    // au pointeur (le vrai curseur est masqué le temps du drag). Le monstre visé,
    // lui, s'illumine en jaune et sa barre de vie clignote (cf. la boucle ennemis).
    if (drag && drag.vise) {
      dessinerCurseurCible(ctx, drag.x, drag.y, temps, drag.cibleSurvol >= 0);
    }

    // Vie du héros (avec son bouclier d'armure = la Pierre).
    barreVieAuSol(ctx, heroEcran, aff.pvHeros / combat.pvHerosMax,
      `${Math.round(combat.pvHeros)}/${combat.pvHerosMax}`, "#2e8b57", etatsHeros(), combat.pierre, aff.initHeros);

    // Nombres flottants (dégâts/soins) AU-DESSUS des persos : gros + contour noir
    // pour rester lisibles sur n'importe quel fond. Ils montent en s'estompant.
    ctx.font = police(16);
    ctx.textAlign = "center";
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    for (const f of flottants) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.t));
      const y = f.y - (1 - f.t) * 20;
      ctx.strokeText(f.texte, f.x, y);
      ctx.fillStyle = f.couleur;
      ctx.fillText(f.texte, f.x, y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // setPause : principal.js fige/défige le combat quand le menu pause s'ouvre/ferme.
  return { mettreAJour, dessiner, setPause: (p) => { enPause = p; } };
}

// ----- Animation -----------------------------------------------------------

function frameAnim(def, t) {
  let i = Math.floor(t * def.ips);
  i = def.boucle ? i % def.frames.length : Math.min(i, def.frames.length - 1);
  return def.frames[i];
}

// ----- Particules (braises de forge à la mort) -----------------------------

function dessinerParticules(ctx, particules) {
  for (const p of particules) {
    if (p.type !== "fumee") continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.vie / p.vieMax)) * 0.32;
    ctx.fillStyle = "#2a2622";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter";
  for (const p of particules) {
    if (p.type === "fumee") continue;
    const k = Math.max(0, Math.min(1, p.vie / p.vieMax));
    if (p.type === "braise") {
      ctx.globalAlpha = k;
      ctx.fillStyle = k > 0.6 ? "#ffe39a" : (k > 0.3 ? "#ff8a2c" : "#a82a12");
      const s = Math.max(1, Math.round(p.taille));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    } else {
      ctx.globalAlpha = k * 0.5;
      ctx.fillStyle = "#ffca8a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// ----- Dessin de la scène --------------------------------------------------

function dessinerFond(ctx) {
  // Toute la zone de jeu est transparente : le fond PNG passera dessous.
  // Seule la bande d'interface (sous SOL_FOND) reçoit un fond sombre temporaire.
  ctx.fillStyle = "#241c16";
  ctx.fillRect(0, SOL_FOND, 640, 360 - SOL_FOND);
  ctx.fillStyle = "#2e241b";
  ctx.fillRect(0, SOL_FOND, 640, 4);
}

function dessinerEnnemi(ctx, planche, spr, frame, x, y, teinte) {
  if (!planche) {
    ctx.fillStyle = "#5e8c3a";
    ctx.fillRect(x + 55, y + 30, 100, 120);
    return;
  }
  if (teinte) ctx.filter = teinte; // teinte CSS (le scaling reste pixelisé)
  ctx.drawImage(
    planche,
    frame * spr.caseL, 0, spr.caseL, spr.caseH,
    Math.round(x), Math.round(y), spr.caseL, spr.caseH
  );
  if (teinte) ctx.filter = "none";
}

// Position RÉELLE des pieds dans une illustration (les monstres ne sont pas centrés
// dans leur image → une ombre calée sur le milieu de l'image tombe à côté). On
// scanne UNE FOIS le bas de la planche pour trouver l'étendue X opaque (les pieds),
// puis on met en cache par planche. Marche pour tout futur monstre, sans réglage.
// Renvoie { cx, demi } en pixels-sprite (centre des pieds + demi-largeur), ou null.
const _piedsCache = new WeakMap();
function scanPieds(planche, sw, sh) {
  if (!planche || !planche.complete || !planche.naturalWidth) return null;
  const cache = _piedsCache.get(planche);
  if (cache !== undefined) return cache;
  let res = null;
  try {
    const cv = document.createElement("canvas");
    cv.width = sw; cv.height = sh;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(planche, 0, 0, sw, sh, 0, 0, sw, sh);
    const data = c.getImageData(0, 0, sw, sh).data;
    const yDebut = Math.floor(sh * 0.85); // les ~15 % du bas = les pieds
    let xmin = sw, xmax = -1;
    for (let y = yDebut; y < sh; y++) {
      const base = y * sw;
      for (let x = 0; x < sw; x++) {
        if (data[(base + x) * 4 + 3] > 40) { if (x < xmin) xmin = x; if (x > xmax) xmax = x; }
      }
    }
    if (xmax >= xmin) res = { cx: (xmin + xmax) / 2, demi: (xmax - xmin) / 2 };
  } catch (_) { res = null; } // canvas « tainted » ou autre : on retombe sur le défaut
  _piedsCache.set(planche, res);
  return res;
}
function metriquesPieds(u) { return scanPieds(u.planche, u.spr.caseL, u.spr.caseH); }

// Dessine un OVALE d'ombre dégradé sombre sous les pieds. (cx, cy) = ligne des pieds ;
// rx = demi-largeur. L'ovale est légèrement DESCENDU (il « pose » sous les pieds au lieu
// d'être coupé en deux par le sprite) et assez FONCÉ pour bien se voir même sur un sol clair.
function ombreOvale(ctx, cx, cy, rx) {
  const ry = rx * 0.34;                // moins aplati → plus visible sous les pieds
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.translate(cx, cy + ry * 0.45);   // pooled sous les pieds (pas coupé par le sprite)
  ctx.scale(1, ry / rx);               // cercle -> ellipse aplatie
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, "rgba(0,0,0,0.75)");   // cœur bien marqué
  g.addColorStop(0.7, "rgba(0,0,0,0.42)"); // le noir tient large avant de s'estomper
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Ombre portée au sol sous un ennemi : calée sous les PIEDS RÉELS (détectés) et assez
// large pour couvrir les deux pieds. Plus grande sous un grand monstre. Dessinée AVANT
// le sprite (donc dessous), dans le repère à l'échelle.
function dessinerOmbreSol(ctx, u) {
  const spr = u.spr;
  const m = metriquesPieds(u); // pieds réels (sinon milieu de l'image en secours)
  const cx = u.localX + (m ? m.cx : spr.caseL / 2);
  const cy = u.localY + spr.caseH - 1; // sur la ligne des pieds
  // Largeur : couvre LARGEMENT les deux pieds (jambes écartées incluses), plancher pour
  // les petits.
  const base = m ? Math.max(m.demi * 1.55, spr.caseL * 0.38) : spr.caseL * 0.48;
  ombreOvale(ctx, cx, cy, base * (u.e.def.grand ? 1.12 : 1));
}

// ---- Animation « image fixe + effets » (sprite.statique) --------------------
// Un monstre n'a qu'UNE image (frame 0) ; toute la vie vient du CODE : respiration
// en boucle, bond vers le héros à l'attaque, recul + flash blanc au coup reçu,
// bascule à la mort. Idée : dans un combat au tour par tour, le « vivant » vient
// surtout des RÉACTIONS, pas d'une boucle d'idle. (cf. Slay the Spire.)
const DUREE_ATTAQUE_PROC = 0.5;  // s — durée du bond d'attaque (à vitesse « neutre »)
const DUREE_TOUCHE_PROC = 0.35;  // s — durée du recul « coup reçu »
const VIT_ANIM_REF = 10;         // vitesse d'initiative « neutre » → anim à ×1.0

// Illustration du HÉROS en combat. Rendu lisse + effets, comme les monstres. Repli
// sur le sprite pixel tant qu'elle charge. (L'EXPLORATION garde le sprite pixel 4 sens.)
// Deux poses : MAINS VIDES (arme abstraite) et POINGS TENDUS (arme à DEUX MAINS —
// on choisit celle-ci quand une arme 2 mains est équipée ; cf. armeDeuxMains).
const imgHeroCombat = new Image();
imgHeroCombat.src = "images/heros/nain-combat.png";
const imgHeroCombat2Mains = new Image();
imgHeroCombat2Mains.src = "images/heros/nain-combat-2mains.png";

// SKINS d'ARME à deux mains : l'arme est dessinée DERRIÈRE le nain (poings tendus),
// sa poignée placée dans les mains → la lame ressort vers l'avant, le manche qui
// dépasse passe derrière la main. Un skin par arme (id = clé). Réglages :
//   gcx,gcy = point de PRISE dans l'image de l'arme (px) ; echelle = taille relative
//   à l'illustration du héros ; angle = inclinaison (° ; + = lame vers le haut) ;
//   fx,fy = point de prise sur le héros (fraction de sa largeur/hauteur dessinée) ;
//   poingsFrac = à partir de quelle fraction de largeur on RE-POSE les poings du nain
//   par-dessus l'arme (0.71 = le dernier ~29 % à droite = les mains) ;
//   poingsTopFrac = au-dessus de cette fraction de HAUTEUR, on ne repose PAS les poings
//   → le dessus de la main reste DERRIÈRE la lame (l'épée « sort » de la main).
const imgClaymore = new Image();
imgClaymore.src = "images/armes/claymore-combat.png";
const imgWarAxe = new Image();
imgWarAxe.src = "images/armes/war-axe-combat.png";
const SKINS_ARME_2M = {
  "epee-large":     { img: imgClaymore, gcx: 237, gcy: 140, echelle: 0.1783, angle: 73, fx: 0.94, fy: 0.37, poingsFrac: 0.71, poingsTopFrac: 0.15 },
  "hache-de-guerre": { img: imgWarAxe,  gcx: 470, gcy: 285, echelle: 0.21,   angle: 73, fx: 1.025, fy: 0.20, poingsFrac: 0.80, poingsTopFrac: 0.15 },
};

// Facteur de rythme d'animation d'après la vitesse du monstre : rapide = anim plus
// COURTE et vive, lent = ample et lourde. (Sert de multiplicateur de durée.)
function facteurAnimVitesse(vit) {
  return Math.max(0.6, Math.min(1.7, VIT_ANIM_REF / (vit || VIT_ANIM_REF)));
}

function dessinerEnnemiStatique(ctx, u, temps, tr) {
  const spr = u.spr;
  const va = u.vitAnim;                   // rythme (∝ vitesse) : <1 rapide, >1 lent
  const ax = u.localX + spr.caseL / 2;    // ancre X (centre du corps)
  const ay = u.localY + spr.caseH;        // ancre Y (les pieds : tout pivote de là)
  const ph = (u.localX * 0.021) % 6.2832; // déphasage pour désynchroniser les monstres

  // Respiration permanente : léger étirement vertical (le buste « gonfle »).
  // Le rythme suit la vitesse du monstre (un vif respire plus vite).
  const br = Math.sin(temps * (2.6 / va) + ph);
  let sx = 1 - 0.018 * br, sy = 1 + 0.03 * br;
  let rot = 0.015 * Math.sin(temps * (1.1 / va) + ph), dx = 0, dy = 0, flash = 0;

  // Vol (def.vole) : le monstre lévite (petit flottement vertical, pas de sol).
  if (u.e.def.vole) dy += -6 + 3 * Math.sin(temps * (2.0 / va) + ph);

  const nom = u.anim.nom, t = u.anim.t;
  if (nom === "attaque") {
    // Le héros est à GAUCHE : ANTICIPATION marquée (on s'arme en reculant et en se
    // ramassant), puis BOND vers lui, puis retour. La phase d'armement est un
    // télégraphe lisible même au tour par tour.
    const p = Math.min(1, t / (DUREE_ATTAQUE_PROC * va));
    if (p < 0.34) { const k = p / 0.34; dx = 12 * k; rot += 0.18 * k; sx *= 1 + 0.07 * k; sy *= 1 - 0.05 * k; }
    else if (p < 0.56) { const k = (p - 0.34) / 0.22; dx = 12 - 42 * k; rot += 0.18 - 0.32 * k; sx *= 1.07 - 0.18 * k; sy *= 0.95 + 0.14 * k; }
    else { const k = (p - 0.56) / 0.44; dx = -30 * (1 - k); rot += -0.14 * (1 - k); }
  } else if (nom === "touche") {
    // Repoussé vers l'arrière (droite), petit choc + flash blanc qui s'éteint.
    const p = Math.min(1, t / (DUREE_TOUCHE_PROC * va)), s = Math.sin(p * Math.PI);
    dx = 14 * s; rot += 0.10 * s; sx *= 1 + 0.04 * s; sy *= 1 - 0.03 * s;
    flash = Math.max(0, 1 - t / (0.18 * va));
  }
  if (u.mort.actif) {
    const k = Math.min(1, u.mort.t / 0.35);
    rot += 0.6 * k; dy += 10 * k;                    // bascule + s'affaisse
    flash = Math.max(flash, 1 - u.mort.t / 0.12);
  }

  ctx.save();
  // LISSAGE ON pour les monstres illustrés : le canvas est déjà suréchantillonné
  // (RES×), donc une illustration rendue en lisse reste NETTE (au lieu des gros
  // pixels du nearest). Le save/restore rétablit le nearest pour le pixel-art.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(ax, ay);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.translate(-ax, -ay);
  const x = u.localX + dx + tr, y = u.localY + dy;
  // HALO de lisibilité : un dégradé clair très léger DERRIÈRE l'ennemi (dessiné
  // avant le sprite → passe dessous). En mode additif (« lighter ») il n'éclaire
  // que le décor sombre autour ; le sprite, opaque, se dessine par-dessus sans
  // être délavé. Ellipse calée sur le corps. Régler HALO_OPACITE pour + / - fort.
  {
    const HALO_OPACITE = 0.16;
    const hcx = x + spr.caseL / 2, hcy = y + spr.caseH * 0.5;
    const rx = spr.caseL * 0.78, ry = spr.caseH * 0.6;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(hcx, hcy);
    ctx.scale(1, ry / rx); // rond -> ellipse verticale (suit la hauteur du corps)
    const halo = ctx.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx);
    halo.addColorStop(0, `rgba(240,244,255,${HALO_OPACITE})`);
    halo.addColorStop(0.55, `rgba(240,244,255,${HALO_OPACITE * 0.4})`);
    halo.addColorStop(1, "rgba(240,244,255,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  dessinerEnnemi(ctx, u.planche, spr, 0, x, y, u.e.def.teinte);
  if (flash > 0) { // 2e passe : silhouette blanche (brightness 0 -> invert) par-dessus
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * Math.min(1, flash);
    ctx.filter = "brightness(0) invert(1)";
    dessinerEnnemi(ctx, u.planche, spr, 0, x, y, null);
    ctx.filter = "none";
    ctx.globalAlpha = ga;
  }
  ctx.restore();
}

// La vie d'un perso posée à son repère-écran : bouclier d'armure (Pierre) à
// GAUCHE, barre + PV chiffrés au centre, états (poison/feu…) en DESSOUS.
function barreVieAuSol(ctx, perso, ratio, texte, couleur, etats, pierre, initRatio) {
  const x = perso.cx - BAR_L / 2;
  const y = perso.sol + VIE_SOUS;
  if (pierre > 0) dessinerBouclier(ctx, x - BAR_H * 0.95, y + BAR_H / 2, BAR_H + 6, pierre);
  dessinerBarreVie(ctx, x, y, BAR_L, BAR_H, ratio, couleur, texte);
  // Barre d'INITIATIVE (orange, ~1/4 de la hauteur, même longueur), collée dessous.
  if (initRatio != null) dessinerBarreInit(ctx, x, y + BAR_H + 1, BAR_L, initRatio);
  // États séparés en DEUX zones : les BONUS (buffs) au-dessus de la barre, les
  // MALUS (debuffs) en dessous (sous la barre d'initiative).
  const buffs = (etats ?? []).filter((e) => e.nature === "buff");
  const malus = (etats ?? []).filter((e) => e.nature !== "buff");
  dessinerEtats(ctx, buffs, perso.cx, y - 9);                  // au-dessus de la barre
  dessinerEtats(ctx, malus, perso.cx, y + BAR_H + ETATS_SOUS); // en dessous
}

function dessinerBarreInit(ctx, x, y, l, ratio) {
  const h = Math.max(2, Math.round(BAR_H / 4)); // 1/4 de la barre de vie
  const r = Math.max(0, Math.min(1, ratio));
  cheminArrondi(ctx, x - 1, y - 1, l + 2, h + 2, RAYON);
  ctx.fillStyle = "#000"; ctx.fill();
  cheminArrondi(ctx, x, y, l, h, RAYON);
  ctx.fillStyle = "#2a2218"; ctx.fill();
  if (r > 0) {
    ctx.save();
    cheminArrondi(ctx, x, y, l, h, RAYON);
    ctx.clip();
    ctx.fillStyle = "#ff9a2c"; // orange (initiative)
    ctx.fillRect(x, y, l * r, h);
    ctx.restore();
  }
}

// Un carré-portrait de la file : fond, tête (planche découpée au `portrait`),
// bordure blanche (dorée + épaisse pour l'acteur courant).
function dessinerCarreTete(ctx, x, y, t, planche, portrait, courant, teinte, lisse = false) {
  ctx.save();
  cheminArrondi(ctx, x, y, t, t, 6);
  ctx.fillStyle = "#15110c";
  ctx.fill();
  ctx.clip(); // la tête reste dans le carré arrondi
  if (planche && portrait) {
    ctx.imageSmoothingEnabled = lisse; // lisse pour une illustration, net pour le pixel-art
    if (teinte) ctx.filter = teinte; // même teinte que le sprite (reconnaître le rapide)
    ctx.drawImage(planche, portrait.sx, portrait.sy, portrait.sw, portrait.sh, x, y, t, t);
  }
  ctx.restore();
  cheminArrondi(ctx, x, y, t, t, 6);
  ctx.lineWidth = courant ? 3 : 2;
  ctx.strokeStyle = courant ? "#ffcf57" : "#ffffff";
  ctx.stroke();
}

function dessinerBarreVie(ctx, x, y, l, h, ratio, couleur, texte) {
  const r = Math.max(0, Math.min(1, ratio));
  // Contour noir + fond gris, coins arrondis (cf. core/style.js).
  cheminArrondi(ctx, x - 1, y - 1, l + 2, h + 2, RAYON);
  ctx.fillStyle = "#000"; ctx.fill();
  cheminArrondi(ctx, x, y, l, h, RAYON);
  ctx.fillStyle = "#3a3a3a"; ctx.fill();
  // Remplissage coloré, DÉCOUPÉ à la forme arrondie (bout gauche arrondi ; le bout
  // droit suit l'arrondi quand la barre est pleine).
  if (r > 0) {
    ctx.save();
    cheminArrondi(ctx, x, y, l, h, RAYON);
    ctx.clip();
    ctx.fillStyle = couleur;
    ctx.fillRect(x, y, l * r, h);
    ctx.restore();
  }
  if (texte) {
    ctx.font = police(Math.round(h * 0.82));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.strokeText(texte, x + l / 2, y + h / 2 + 0.5);
    ctx.fillStyle = "#fff";
    ctx.fillText(texte, x + l / 2, y + h / 2 + 0.5);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

// Un petit bouclier bleu (l'armure du nain = sa Pierre) avec sa valeur dedans.
function dessinerBouclier(ctx, cx, cy, taille, valeur) {
  const w = taille, h = taille * 1.18;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy + h * 0.12);
  ctx.quadraticCurveTo(cx + w * 0.46, cy + h * 0.42, cx, cy + h / 2);
  ctx.quadraticCurveTo(cx - w * 0.46, cy + h * 0.42, cx - w / 2, cy + h * 0.12);
  ctx.closePath();
  ctx.fillStyle = "#2f6fb0";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#bcd8f5";
  ctx.stroke();
  ctx.font = police(Math.round(taille * 0.6));
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(valeur), cx, cy + h * 0.04);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// Sorts qui touchent TOUT le groupe allié → leur intention porte un badge « ALL »
// collé à l'icône (convention valable pour tout futur sort de groupe).
const SORTS_GROUPE = new Set(["haste-allie"]);

function dessinerIntention(ctx, intention, cx, y) {
  if (!intention) return;
  ctx.font = police(12);
  ctx.textBaseline = "alphabetic";
  let icone = "⚔", couleur = "#ff8a5b";
  if (intention.type === "soigner") { icone = "💚"; couleur = "#7edf82"; }
  else if (intention.type === "haste-allie") { icone = "⚡"; couleur = "#dff4ff"; }
  const txt = `${icone} ${intention.valeur}`;
  ctx.fillStyle = couleur;
  if (SORTS_GROUPE.has(intention.type)) {
    // Icône + valeur, puis une petite case « ALL » à droite (bloc centré sur cx).
    const wTxt = ctx.measureText(txt).width;
    const wBadge = 21, gap = 4, total = wTxt + gap + wBadge;
    const gauche = cx - total / 2;
    ctx.textAlign = "left";
    ctx.fillText(txt, gauche, y);
    dessinerBadgeAll(ctx, gauche + wTxt + gap, y, wBadge);
  } else {
    ctx.textAlign = "center";
    ctx.fillText(txt, cx, y);
  }
  ctx.textAlign = "left";
}

// Petite case « ALL » (sorts de groupe), alignée sur la ligne de texte `y`.
function dessinerBadgeAll(ctx, x, y, w) {
  const h = 11, top = y - 10;
  cheminArrondi(ctx, x, top, w, h, 3);
  ctx.fillStyle = "rgba(40, 70, 96, 0.92)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#8fd6ff";
  ctx.stroke();
  ctx.font = police(8);
  ctx.fillStyle = "#dff4ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ALL", x + w / 2, top + h / 2 + 0.5);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

// Petit tag ambre « NEXT » au-dessus de l'ennemi qui agira le prochain.
function dessinerTagProchain(ctx, ecran, t) {
  const bob = Math.sin(t * 4) * 2;
  const cx = ecran.cx;
  const y = ecran.haut - 36 + bob;
  const tw = 34, th = 13;
  cheminArrondi(ctx, cx - tw / 2, y - th / 2, tw, th, 3);
  ctx.fillStyle = "rgba(255, 188, 30, 0.88)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 220, 100, 0.6)";
  ctx.stroke();
  ctx.font = police(7);
  ctx.fillStyle = "#1a0f00";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("NEXT ▼", cx, y + 0.5);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// Une rangée de badges d'état, centrée en `cx` sur la ligne `y`. Chaque badge a
// une PASTILLE arrondie de fond qui dit sa nature : VERTE pour un bonus (buff),
// ROUGE pour un malus (debuff) — pour distinguer d'un coup d'œil ce qui aide de
// ce qui nuit (convention « vert = bon / rouge = mauvais pour le porteur »).
function dessinerEtats(ctx, etats, cx, y) {
  if (!etats || etats.length === 0) return;
  ctx.font = police(9);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const espace = 26;        // écart entre deux pastilles
  const lw = 22, lh = 13;   // taille d'une pastille
  const x0 = cx - ((etats.length - 1) * espace) / 2;
  etats.forEach((etat, i) => {
    const bx = x0 + i * espace;
    const buff = etat.nature === "buff";
    cheminArrondi(ctx, bx - lw / 2, y - lh / 2, lw, lh, 4);
    ctx.fillStyle = buff ? "rgba(34, 84, 40, 0.78)" : "rgba(96, 28, 28, 0.78)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = buff ? "#5fd06e" : "#e36a6a";
    ctx.stroke();
    ctx.fillStyle = etat.couleur;
    ctx.fillText(etat.texte, bx, y + 0.5);
  });
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// Tracé pointillé en « cloche » : Bézier CUBIQUE dont les deux points de contrôle
// sont posés À LA VERTICALE au-dessus de chaque extrémité, à la hauteur `sommetY`.
// Conséquence géométrique : la tangente au départ et à l'arrivée est VERTICALE →
// le fil s'élance presque droit vers le haut depuis la source et REDESCEND presque
// droit sur la cible, symétriquement. `offset` anime le défilement des pointillés.
function tracerClochePointille(ctx, x0, y0, x1, y1, sommetY, couleur, offset, largeur) {
  ctx.save();
  ctx.strokeStyle = couleur;
  ctx.lineWidth = largeur;
  ctx.lineCap = "round";
  ctx.setLineDash([5, 6]);
  ctx.lineDashOffset = offset;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.bezierCurveTo(x0, sommetY, x1, sommetY, x1, y1);
  ctx.stroke();
  ctx.restore();
}

// Fil animé reliant un lanceur de sort à sa cible alliée (`src`/`dst` = repères
// écran). Il part PRÈS de la tête de la cible (juste au-dessus de l'action) et son
// arc monte haut, bien VERTICAL (en cloche). Dessiné en ARRIÈRE-PLAN → l'action et
// le tag NEXT au-dessus des têtes passent par-dessus. Marque GÉNÉRIQUE de tout sort
// à cible unique entre monstres : `couleur` qualifie le type (vert = soin…),
// volontairement SANS icône.
function dessinerLienSort(ctx, src, dst, t, couleur) {
  const x0 = src.cx, x1 = dst.cx;
  const yA = src.haut - 24, yB = dst.haut - 24;          // près des têtes (au-dessus de l'action)
  // Sommet de la cloche : très au-dessus de la tête la plus haute pour un arc
  // ample et vertical. Plancher à 50 px → reste sous la file des tours (y≈12-52)
  // tout en montant le plus haut possible (sommet réel de la courbe vers y≈69).
  const sommetY = Math.max(50, Math.min(yA, yB) - 104);
  const pulse = 0.55 + 0.45 * Math.sin(t * 6);
  ctx.globalAlpha = pulse;
  tracerClochePointille(ctx, x0, yA, x1, yB, sommetY, couleur, -t * 28, 2.5);
  ctx.globalAlpha = 1;
}

// Une flèche rouge qui pointe la CIBLE, au-dessus de sa tête, avec un petit
// rebond. `fort` (pendant le ciblage clavier) la rend plus vive et plus grande.
function dessinerFlecheCible(ctx, ecran, t, fort) {
  const bob = Math.sin(t * 6) * 3;
  const x = ecran.cx;
  const y = ecran.haut - 14 + bob;
  const w = fort ? 13 : 10, h = fort ? 15 : 12;
  ctx.fillStyle = fort ? "#ff3b30" : "#e0473a";
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h);
  ctx.lineTo(x + w / 2, y - h);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.stroke();
}

// Curseur de ciblage souris : une CROIX ROUGE avec un rond au centre, dessinée au
// pointeur pendant qu'on tire une carte offensive (le vrai curseur est masqué le
// temps du drag). `surCible` = true quand on survole un monstre : le réticule
// s'avive un peu et un anneau s'écarte en pulsant (renfort du verrouillage).
function dessinerCurseurCible(ctx, x, y, t, surCible) {
  ctx.save();
  ctx.translate(x, y);
  const R = 9;                                   // rayon du rond central
  const rouge = surCible ? "#ff5c4d" : "#ff3b30";
  ctx.lineCap = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = rouge;
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";       // légère ombre → lisible sur tout fond
  ctx.shadowBlur = 3;

  ctx.beginPath();                               // le rond au milieu
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();

  const a0 = R + 3, a1 = R + 9;                  // les 4 branches de la croix
  ctx.beginPath();
  ctx.moveTo(0, -a0); ctx.lineTo(0, -a1);
  ctx.moveTo(0,  a0); ctx.lineTo(0,  a1);
  ctx.moveTo(-a0, 0); ctx.lineTo(-a1, 0);
  ctx.moveTo( a0, 0); ctx.lineTo( a1, 0);
  ctx.stroke();

  ctx.shadowBlur = 0;                            // le point central
  ctx.fillStyle = rouge;
  ctx.beginPath();
  ctx.arc(0, 0, 1.7, 0, Math.PI * 2);
  ctx.fill();

  if (surCible) {                                // anneau qui s'écarte en pulsant
    const p = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.globalAlpha = 0.55 * (1 - p);
    ctx.beginPath();
    ctx.arc(0, 0, R + 4 + p * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// Halo jaune DÉGRADÉ derrière un monstre pour montrer qu'il est ciblé (souris).
// Radial, centré sur le corps ; il pulse DOUCEMENT (clignotement lent) — dessiné
// AVANT le sprite du monstre, donc « derrière » lui.
function dessinerLueurCible(ctx, u, t) {
  const cx = u.ecran.cx;
  const cy = (u.ecran.haut + u.ecran.sol) / 2;
  const rayon = Math.max(u.ecran.sol - u.ecran.haut, u.spr.caseL * u.echelle) * 0.72;
  const puls = 0.5 + 0.5 * Math.sin(t * 3.2);    // lent = « clignote doucement »
  const a = 0.16 + 0.32 * puls;
  const g = ctx.createRadialGradient(cx, cy, rayon * 0.12, cx, cy, rayon);
  g.addColorStop(0,    `rgba(255, 233, 138, ${a})`);
  g.addColorStop(0.55, `rgba(255, 201, 66, ${a * 0.5})`);
  g.addColorStop(1,    "rgba(255, 190, 40, 0)");
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, rayon, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ----- Une carte en HTML ---------------------------------------------------

// Anime la carte qu'on vient de jouer : un clone sort de la main, grandit au
// centre de l'écran (bien visible), puis s'estompe et disparaît. Le clone est
// indépendant (la main, elle, se referme tout de suite).
function animerCarteJouee(el) {
  const r = el.getBoundingClientRect();
  const clone = el.cloneNode(true);
  clone.classList.remove("sel");
  clone.disabled = false;
  Object.assign(clone.style, {
    position: "fixed", left: r.left + "px", top: r.top + "px",
    width: r.width + "px", height: r.height + "px",
    margin: "0", zIndex: "30", pointerEvents: "none", transformOrigin: "center center",
  });
  clone.style.setProperty("--carte-l", r.width + "px"); // garde la bonne taille de texte
  document.body.appendChild(clone);

  // On agrandit la carte vers la GAUCHE (côté héros), PAS au centre : sinon elle
  // recouvre les premiers monstres (à droite) et on ne voit pas l'effet.
  const dx = innerWidth * 0.36 - (r.left + r.width / 2);
  const dy = innerHeight / 2 - (r.top + r.height / 2);
  clone.animate([
    { transform: "translate(0px, 0px) rotate(0deg) scale(1)", opacity: 1 },
    { transform: `translate(${dx}px, ${dy - 30}px) rotate(0deg) scale(1.7)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy - 30}px) rotate(0deg) scale(1.7)`, opacity: 1, offset: 0.72 },
    { transform: `translate(${dx}px, ${dy - 80}px) rotate(0deg) scale(1.9)`, opacity: 0, offset: 1 },
  ], { duration: 620, easing: "cubic-bezier(.2, .7, .3, 1)" }).onfinish = () => clone.remove();
}

function creerCarteDOM(carte, combat) {
  const el = document.createElement("button");
  el.className = "combat-carte";
  el.disabled = combat.fini || !combat.tourJoueur;
  garnirCarte(el, carte);
  if (carte.cout > combat.chaleur) el.classList.add("combat-carte--injouable");
  return el;
}
