// Point d'entrée du jeu : assemble les briques et démarre la boucle.

import { lancerBoucle } from "./core/boucle.js";
import { clavier } from "./core/clavier.js";
import { chargerImage } from "./core/sprites.js";
import { creerHeros, mettreAJourHeros, dessinerHeros } from "./entities/heros.js";
import { dessinerZone, limites } from "./world/zone.js";
import { ARMES } from "./data/armes.js";
import { ARMURES } from "./data/armures.js";
import {
  creerEquipement, appliquerEquipement,
  armeActuelle, armureActuelle,
  changerArme, changerArmure,
} from "./systems/equipement.js";
import { installerMenu } from "./ui/menu.js";

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
  const chemins = [...ARMES, ...ARMURES].map((objet) => objet.planche);
  const images = await Promise.all(chemins.map(chargerImage));
  const planches = new Map(chemins.map((chemin, i) => [chemin, images[i]]));

  const heros = creerHeros();
  const equipement = creerEquipement();
  appliquerEquipement(heros, equipement, planches);
  majHud(equipement);

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
    if (Number.isFinite(donnees.x) && Number.isFinite(donnees.y)) {
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

  lancerBoucle({
    mettreAJour(dt) {
      if (enPause) return;          // jeu figé tant que le menu est ouvert
      mettreAJourHeros(heros, clavier, dt, limites);
    },
    dessiner() {
      dessinerZone(ctx);
      dessinerHeros(ctx, heros);
    },
  });
}
