// Point d'entrée du jeu : assemble les briques et démarre la boucle.

import { lancerBoucle } from "./core/boucle.js";
import { clavier } from "./core/clavier.js";
import { chargerImage } from "./core/sprites.js";
import { creerCamera, mettreAJourCamera } from "./core/camera.js";
import { creerHeros, mettreAJourHeros, dessinerHeros } from "./entities/heros.js";
import { creerCarte, dessinerCarte, piedsLibres, tuileSousLesPieds, TUILE } from "./world/carte.js";
import { VILLE, ZONES } from "./data/zones.js";
import { tuileDef, estPorte } from "./data/tuiles.js";
import { ARMES } from "./data/armes.js";
import { ARMURES } from "./data/armures.js";
import {
  creerEquipement, appliquerEquipement,
  armeActuelle, armureActuelle,
  changerArme, changerArmure,
} from "./systems/equipement.js";
import { installerMenu } from "./ui/menu.js";
import { afficherMessage, flashCombat, fondu } from "./ui/effets.js";
import { creerRencontres, avancerRencontres } from "./systems/rencontres.js";
import { demarrerCombat } from "./ui/combat.js";
import { ennemiParId, ENNEMIS } from "./data/ennemis.js";
import { FANATIQUE } from "./data/pnj.js";
import { creerPnj, mettreAJourPnj, dessinerPnj, piedsPnj } from "./entities/pnj.js";

const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");

// Le canvas remplit TOUTE la fenêtre (plus de marges noires). Sa résolution
// interne = fenêtre / ZOOM : ZOOM = taille d'un pixel-jeu à l'écran. Plus ZOOM
// est petit, plus on voit loin (mais plus les sprites sont petits). Bornée pour
// garder une vue raisonnable sur très grand écran.
const ZOOM = 2;
const VUE_MAX = { l: 1344, h: 800 };
function ajusterEchelle() {
  canvas.width = Math.min(VUE_MAX.l, Math.ceil(innerWidth / ZOOM));
  canvas.height = Math.min(VUE_MAX.h, Math.ceil(innerHeight / ZOOM));
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.imageSmoothingEnabled = false; // redimensionner le canvas réinitialise le contexte
}
window.addEventListener("resize", ajusterEchelle);

// Le HUD (interface par-dessus le jeu) affiche l'équipement porté.
function majHud(equipement) {
  const arme = armeActuelle(equipement);
  const armure = armureActuelle(equipement);
  document.getElementById("hud-arme").textContent =
    `[R] Weapon : ${arme.nom}  (+${arme.degats} ATK)`;
  document.getElementById("hud-armure").textContent =
    `[E] Armor  : ${armure.nom}  (+${armure.defense} DEF)`;
}

// Place le héros pour que ses PIEDS soient centrés sur une case (colonne, ligne).
function poserHeros(heros, colonne, ligne) {
  heros.x = colonne * TUILE - 16;
  heros.y = ligne * TUILE - 38;
}

// `donneesInitiales` : la sauvegarde choisie sur l'écran de démarrage
// (ou null pour une nouvelle partie).
export async function demarrerJeu(donneesInitiales = null) {
  ajusterEchelle(); // règle la taille du canvas + coupe le lissage

  // On charge toutes les planches des bibliothèques, rangées par chemin
  const chemins = [...ARMES, ...ARMURES, ...ENNEMIS, FANATIQUE].map((objet) => objet.planche);
  const images = await Promise.all(chemins.map(chargerImage));
  const planches = new Map(chemins.map((chemin, i) => [chemin, images[i]]));

  // La zone courante (on démarre dans la ville). `carte` et `rencontres`
  // changent à chaque passage de porte, d'où le `let`.
  let zoneActuelle = "ville";
  let carte = creerCarte(VILLE);
  let rencontres = creerRencontres();
  const camera = creerCamera();
  const heros = creerHeros();
  heros.x = carte.departX;
  heros.y = carte.departY;
  const equipement = creerEquipement();
  appliquerEquipement(heros, equipement, planches);
  majHud(equipement);

  const hud = document.getElementById("hud");
  let enPause = false;
  let enTransition = false;
  let combatEnCours = null;        // non-null = on est en combat

  // Un PNJ d'ambiance : un fanatique qui arpente la place de la ville (rangée 8).
  const fanatique = creerPnj({
    modele: FANATIQUE,
    planche: planches.get(FANATIQUE.planche),
    x: 18 * TUILE - 11,
    y: 8 * TUILE - 56,
    xMin: 14 * TUILE - 11,
    xMax: 28 * TUILE - 11,
    message: "Repent, dwarf — the Deep stirs, and it knows your name.",
  });

  // L'état qu'un emplacement de sauvegarde retient.
  function obtenirEtat() {
    return {
      zone: zoneActuelle,
      x: heros.x,
      y: heros.y,
      direction: heros.direction,
      armeId: armeActuelle(equipement).id,
      armureId: armureActuelle(equipement).id,
      armeNom: armeActuelle(equipement).nom,     // pour l'affichage du slot
      armureNom: armureActuelle(equipement).nom,
    };
  }

  // L'état qu'on applique en chargeant (vérifié champ par champ : une
  // sauvegarde abîmée ne doit jamais casser le jeu).
  function appliquerEtat(donnees) {
    if (!donnees) return;
    const arme = ARMES.findIndex((a) => a.id === donnees.armeId);
    const armure = ARMURES.findIndex((a) => a.id === donnees.armureId);
    if (arme !== -1) equipement.arme = arme;
    if (armure !== -1) equipement.armure = armure;
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
    appliquerEquipement(heros, equipement, planches);
    majHud(equipement);
    mettreAJourCamera(camera, heros, carte, canvas.width, canvas.height);
  }

  installerMenu({
    obtenirEtat,
    appliquerEtat,
    surChangementPause: (pause) => { enPause = pause; },
  });

  appliquerEtat(donneesInitiales); // reprise choisie au démarrage (sinon null = neuf)

  // Touches d'essayage (inactives quand le menu est ouvert) :
  // R = arme suivante, E = armure suivante
  window.addEventListener("keydown", (e) => {
    if (enPause || e.repeat) return;
    if (e.code === "KeyR") changerArme(equipement);
    else if (e.code === "KeyE") changerArmure(equipement);
    else return;
    appliquerEquipement(heros, equipement, planches);
    majHud(equipement);
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
  function verifierPorte(tuile) {
    if (estPorte(tuile.caractere) && !surPorte && !enTransition) {
      const portail = (ZONES[zoneActuelle].portails || []).find(
        (p) => p.colonne === tuile.colonne && p.ligne === tuile.ligne
      );
      if (portail) allerVersZone(portail.vers, portail.entree);
    }
    surPorte = estPorte(tuile.caractere);
  }

  async function allerVersZone(zoneId, entree) {
    if (enTransition) return;
    enTransition = true;
    enPause = true;
    await fondu(1);                  // écran au noir
    carte = creerCarte(ZONES[zoneId]);
    zoneActuelle = zoneId;
    poserHeros(heros, entree.colonne, entree.ligne);
    rencontres = creerRencontres();  // période de grâce fraîche dans la zone
    surPorte = true;                 // on arrive : ne pas re-déclencher
    mettreAJourCamera(camera, heros, carte, canvas.width, canvas.height);
    afficherMessage(carte.nom);
    await fondu(0);                  // on rouvre l'écran
    enPause = false;
    enTransition = false;
  }

  // Les rencontres : sur les tuiles de souterrain, un monstre invisible surgit.
  // Flash façon FF9, puis bascule sur l'écran de combat.
  async function declencherRencontre() {
    enPause = true;                 // le monde se fige pendant le flash
    await flashCombat();
    hud.hidden = true;              // on dégage le HUD d'exploration
    combatEnCours = demarrerCombat({
      ctx,
      heros,
      equipement,
      planches,
      ennemi: ennemiParId("gobelin"),
      surFin: (resultat) => {
        combatEnCours = null;
        hud.hidden = false;
        enPause = false;
        afficherMessage(
          resultat === "victoire"
            ? "⚔ The creature falls. The dark grows quiet."
            : "💀 You were overwhelmed... and crawl back to safety."
        );
      },
    });
  }

  lancerBoucle({
    mettreAJour(dt) {
      // Pendant un combat, c'est lui qui pilote tout (le monde est figé)
      if (combatEnCours) { combatEnCours.mettreAJour(dt); return; }
      if (enPause) return;          // figé : menu ouvert ou transition en cours
      mettreAJourHeros(heros, clavier, dt, carte);
      const tuile = tuileSousLesPieds(carte, heros);
      verifierPointsInteret(tuile);
      verifierPorte(tuile);
      if (avancerRencontres(rencontres, tuile)) declencherRencontre();
      if (zoneActuelle === "ville") mettreAJourPnj(fanatique, dt, heros);
      mettreAJourCamera(camera, heros, carte, canvas.width, canvas.height);
    },
    dessiner() {
      if (combatEnCours) { combatEnCours.dessiner(); return; } // la scène de combat
      ctx.fillStyle = "#0b0a08";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      // Tout est dessiné dans le repère du monde, décalé par la caméra
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
      dessinerCarte(ctx, carte, camera, canvas.width, canvas.height);
      // Le fanatique n'existe que dans la ville. Profondeur : celui dont les
      // pieds sont les plus « hauts » passe derrière l'autre.
      if (zoneActuelle === "ville") {
        if (piedsPnj(fanatique) <= heros.y + 54) {
          dessinerPnj(ctx, fanatique);
          dessinerHeros(ctx, heros);
        } else {
          dessinerHeros(ctx, heros);
          dessinerPnj(ctx, fanatique);
        }
      } else {
        dessinerHeros(ctx, heros);
      }
      ctx.restore();
    },
  });
}
