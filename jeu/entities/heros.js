// Le héros : son état (position, direction...), sa mise à jour, son dessin.

import { dessinerCase, TAILLE_CASE } from "../core/sprites.js";

// Lignes de la planche images/heros/nain.png
const LIGNE = { bas: 0, gauche: 1, droite: 2, haut: 3 };

const IMAGES_PAR_SECONDE = 8; // vitesse de l'animation de marche

export function creerHeros() {
  return {
    x: 288,            // position en pixels (coin haut-gauche du sprite)
    y: 148,
    vitesse: 160,      // pixels par seconde
    direction: "bas",
    enMarche: false,
    tempsAnimation: 0,
    plancheArmure: null, // le corps du nain : changé par le set d'armure porté
    plancheArme: null,   // l'arme tenue : dessinée par-dessus
  };
}

export function mettreAJourHeros(heros, clavier, dt, limites) {
  // -1, 0 ou +1 sur chaque axe selon les touches enfoncées
  const dx = (clavier.droite() ? 1 : 0) - (clavier.gauche() ? 1 : 0);
  const dy = (clavier.bas() ? 1 : 0) - (clavier.haut() ? 1 : 0);

  heros.enMarche = dx !== 0 || dy !== 0;

  if (heros.enMarche) {
    // En diagonale on normalise, sinon le héros irait plus vite (Pythagore !)
    const longueur = Math.hypot(dx, dy);
    heros.x += (dx / longueur) * heros.vitesse * dt;
    heros.y += (dy / longueur) * heros.vitesse * dt;

    // La direction du regard suit le déplacement (l'axe horizontal gagne)
    if (dy > 0) heros.direction = "bas";
    if (dy < 0) heros.direction = "haut";
    if (dx > 0) heros.direction = "droite";
    if (dx < 0) heros.direction = "gauche";

    heros.tempsAnimation += dt;
  } else {
    heros.tempsAnimation = 0; // à l'arrêt : retour à la pose immobile
  }

  // On reste à l'intérieur de la zone
  heros.x = Math.max(limites.gauche, Math.min(limites.droite - TAILLE_CASE, heros.x));
  heros.y = Math.max(limites.haut, Math.min(limites.bas - TAILLE_CASE, heros.y));
}

export function dessinerHeros(ctx, heros) {
  const pose = heros.enMarche
    ? Math.floor(heros.tempsAnimation * IMAGES_PAR_SECONDE) % 4
    : 0;
  const ligne = LIGNE[heros.direction];
  // Le corps d'abord (la planche du set d'armure), l'arme par-dessus :
  // les deux planches partagent la même grille, elles se superposent pile.
  dessinerCase(ctx, heros.plancheArmure, pose, ligne, heros.x, heros.y);
  if (heros.plancheArme) {
    dessinerCase(ctx, heros.plancheArme, pose, ligne, heros.x, heros.y);
  }
}
