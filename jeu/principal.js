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

const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");

// Rendu pixel art : on agrandit l'écran interne 320x180 d'un facteur ENTIER
// (x2, x3, x4...) pour remplir la fenêtre sans jamais flouter les pixels.
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
  appliquerEquipement(heros, equipement, planches);
  majHud(equipement);

  // Touches d'essayage : R = arme suivante, E = armure suivante
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return; // ignorer la répétition quand on garde la touche enfoncée
    if (e.code === "KeyR") changerArme(equipement);
    else if (e.code === "KeyE") changerArmure(equipement);
    else return;
    appliquerEquipement(heros, equipement, planches);
    majHud(equipement);
  });

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
