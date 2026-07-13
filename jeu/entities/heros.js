// Le héros : son état (position, direction...), sa mise à jour, son dessin.

import { dessinerCase } from "../core/sprites.js";
import { piedsLibres, rectangleLibre, TUILE } from "../world/carte.js";
import { STATS_HEROS_BASE } from "../data/heros_base.js";

// Lignes de la planche images/heros/nain.png
const LIGNE = { bas: 0, gauche: 1, droite: 2, haut: 3 };

const IMAGES_PAR_SECONDE = 8; // vitesse de l'animation de marche

export function creerHeros() {
  return {
    x: 0,              // position en pixels (placée par la carte au démarrage)
    y: 0,
    vitesse: STATS_HEROS_BASE.vitesseMarche, // pixels/s (Excel « Héros ») ; recalc. par talents
    direction: "bas",
    enMarche: false,
    tempsAnimation: 0,
    plancheArmure: null, // le corps du nain : changé par le set d'armure porté
    plancheArme: null,   // l'arme tenue : dessinée par-dessus
    pvMax: STATS_HEROS_BASE.pv, // vie max — RECALCULÉE par les talents (base Excel « Héros »)
    pv: STATS_HEROS_BASE.pv,    // vie courante — PERSISTE entre les combats
    // Progression : XP/niveau → points de talent. L'arbre de talents donne les
    // CHIFFRES du héros (vie max, vitesse, Chaleur, pioche…) ; l'équipement, lui,
    // donne les CARTES. (vitesse ci-dessus est aussi recalculée par les talents.)
    niveau: 1,
    xp: 0,
    pointsTalent: 0,
    talents: {},         // { idNoeud: rang } — talents débloqués
  };
}

// `obstacles` : boîtes pleines {x, y, w, h} à ne pas traverser (PNJ, fontaine…),
// en plus des murs. On teste contre la BOÎTE DES PIEDS du héros (comme les murs).
export function mettreAJourHeros(heros, clavier, dt, carte, obstacles = []) {
  // Une position est LIBRE si les pieds ne touchent ni un mur ni un obstacle.
  const libre = (x, y) => {
    if (!piedsLibres(carte, x, y)) return false;
    const px = x + 16, py = y + 46; // boîte des pieds : 32×16 (cf. piedsLibres)
    return !obstacles.some((o) => px < o.x + o.w && px + 32 > o.x && py < o.y + o.h && py + 16 > o.y);
  };

  // -1, 0 ou +1 sur chaque axe selon les touches enfoncées
  const dx = (clavier.droite() ? 1 : 0) - (clavier.gauche() ? 1 : 0);
  const dy = (clavier.bas() ? 1 : 0) - (clavier.haut() ? 1 : 0);

  heros.enMarche = dx !== 0 || dy !== 0;

  if (heros.enMarche) {
    // En diagonale on normalise, sinon le héros irait plus vite (Pythagore !)
    const longueur = Math.hypot(dx, dy);
    // Vitesse de marche = base/talents (heros.vitesse) × bonus % d'équipement (bottes).
    const v = heros.vitesse * (1 + (heros.vitesseEquipPct || 0) / 100);
    const pasX = (dx / longueur) * v * dt;
    const pasY = (dy / longueur) * v * dt;

    // Chaque axe est testé séparément contre les murs : si un seul des
    // deux est bloqué, on glisse le long du mur au lieu de rester planté.
    const bougeX = libre(heros.x + pasX, heros.y);
    if (bougeX) heros.x += pasX;
    const bougeY = libre(heros.x, heros.y + pasY);
    if (bougeY) heros.y += pasY;

    // Aide au passage des galeries étroites (larges d'1 case). La « boîte des pieds »
    // fait exactement une case de large : pour enfiler un couloir d'1 case, il faut
    // être aligné au pixel près. Quand on pousse sur UN SEUL axe et qu'on bute tout
    // droit, on regarde lequel des deux coins d'attaque touche le mur : si l'autre
    // coin est libre, c'est qu'une ouverture est de ce côté → on glisse vers elle,
    // en s'arrêtant PILE sur l'alignement de la case (donc sans dépasser ni osciller).
    const aide = v * dt;
    if (dx === 0 && dy !== 0 && !bougeY) {            // poussée verticale bloquée
      const yb = heros.y + pasY + (dy < 0 ? 46 : 61); // bord d'attaque (haut si on monte, bas si on descend)
      const gSolide = !rectangleLibre(carte, heros.x + 16, yb, 1, 1); // coin gauche des pieds
      const dSolide = !rectangleLibre(carte, heros.x + 47, yb, 1, 1); // coin droit des pieds
      if (gSolide && !dSolide) {                       // mur à gauche → ouverture à droite
        const cible = (Math.floor((heros.x + 16) / TUILE) + 1) * TUILE - 16;
        const nx = Math.min(heros.x + aide, cible);
        if (libre(nx, heros.y)) heros.x = nx;
      } else if (dSolide && !gSolide) {                // mur à droite → ouverture à gauche
        const cible = Math.floor((heros.x + 47) / TUILE) * TUILE - 48;
        const nx = Math.max(heros.x - aide, cible);
        if (libre(nx, heros.y)) heros.x = nx;
      }
    } else if (dy === 0 && dx !== 0 && !bougeX) {     // poussée horizontale bloquée
      const xb = heros.x + pasX + (dx < 0 ? 16 : 47); // bord d'attaque (gauche si on va à gauche, droite sinon)
      const hSolide = !rectangleLibre(carte, xb, heros.y + 46, 1, 1); // coin haut des pieds
      const bSolide = !rectangleLibre(carte, xb, heros.y + 61, 1, 1); // coin bas des pieds
      if (hSolide && !bSolide) {                       // mur en haut → ouverture en bas
        const cible = (Math.floor((heros.y + 46) / TUILE) + 1) * TUILE - 46;
        const ny = Math.min(heros.y + aide, cible);
        if (libre(heros.x, ny)) heros.y = ny;
      } else if (bSolide && !hSolide) {                // mur en bas → ouverture en haut
        const cible = Math.floor((heros.y + 61) / TUILE) * TUILE - 62;
        const ny = Math.max(heros.y - aide, cible);
        if (libre(heros.x, ny)) heros.y = ny;
      }
    }

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
