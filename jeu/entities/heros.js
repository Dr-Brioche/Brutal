// Le héros : son état (position, direction...), sa mise à jour, son dessin.

import { dessinerCase } from "../core/sprites.js";
import { piedsLibres } from "../world/carte.js";

// Lignes de la planche images/heros/nain.png
const LIGNE = { bas: 0, gauche: 1, droite: 2, haut: 3 };

const IMAGES_PAR_SECONDE = 8; // vitesse de l'animation de marche

export function creerHeros() {
  return {
    x: 0,              // position en pixels (placée par la carte au démarrage)
    y: 0,
    vitesse: 160,      // pixels par seconde
    direction: "bas",
    enMarche: false,
    tempsAnimation: 0,
    plancheArmure: null, // le corps du nain : changé par le set d'armure porté
    plancheArme: null,   // l'arme tenue : dessinée par-dessus
    pvMax: 40,           // vie max — RECALCULÉE par les talents (base 40)
    pv: 40,              // vie courante — PERSISTE entre les combats
    // Progression : XP/niveau → points de talent. L'arbre de talents donne les
    // CHIFFRES du héros (vie max, vitesse, Chaleur, pioche…) ; l'équipement, lui,
    // donne les CARTES. (vitesse ci-dessus est aussi recalculée par les talents.)
    niveau: 1,
    xp: 0,
    pointsTalent: 0,
    talents: {},         // { idNoeud: rang } — talents débloqués
  };
}

export function mettreAJourHeros(heros, clavier, dt, carte) {
  // -1, 0 ou +1 sur chaque axe selon les touches enfoncées
  const dx = (clavier.droite() ? 1 : 0) - (clavier.gauche() ? 1 : 0);
  const dy = (clavier.bas() ? 1 : 0) - (clavier.haut() ? 1 : 0);

  heros.enMarche = dx !== 0 || dy !== 0;

  if (heros.enMarche) {
    // En diagonale on normalise, sinon le héros irait plus vite (Pythagore !)
    const longueur = Math.hypot(dx, dy);
    // Vitesse de marche = base/talents (heros.vitesse) + bonus d'équipement (bottes).
    const v = heros.vitesse + (heros.vitesseEquip || 0);
    const pasX = (dx / longueur) * v * dt;
    const pasY = (dy / longueur) * v * dt;

    // Chaque axe est testé séparément contre les murs : si un seul des
    // deux est bloqué, on glisse le long du mur au lieu de rester planté.
    if (piedsLibres(carte, heros.x + pasX, heros.y)) heros.x += pasX;
    if (piedsLibres(carte, heros.x, heros.y + pasY)) heros.y += pasY;

    // La direction du regard suit le déplacement (l'axe horizontal gagne)
    if (dy > 0) heros.direction = "bas";
    if (dy < 0) heros.direction = "haut";
    if (dx > 0) heros.direction = "droite";
    if (dx < 0) heros.direction = "gauche";

    heros.tempsAnimation += dt;
  } else {
    heros.tempsAnimation = 0; // à l'arrêt : retour à la pose immobile
  }
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
