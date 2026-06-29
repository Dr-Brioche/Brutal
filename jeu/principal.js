// Point d'entrée du jeu : assemble les briques et démarre la boucle.

import { lancerBoucle } from "./core/boucle.js";
import { clavier } from "./core/clavier.js";
import { chargerImage } from "./core/sprites.js";
import { creerCamera, mettreAJourCamera } from "./core/camera.js";
import { creerHeros, mettreAJourHeros, dessinerHeros } from "./entities/heros.js";
import { creerCarte, dessinerCarte, piedsLibres, tuileSousLesPieds, TUILE } from "./world/carte.js";
import { genererMine } from "./world/mine.js";
import { CITY, ZONES } from "./data/zones.js";
import { tuileDef, estPorte } from "./data/tuiles.js";
import { ITEMS, itemDef, prixVente, RARETES, rareteAuMoins } from "./data/items.js";
import {
  creerInventaire, appliquerEquipement, armeEquipee, armureEquipee,
  ajouterObjet, ajouterOr, vendreObjet, jeterObjet, etatInventaire, chargerInventaire,
} from "./systems/inventaire.js";
import {
  creerMaitrise, etatMaitrise, chargerMaitrise,
} from "./systems/maitrise.js";
import { demanderConfirmation } from "./ui/confirmation.js";
import { installerInventaire } from "./ui/inventaire.js";
import { definirSourceEquipement } from "./ui/infobulle.js";
import { installerDeck } from "./ui/deck.js";
import { installerTalents } from "./ui/talents.js";
import { appliquerTalents } from "./systems/talents.js";
import { installerButin } from "./ui/butin.js";
import { installerMenu } from "./ui/menu.js";
import { afficherMessage, flashCombat, fondu, alerteVie } from "./ui/effets.js";
import { ouvrirDialogue, dialogueActif, rafraichirChoix, fermerDialogue } from "./ui/dialogue.js";
import { creerRencontres, avancerRencontres } from "./systems/rencontres.js";
import { gagnerXp } from "./systems/progression.js";
import { demarrerCombat } from "./ui/combat.js";
import { ENNEMIS, tirerButin, composerGroupe } from "./data/ennemis.js";
import { fondCombat, prechargerFonds } from "./data/fonds.js";
import { musiqueCombat, prechargerMusiquesCombat } from "./data/musiques.js";
import { FANATIQUE, MARCHAND } from "./data/pnj.js";
import { creerPnj, mettreAJourPnj, dessinerPnj, piedsPnj } from "./entities/pnj.js";
import { jouerMusique, jouerMusiqueFichier, arreterMusique, jouerSonPierre } from "./core/sons.js";
import { getPreference } from "./systems/preferences.js";

const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");

// Résolution LOGIQUE fixe, en 16:9. Tout le jeu se dessine dans ce rectangle, puis
// on l'AGRANDIT uniformément à l'écran et on le CENTRE : sur un écran qui n'est pas
// pile 16:9, des bandes noires apparaissent sur les côtés (body en flex + fond
// sombre). Avantage : JAMAIS de déformation, et le décor / les ennemis restent
// alignés sur le fond et le HUD (eux aussi 16:9).
// La VALEUR règle le CHAMP DE VISION en EXPLORATION : plus elle est grande, plus on
// voit de monde autour du héros (sprites un peu plus petits). Le COMBAT, lui, garde
// EXACTEMENT la même taille quelle que soit cette valeur (sa scène 640×360 remplit
// toujours le cadre) → on peut régler le zoom d'exploration sans toucher au combat.
const VUE = { l: 960, h: 540 };
function ajusterEchelle() {
  canvas.width = VUE.l;
  canvas.height = VUE.h;
  // Plus grand rectangle 16:9 qui tient dans la fenêtre (limité par la largeur OU
  // la hauteur selon la forme de l'écran) ; le flex du body le centre tout seul.
  const zoneL = Math.min(innerWidth, innerHeight * 16 / 9);
  canvas.style.width = Math.round(zoneL) + "px";
  canvas.style.height = Math.round(zoneL * 9 / 16) + "px";
  ctx.imageSmoothingEnabled = false; // redimensionner le canvas réinitialise le contexte
}
window.addEventListener("resize", ajusterEchelle);

// Place le héros pour que ses PIEDS soient centrés sur une case (colonne, ligne).
function poserHeros(heros, colonne, ligne) {
  heros.x = colonne * TUILE - 16;
  heros.y = ligne * TUILE - 38;
}

// `donneesInitiales` : la sauvegarde choisie sur l'écran de démarrage
// (ou null pour une nouvelle partie).
export async function demarrerJeu(donneesInitiales = null) {
  ajusterEchelle(); // règle la taille du canvas + coupe le lissage

  // On charge toutes les planches (items équipables + ennemis + PNJ), dédoublonnées
  const aPlanche = [...Object.values(ITEMS), ...ENNEMIS, FANATIQUE, MARCHAND].filter((o) => o.planche);
  const chemins = [...new Set(aPlanche.map((o) => o.planche))];
  const images = await Promise.all(chemins.map(chargerImage));
  const planches = new Map(chemins.map((chemin, i) => [chemin, images[i]]));

  // La zone courante (on démarre dans la ville). `carte` et `rencontres`
  // changent à chaque passage de porte, d'où le `let`.
  let zoneActuelle = "city";   // id de zone pour les ASSETS (fonds + musique de combat)
  let zoneCourante = CITY;     // l'OBJET zone courant : statique (ZONES) OU mine générée
  let veines = [];             // veines minables de la mine courante (vide hors mine)
  let veineProche = null;      // veine à portée de minage (surbrillée en doré)
  let minage = null;           // minage en cours { veine, t, duree } : fige le héros
  let carte = creerCarte(CITY);
  let rencontres = creerRencontres();
  prechargerFonds(zoneActuelle);                // fonds de combat prêts en cache
  prechargerMusiquesCombat(zoneActuelle);       // musiques de combat prêtes en cache
  if (CITY.musique) jouerMusique(CITY.musique); // ambiance ville dès le lancement
  const camera = creerCamera();
  const heros = creerHeros();
  heros.x = carte.departX;
  heros.y = carte.departY;
  const inventaire = creerInventaire();
  // La bulle d'info lit l'équipement courant pour colorer les pièces d'un set.
  definirSourceEquipement(() => inventaire.slots);
  inventaire.slots.armure = "tenue-de-voyageur"; // habits de base (corps)
  inventaire.slots.outil = "pioche-basique";     // pioche de base : permet de miner
  // On démarre VRAIMENT sans arme (sac vide) : il faut looter/forger sa 1re arme.
  // En attendant, le deck de base (Tap + Brace) sert de filet (cf. cartesDeBase).
  appliquerEquipement(heros, inventaire, planches);
  appliquerTalents(heros); // vie max / vitesse selon les talents (aucun au départ)
  const maitrise = creerMaitrise();

  let enPause = false;
  let enTransition = false;
  let combatEnCours = null;        // non-null = on est en combat
  let menuPauseOuvert = false;     // le menu pause (Échap) est-il ouvert ?

  // Luc l'hérétique : arpente le couloir devant la porte de sortie (rangée 13).
  const fanatique = creerPnj({
    modele: FANATIQUE,
    planche: planches.get(FANATIQUE.planche),
    x: 37 * TUILE - 11,
    y: 13 * TUILE - 56,
    xMin: 34 * TUILE - 11,
    xMax: 40 * TUILE - 11,
  });
  // Renaud (marchand de TEST), STATIONNAIRE près de la sortie (rangée 11).
  // Placeholder visuel = sprite du fanatique.
  const marchand = creerPnj({
    modele: MARCHAND,
    planche: planches.get(MARCHAND.planche),
    x: 38 * TUILE - 11,
    y: 11 * TUILE - 56,
    xMin: 38 * TUILE - 11,
    xMax: 38 * TUILE - 11,
  });
  // FONTAINE (build de TEST) : près de la porte de sortie. On lui parle
  // pour gagner 1 niveau d'un coup → tester l'arbre de talents sans farmer.
  const fontaine = {
    cx: 35 * TUILE + TUILE / 2, // centre x (monde)
    solY: 12 * TUILE,           // base/pieds (profondeur + dessin)
    proche: false,
    t: 0,
  };
  function dessinerFontaine(ctx, f) {
    const cx = f.cx, by = f.solY;
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)"; // ombre
    ctx.beginPath(); ctx.ellipse(cx, by, 27, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5c544a";              // bassin (pierre, dessous)
    ctx.beginPath(); ctx.ellipse(cx, by - 5, 25, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#857b6b";              // rebord
    ctx.beginPath(); ctx.ellipse(cx, by - 8, 25, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#356394";              // eau
    ctx.beginPath(); ctx.ellipse(cx, by - 9, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(150, 200, 240, 0.55)"; // reflets qui tournent
    for (let i = 0; i < 3; i++) {
      const a = f.t * 1.6 + i * 2.1;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * 11, by - 9 + Math.sin(a) * 4, 3, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#7d7464";              // pilier central
    ctx.fillRect(cx - 4, by - 28, 8, 20);
    ctx.fillStyle = "#a89d88";
    ctx.beginPath(); ctx.ellipse(cx, by - 28, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(160, 205, 245, 0.85)"; // jets : gouttes qui jaillissent
    for (let i = 0; i < 7; i++) {
      const p = (f.t * 1.3 + i / 7) % 1;
      const ang = (i / 7) * Math.PI * 2;
      const dxj = Math.cos(ang) * (3 + p * 13);
      const yj = by - 30 - Math.sin(p * Math.PI) * 15;
      ctx.fillRect(Math.round(cx + dxj) - 1, Math.round(yj), 2, 3);
    }
  }

  const invite = document.getElementById("invite");

  // Parler au fanatique : un petit laïus, puis un choix (se faire soigner ou partir).
  function parlerAuFanatique() {
    if (dialogueActif() || combatEnCours || enPause) return;
    enPause = true;
    invite.hidden = true;
    ouvrirDialogue({
      nom: "The Fanatic",
      texte: [
        "Repent, dwarf — the Deep stirs, and it knows your name.",
        "Kneel, and its forge-fire shall mend your broken flesh.",
      ],
      choix: [
        {
          texte: "I have faith — heal me.",
          action: () => {
            heros.pv = heros.pvMax;
            afficherMessage("✨ Warmth floods your bones — fully healed.");
          },
        },
        {
          texte: "Your religion is a cult.",
          action: () => afficherMessage("The Fanatic sneers and turns away."),
        },
      ],
    }, () => { enPause = false; });
  }

  // Parler à la fontaine (build de TEST) : monter d'un niveau d'un coup pour
  // essayer l'arbre de talents sans devoir farmer des combats.
  function parlerALaFontaine() {
    if (dialogueActif() || combatEnCours || enPause) return;
    enPause = true;
    invite.hidden = true;
    ouvrirDialogue({
      nom: "Ancient Fountain",
      texte: [
        "The water glows with old forge-magic.",
        "Drink, and feel your power grow.",
      ],
      choix: [
        {
          texte: "💧  Drink — gain 1 level",
          action: () => {
            heros.niveau += 1;
            heros.pointsTalent += 1;
            afficherMessage(`⬆ Level ${heros.niveau}!  +1 talent point — press T to spend it.`);
          },
        },
        { texte: "Leave", action: () => {} },
      ],
    }, () => { enPause = false; });
  }

  // Marchand de TEST : propose TOUS les items du jeu, gratuits, rangés par
  // sous-catégories (armes / armures / bijoux / autres). On choisit ensuite quoi
  // équiper via l'inventaire (ouvert à côté). Échap ou « Leave » ferme la boutique.
  const CATEGORIES_BOUTIQUE = [
    { nom: "Weapons", icone: "⚔",  cats: ["arme", "bouclier"], groupes: [
      { label: "Weapons — 1 hand",  test: (it) => it.categorie === "arme" && it.mains !== 2 },
      { label: "Weapons — 2 hands", test: (it) => it.categorie === "arme" && it.mains === 2 },
      { label: "Off-hand",          test: (it) => it.categorie === "bouclier" },
    ]},
    { nom: "Armor",   icone: "🛡", cats: ["armure"] },
    { nom: "Jewelry", icone: "💍", cats: ["bague", "collier"], groupes: [
      { label: "Amulets", test: (it) => it.categorie === "collier" },
      { label: "Rings",   test: (it) => it.categorie === "bague" },
    ]},
    { nom: "Other",   icone: "🎒", cats: ["gant", "botte", "sac"], groupes: [
      { label: "Gloves", test: (it) => it.categorie === "gant" },
      { label: "Boots",  test: (it) => it.categorie === "botte" },
      { label: "Bags",   test: (it) => it.categorie === "sac" },
    ]},
  ];

  function parlerAuMarchand() {
    if (dialogueActif() || combatEnCours || enPause) return;
    enPause = true;
    invite.hidden = true;
    document.body.classList.add("en-boutique"); // inventaire à côté (feedback des achats)
    menuBoutique();         // dialogue d'abord → dialogueActif() = true
    inventaireUI.ouvrir(); // inventaire ensuite → kbFocus = false (focus sur le marchand)
  }

  // `prochainMenu` : ce qu'on rouvre après la fermeture du dialogue courant
  // (posé par l'action du choix). null = on quitte la boutique (Leave / Échap).
  let prochainMenu = null;
  // Quand l'inventaire change (équiper/déséquiper) pendant un menu marchand, on
  // rafraîchit la liste à chaud (utile dans « Sell items »). null = pas de refresh.
  let surChangementMenu = null;
  // `retour` (optionnel) : le menu parent à rouvrir sur Échap. Si fourni, Échap
  // revient à ce menu au lieu de quitter la boutique (cf. dialogue → surEchap).
  // Les menus RACINE (menuBoutique) ne le passent pas → Échap quitte la boutique.
  function ouvrirMenuMarchand(nom, choix, selInitial = 0, retour = null) {
    prochainMenu = null;
    surChangementMenu = null; // chaque menu repose son propre refresh (cf. menuVendre)
    const surEchap = retour ? () => { prochainMenu = retour; } : null;
    ouvrirDialogue({ nom, choix, selInitial, surEchap }, () => {
      const suite = prochainMenu;
      prochainMenu = null;
      if (suite) suite();
      else fermerBoutique();
    });
  }

  // Menu racine : choisir une catégorie (acheter) ou vendre. `selInitial` = ligne
  // présélectionnée, pour revenir sur la MÊME entrée au retour d'un sous-menu.
  function menuBoutique(selInitial = 0) {
    const choix = CATEGORIES_BOUTIQUE.map((c, i) => ({
      texte: `${c.icone}  ${c.nom}`,
      action: () => { prochainMenu = () => menuCategorie(c, 0, i); }, // i = position racine à retrouver
    }));
    const idxVente = choix.length; // position de « Sell items » (pour y revenir)
    choix.push({ texte: "💰  Sell items", action: () => { prochainMenu = () => menuVendre(0, idxVente); } });
    choix.push({ texte: "Leave", action: () => { prochainMenu = null; } });
    ouvrirMenuMarchand("Test Merchant", choix, selInitial);
  }

  // Les choix du menu de vente : un par objet du SAC + retour. Recalculé à chaque
  // changement d'inventaire pour rester à jour (déséquiper ajoute un objet).
  // `selRoot` = position de « Sell items » dans le menu racine, threadée pour que
  // le « Back » y revienne précisément. Chaque objet retient sa propre ligne `i`
  // → après une vente/confirmation, le curseur reste sur le même emplacement.
  function choixVente(selRoot = 0) {
    const choix = inventaire.objets.map((o, i) => ({
      texte: `Sell ${ITEMS[o.id].nom}  ·  +${prixVente(o.id)} 🪙`,
      itemId: o.id, // survol → bulle (on voit ce qu'on vend)
      action: () => {
        const d = ITEMS[o.id];
        if (getPreference("confirmVente") && rareteAuMoins(o.id, "rare")) {
          prochainMenu = () => menuConfirmerVente(o, i, selRoot);
        } else {
          prochainMenu = () => menuVendre(i, selRoot);
          const prix = vendreObjet(inventaire, o);
          afficherMessage(`💰 Sold ${d.nom} for ${prix} 🪙.`);
          inventaireUI.rendre();
        }
      },
    }));
    // « Tout vendre » : proposé dès 2 objets et JAMAIS en 1re position (le défaut
    // du dialogue) — en plus, il passe par un sous-menu de confirmation.
    if (inventaire.objets.length > 1) {
      const idxToutVendre = choix.length;
      choix.push({ texte: "💰  Sell all…", action: () => { prochainMenu = () => menuVendreTout(idxToutVendre, selRoot); } });
    }
    choix.push({ texte: "←  Back", action: () => { prochainMenu = () => menuBoutique(selRoot); } });
    return choix;
  }

  // Menu de vente : les objets du SAC, chacun revendable contre de l'or. Se met à
  // jour à chaud si on (dés)équipe dans l'inventaire ouvert à côté. `selInitial` =
  // ligne présélectionnée (l'objet où on était) ; `selRoot` = retour au menu racine.
  function menuVendre(selInitial = 0, selRoot = 0) {
    if (!inventaire.objets.length) afficherMessage("Your bag is empty — nothing to sell.");
    ouvrirMenuMarchand("Test Merchant — Sell", choixVente(selRoot), selInitial, () => menuBoutique(selRoot));
    surChangementMenu = () => rafraichirChoix(choixVente(selRoot));
  }

  // Confirmation « tout vendre » : le choix par DÉFAUT est « Non » (le choix
  // dangereux est en 2e position) → aucune vente massive par mégarde. `selVente` =
  // ligne à retrouver dans le menu de vente au retour ; `selRoot` = retour racine.
  function menuVendreTout(selVente = 0, selRoot = 0) {
    const objets = [...inventaire.objets];
    const total = objets.reduce((s, o) => s + prixVente(o.id), 0);
    const retourVente = () => menuVendre(selVente, selRoot);
    ouvrirMenuMarchand("Sell EVERYTHING in your bag?", [
      { texte: "←  No, keep my items", action: () => { prochainMenu = retourVente; } },
      { texte: `⚠  Yes, sell all ${objets.length} · +${total} 🪙`, action: () => {
          prochainMenu = retourVente; // on revient au menu de vente après coup
          const aVendre = [...inventaire.objets];
          let somme = 0;
          for (const o of aVendre) somme += vendreObjet(inventaire, o);
          afficherMessage(`💰 Sold ${aVendre.length} items for ${somme} 🪙.`);
          inventaireUI.rendre();
        } },
    ], 0, retourVente);
  }

  // Confirmation de vente pour un objet rare+ (sous-menu marchand). `selVente` =
  // ligne de l'objet à retrouver dans le menu de vente au retour.
  function menuConfirmerVente(o, selVente = 0, selRoot = 0) {
    const d = ITEMS[o.id];
    const prix = prixVente(o.id);
    const retourVente = () => menuVendre(selVente, selRoot);
    ouvrirMenuMarchand(`Sell ${d.nom}?`, [
      { texte: "←  No, keep it", action: () => { prochainMenu = retourVente; } },
      { texte: `⚠  Yes, sell · +${prix} 🪙`, action: () => {
          prochainMenu = retourVente;
          vendreObjet(inventaire, o);
          afficherMessage(`💰 Sold ${d.nom} for ${prix} 🪙.`);
          inventaireUI.rendre();
        } },
    ], 0, retourVente);
  }

  // Menu d'une catégorie : ses items (gratuits) + retour aux catégories.
  // `selInitial` = item présélectionné ; `selRoot` = position de la catégorie dans
  // le menu racine, pour y revenir au « Back » / Échap.
  function menuCategorie(c, selInitial = 0, selRoot = 0) {
    const tousItems = Object.values(ITEMS)
      .filter((it) => c.cats.includes(it.categorie))
      .sort((a, b) => (RARETES[a.rarete]?.rang ?? 0) - (RARETES[b.rarete]?.rang ?? 0));
    const groupes = c.groupes ?? [{ label: null, test: () => true }];
    // Séparateurs seulement si plusieurs sous-groupes sont non vides.
    const groupesPeuples = groupes.filter((g) => tousItems.some(g.test));
    const avecSep = groupesPeuples.length > 1;
    const choix = [];
    for (const g of groupesPeuples) {
      if (avecSep) choix.push({ texte: g.label, separateur: true });
      for (const it of tousItems.filter((x) => g.test(x))) {
        const fullIdx = choix.length; // position dans le tableau avec séparateurs
        choix.push({
          texte: `${it.nom}  ·  free`,
          itemId: it.id,
          action: () => {
            prochainMenu = () => menuCategorie(c, fullIdx, selRoot);
            if (ajouterObjet(inventaire, it.id)) afficherMessage(`🛒 ${it.nom} added to your bag.`);
            else afficherMessage("Your bag is full — equip or drop something first.");
            inventaireUI.rendre();
          },
        });
      }
    }
    choix.push({ texte: "←  Back", action: () => { prochainMenu = () => menuBoutique(selRoot); } });
    ouvrirMenuMarchand(`Test Merchant — ${c.nom}`, choix, selInitial, () => menuBoutique(selRoot));
  }

  function fermerBoutique() {
    document.body.classList.remove("en-boutique");
    surChangementMenu = null;
    fermerDialogue(); // ferme le menu marchand (dialogue)
    inventaireUI.fermer();
    enPause = false;
  }

  // L'état qu'un emplacement de sauvegarde retient.
  function obtenirEtat() {
    return {
      zone: zoneActuelle,
      x: heros.x,
      y: heros.y,
      pv: heros.pv,
      niveau: heros.niveau,
      xp: heros.xp,
      pointsTalent: heros.pointsTalent,
      talents: { ...heros.talents },
      direction: heros.direction,
      inventaire: etatInventaire(inventaire),
      maitrise: etatMaitrise(maitrise),
      armeNom: armeEquipee(inventaire)?.nom ?? "Unarmed",
      armureNom: armureEquipee(inventaire).nom,
    };
  }

  // L'état qu'on applique en chargeant (vérifié champ par champ : une
  // sauvegarde abîmée ne doit jamais casser le jeu).
  function appliquerEtat(donnees) {
    if (!donnees) return;
    if (donnees.inventaire) chargerInventaire(inventaire, donnees.inventaire);
    // Recharger la bonne zone AVANT de valider la position
    if (donnees.zone && ZONES[donnees.zone] && donnees.zone !== zoneActuelle) {
      carte = creerCarte(ZONES[donnees.zone]);
      zoneActuelle = donnees.zone;
      rencontres = creerRencontres();
    }
    if (
      Number.isFinite(donnees.x) && Number.isFinite(donnees.y) &&
      piedsLibres(carte, donnees.x, donnees.y) // jamais dans un mur
    ) {
      heros.x = donnees.x;
      heros.y = donnees.y;
    }
    if (["bas", "gauche", "droite", "haut"].includes(donnees.direction)) {
      heros.direction = donnees.direction;
    }
    // Progression (validée champ par champ), PUIS on recalcule pvMax/vitesse
    // selon les talents AVANT de borner la vie.
    if (Number.isFinite(donnees.niveau) && donnees.niveau >= 1) heros.niveau = Math.floor(donnees.niveau);
    if (Number.isFinite(donnees.xp) && donnees.xp >= 0) heros.xp = Math.floor(donnees.xp);
    if (Number.isFinite(donnees.pointsTalent) && donnees.pointsTalent >= 0) heros.pointsTalent = Math.floor(donnees.pointsTalent);
    if (donnees.talents && typeof donnees.talents === "object") heros.talents = { ...donnees.talents };
    appliquerTalents(heros);
    if (Number.isFinite(donnees.pv)) {
      heros.pv = Math.max(1, Math.min(heros.pvMax, donnees.pv)); // jamais 0 ni au-delà du max
    }
    if (donnees.maitrise) chargerMaitrise(maitrise, donnees.maitrise);
    appliquerEquipement(heros, inventaire, planches);
    mettreAJourCamera(camera, heros, carte, canvas.width, canvas.height);
  }

  const menu = installerMenu({
    obtenirEtat,
    appliquerEtat,
    surChangementPause: (pause) => {
      menuPauseOuvert = pause;
      // En COMBAT, le monde est déjà figé (enPause global) : on fige/défige juste le
      // combat lui-même. Hors combat, on fige le monde comme avant.
      if (combatEnCours) combatEnCours.setPause(pause);
      else enPause = pause;
      if (pause) invite.hidden = true;
    },
  });

  appliquerEtat(donneesInitiales); // reprise choisie au démarrage (sinon null = neuf)
  if (!inventaire.slots.outil) inventaire.slots.outil = "pioche-basique"; // garantit une pioche (test)

  // L'inventaire (touche B) : équiper/déséquiper réapplique le skin + le HUD.
  const inventaireUI = installerInventaire({
    inventaire,
    heros,
    surChangement: () => {
      appliquerEquipement(heros, inventaire, planches);
      if (surChangementMenu) surChangementMenu(); // rafraîchit le menu marchand (vente)
    },
    surFermer: () => {
      if (document.body.classList.contains("en-boutique")) fermerBoutique();
      else basculerInventaire();
    },
    // Jeter un objet — du sac ({ objet }) ou d'un slot équipé ({ slot }). À partir
    // de « rare » → on confirme (pour ne pas perdre un objet de valeur par erreur).
    surJeter: (cible) => {
      const id = cible.objet ? cible.objet.id : inventaire.slots[cible.slot];
      if (!id) return;
      const d = ITEMS[id];
      const jeter = () => {
        if (cible.objet) jeterObjet(inventaire, cible.objet);
        else inventaire.slots[cible.slot] = null;
        appliquerEquipement(heros, inventaire, planches); // si c'était une arme/armure portée
        inventaireUI.rendre();
      };
      if (rareteAuMoins(id, "rare")) {
        demanderConfirmation({
          titre: "Drop this item?",
          message: `${d.nom} (${RARETES[d.rarete]?.nom ?? d.rarete}) will be lost for good.`,
          texteOui: "Drop it",
          texteNon: "Keep it",
          danger: true,
        }, jeter);
      } else {
        jeter();
      }
    },
    // Vendre un objet par glisser-déposer hors du panneau (en boutique seulement).
    surVendre: (objet) => {
      const d = ITEMS[objet.id];
      const vendre = () => {
        const prix = vendreObjet(inventaire, objet);
        afficherMessage(`💰 Sold ${d.nom} for ${prix} 🪙.`);
        inventaireUI.rendre();
        if (surChangementMenu) surChangementMenu();
      };
      if (getPreference("confirmVente") && rareteAuMoins(objet.id, "rare")) {
        demanderConfirmation({
          titre: "Sell this item?",
          message: `${d.nom} (${RARETES[d.rarete]?.nom ?? d.rarete}) · +${prixVente(objet.id)} 🪙`,
          texteOui: "Sell it",
          texteNon: "Keep it",
        }, vendre);
      } else {
        vendre();
      }
    },
  });
  let inventaireOuvert = false;
  function basculerInventaire() {
    if (combatEnCours || dialogueActif() || enTransition) return;
    if (inventaireOuvert) { inventaireOuvert = false; enPause = false; inventaireUI.fermer(); return; }
    // Pour ouvrir : soit rien d'autre n'est ouvert, soit on vient du deck (B
    // depuis le deck) — dans ce cas on referme le deck d'abord.
    if (enPause && !deckOuvert) return; // menu pause ou autre écran déjà ouvert
    if (deckOuvert) { deckOuvert = false; deckUI.fermer(); }
    inventaireOuvert = true; enPause = true; invite.hidden = true; inventaireUI.ouvrir();
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyB" && !e.repeat) { e.preventDefault(); basculerInventaire(); }
  });

  // La consultation du deck (touche N + bouton de l'inventaire). Le deck = miroir
  // de l'équipement ; on l'étudie ici, JAMAIS en combat (effort de mémoire voulu).
  const deckUI = installerDeck({
    inventaire,
    heros,
    maitrise,
    estEnVille: () => zoneActuelle === "city",
    surFermer: () => basculerDeck(),
  });
  let deckOuvert = false;
  function basculerDeck() {
    if (combatEnCours || dialogueActif() || enTransition) return;
    if (deckOuvert) { deckOuvert = false; enPause = false; deckUI.fermer(); return; }
    // Pour ouvrir : soit rien d'autre n'est ouvert, soit on vient de l'inventaire
    // (le bouton 🃏) — dans ce cas on referme l'inventaire d'abord.
    if (enPause && !inventaireOuvert) return; // menu pause ou autre écran déjà ouvert
    if (inventaireOuvert) { inventaireOuvert = false; inventaireUI.fermer(); }
    deckOuvert = true; enPause = true; invite.hidden = true; deckUI.ouvrir();
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyN" && !e.repeat) { e.preventDefault(); basculerDeck(); }
  });
  document.getElementById("inv-deck").addEventListener("click", basculerDeck);

  // L'arbre de talents (touche T) : on y dépense les points gagnés en niveau.
  const talentsUI = installerTalents({
    heros,
    surChangement: () => {}, // debloquer() met le héros à jour ; l'écran se rafraîchit seul
    surFermer: () => basculerTalents(),
  });
  let talentsOuvert = false;
  function basculerTalents() {
    if (combatEnCours || dialogueActif() || enTransition) return;
    if (talentsOuvert) { talentsOuvert = false; enPause = false; talentsUI.fermer(); return; }
    if (enPause) return; // un autre écran est déjà ouvert
    talentsOuvert = true; enPause = true; invite.hidden = true; talentsUI.ouvrir();
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyT" && !e.repeat) { e.preventDefault(); basculerTalents(); }
  });

  // La fenêtre de butin (fin de combat gagné) : on récupère le loot d'un clic / Espace.
  const butinUI = installerButin();

  // Échap : ferme d'abord l'écran ouvert (inventaire, deck, talents, menu pause) ;
  // si rien n'est ouvert, ouvre le menu pause (sauvegarder / quitter).
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Escape" || e.repeat) return;
    // Le menu pause se ferme avec Échap MÊME en combat (le combat a laissé filer la
    // touche). À placer avant le verrou « combat » ci-dessous.
    if (menuPauseOuvert) { e.preventDefault(); menu.fermer(); return; }
    if (combatEnCours || dialogueActif()) return; // sinon le combat capte Échap (ouvre le menu)
    e.preventDefault();
    if (inventaireOuvert) { basculerInventaire(); return; }
    if (deckOuvert) { basculerDeck(); return; }
    if (talentsOuvert) { basculerTalents(); return; }
    if (enPause) return;          // état transitoire (transition de zone, flash) : on ignore
    // En mine, la sauvegarde est INTERDITE (l'état généré n'est pas sérialisé) :
    // on ouvre le menu sans Save/Load, comme en combat.
    menu.ouvrir(zoneCourante.estMine ? { sansSauvegarde: true } : undefined);
  });

  // Espace : parler au PNJ tout proche
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat || enPause || combatEnCours || dialogueActif()) return;
    // Miner une veine à portée (en mine, avec une pioche équipée).
    if (veineProche && !minage && aPioche()) { e.preventDefault(); commencerMinage(veineProche); return; }
    if (zoneActuelle !== "city") return;
    if (fanatique.proche) { e.preventDefault(); parlerAuFanatique(); }
    else if (marchand.proche) { e.preventDefault(); parlerAuMarchand(); }
    else if (fontaine.proche) { e.preventDefault(); parlerALaFontaine(); }
  });

  // Les points d'intérêt : le message vient du catalogue (champ `interet`),
  // affiché une seule fois par passage (pas en boucle tant qu'on reste dessus).
  let surInteret = false;
  function verifierPointsInteret(tuile) {
    const message = tuileDef(tuile.caractere).interet;
    if (message && !surInteret) afficherMessage(message);
    surInteret = Boolean(message);
  }

  // Les portes : marcher sur une tuile-porte fait passer dans la zone reliée.
  let surPorte = false;
  let surEntreeMine = false; // idem pour l'entrée de mine `M` (évite la re-entrée immédiate)
  let surDescente = false;   // idem pour le passage de descente `>`
  function verifierPorte(tuile) {
    if (estPorte(tuile.caractere) && !surPorte && !enTransition) {
      const portail = (zoneCourante.portails || []).find(
        (p) => p.colonne === tuile.colonne && p.ligne === tuile.ligne
      );
      if (portail && zoneCourante.estMine) {
        // Sortie d'une mine : confirmation (l'étage courant n'est pas conservé).
        confirmerEnExploration(
          { titre: "Leave the mine?", message: "You'll head back up to the surface — this level won't be kept.", texteOui: "Leave", texteNon: "Stay" },
          () => allerVersZone(portail.vers, portail.entree),
        );
      } else if (portail) {
        allerVersZone(portail.vers, portail.entree);
      }
    }
    surPorte = estPorte(tuile.caractere);
  }

  // `zoneOuId` peut être un ID de zone STATIQUE (data/zones.js) OU un OBJET zone
  // déjà construit (ex. une mine générée). `assetZone` = l'id servant aux ASSETS
  // (fonds + musique de combat) ; pour une mine, c'est la zone d'origine.
  async function allerVersZone(zoneOuId, entree) {
    if (enTransition) return;
    enTransition = true;
    enPause = true;
    await fondu(1);                  // écran au noir
    const statique = typeof zoneOuId === "string";
    const zone = statique ? ZONES[zoneOuId] : zoneOuId;
    const assetZone = statique ? zoneOuId : (zone.assetZone ?? "city");
    carte = creerCarte(zone);
    zoneActuelle = assetZone;
    zoneCourante = zone;
    prechargerFonds(assetZone);          // télécharge les fonds pendant l'explo
    prechargerMusiquesCombat(assetZone); // idem pour les musiques de combat
    poserHeros(heros, entree.colonne, entree.ligne);
    rencontres = creerRencontres();  // période de grâce fraîche dans la zone
    veines = zone.veines ?? [];      // veines minables (mine) ; vide ailleurs
    minage = null; veineProche = null;
    surPorte = true;                 // on arrive : ne pas re-déclencher une porte…
    surEntreeMine = true;            // … ni une entrée de mine si on atterrit dessus
    surDescente = true;              // … ni un passage de descente
    mettreAJourCamera(camera, heros, carte, canvas.width, canvas.height);
    afficherMessage(carte.nom);
    const musique = zone.musique ?? null;
    if (musique) jouerMusique(musique); else arreterMusique();
    await fondu(0);                  // on rouvre l'écran
    enPause = false;
    enTransition = false;
  }

  // Entrée de mine : marcher sur une tuile `M` GÉNÈRE une mine et y descend.
  // (Comme une porte, mais vers une zone FABRIQUÉE au lieu d'une zone statique.)
  function verifierEntreeMine(tuile) {
    if (tuile.caractere === "M" && !surEntreeMine && !enTransition && !zoneCourante.estMine) {
      entrerEnMine(tuile);
    }
    surEntreeMine = tuile.caractere === "M";
  }
  function entrerEnMine(tuile) {
    const mine = genererMine({
      monstres: zoneCourante.monstres ?? ["gobelin", "gobelin-vif", "gobelin-chaman"],
      musique: zoneCourante.musique,   // ambiance d'explo réutilisée (Phase 1)
      assetZone: zoneActuelle,         // fonds + musique de combat de la zone d'origine
      // Sortie : on revient SUR l'entrée `M` (le garde `surEntreeMine` posé à
      // l'arrivée évite de re-rentrer aussitôt, comme pour les portes).
      retour: { vers: zoneActuelle, entree: { colonne: tuile.colonne, ligne: tuile.ligne } },
    });
    allerVersZone(mine, mine.depart);
  }

  // Confirmation EN EXPLORATION : fige le monde le temps de répondre (sinon on
  // continuerait à marcher derrière la modale).
  function confirmerEnExploration(opts, surOui) {
    enPause = true;
    demanderConfirmation(opts, () => { enPause = false; surOui(); }, () => { enPause = false; });
  }

  // Passage de descente `>` : marcher dessus propose de descendre d'un étage
  // (plus profond = minerais plus rares). Descente IRRÉVERSIBLE (on ne remonte pas).
  function verifierDescente(tuile) {
    if (tuile.caractere === ">" && !surDescente && !enTransition && zoneCourante.estMine) {
      confirmerEnExploration(
        {
          titre: "Go deeper?",
          message: "A passage sinks into the depths. ⚠ You won't be able to climb back to this level. Explore it?",
          texteOui: "Descend", texteNon: "Stay", danger: true,
        },
        descendre,
      );
    }
    surDescente = tuile.caractere === ">";
  }
  function descendre() {
    const mine = genererMine({
      niveau: (zoneCourante.niveau ?? 1) + 1,
      monstres: zoneCourante.monstres,
      musique: zoneCourante.musique,
      assetZone: zoneActuelle,
      retour: zoneCourante.retour,        // la sortie ramène toujours à l'ENTRÉE DU MONDE
      materiaux: zoneCourante.materiaux,  // même table de drop (même grotte)
    });
    allerVersZone(mine, mine.depart);
  }

  // --- Minage des veines (en mine) -----------------------------------------
  function aPioche() { return Boolean(inventaire.slots.outil); }
  function veineLaPlusProche() {
    const hx = heros.x + 32, hy = heros.y + 54;
    let best = null, bestD = 42; // portée ≈ 1,3 tuile
    for (const v of veines) {
      const vx = v.col * TUILE + TUILE / 2, vy = v.lig * TUILE + TUILE / 2;
      const d = Math.hypot(hx - vx, hy - vy);
      if (d < bestD) { bestD = d; best = v; }
    }
    return best;
  }
  function commencerMinage(v) {
    minage = { veine: v, t: 0, duree: 0.55 }; // ≈ 0,55 s figé par coup de pioche
    jouerSonPierre();
  }
  function avancerMinage(dt) {
    minage.t += dt;
    if (minage.t < minage.duree) return; // encore en train de frapper
    const v = minage.veine;
    const nom = itemDef(v.type)?.nom ?? v.type;
    // Le minerai va dans le SAC (objet empilable). Sac plein → le coup ne compte pas.
    if (!ajouterObjet(inventaire, v.type, 1)) {
      afficherMessage("Inventory full!");
      minage = null;
      return;
    }
    const total = inventaire.objets
      .filter((o) => o.id === v.type)
      .reduce((s, o) => s + (o.quantite ?? 1), 0);
    v.coups--;
    if (v.coups <= 0) {                      // filon épuisé → il disparaît
      veines = veines.filter((x) => x !== v);
      afficherMessage(`⛏ +1 ${nom} (×${total}) — vein depleted`);
    } else {
      afficherMessage(`⛏ +1 ${nom} (×${total})`);
    }
    minage = null;
  }
  function dessinerVeine(ctx, v) {
    const x = v.col * TUILE, y = v.lig * TUILE;
    const col = itemDef(v.type)?.icone ?? "#aaa";
    ctx.fillStyle = "#241f1a"; // gangue (roche sombre)
    ctx.fillRect(x + 5, y + 7, TUILE - 10, TUILE - 11);
    ctx.fillStyle = col;       // pépites de minerai
    ctx.fillRect(x + 9, y + 11, 5, 5);
    ctx.fillRect(x + 18, y + 13, 6, 6);
    ctx.fillRect(x + 13, y + 19, 4, 4);
    if (v === veineProche) {   // à portée de minage → liseré doré
      ctx.strokeStyle = "#ffcf57"; ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 6, TUILE - 8, TUILE - 10);
    }
  }

  // Les rencontres : sur les tuiles de souterrain, un monstre invisible surgit.
  // Flash façon FF9, puis bascule sur l'écran de combat.
  async function declencherRencontre() {
    // Le groupe est composé à partir des monstres de la ZONE courante : taille
    // (30/30/20/15/5) et types tirés au sort, range placés à l'arrière. Si la
    // zone n'a aucun monstre déclaré, pas de combat.
    const ennemis = composerGroupe(zoneCourante?.monstres);
    if (ennemis.length === 0) return;
    enPause = true;                 // le monde se fige pendant le flash
    await flashCombat();
    combatEnCours = demarrerCombat({
      ctx, heros, inventaire, planches, ennemis, maitrise,
      fond: fondCombat(zoneActuelle), // un fond tiré dans la bibliothèque de la zone
      // Échap en combat : ouvre le menu pause (réglages son), SANS Save/Load.
      surPause: () => menu.ouvrir({ sansSauvegarde: true }),
      surFin: (resultat) => {
        combatEnCours = null;
        if (resultat === "defaite") {
          // Pas encore mort : on se réveille en ville, à 1 PV (à soigner).
          heros.pv = 1;
          afficherMessage("💀 You collapse... and wake up back in Brütàl.");
          allerVersZone("city", CITY.depart); // retour sûr (gère le fondu + la musique)
        } else if (resultat === "fuite") {
          // Fuite réussie : retour à l'exploration, AUCUNE récompense (ni or, ni XP,
          // ni butin). On restaure l'ambiance de la zone et on rafraîchit la période
          // de grâce des rencontres pour ne pas être re-happé dans un combat aussitôt.
          const ambiance = zoneCourante?.musique ?? null;
          if (ambiance) jouerMusique(ambiance); else arreterMusique();
          rencontres = creerRencontres();
          afficherMessage("🏃 You fled the battle.");
          enPause = false; // IMPORTANT : le monde était figé (ligne ~655) → on le relance
        } else {
          // Fin de la baston : on quitte la musique de combat pour revenir à
          // l'ambiance d'exploration de la zone (silence si elle n'en a pas).
          const ambiance = zoneCourante?.musique ?? null;
          if (ambiance) jouerMusique(ambiance); else arreterMusique();
          // Victoire : on calcule le butin (sans l'appliquer) et on l'affiche dans
          // une fenêtre centrée. Le joueur le récupère (clic / Espace). Le monde
          // reste figé (enPause) tant qu'il n'a pas récupéré.
          let or = 0, xp = 0;
          const items = [];
          for (const e of ennemis) {
            const butin = tirerButin(e);
            or += butin.or;
            xp += e.xp || 0;
            items.push(...butin.objets);
          }
          // L'XP est appliquée TOUT DE SUITE (le héros est à jour pour la suite) ;
          // on mémorise l'état d'avant pour que la fenêtre REJOUE la montée animée
          // (barre d'XP qui se remplit + éclats dorés au passage de niveau).
          const xpAvant = heros.xp, niveauAvant = heros.niveau;
          const niveaux = gagnerXp(heros, xp);
          // On ouvre l'inventaire À CÔTÉ du butin (place restante + organisation).
          document.body.classList.add("en-butin");
          inventaireUI.ouvrir();
          butinUI.ouvrir({ or, xp, items, xpAnim: { niveauDepart: niveauAvant, xpDepart: xpAvant, gain: xp } }, {
            prendre: (id) => {
              const ok = ajouterObjet(inventaire, id); // range l'objet, false si sac plein
              if (ok) inventaireUI.rendre();            // l'objet apparaît tout de suite
              return ok;
            },
            surFin: () => {
              ajouterOr(inventaire, or); // l'XP, elle, a déjà été appliquée (montée animée)
              if (niveaux > 0) afficherMessage(`⬆ Lvl ${heros.niveau} (+${niveaux} talent pt)`);
              document.body.classList.remove("en-butin");
              inventaireUI.fermer();
              enPause = false;
            },
          });
        }
      },
    });
  }

  // La barre de menu (bas-droite, façon RPG) : raccourcis vers les écrans. Chaque
  // bascule vérifie elle-même si l'action est possible (combat, etc.). Sa
  // visibilité est gérée par image dans la boucle (cachée en combat / écran ouvert).
  const barreMenu = document.getElementById("barre-menu");
  document.getElementById("barre-inv").addEventListener("click", basculerInventaire);
  document.getElementById("barre-talents").addEventListener("click", basculerTalents);
  document.getElementById("barre-deck").addEventListener("click", basculerDeck);
  document.getElementById("barre-menu-pause").addEventListener("click", () => {
    if (combatEnCours || dialogueActif() || enPause) return;
    menu.ouvrir();
  });

  lancerBoucle({
    mettreAJour(dt) {
      // La barre de menu n'est visible qu'en exploration libre (pas en combat,
      // pas quand un écran/menu est ouvert).
      barreMenu.hidden = Boolean(combatEnCours) || enPause;
      // Pendant un combat, c'est lui qui pilote tout (le monde est figé)
      if (combatEnCours) { combatEnCours.mettreAJour(dt); return; }
      if (enPause) return;          // figé : menu ouvert ou transition en cours
      // Minage en cours : le héros est FIGÉ le temps du coup de pioche.
      if (minage) avancerMinage(dt);
      else mettreAJourHeros(heros, clavier, dt, carte);
      const tuile = tuileSousLesPieds(carte, heros);
      verifierPointsInteret(tuile);
      verifierPorte(tuile);
      verifierEntreeMine(tuile); // marcher sur `M` descend dans une mine générée
      verifierDescente(tuile);   // marcher sur `>` descend d'un étage (en mine)
      if (!minage && avancerRencontres(rencontres, tuile, heros.evasionRencontre || 0, zoneCourante.tauxRencontre ?? 1)) {
        // Musique lancée immédiatement — au tout premier instant où le jeu sait
        // qu'une rencontre a lieu, avant même le flash ou la composition du groupe.
        const mc = musiqueCombat(zoneActuelle);
        if (mc) jouerMusiqueFichier(mc);
        declencherRencontre();
      }
      if (zoneActuelle === "city") {
        mettreAJourPnj(fanatique, dt, heros);
        mettreAJourPnj(marchand, dt, heros);
        fontaine.t += dt;
        fontaine.proche =
          Math.abs((heros.x + 32) - fontaine.cx) < 46 &&
          Math.abs((heros.y + 54) - fontaine.solY) < 46;
      }
      // Veine minable la plus proche (en mine) → surbrillée en doré (dessinerVeine).
      veineProche = (zoneCourante.estMine && !minage) ? veineLaPlusProche() : null;
      // L'invite « parler » s'affiche quand on est à portée d'un PNJ / de la fontaine
      invite.hidden = !(zoneActuelle === "city" &&
        (fanatique.proche || marchand.proche || fontaine.proche));
      mettreAJourCamera(camera, heros, carte, canvas.width, canvas.height);
      alerteVie(heros.pv / heros.pvMax); // liseré rouge si la vie est basse
    },
    dessiner() {
      if (combatEnCours) { combatEnCours.dessiner(); return; } // la scène de combat
      ctx.fillStyle = "#0b0a08";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      // Tout est dessiné dans le repère du monde, décalé par la caméra
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
      dessinerCarte(ctx, carte, camera, canvas.width, canvas.height);
      // Les PNJ n'existent que dans la ville. Profondeur : on dessine héros et
      // PNJ du plus « haut » (pieds les plus en arrière) au plus « bas ».
      if (zoneActuelle === "city") {
        const acteurs = [
          { pieds: fontaine.solY, dessiner: () => dessinerFontaine(ctx, fontaine) },
          { pieds: piedsPnj(fanatique), dessiner: () => dessinerPnj(ctx, fanatique) },
          { pieds: piedsPnj(marchand), dessiner: () => dessinerPnj(ctx, marchand) },
          { pieds: heros.y + 54, dessiner: () => dessinerHeros(ctx, heros) },
        ];
        acteurs.sort((a, b) => a.pieds - b.pieds);
        for (const a of acteurs) a.dessiner();
      } else if (veines.length) {
        // En mine : veines + héros, triés par profondeur (pieds) pour le chevauchement.
        const acteurs = [
          ...veines.map((v) => ({ pieds: v.lig * TUILE + TUILE, dessiner: () => dessinerVeine(ctx, v) })),
          { pieds: heros.y + 54, dessiner: () => dessinerHeros(ctx, heros) },
        ];
        acteurs.sort((a, b) => a.pieds - b.pieds);
        for (const a of acteurs) a.dessiner();
      } else {
        dessinerHeros(ctx, heros);
      }
      ctx.restore();
    },
  });
}
