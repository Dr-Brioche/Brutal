// Point d'entrée du jeu : assemble les briques et démarre la boucle.

import { lancerBoucle } from "./core/boucle.js";
import { clavier } from "./core/clavier.js";
import { chargerImage } from "./core/sprites.js";
import { creerHeros, mettreAJourHeros, dessinerHeros } from "./entities/heros.js";
import { dessinerZone, limites } from "./world/zone.js";

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

export async function demarrerJeu() {
  ajusterEchelle();
  ctx.imageSmoothingEnabled = false; // jamais de lissage : pixels nets

  const plancheNain = await chargerImage("images/heros/nain.png");
  const heros = creerHeros(plancheNain);

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
