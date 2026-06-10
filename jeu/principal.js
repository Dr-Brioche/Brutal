// Point d'entrée du jeu : assemble les briques et démarre la boucle.

import { lancerBoucle } from "./core/boucle.js";
import { clavier } from "./core/clavier.js";
import { chargerImage } from "./core/sprites.js";
import { creerCamera, mettreAJourCamera } from "./core/camera.js";
import { creerHeros, mettreAJourHeros, dessinerHeros } from "./entities/heros.js";
import { creerCarte, dessinerCarte, piedsLibres, tuileSousLesPieds } from "./world/carte.js";
import { ZONE_TEST } from "./data/zones.js";
import { ARMES } from "./data/armes.js";
import { ARMURES } from "./data/armures.js";
import {
  creerEquipement, appliquerEquipement,
  armeActuelle, armureActuelle,
  changerArme, changerArmure,
} from "./systems/equipement.js";
import { installerMenu } from "./ui/menu.js";
import { afficherMessage, flashCombat } from "./ui/effets.js";
import { creerRencontres, avancerRencontres } from "./systems/rencontres.js";
import { demarrerCombat } from "./ui/combat.js";
import { ennemiParId, ENNEMIS } from "./data/ennemis.js";
import { FANATIQUE } from "./data/pnj.js";
import { creerPnj, mettreAJourPnj, dessinerPnj, piedsPnj } from "./entities/pnj.js";

const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");

// Rendu pixel art : on agrandit l'écran interne 640x360 d'un facteur ENTIER
// (x2, x3...) pour remplir la fenêtre sans jamais flouter les pixels.
function ajusterEchelle() {
  const echelle = Math.max(
    1,
    Math.floor(Math.min(innerWidth / canvas.width, innerHeight / canvas.height))
  );
  canvas.style.width = canvas.width * echelle + "px";
  canvas.style.height = canvas.height * echelle + "px";
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

// `donneesInitiales` : la sauvegarde choisie sur l'écran de démarrage
// (ou null pour une nouvelle partie).
export async function demarrerJeu(donneesInitiales = null) {
  ajusterEchelle();
  ctx.imageSmoothingEnabled = false; // jamais de lissage : pixels nets

  // On charge toutes les planches des bibliothèques, rangées par chemin
  const chemins = [...ARMES, ...ARMURES, ...ENNEMIS, FANATIQUE].map((objet) => objet.planche);
  const images = await Promise.all(chemins.map(chargerImage));
  const planches = new Map(chemins.map((chemin, i) => [chemin, images[i]]));

  const carte = creerCarte(ZONE_TEST);
  const camera = creerCamera();
  const heros = creerHeros();
  heros.x = carte.departX;
  heros.y = carte.departY;
  const equipement = creerEquipement();
  appliquerEquipement(heros, equipement, planches);
  majHud(equipement);

  // Un PNJ d'ambiance : un fanatique qui arpente la ville (rangée 7).
  // Bornes et position calées sur la grille de tuiles (32 px).
  const fanatique = creerPnj({
    modele: FANATIQUE,
    planche: planches.get(FANATIQUE.planche),
    x: 8 * 32 - 11,
    y: 7 * 32 - 56,
    xMin: 4 * 32 - 11,
    xMax: 15 * 32 - 11,
    message: "Repent, dwarf — the Deep stirs, and it knows your name.",
  });

  let enPause = false;

  // L'état qu'un emplacement de sauvegarde retient.
  function obtenirEtat() {
    return {
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

  // Les points d'intérêt : un message quand on arrive dessus (une seule fois
  // par passage, pas en boucle tant qu'on reste sur la tuile)
  let surPointInteret = false;
  function verifierPointsInteret(tuile) {
    if (tuile.caractere === "M" && !surPointInteret) {
      afficherMessage("⛏ The Depths — mining zone (coming soon)");
    }
    surPointInteret = tuile.caractere === "M";
  }

  // Les rencontres : sur les tuiles sauvages, un monstre invisible surgit.
  // Flash façon FF9, puis bascule sur l'écran de combat.
  const hud = document.getElementById("hud");
  const rencontres = creerRencontres();
  let combatEnCours = null;        // non-null = on est en combat

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
      if (enPause) return;          // jeu figé tant que le menu est ouvert
      mettreAJourHeros(heros, clavier, dt, carte);
      const tuile = tuileSousLesPieds(carte, heros);
      verifierPointsInteret(tuile);
      if (avancerRencontres(rencontres, tuile)) declencherRencontre();
      mettreAJourPnj(fanatique, dt, heros);
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
      // Profondeur : celui dont les pieds sont les plus « hauts » passe derrière
      if (piedsPnj(fanatique) <= heros.y + 54) {
        dessinerPnj(ctx, fanatique);
        dessinerHeros(ctx, heros);
      } else {
        dessinerHeros(ctx, heros);
        dessinerPnj(ctx, fanatique);
      }
      ctx.restore();
    },
  });
}
