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
import { chargerSauvegarde, enregistrerSauvegarde } from "./systems/sauvegarde.js";

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

export async function demarrerJeu() {
  ajusterEchelle();
  ctx.imageSmoothingEnabled = false; // jamais de lissage : pixels nets

  // On charge toutes les planches des bibliothèques, rangées par chemin
  const chemins = [...ARMES, ...ARMURES].map((objet) => objet.planche);
  const images = await Promise.all(chemins.map(chargerImage));
  const planches = new Map(chemins.map((chemin, i) => [chemin, images[i]]));

  const heros = creerHeros();
  const equipement = creerEquipement();

  // On reprend la partie précédente si le carnet en contient une.
  // Chaque champ est vérifié : une sauvegarde abîmée ne doit rien casser.
  const sauvegarde = chargerSauvegarde();
  if (sauvegarde) {
    const arme = ARMES.findIndex((a) => a.id === sauvegarde.armeId);
    const armure = ARMURES.findIndex((a) => a.id === sauvegarde.armureId);
    if (arme !== -1) equipement.arme = arme;
    if (armure !== -1) equipement.armure = armure;
    if (Number.isFinite(sauvegarde.x) && Number.isFinite(sauvegarde.y)) {
      heros.x = sauvegarde.x;
      heros.y = sauvegarde.y;
    }
    if (["bas", "gauche", "droite", "haut"].includes(sauvegarde.direction)) {
      heros.direction = sauvegarde.direction;
    }
  }

  appliquerEquipement(heros, equipement, planches);
  majHud(equipement);

  function sauvegarder() {
    enregistrerSauvegarde({
      x: heros.x,
      y: heros.y,
      direction: heros.direction,
      armeId: armeActuelle(equipement).id,
      armureId: armureActuelle(equipement).id,
    });
  }

  // Touches d'essayage : R = arme suivante, E = armure suivante
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return; // ignorer la répétition quand on garde la touche enfoncée
    if (e.code === "KeyR") changerArme(equipement);
    else if (e.code === "KeyE") changerArmure(equipement);
    else return;
    appliquerEquipement(heros, equipement, planches);
    majHud(equipement);
    sauvegarder();
  });

  // Sauvegarde de la position : toutes les 3 secondes + en quittant la page
  setInterval(sauvegarder, 3000);
  window.addEventListener("pagehide", sauvegarder);

  lancerBoucle({
    mettreAJour(dt) {
      mettreAJourHeros(heros, clavier, dt, limites);
    },
    dessiner() {
      dessinerZone(ctx);
      dessinerHeros(ctx, heros);
    },
  });
}
