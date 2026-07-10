// Point d'entrée du jeu : assemble les briques et démarre la boucle.

import { lancerBoucle } from "./core/boucle.js";
import { clavier } from "./core/clavier.js";
import { chargerImage } from "./core/sprites.js";
import { RES, police } from "./core/texte.js"; // réglages centraux : résolution + polices
import { creerCamera, mettreAJourCamera } from "./core/camera.js";
import { creerHeros, mettreAJourHeros, dessinerHeros } from "./entities/heros.js";
import { creerCarte, dessinerCarte, piedsLibres, tuileSousLesPieds, revelerAutour, estVu, peindreMasqueBrouillard, TUILE } from "./world/carte.js";
import { genererMine } from "./world/mine.js";
import { CITY, ZONES } from "./data/zones.js";
import { tuileDef, estPorte } from "./data/tuiles.js";
import { ITEMS, itemDef, prixVente, RARETES, rareteAuMoins, distributionMinerais } from "./data/items.js";
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
import { FANATIQUE, MARCHAND, FORGERON, COURTIER, COMMISSAIRE } from "./data/pnj.js";
import { installerForge, ouvrirForge, forgeActive } from "./ui/forge.js";
import { installerHV, ouvrirHV, hvActive, phraseCourtier } from "./ui/hv.js";
import { creerMarche, tickMarche, etatMarche, chargerMarche, valeurReelle } from "./systems/marche.js";
import {
  BATIMENTS, creerBatiments, possede, etatBatiment,
  tickBatiments, etatBatiments, chargerBatiments, stockTotal,
} from "./systems/batiments.js";
import { installerBatiment, ouvrirBatiment } from "./ui/batiment.js";
import {
  creerTemps, tickTemps, phase, numeroJour, positionCycle, tempsAvantSoir,
  enFenetreInscription, DUREE_JOUR, etatTemps, chargerTemps,
} from "./systems/temps.js";
import {
  TICKET, FENETRE_ENTREE, creerEncheres, aTicket, acheterTicket, genererLots,
  lotDepot, resoudreHorsEcran, depotAcceptable, etatEncheres, chargerEncheres,
} from "./systems/encheres.js";
import { installerEncheres, ouvrirEncheres, enchereActive } from "./ui/encheres.js";
import { installerHorloge, dessinerHorloge, montrerHorloge } from "./ui/horloge.js";
import { installerParchemin, ouvrirParchemin } from "./ui/parchemin.js";
import {
  creerBibliotheque, decouvrir, etatBibliotheque, chargerBibliotheque,
} from "./systems/bibliotheque.js";
import { installerLivre, ouvrirLivre, livreActif } from "./ui/livre.js";
import {
  creerRunProfondeur, tirerChoix, appliquerLoot, etageSuivant,
  bonusCombatRun, runActif, resumeRun,
} from "./systems/profondeur.js";
import { installerChoixProfondeur, ouvrirChoixProfondeur } from "./ui/profondeur.js";
import { creerPnj, mettreAJourPnj, dessinerPnj, piedsPnj, regarderHeros } from "./entities/pnj.js";
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
// Suréchantillonnage : le canvas a une résolution interne RES× plus grande que le
// repère logique (VUE). Le monde reste dessiné en coordonnées 960×540, mais rendu
// à RES× → le TEXTE (anti-aliasé par le navigateur) devient net au lieu d'être
// agrandi en gros pixels. Les sprites gardent `imageSmoothingEnabled=false`
// (nearest-neighbor) : rendu final identique, juste calculé à RES×.
// RES est défini dans core/texte.js (réglages centraux police + résolution).
function ajusterEchelle() {
  canvas.width = VUE.l * RES;
  canvas.height = VUE.h * RES;
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
  const aPlanche = [...Object.values(ITEMS), ...ENNEMIS, FANATIQUE, MARCHAND, FORGERON].filter((o) => o.planche);
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
  const RAYON_VUE = 5;         // brouillard de guerre (mine) : rayon de découverte, en cases
  let fogCanvas = null, fogCtx = null; // masque basse résolution du brouillard (1 px = 1 case), réutilisé
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
  // Le MARCHÉ (Hôtel des ventes) : prix vivants des ressources + annonces d'objets.
  // Son horloge n'avance qu'en JEU ACTIF (cf. le tick en tête de mettreAJour).
  const marche = creerMarche();
  // Les BÂTIMENTS à acheter (revenu passif à récolter) — cf. systems/batiments.js.
  const batiments = creerBatiments();
  // Le CYCLE JOUR/NUIT de la cité (1 h de jour + 30 min de nuit, en jeu actif).
  const temps = creerTemps();
  // La VENTE AUX ENCHÈRES du soir (ticket, dépôt, gains en attente).
  const encheres = creerEncheres();
  // Le LIVRE D'ARTISANAT : les recettes DÉCOUVERTES (parchemin lu ou objet forgé
  // par hasard). S'alimente tout seul ; consultable à la touche L.
  const bibliotheque = creerBibliotheque();
  // Le RUN de profondeur : buffs accumulés pendant une descente en mine (null hors
  // mine). Créé à l'entrée, jeté à la sortie/mort. Non sauvegardé (comme la mine).
  let runProfondeur = null;
  // La bulle d'info lit l'équipement courant pour colorer les pièces d'un set.
  definirSourceEquipement(() => inventaire.slots);
  inventaire.slots.armure = "tenue-de-voyageur"; // habits de base (corps)
  inventaire.slots.outil = "pioche-basique";     // pioche de base : permet de miner
  // On démarre VRAIMENT sans arme (sac vide) : il faut looter/forger sa 1re arme.
  // En attendant, le deck de base (Tap + Brace) sert de filet (cf. cartesDeBase).
  appliquerEquipement(heros, inventaire, planches);
  appliquerTalents(heros); // vie max / vitesse selon les talents (aucun au départ)
  const maitrise = creerMaitrise();

  // Apprendre une recette (parchemin lu ou objet forgé par hasard) : on l'ajoute
  // au livre et, si c'est une VRAIE nouveauté, on prévient le joueur.
  function apprendreRecette(resultatId) {
    if (decouvrir(bibliotheque, resultatId)) {
      const nom = itemDef(resultatId)?.nom ?? resultatId;
      afficherMessage(`✨ Recette apprise : ${nom} — voir le Livre d'artisanat (L).`);
    }
  }

  let enPause = false;
  let enTransition = false;
  let combatEnCours = null;        // non-null = on est en combat
  let menuPauseOuvert = false;     // le menu pause (Échap) est-il ouvert ?

  // Luc l'hérétique : IMMOBILE, garé JUSTE SOUS la porte de sortie (colonne 42,
  // rangée 15) pour ne plus gêner les déplacements de test. (Avant, il arpentait la
  // rangée 13 et bloquait le chemin vers le marchand/la mine.) Stationnaire =
  // xMin = xMax = x (comme le marchand). Sprite 104×88 → offset −36 pour le centrer.
  const fanatique = creerPnj({
    modele: FANATIQUE,
    planche: planches.get(FANATIQUE.planche),
    x: 42 * TUILE - 36,
    y: 15 * TUILE - 72,
    xMin: 42 * TUILE - 36,
    xMax: 42 * TUILE - 36,
  });
  // Renaud (marchand de TEST), STATIONNAIRE près de la sortie (rangée 11).
  // Sprite 104×88 → offsets pour le centrer sur la tuile (−36) et poser ses pieds
  // à la même hauteur qu'avant (rangée 11,5 → −72).
  const marchand = creerPnj({
    modele: MARCHAND,
    planche: planches.get(MARCHAND.planche),
    x: 38 * TUILE - 36,
    y: 11 * TUILE - 72,
    xMin: 38 * TUILE - 36,
    xMax: 38 * TUILE - 36,
  });
  // Ferran le forgeron, STATIONNAIRE (rangée 11, à droite du marchand). Lui parler
  // ouvre la FORGE (nouvel arc de gameplay). Même sprite/offsets que le marchand.
  const forgeron = creerPnj({
    modele: FORGERON,
    planche: planches.get(FORGERON.planche),
    x: 32 * TUILE - 36,
    y: 11 * TUILE - 72,
    xMin: 32 * TUILE - 36,
    xMax: 32 * TUILE - 36,
  });
  // Baldrik le courtier (HÔTEL DES VENTES), STATIONNAIRE (rangée 11, à gauche du
  // forgeron — la « place du marché »). Lui parler ouvrira l'HV (pilier économie).
  const courtier = creerPnj({
    modele: COURTIER,
    planche: planches.get(COURTIER.planche),
    x: 26 * TUILE - 36,
    y: 11 * TUILE - 72,
    xMin: 26 * TUILE - 36,
    xMax: 26 * TUILE - 36,
  });
  // Magnar le commissaire-priseur (VENTE AUX ENCHÈRES du soir), STATIONNAIRE
  // (rangée 11, à gauche du courtier — le coin chic de la place du marché).
  // Contenu tardif : sans le talent « Title of Nobility », il vous éconduit.
  const commissaire = creerPnj({
    modele: COMMISSAIRE,
    planche: planches.get(COMMISSAIRE.planche),
    x: 21 * TUILE - 36,
    y: 11 * TUILE - 72,
    xMin: 21 * TUILE - 36,
    xMax: 21 * TUILE - 36,
  });
  // FONTAINE (build de TEST) : près de la porte de sortie. On lui parle
  // pour gagner 1 niveau d'un coup → tester l'arbre de talents sans farmer.
  const fontaine = {
    cx: 35 * TUILE + TUILE / 2, // centre x (monde)
    solY: 12 * TUILE,           // base/pieds (profondeur + dessin)
    proche: false,
    t: 0,
  };

  // LA SCIERIE (1er bâtiment à acheter) : le bloc de murs cols 15-16 / rangées
  // 9-10 lui sert de corps (le vrai visuel viendra plus tard — on dessine une
  // façade placeholder par-dessus). Devant, un PANNEAU planté au sol : c'est LUI
  // qu'on lit ([Space]) pour acheter le bâtiment, puis pour récolter le revenu.
  const SCIERIE_BLOC = { x: 15 * TUILE, y: 9 * TUILE, l: 2 * TUILE, h: 2 * TUILE };
  const panneauScierie = {
    cx: 16 * TUILE,             // centré sous la façade
    solY: 11 * TUILE + 14,      // pieds du poteau (profondeur + dessin)
    proche: false,
    t: 0,                       // anime la pastille « or à récolter »
  };
  // La TANNERIE : même principe, bloc de murs symétrique de l'autre côté de la place.
  const TANNERIE_BLOC = { x: 28 * TUILE, y: 9 * TUILE, l: 2 * TUILE, h: 2 * TUILE };
  const panneauTannerie = { cx: 29 * TUILE, solY: 11 * TUILE + 14, proche: false, t: 0 };

  // Obstacles PLEINS de la ville : on ne traverse pas les PNJ ni la fontaine.
  // Chaque boîte est au niveau des PIEDS (on peut donc chevaucher les têtes en
  // s'approchant ; la profondeur d'affichage gère qui passe devant). Recalculée
  // à chaque frame (le fanatique se déplace). Vide hors de la ville.
  function obstaclesVille() {
    if (zoneActuelle !== "city") return [];
    const boitePnj = (p) => {
      const s = p.modele.sprite;
      return { x: p.x + s.caseL / 2 - 16, y: p.y + s.caseH - 26, w: 32, h: 18 };
    };
    return [
      boitePnj(fanatique), boitePnj(marchand), boitePnj(forgeron), boitePnj(courtier),
      boitePnj(commissaire),
      { x: fontaine.cx - 20, y: fontaine.solY - 16, w: 40, h: 22 },
      // Le panneau de la scierie : petit poteau planté au sol, on ne le traverse pas.
      { x: panneauScierie.cx - 12, y: panneauScierie.solY - 8, w: 24, h: 10 },
      { x: panneauTannerie.cx - 12, y: panneauTannerie.solY - 8, w: 24, h: 10 },
    ];
  }
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

  // Façade PLACEHOLDER de la scierie, dessinée par-dessus son bloc de murs :
  // planches de bois + porte + lame de scie, pour qu'on repère le bâtiment en
  // attendant le vrai visuel.
  function dessinerScierie(ctx) {
    const { x, y, l, h } = SCIERIE_BLOC;
    ctx.fillStyle = "#4a3421";                  // mur en planches
    ctx.fillRect(x, y, l, h);
    ctx.fillStyle = "#3a2818";                  // lignes des planches
    for (let i = 1; i < 4; i++) ctx.fillRect(x, y + i * (h / 4), l, 2);
    ctx.fillStyle = "#2a1d10";                  // auvent (haut)
    ctx.fillRect(x - 3, y - 4, l + 6, 8);
    ctx.fillStyle = "#241708";                  // porte
    ctx.fillRect(x + l / 2 - 8, y + h - 24, 16, 24);
    // Lame de scie circulaire (l'enseigne du métier), côté gauche.
    const sx = x + 16, sy = y + 18;
    ctx.fillStyle = "#8f8f96";
    ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c9c9d2";                  // dents (4 crans clairs)
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      ctx.fillRect(sx + Math.cos(a) * 8 - 2, sy + Math.sin(a) * 8 - 2, 4, 4);
    }
    ctx.fillStyle = "#4a3421";                  // moyeu
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
  }

  // Façade PLACEHOLDER de la tannerie : mur de torchis + porte + une PEAU tendue
  // sur un cadre (l'enseigne du tanneur), en attendant le vrai visuel.
  function dessinerTannerie(ctx) {
    const { x, y, l, h } = TANNERIE_BLOC;
    ctx.fillStyle = "#5a4632";                  // mur (torchis brun)
    ctx.fillRect(x, y, l, h);
    ctx.fillStyle = "#463525";                  // colombages
    ctx.fillRect(x, y + h * 0.5, l, 2);
    ctx.fillRect(x + l / 2 - 1, y, 2, h);
    ctx.fillStyle = "#2a1d10";                  // auvent
    ctx.fillRect(x - 3, y - 4, l + 6, 8);
    ctx.fillStyle = "#241708";                  // porte
    ctx.fillRect(x + l / 2 - 8, y + h - 24, 16, 24);
    // Peau tendue sur un cadre (côté gauche) : losange de cuir + lanières.
    const sx = x + 16, sy = y + 18;
    ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 2;    // cadre
    ctx.strokeRect(sx - 9, sy - 9, 18, 18);
    ctx.fillStyle = "#9a6a3a";                          // la peau (cuir clair)
    ctx.beginPath();
    ctx.moveTo(sx, sy - 8); ctx.lineTo(sx + 8, sy); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx - 8, sy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#6a4020"; ctx.lineWidth = 1;    // lanières
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(sx - 9, sy + i * 4); ctx.lineTo(sx - 8, sy + i * 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 8, sy + i * 4); ctx.lineTo(sx + 9, sy + i * 4); ctx.stroke();
    }
  }

  // Le PANNEAU devant la scierie : écriteau sur poteau. Avant l'achat il affiche
  // « FOR SALE » ; après, « SAWMILL » + une pastille dorée qui pulse quand la
  // trésorerie a de l'or à récolter (rouge clignotant si elle est PLEINE :
  // production à l'arrêt — viens vider la caisse !).
  function dessinerPanneauBatiment(ctx, p, batId, label) {
    const cx = p.cx, by = p.solY;
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";      // ombre au sol
    ctx.beginPath(); ctx.ellipse(cx, by, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5a4126";                  // poteau
    ctx.fillRect(cx - 2, by - 26, 4, 26);
    ctx.fillStyle = "#6d4f2c";                  // écriteau
    ctx.fillRect(cx - 25, by - 44, 50, 20);
    ctx.strokeStyle = "#3a2818"; ctx.lineWidth = 2;
    ctx.strokeRect(cx - 25, by - 44, 50, 20);
    ctx.save();
    ctx.font = police(9);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (!possede(batiments, batId)) {
      ctx.fillStyle = "#ffe9b0";
      ctx.fillText("FOR SALE", cx, by - 34);
    } else {
      ctx.fillStyle = "#e8d9b0";
      ctx.fillText(label, cx, by - 34);
      const b = etatBatiment(batiments, batId);
      const plein = b && b.tresorerie >= BATIMENTS[batId].tresorerieMax;
      if (b && (b.tresorerie > 0 || stockTotal(b) > 0)) {
        // Pastille au-dessus du panneau : or à récolter (dorée) / caisse pleine (rouge).
        const pulse = 0.6 + 0.4 * Math.sin(p.t * (plein ? 9 : 4));
        ctx.fillStyle = plein ? `rgba(255, 90, 70, ${pulse})` : `rgba(255, 207, 87, ${pulse})`;
        ctx.beginPath(); ctx.arc(cx + 20, by - 48, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  const invite = document.getElementById("invite");
  const hudInfo = document.getElementById("hud-info");
  const hudEtage = document.getElementById("hud-etage");
  const veineLabel = document.getElementById("veine-label");

  // Parler au fanatique : un petit laïus, puis un choix (se faire soigner ou partir).
  function parlerAuFanatique() {
    if (dialogueActif() || combatEnCours || enPause) return;
    regarderHeros(fanatique, heros); // il se tourne vers le héros PENDANT qu'on lui parle
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

  // Parler à Ferran le forgeron : mot de bienvenue, puis on peut ouvrir la FORGE
  // (espace plein écran). L'atelier lui-même est encore un placeholder.
  function parlerAuForgeron() {
    if (dialogueActif() || combatEnCours || enPause) return;
    regarderHeros(forgeron, heros); // il se tourne vers le héros PENDANT qu'on lui parle
    enPause = true;
    invite.hidden = true;
    ouvrirDialogue({
      nom: "Ferran le forgeron",
      texte: [
        "Bienvenue à la forge, nain. Le feu ne dort jamais, ici.",
        "Apporte-moi minerai et volonté — ensemble, on façonnera ton acier.",
      ],
      choix: [
        { texte: "⚒  Forger", action: () => ouvrirForge(inventaire, heros, () => { enPause = false; }, { surDecouverte: apprendreRecette, bibliotheque }) },
        { texte: "Plus tard", action: () => {} },
      ],
    }, () => { if (!forgeActive()) enPause = false; });
  }

  // Parler à la fontaine (build de TEST) : monter d'un niveau d'un coup pour
  // essayer l'arbre de talents sans devoir farmer des combats.
  // Parler à Baldrik le courtier : mot d'accueil, puis on ouvre l'HÔTEL DES
  // VENTES (l'écran du pilier économie). S'il y a un événement de marché en
  // cours, son accueil GLISSE L'INDICE (cf. phraseCourtier dans ui/hv.js).
  function parlerAuCourtier() {
    if (dialogueActif() || combatEnCours || enPause) return;
    regarderHeros(courtier, heros); // il se tourne vers le héros PENDANT qu'on lui parle
    enPause = true;
    invite.hidden = true;
    // Sans le titre de CITOYEN, le courtier refuse l'accès à l'Hôtel des ventes.
    if (!heros.citoyen) {
      ouvrirDialogue({
        nom: "Baldrik the Broker",
        texte: [
          "“The Deep-Market Exchange trades with CITIZENS of Brütàl, friend — not with drifters.”",
          "“Earn your Citizenship — see the talent masters — and my ledgers are yours.”",
        ],
        choix: [{ texte: "Leave", action: () => {} }],
      }, () => { enPause = false; });
      return;
    }
    ouvrirDialogue({
      nom: "Baldrik the Broker",
      texte: phraseCourtier(marche),
      choix: [
        { texte: "📈  Trade", action: () => ouvrirHV(inventaire, marche, () => { enPause = false; }) },
        { texte: "Later", action: () => {} },
      ],
    }, () => { if (!hvActive()) enPause = false; });
  }

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

  // Lire le PANNEAU de la scierie : ouvre l'ÉCRAN BÂTIMENT (ui/batiment.js) —
  // la fiche claire du bâtiment (à vendre / possédé) avec ses jauges. Le MONDE
  // se fige (le héros ne bouge plus) mais l'horloge économie continue (comme
  // partout hors menu pause) — on regarde la production avancer en direct.
  function lirePanneauBatiment(batId) {
    if (dialogueActif() || combatEnCours || enPause) return;
    enPause = true;
    invite.hidden = true;
    ouvrirBatiment(batId, batiments, inventaire, () => { enPause = false; });
  }

  // ----- Magnar le commissaire-priseur (vente aux enchères du soir) ---------

  // Minutes de jeu lisibles (« 12 min » / « 1 h 05 »).
  function fmtTempsJeu(s) {
    if (s < 90) return `${Math.max(1, Math.round(s))} s`;
    const m = Math.ceil(s / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
  }

  function parlerAuCommissaire() {
    if (dialogueActif() || combatEnCours || enPause) return;
    regarderHeros(commissaire, heros); // il se tourne vers le héros PENDANT qu'on lui parle
    enPause = true;
    invite.hidden = true;
    menuCommissaire();
  }

  // Le dialogue reste figé tant qu'un sous-menu ou l'écran d'enchères est ouvert.
  const finCommissaire = () => { if (!dialogueActif() && !enchereActive()) enPause = false; };

  function menuCommissaire() {
    // Sans titre de noblesse : la porte reste fermée (contenu tardif).
    if (!heros.noblesse) {
      ouvrirDialogue({
        nom: "Magnar the Auctioneer",
        texte: [
          "“The evening auctions are for the TITLED of Brütàl, stranger.”",
          "“Earn yourself a Title of Nobility — see the talent masters — and we shall talk business.”",
        ],
        choix: [{ texte: "Leave", action: () => {} }],
      }, finCommissaire);
      return;
    }
    const jour = numeroJour(temps);
    const nuit = phase(temps) === "nuit";
    const attente = tempsAvantSoir(temps);
    const porteOuverte = nuit && positionCycle(temps) < DUREE_JOUR + FENETRE_ENTREE &&
      aTicket(encheres, jour) && encheres.derniereVenteJouee < jour;

    const texte = [];
    if (porteOuverte) {
      texte.push("“You made it, my lord. The hall is warming up — shall we go in?”");
    } else if (nuit) {
      texte.push(encheres.derniereVenteJouee >= jour
        ? "“Quite a show tonight, wasn't it? Come back tomorrow evening.”"
        : "“The doors are shut — tonight's auction goes on without you. There is always tomorrow.”");
    } else if (enFenetreInscription(temps)) {
      texte.push(`“The auction starts at dusk — in ${fmtTempsJeu(attente)} of play. Registrations are OPEN, my lord.”`);
    } else {
      texte.push(`“Next auction at dusk, in ${fmtTempsJeu(attente)} of play. Registrations open shortly before — don't be late.”`);
    }
    if (encheres.depots.length) {
      const noms = encheres.depots.map((d) => ITEMS[d.id].nom).join(", ");
      texte.push(`“Consigned for the next sale: ${noms}. The room will decide their fate.”`);
    }

    const choix = [];
    // Gains / lots en attente (vente hors écran, sac plein…).
    const du = encheres.aRecuperer;
    if (du.or > 0 || du.objets.length) {
      const detail = [du.or > 0 ? `${du.or} 🪙` : null, du.objets.length ? `${du.objets.length} item${du.objets.length > 1 ? "s" : ""}` : null]
        .filter(Boolean).join(" + ");
      choix.push({ texte: `💰  Collect your dues — ${detail}`, action: collecterDusEncheres });
    }
    if (porteOuverte) {
      choix.push({ texte: "🔔  Enter the auction hall", action: () => entrerEnchere(jour) });
    }
    if (!nuit && enFenetreInscription(temps) && !aTicket(encheres, jour)) {
      choix.push({
        texte: `🎫  Buy tonight's entry ticket — ${TICKET} 🪙`,
        action: () => {
          if (acheterTicket(encheres, inventaire, jour)) afficherMessage("🎫 Ticket in pocket — be at the hall when the bell rings!");
          else afficherMessage(`Not enough gold (the ticket costs ${TICKET} 🪙).`);
        },
      });
    }
    // Dépôt d'objet : possible À TOUT MOMENT (jour, soir juste avant d'entrer =
    // « dernière minute », ou même après la vente pour la PROCHAINE) — jamais bloqué
    // par la nuit. Le lot rejoint la prochaine vente (cf. entrerEnchere : d.jour<=jour).
    if (encheres.depots.length < (heros.depotsEncheresMax ?? 1)) {
      const reste = (heros.depotsEncheresMax ?? 1) - encheres.depots.length;
      const slots = `(${reste} slot${reste > 1 ? "s" : ""} left)`;
      choix.push({
        texte: porteOuverte
          ? `📦  Last-minute consignment…  ${slots}`
          : `📦  Consign an item to sell…  ${slots}`,
        action: () => menuDepotEnchere(),
      });
    }
    choix.push({ texte: "Leave", action: () => {} });
    ouvrirDialogue({ nom: "Magnar the Auctioneer", texte, choix }, finCommissaire);
  }

  // Sous-menu de DÉPÔT : les objets du sac dignes de la salle (équipement rare+).
  function menuDepotEnchere() {
    const eligibles = inventaire.objets.filter((o) => depotAcceptable(o.id));
    if (!eligibles.length) {
      ouvrirDialogue({
        nom: "Magnar the Auctioneer",
        texte: ["“Nothing in your bag is worthy of my room — bring me RARE craft or better.”"],
        choix: [{ texte: "←  Back", action: () => menuCommissaire() }],
      }, finCommissaire);
      return;
    }
    const choix = eligibles.map((o) => ({
      texte: `Consign ${ITEMS[o.id].nom}  ·  value ~${valeurReelle(o.id, o.qualite ?? null)} 🪙`,
      itemId: o.id,
      action: () => {
        jeterObjet(inventaire, o); // il quitte le sac (il est chez Magnar désormais)
        encheres.depots.push({ id: o.id, qualite: o.qualite ?? null, jour: numeroJour(temps) });
        afficherMessage(`📦 ${ITEMS[o.id].nom} consigned — it goes under the hammer at the next sale.`);
        inventaireUI.rendre();
        // S'il reste des emplacements de dépôt, on rouvre le menu pour en confier
        // un autre ; sinon retour au commissaire.
        if (encheres.depots.length < (heros.depotsEncheresMax ?? 1)) menuDepotEnchere();
        else menuCommissaire();
      },
    }));
    choix.push({ texte: "←  Back", action: () => menuCommissaire() });
    ouvrirDialogue({
      nom: "Magnar — Consignment",
      texte: ["“A word of honesty: the room decides the price. Riches… or a loss. Floor price = what a merchant would pay.”"],
      choix,
    }, finCommissaire);
  }

  function collecterDusEncheres() {
    const du = encheres.aRecuperer;
    const morceaux = [];
    if (du.or > 0) { ajouterOr(inventaire, du.or); morceaux.push(`+${du.or} 🪙`); du.or = 0; }
    const restent = [];
    for (const o of du.objets) {
      if (ajouterObjet(inventaire, o.id, o.quantite ?? 1, o.qualite ? { qualite: o.qualite } : null)) {
        morceaux.push(ITEMS[o.id].nom);
      } else {
        restent.push(o); // sac plein : ça reste chez Magnar
      }
    }
    du.objets = restent;
    let msg = `💰 ${morceaux.join(", ")}`;
    if (restent.length) msg += ` — bag full: ${restent.length} item${restent.length > 1 ? "s" : ""} still with Magnar`;
    afficherMessage(msg + ".");
    inventaireUI.rendre();
  }

  // Entrer dans la salle : lots de la maison + (en dernier) le dépôt du joueur.
  function entrerEnchere(jour) {
    const lots = genererLots();
    // Tous les dépôts du joueur mûrs pour ce soir passent sous le marteau. On
    // garde une référence au dépôt sur le lot pour le retirer une fois vendu.
    for (const d of encheres.depots) {
      if (d.jour <= jour) {
        const lot = lotDepot(d);
        lot.depotRef = d;
        lots.push(lot);
      }
    }
    encheres.derniereVenteJouee = jour;
    ouvrirEncheres({
      inv: inventaire, enc: encheres, lots, jour,
      surFin: () => { enPause = false; inventaireUI.rendre(); },
    });
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
    // Onglet de TEST pour le craft : toutes les ressources (minerais + bois),
    // GRATUITES, pour remplir le sac et essayer la forge (1 clic = +1, empilable).
    { nom: "Resources", icone: "⛏", cats: ["ressource"], groupes: [
      { label: "Ores & stone", test: (it) => it.famille === "metal" || it.famille === "pierre" },
      { label: "Gems",         test: (it) => it.famille === "gemme" },
      { label: "Wood & misc",  test: (it) => it.famille !== "metal" && it.famille !== "pierre" && it.famille !== "gemme" },
    ]},
    // Trésors : objets non-utilisables, juste à revendre (marchand / HV / test).
    { nom: "Valuables", icone: "💎", cats: ["tresor"] },
    // Parchemins de craft : à ouvrir (« Read ») pour découvrir une recette.
    { nom: "Scrolls", icone: "📜", cats: ["parchemin"] },
  ];

  function parlerAuMarchand() {
    if (dialogueActif() || combatEnCours || enPause) return;
    regarderHeros(marchand, heros); // il se tourne vers le héros PENDANT qu'on lui parle
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
      texte: `Sell ${ITEMS[o.id].nom}${(o.quantite ?? 1) > 1 ? ` ×${o.quantite}` : ""}  ·  +${prixVente(o.id, o.qualite ?? null) * (o.quantite ?? 1)} 🪙`,
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
    const total = objets.reduce((s, o) => s + prixVente(o.id, o.qualite ?? null) * (o.quantite ?? 1), 0);
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
    const prix = prixVente(o.id, o.qualite ?? null) * (o.quantite ?? 1);
    const retourVente = () => menuVendre(selVente, selRoot);
    ouvrirMenuMarchand(`Sell ${d.nom}${(o.quantite ?? 1) > 1 ? ` ×${o.quantite}` : ""}?`, [
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
      marche: etatMarche(marche),
      batiments: etatBatiments(batiments),
      temps: etatTemps(temps),
      encheres: etatEncheres(encheres),
      bibliotheque: etatBibliotheque(bibliotheque),
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
    if (donnees.marche) chargerMarche(marche, donnees.marche); // prix + annonces en cours
    if (donnees.batiments) chargerBatiments(batiments, donnees.batiments); // scierie & co
    if (donnees.temps) chargerTemps(temps, donnees.temps);                 // cycle jour/nuit
    if (donnees.encheres) chargerEncheres(encheres, donnees.encheres);     // ticket, dépôt, dus
    if (donnees.bibliotheque) chargerBibliotheque(bibliotheque, donnees.bibliotheque); // recettes apprises
    appliquerEquipement(heros, inventaire, planches);
    mettreAJourCamera(camera, heros, carte, VUE.l, VUE.h);
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
  majHudInfo(); // état initial du HUD (caché en ville)

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
          message: `${d.nom}${(objet.quantite ?? 1) > 1 ? ` ×${objet.quantite}` : ""} (${RARETES[d.rarete]?.nom ?? d.rarete}) · +${prixVente(objet.id, objet.qualite ?? null) * (objet.quantite ?? 1)} 🪙`,
          texteOui: "Sell it",
          texteNon: "Keep it",
        }, vendre);
      } else {
        vendre();
      }
    },
    // Ouvrir un parchemin de craft (« Read ») : sa recette + son lore, par-dessus
    // l'inventaire (on y revient en fermant ; le monde reste figé).
    surLire: (objet) => {
      ouvrirParchemin(objet.id);
      apprendreRecette(itemDef(objet.id)?.revele); // lire un parchemin apprend sa recette
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

  // ⚠ TODO EXPORT FINAL — TALENT DE TEST « God Mode » à RETIRER avant le build Steam.
  // Action immédiate : on s'équipe du kit croisé complet (chaque pièce sur son slot),
  // +1 000 000 🪙, niveau 30 et 30 points de talent à dépenser. Ré-cliquable.
  const GODMODE_STUFF = {
    arme1: "epee-sacree",              // Holy Sword
    arme2: "bouclier-protecteur",      // Warding Shield (main seconde)
    armure: "plate-croise",            // Crusader Plate
    gant: "gants-croise",              // Crusader Gauntlets
    botte: "bottes-croise",            // Crusader Greaves
    collier: "collier-de-saphir-fin",  // Nice Sapphire Amulet
    bague1: "anneau-vigueur",          // Vigor Ring
    bague2: "anneau-force",            // Power Ring
    bague3: "bague-de-sang",           // Blood Ring
    bague4: "anneau-forge",            // Forge Ring
    bague5: "anneau-de-givre-parfait", // Perfect Frost Ring
    sac: "sac-a-dos",                  // Backpack
  };
  function activerGodmode() {
    for (const [slot, id] of Object.entries(GODMODE_STUFF)) {
      inventaire.slots[slot] = id;
      inventaire.qualites[slot] = null; // objets « lootés » : qualité normale
    }
    inventaire.or += 1_000_000;
    heros.niveau = 30;
    heros.xp = 0;
    heros.pointsTalent = 30;
    appliquerTalents(heros);
    appliquerEquipement(heros, inventaire, planches);
    heros.pv = heros.pvMax; // soigné à fond
    majHudInfo();
    afficherMessage("🧪 GOD MODE : kit croisé équipé, +1 000 000 🪙, niveau 30 (+30 points de talent).");
  }

  // L'arbre de talents (touche T) : on y dépense les points gagnés en niveau.
  const talentsUI = installerTalents({
    heros,
    surChangement: () => {}, // debloquer() met le héros à jour ; l'écran se rafraîchit seul
    surFermer: () => basculerTalents(),
    surAction: (id) => { if (id === "godmode") activerGodmode(); },
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

  // ⚠ TODO EXPORT FINAL — RACCOURCI DE TEST à RETIRER avant le build Steam.
  // Touche K : « saut au crépuscule » pour essayer les enchères sans attendre
  // 1 h 30 de jeu. Elle t'octroie le titre de noblesse + un ticket gratuit et
  // avance le temps juste après la tombée du soir de la prochaine vente non
  // jouée → tu vas voir Magnar et « Enter the auction hall » tout de suite.
  window.addEventListener("keydown", (e) => {
    if (e.code !== "KeyK" || e.repeat) return;
    if (combatEnCours || dialogueActif() || enPause) return;
    e.preventDefault();
    heros.talents = heros.talents || {};
    heros.talents.citoyen = 1;    // titre de citoyen (accès à l'HV) — pour tester
    heros.talents.noblesse = 1;   // titre de noblesse (accès aux enchères)
    appliquerTalents(heros);
    // Avance jusqu'au prochain soir dont la vente n'a pas encore été jouée.
    temps.total += tempsAvantSoir(temps) + 1; // 1 s DANS la nuit
    if (encheres.derniereVenteJouee >= numeroJour(temps)) temps.total += DUREE_JOUR; // déjà vue → soir suivant
    encheres.ticketPour = numeroJour(temps);  // ticket gratuit du soir
    afficherMessage("🧪 TEST: dusk! Nobility + ticket granted — go see Magnar to enter the auction.");
  });

  // La fenêtre de butin (fin de combat gagné) : on récupère le loot d'un clic / Espace.
  const butinUI = installerButin();
  installerForge();    // la forge plein écran (ouverte via le forgeron)
  installerHV();       // l'hôtel des ventes plein écran (ouvert via le courtier)
  installerBatiment(); // l'écran bâtiment (ouvert via le panneau de la scierie)
  installerEncheres(); // la salle des ventes du soir (ouverte via Magnar)
  installerHorloge();  // le cadran jour/nuit (HUD haut-droite)
  installerParchemin(); // l'écran de lecture des parchemins de craft
  installerLivre();     // le Livre d'artisanat (recettes apprises, touche L)
  installerChoixProfondeur(); // l'écran de choix de buff à chaque étage de mine

  // Le LIVRE D'ARTISANAT (touche L + bouton 📖 de la barre). Le livre gère sa
  // propre fermeture (L / Esc, en capture) ; on ne fait qu'ouvrir ici.
  function basculerLivre() {
    if (livreActif()) return;
    if (combatEnCours || dialogueActif() || enTransition) return;
    if (enPause) return; // un autre écran est déjà ouvert
    enPause = true; invite.hidden = true;
    ouvrirLivre(bibliotheque, { surFermer: () => { enPause = false; } });
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyL" && !e.repeat) { e.preventDefault(); basculerLivre(); }
  });
  document.getElementById("barre-livre").addEventListener("click", basculerLivre);

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
    else if (forgeron.proche) { e.preventDefault(); parlerAuForgeron(); }
    else if (courtier.proche) { e.preventDefault(); parlerAuCourtier(); }
    else if (commissaire.proche) { e.preventDefault(); parlerAuCommissaire(); }
    else if (fontaine.proche) { e.preventDefault(); parlerALaFontaine(); }
    else if (panneauScierie.proche) { e.preventDefault(); lirePanneauBatiment("scierie"); }
    else if (panneauTannerie.proche) { e.preventDefault(); lirePanneauBatiment("tannerie"); }
  });

  // Les points d'intérêt : le message vient du catalogue (champ `interet`),
  // affiché une seule fois par passage (pas en boucle tant qu'on reste dessus).
  let surInteret = false;
  function verifierPointsInteret(tuile) {
    const message = tuileDef(tuile.caractere).interet;
    if (message && !surInteret) afficherMessage(message);
    surInteret = Boolean(message);
  }

  // HUD info (haut-gauche) : niveau des monstres de la zone + (en mine) les minerais
  // trouvables à l'étage avec leur % de pop. Caché là où il n'y a pas de monstres.
  function majHudInfo() {
    const z = zoneCourante;
    if (!Array.isArray(z.niveauMobs)) { hudInfo.hidden = true; return; }
    hudInfo.hidden = false;
    let html = `<div class="hud-ligne" data-tooltip="Monster level on this floor">`
      + `<span class="hud-logo">⚔</span> Lv ${z.niveauMobs[0]}–${z.niveauMobs[1]}</div>`;
    if (z.estMine) {
      const dist = distributionMinerais(z.niveau ?? 1, z.materiaux);
      html += dist.map(e => {
        const d = itemDef(e.id);
        return `<div class="hud-min"><i class="hud-icone" style="background:${d.icone}"></i>${d.nom}<span class="hud-pct">${e.pct}%</span></div>`;
      }).join("");
      // Bandeau des buffs de RUN actifs (accumulés en descendant).
      if (runActif(runProfondeur)) {
        html += `<div class="hud-run">` + resumeRun(runProfondeur)
          .map(b => `<span class="hud-run-buff" data-tooltip="${b.tip}">${b.icone}${b.texte}</span>`)
          .join("") + `</div>`;
      }
    }
    hudInfo.innerHTML = html;
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
          { titre: "Leave the mine?", message: "You'll head back up to the surface — this level won't be kept. Any depth boons fade (gold is banked).", texteOui: "Leave", texteNon: "Stay" },
          () => { finRunProfondeur({ vivant: true }); allerVersZone(portail.vers, portail.entree); },
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
    revelerAutour(carte, entree.colonne, entree.ligne, RAYON_VUE); // découvre le point d'arrivée (mine)
    rencontres = creerRencontres();  // période de grâce fraîche dans la zone
    veines = zone.veines ?? [];      // veines minables (mine) ; vide ailleurs
    minage = null; veineProche = null;
    surPorte = true;                 // on arrive : ne pas re-déclencher une porte…
    surEntreeMine = true;            // … ni une entrée de mine si on atterrit dessus
    surDescente = true;              // … ni un passage de descente
    mettreAJourCamera(camera, heros, carte, VUE.l, VUE.h);
    afficherMessage(carte.nom);
    majHudInfo();                    // HUD : niveau des mobs + minerais de l'étage
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
  async function entrerEnMine(tuile) {
    const mine = genererMine({
      monstres: zoneCourante.monstres ?? ["gobelin", "gobelin-vif", "gobelin-chaman"],
      musique: zoneCourante.musique,   // ambiance d'explo réutilisée (Phase 1)
      assetZone: zoneActuelle,         // fonds + musique de combat de la zone d'origine
      // Sortie : on revient SUR l'entrée `M` (le garde `surEntreeMine` posé à
      // l'arrivée évite de re-rentrer aussitôt, comme pour les portes).
      retour: { vers: zoneActuelle, entree: { colonne: tuile.colonne, ligne: tuile.ligne } },
      bonusDescente: heros.descenteBonus ?? 0, // talent « Deep Experience »
    });
    runProfondeur = creerRunProfondeur(); // nouveau run : les buffs repartent de zéro
    await allerVersZone(mine, mine.depart);
    offrirChoixProfondeur();              // 1er étage : un premier butin de run
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
  async function descendre() {
    const mine = genererMine({
      niveau: (zoneCourante.niveau ?? 1) + 1,
      monstres: zoneCourante.monstres,
      musique: zoneCourante.musique,
      assetZone: zoneActuelle,
      retour: zoneCourante.retour,        // la sortie ramène toujours à l'ENTRÉE DU MONDE
      materiaux: zoneCourante.materiaux,  // même table de drop (même grotte)
      bonusDescente: heros.descenteBonus ?? 0, // talent « Deep Experience »
    });
    if (!runProfondeur) runProfondeur = creerRunProfondeur(); // filet (ne devrait pas arriver)
    await allerVersZone(mine, mine.depart);
    offrirChoixProfondeur();              // étage plus profond : encore un butin de run
  }

  // Propose le choix de buff à l'arrivée sur un étage. Modale OBLIGATOIRE : le
  // monde reste figé tant qu'on n'a pas choisi. Le nombre de choix = 2 de base,
  // +1 par rang du talent « Deep Prospector » (jusqu'à 4).
  function offrirChoixProfondeur() {
    if (!runProfondeur) return;
    const nbChoix = heros.choixLootProfondeur ?? 2;
    const choix = tirerChoix(nbChoix);
    enPause = true; invite.hidden = true;
    ouvrirChoixProfondeur(choix, {
      surChoisir: (loot) => {
        if (loot.effet === "porte") {
          // « Depth Portal » : garantit une porte de descente sur CET étage.
          const ok = garantirPorteCourante();
          afficherMessage(ok
            ? "🕳 Depth Portal — a passage deeper is guaranteed on this floor. Go find it!"
            : "🕳 Depth Portal — this floor already has a way down.");
        } else {
          appliquerLoot(runProfondeur, loot);
          afficherMessage(`⛏ Depth boon: ${loot.nom} — ${etiquetteLoot(loot)}.`);
        }
        etageSuivant(runProfondeur);
        majHudInfo();                     // le bandeau des buffs actifs se met à jour
        enPause = false;
      },
    });
  }

  // Garantit une PORTE de descente `>` sur l'étage courant (loot « Depth Portal ») :
  // si aucune n'existe, on en pose une sur une case sol d'exploration, loin du départ
  // (le sol de mine est entièrement connexe → toujours atteignable).
  function garantirPorteCourante() {
    if (!zoneCourante?.estMine || !carte) return false;
    if (carte.lignes.some((l) => l.includes(">"))) return true; // déjà une porte
    const dCol = zoneCourante.depart?.colonne ?? 2, dLig = zoneCourante.depart?.ligne ?? 2;
    const cands = [];
    for (let y = 0; y < carte.hauteur; y++) {
      for (let x = 0; x < carte.largeur; x++) {
        if (carte.lignes[y][x] !== ",") continue;          // sol d'exploration uniquement
        if (Math.hypot(x - dCol, y - dLig) < 6) continue;  // pas collé au départ
        cands.push([x, y]);
      }
    }
    if (!cands.length) return false;
    const [x, y] = cands[Math.floor(Math.random() * cands.length)];
    carte.lignes[y] = carte.lignes[y].slice(0, x) + ">" + carte.lignes[y].slice(x + 1);
    return true;
  }

  // Petite étiquette lisible de l'effet d'un loot (pour le message).
  function etiquetteLoot(loot) {
    const t = {
      force: `+${loot.valeur} Force`, gold: `+${loot.valeur} gold on exit`,
      celerite: `+${loot.valeur}% combat speed`, armure: `+${loot.valeur} start armor`,
    };
    return t[loot.effet] ?? `+${loot.valeur}`;
  }

  // Fin d'un run de profondeur : verse l'or accumulé SI on sort vivant, puis
  // jette les buffs. Appelé à la sortie volontaire (porte) et — sans or — à la mort.
  function finRunProfondeur({ vivant }) {
    if (!runProfondeur) return;
    if (vivant && runProfondeur.gold > 0) {
      ajouterOr(inventaire, runProfondeur.gold);
      afficherMessage(`🪙 You resurface with ${runProfondeur.gold} gold from the depths!`);
    }
    runProfondeur = null;
    majHudInfo();
  }

  // --- Minage des veines (en mine) -----------------------------------------
  function aPioche() { return Boolean(inventaire.slots.outil); }
  function veineLaPlusProche() {
    const hx = heros.x + 32, hy = heros.y + 54;
    let best = null, bestD = 42; // portée ≈ 1,3 tuile
    for (const v of veines) {
      if (!estVu(carte, v.col, v.lig)) continue; // une veine encore dans le noir n'est pas ciblable
      const vx = v.col * TUILE + TUILE / 2, vy = v.lig * TUILE + TUILE / 2;
      const d = Math.hypot(hx - vx, hy - vy);
      if (d < bestD) { bestD = d; best = v; }
    }
    return best;
  }
  function commencerMinage(v) {
    const outilDef = itemDef(inventaire.slots.outil?.id);
    const vitesse = outilDef?.minage ?? 1;
    minage = { veine: v, t: 0, duree: 0.55 / vitesse }; // plus rapide avec une meilleure pioche
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
    // Bonus selon la rareté : chance d'obtenir un minerai supplémentaire par coup.
    const BONUS_RARETE = { commun: 0.10, uncommon: 0.15, rare: 0.20, epic: 0.25, legendaire: 0.35 };
    const chancebonus = BONUS_RARETE[itemDef(v.type)?.rarete] ?? 0.10;
    const bonus = Math.random() < chancebonus && ajouterObjet(inventaire, v.type, 1);
    const qty = bonus ? 2 : 1;
    v.coups--;
    if (v.coups <= 0) {                      // filon épuisé → il disparaît
      veines = veines.filter((x) => x !== v);
      afficherMessage(qty > 1 ? `⛏ +${qty} ${nom} — vein depleted` : `⛏ +1 ${nom} — vein depleted`);
    } else {
      afficherMessage(qty > 1 ? `⛏ +${qty} ${nom}!` : `⛏ +1 ${nom}`);
    }
    minage = null;
  }
  function dessinerVeine(ctx, v) {
    const x = v.col * TUILE, y = v.lig * TUILE;
    const col = itemDef(v.type)?.icone ?? "#aaa";
    if (v.mega) {
      // Méga-gisement : déborde la case, plus de pépites + éclats brillants.
      ctx.fillStyle = "#1c1813"; // gangue large
      ctx.fillRect(x - 3, y - 2, TUILE + 6, TUILE + 3);
      ctx.fillStyle = col;       // gros amas de minerai
      ctx.fillRect(x + 3, y + 5, 9, 9);
      ctx.fillRect(x + 17, y + 4, 10, 10);
      ctx.fillRect(x + 8, y + 17, 8, 8);
      ctx.fillRect(x + 20, y + 18, 8, 8);
      ctx.fillStyle = "#fff6d8"; // reflets
      ctx.fillRect(x + 6, y + 8, 2, 2);
      ctx.fillRect(x + 20, y + 7, 2, 2);
    } else {
      ctx.fillStyle = "#241f1a"; // gangue (roche sombre)
      ctx.fillRect(x + 5, y + 7, TUILE - 10, TUILE - 11);
      ctx.fillStyle = col;       // pépites de minerai
      ctx.fillRect(x + 9, y + 11, 5, 5);
      ctx.fillRect(x + 18, y + 13, 6, 6);
      ctx.fillRect(x + 13, y + 19, 4, 4);
    }
    if (v === veineProche) {   // à portée de minage → liseré doré
      ctx.strokeStyle = "#ffcf57"; ctx.lineWidth = 2;
      const m = v.mega ? 3 : 0;
      ctx.strokeRect(x + 4 - m, y + 6 - m, TUILE - 8 + 2 * m, TUILE - 10 + 2 * m);
      // (la bulle flottante est un élément DOM — voir majVeineLabel dans mettreAJour)
    }
  }

  // Brouillard de guerre LISSE (mine) : on peint un masque 1 px = 1 case (peindre…
  // dans carte.js) puis on l'ÉTIRE sur la carte avec le lissage → dégradés doux au
  // lieu de gros carrés noirs. Dessiné en DERNIER (par-dessus tuiles + veines + héros)
  // pour assombrir tout ce qui est loin ; le héros, lui, est toujours en pleine lumière.
  function dessinerBrouillard() {
    if (!carte.vu) return;
    const W = carte.largeur, H = carte.hauteur;
    if (!fogCanvas || fogCanvas.width !== W || fogCanvas.height !== H) {
      fogCanvas = document.createElement("canvas");
      fogCanvas.width = W; fogCanvas.height = H;
      fogCtx = fogCanvas.getContext("2d");
    }
    const ht = tuileSousLesPieds(carte, heros);
    peindreMasqueBrouillard(fogCtx, carte, ht.colonne, ht.ligne);
    const liss = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;                          // le masque, lui, est lissé…
    ctx.drawImage(fogCanvas, 0, 0, W, H, 0, 0, W * TUILE, H * TUILE);
    ctx.imageSmoothingEnabled = liss;                          // … on rend le réglage d'origine (sprites nets)
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
      bonusRun: bonusCombatRun(runProfondeur), // buffs de run (force/célérité/armure)
      fond: fondCombat(zoneActuelle), // un fond tiré dans la bibliothèque de la zone
      // Échap en combat : ouvre le menu pause (réglages son), SANS Save/Load.
      surPause: () => menu.ouvrir({ sansSauvegarde: true }),
      surFin: (resultat) => {
        combatEnCours = null;
        if (resultat === "defaite") {
          // Pas encore mort : on se réveille en ville, à 1 PV (à soigner).
          heros.pv = 1;
          finRunProfondeur({ vivant: false }); // on n'est pas sorti vivant : buffs + or PERDUS
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
      // L'HORLOGE ÉCONOMIE (marché + bâtiments + cycle jour/nuit) tourne EN
      // PERMANENCE — le temps de Brütàl s'écoule toujours. SEULE la mise en PAUSE
      // (menu Échap) la fige : c'est LE bouton « stop » quand on s'absente.
      // Dialogues, inventaire, Forge, HV, enchères, écran bâtiment : le temps y
      // continue d'avancer. Pas d'abus d'AFK possible : la trésorerie des
      // bâtiments est PLAFONNÉE, le marché est anti-exploit AU MOMENT de l'échange,
      // et une annonce vendue ne PAIE PAS toute seule (on va la récolter à l'HV).
      if (!menuPauseOuvert) {
        for (const v of tickMarche(marche, dt)) {
          afficherMessage(`📈 ${itemDef(v.id)?.nom ?? v.id} sold at the Exchange — go collect your ${v.prix} 🪙!`);
        }
        // Les BÂTIMENTS produisent sur la MÊME horloge de jeu actif que le marché.
        // Le talent « Tax Collector » encaisse l'or automatiquement (coffre plein).
        for (const e of tickBatiments(batiments, dt, { collecteurImpot: heros.collecteurImpot, inv: inventaire })) {
          const nom = BATIMENTS[e.id]?.nom ?? e.id;
          if (e.type === "impot") afficherMessage(`🪙 ${nom}: +${e.montant} 🪙 auto-collected by your Tax Collector.`);
          else if (e.type === "versement" && !heros.collecteurImpot) afficherMessage(`🪚 ${nom}: +${e.montant} 🪙 in its treasury — collect at its sign.`);
          else if (e.type === "plein") afficherMessage(`⚠ ${nom}: treasury FULL — production STOPPED until you collect!`);
        }
        // Le CYCLE JOUR/NUIT avance aussi en jeu actif. À la tombée du soir, la
        // cloche des enchères sonne (elle ne parle qu'aux nobles).
        for (const e of tickTemps(temps, dt)) {
          if (e.type === "soir") {
            afficherMessage(heros.noblesse
              ? "🌙 Dusk falls on Brütàl — the auction bell rings!"
              : "🌙 Dusk falls on Brütàl.");
          } else if (e.type === "aube") {
            afficherMessage(`🌅 Day ${numeroJour(temps)} dawns on Brütàl.`);
          }
        }
        // Dépôt du joueur non assisté : quand la fenêtre d'entrée de SA vente est
        // passée sans qu'il soit venu, l'objet est vendu HORS ÉCRAN (même modèle
        // de salle) et l'or attend chez Magnar.
        if (encheres.depots.length && !enchereActive()) {
          const jour = numeroJour(temps);
          const restants = [];
          for (const d of encheres.depots) {
            const rate = jour > d.jour ||
              (jour === d.jour && positionCycle(temps) >= DUREE_JOUR + FENETRE_ENTREE && encheres.derniereVenteJouee < jour);
            if (rate) {
              const resultat = resoudreHorsEcran(lotDepot(d));
              encheres.aRecuperer.or += resultat.prix;
              afficherMessage(`🔨 Your ${itemDef(d.id)?.nom ?? d.id} sold at auction for ${resultat.prix} 🪙 — collect from Magnar.`);
            } else {
              restants.push(d);
            }
          }
          encheres.depots = restants;
        }
      }
      // La barre de menu n'est visible qu'en exploration libre (pas en combat,
      // pas quand un écran/menu est ouvert).
      barreMenu.hidden = Boolean(combatEnCours) || enPause;
      hudInfo.hidden = Boolean(combatEnCours) || enPause || !Array.isArray(zoneCourante.niveauMobs);
      // Le cadran jour/nuit : visible en exploration libre (comme la barre de menu),
      // redessiné à l'heure courante (le cycle avance en jeu actif).
      const horlogeVisible = !combatEnCours && !enPause;
      montrerHorloge(horlogeVisible);
      if (horlogeVisible) dessinerHorloge(temps);
      const enMine = Boolean(zoneCourante.estMine);
      hudEtage.hidden = Boolean(combatEnCours) || enPause || !enMine;
      if (enMine) hudEtage.textContent = `⛏ Floor ${zoneCourante.niveau ?? 1}`;
      // Bulle de minerai masquée hors mine / en combat / en pause
      if (Boolean(combatEnCours) || enPause || !enMine) veineLabel.hidden = true;
      // Pendant un combat, c'est lui qui pilote tout (le monde est figé)
      if (combatEnCours) { combatEnCours.mettreAJour(dt); return; }
      if (enPause) return;          // figé : menu ouvert ou transition en cours
      // Minage en cours : le héros est FIGÉ le temps du coup de pioche.
      if (minage) avancerMinage(dt);
      else mettreAJourHeros(heros, clavier, dt, carte, obstaclesVille());
      const tuile = tuileSousLesPieds(carte, heros);
      revelerAutour(carte, tuile.colonne, tuile.ligne, RAYON_VUE); // brouillard : on éclaire autour de soi
      verifierPointsInteret(tuile);
      verifierPorte(tuile);
      verifierEntreeMine(tuile); // marcher sur `M` descend dans une mine générée
      verifierDescente(tuile);   // marcher sur `>` descend d'un étage (en mine)
      if (!minage && !heros.sansRencontre && avancerRencontres(rencontres, tuile, heros.evasionRencontre || 0, zoneCourante.tauxRencontre ?? 1)) {
        // Musique lancée immédiatement — au tout premier instant où le jeu sait
        // qu'une rencontre a lieu, avant même le flash ou la composition du groupe.
        const mc = musiqueCombat(zoneActuelle);
        if (mc) jouerMusiqueFichier(mc);
        declencherRencontre();
      }
      if (zoneActuelle === "city") {
        mettreAJourPnj(fanatique, dt, heros);
        mettreAJourPnj(marchand, dt, heros);
        mettreAJourPnj(forgeron, dt, heros);
        mettreAJourPnj(courtier, dt, heros);
        mettreAJourPnj(commissaire, dt, heros);
        fontaine.t += dt;
        fontaine.proche =
          Math.abs((heros.x + 32) - fontaine.cx) < 46 &&
          Math.abs((heros.y + 54) - fontaine.solY) < 46;
        panneauScierie.t += dt;
        panneauScierie.proche =
          Math.abs((heros.x + 32) - panneauScierie.cx) < 46 &&
          Math.abs((heros.y + 54) - panneauScierie.solY) < 46;
        panneauTannerie.t += dt;
        panneauTannerie.proche =
          Math.abs((heros.x + 32) - panneauTannerie.cx) < 46 &&
          Math.abs((heros.y + 54) - panneauTannerie.solY) < 46;
      }
      // Veine minable la plus proche (en mine) → surbrillée en doré (dessinerVeine).
      veineProche = (zoneCourante.estMine && !minage) ? veineLaPlusProche() : null;
      // L'invite « parler » s'affiche quand on est à portée d'un PNJ / de la
      // fontaine / du panneau de la scierie (où « Read » remplace « Talk »).
      const presPnj = fanatique.proche || marchand.proche || forgeron.proche || courtier.proche || commissaire.proche || fontaine.proche;
      invite.hidden = !(zoneActuelle === "city" && (presPnj || panneauScierie.proche || panneauTannerie.proche));
      if (!invite.hidden) invite.textContent = presPnj ? "[Space] Talk" : "[Space] Read";
      mettreAJourCamera(camera, heros, carte, VUE.l, VUE.h);
      // Bulle flottante du minerai : positionnée en CSS au-dessus de la veine
      if (veineProche) {
        const wx = veineProche.col * TUILE + TUILE / 2;
        const wy = veineProche.lig * TUILE;
        const rect = canvas.getBoundingClientRect();
        const sx = rect.left + (wx - camera.x) * (rect.width / VUE.l);  // VUE = repère logique
        const sy = rect.top  + (wy - camera.y) * (rect.height / VUE.h);
        veineLabel.textContent = itemDef(veineProche.type)?.nom ?? veineProche.type;
        veineLabel.style.left = sx + "px";
        veineLabel.style.top  = sy + "px";
        veineLabel.hidden = false;
      } else {
        veineLabel.hidden = true;
      }
      alerteVie(heros.pv / heros.pvMax); // liseré rouge si la vie est basse
    },
    dessiner() {
      if (combatEnCours) { combatEnCours.dessiner(); return; } // la scène de combat (gère son propre repère)
      ctx.setTransform(RES, 0, 0, RES, 0, 0); // repère logique 960×540, rendu à RES×
      ctx.fillStyle = "#0b0a08";
      ctx.fillRect(0, 0, VUE.l, VUE.h);
      ctx.save();
      // Tout est dessiné dans le repère du monde, décalé par la caméra
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
      dessinerCarte(ctx, carte, camera, VUE.l, VUE.h);
      // Les PNJ n'existent que dans la ville. Profondeur : on dessine héros et
      // PNJ du plus « haut » (pieds les plus en arrière) au plus « bas ».
      if (zoneActuelle === "city") {
        const acteurs = [
          // Les façades couvrent leur bloc de murs ; le panneau est devant.
          { pieds: SCIERIE_BLOC.y + SCIERIE_BLOC.h, dessiner: () => dessinerScierie(ctx) },
          { pieds: panneauScierie.solY, dessiner: () => dessinerPanneauBatiment(ctx, panneauScierie, "scierie", "SAWMILL") },
          { pieds: TANNERIE_BLOC.y + TANNERIE_BLOC.h, dessiner: () => dessinerTannerie(ctx) },
          { pieds: panneauTannerie.solY, dessiner: () => dessinerPanneauBatiment(ctx, panneauTannerie, "tannerie", "TANNERY") },
          { pieds: fontaine.solY, dessiner: () => dessinerFontaine(ctx, fontaine) },
          { pieds: piedsPnj(fanatique), dessiner: () => dessinerPnj(ctx, fanatique) },
          { pieds: piedsPnj(marchand), dessiner: () => dessinerPnj(ctx, marchand) },
          { pieds: piedsPnj(forgeron), dessiner: () => dessinerPnj(ctx, forgeron) },
          { pieds: piedsPnj(courtier), dessiner: () => dessinerPnj(ctx, courtier) },
          { pieds: piedsPnj(commissaire), dessiner: () => dessinerPnj(ctx, commissaire) },
          { pieds: heros.y + 54, dessiner: () => dessinerHeros(ctx, heros) },
        ];
        acteurs.sort((a, b) => a.pieds - b.pieds);
        for (const a of acteurs) a.dessiner();
      } else if (veines.length) {
        // En mine : veines + héros, triés par profondeur (pieds) pour le chevauchement.
        // Une veine encore sous le brouillard n'est pas dessinée (on la découvre en explorant).
        const acteurs = [
          ...veines.filter((v) => estVu(carte, v.col, v.lig))
            .map((v) => ({ pieds: v.lig * TUILE + TUILE, dessiner: () => dessinerVeine(ctx, v) })),
          { pieds: heros.y + 54, dessiner: () => dessinerHeros(ctx, heros) },
        ];
        acteurs.sort((a, b) => a.pieds - b.pieds);
        for (const a of acteurs) a.dessiner();
      } else {
        dessinerHeros(ctx, heros);
      }
      dessinerBrouillard(); // par-dessus tout : assombrit le lointain en dégradé (mine)
      // Barre de minage sous les pieds du héros — toujours visible, par-dessus brouillard et décors
      if (minage) {
        const prog = Math.min(1, minage.t / minage.duree);
        const bw = 40, bh = 4;
        const bx = heros.x + 32 - bw / 2;
        const by = heros.y + 66; // 2 px sous le sprite (64 px de hauteur)
        ctx.fillStyle = "#120f0c"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = "#2d2620"; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#ffcf57"; ctx.fillRect(bx, by, Math.round(bw * prog), bh);
      }
      ctx.restore();
    },
  });
}
