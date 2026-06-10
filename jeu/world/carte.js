// Le moteur de carte : transforme un plan en caractères (jeu/data/zones.js)
// en monde jouable — collisions, points d'intérêt, dessin des tuiles.

export const TUILE = 32; // taille d'une tuile en pixels

// Prépare une zone : dimensions, position de départ du héros en pixels…
export function creerCarte(zone) {
  const lignes = zone.plan;
  const largeur = lignes[0].length;
  const hauteur = lignes.length;
  return {
    nom: zone.nom,
    lignes,
    largeur,
    hauteur,
    largeurPx: largeur * TUILE,
    hauteurPx: hauteur * TUILE,
    // Position du sprite (64x64) pour que les PIEDS du héros
    // soient centrés sur la tuile de départ
    departX: zone.depart.colonne * TUILE - 16,
    departY: zone.depart.ligne * TUILE - 38,
  };
}

export function tuile(carte, colonne, ligne) {
  if (colonne < 0 || ligne < 0 || colonne >= carte.largeur || ligne >= carte.hauteur) {
    return "#"; // hors de la carte = mur
  }
  return carte.lignes[ligne][colonne];
}

// Un rectangle (en pixels) ne touche-t-il aucun mur ?
// Le rectangle fait moins d'une tuile : vérifier ses 4 coins suffit.
export function rectangleLibre(carte, x, y, largeur, hauteur) {
  const points = [
    [x, y], [x + largeur - 1, y],
    [x, y + hauteur - 1], [x + largeur - 1, y + hauteur - 1],
  ];
  return points.every(
    ([px, py]) => tuile(carte, Math.floor(px / TUILE), Math.floor(py / TUILE)) !== "#"
  );
}

// La "boîte des pieds" du héros : on ne collisionne que le bas du sprite,
// pour que sa tête puisse passer devant les murs (rendu naturel en vue de haut).
export function piedsLibres(carte, x, y) {
  return rectangleLibre(carte, x + 16, y + 46, 32, 16);
}

// La tuile sous les pieds du héros (pour les rencontres, points d'intérêt…)
export function tuileSousLesPieds(carte, heros) {
  const colonne = Math.floor((heros.x + 32) / TUILE);
  const ligne = Math.floor((heros.y + 54) / TUILE);
  return { colonne, ligne, caractere: tuile(carte, colonne, ligne) };
}

// ---- Dessin -------------------------------------------------------------

const STYLE = {
  solVille: ["#211c18", "#1d1916"],
  solSauvage: ["#1b211a", "#171d17"],
  mousse: "#2a3324",
  mur: "#4a505a",
  joint: "#2b2f36",
  mineFond: "#0b0907",
  mineCadre: "#5a4632",
};

// Ne dessine que les tuiles visibles par la caméra
export function dessinerCarte(ctx, carte, camera, largeurVue, hauteurVue) {
  const c0 = Math.max(0, Math.floor(camera.x / TUILE));
  const l0 = Math.max(0, Math.floor(camera.y / TUILE));
  const c1 = Math.min(carte.largeur - 1, Math.ceil((camera.x + largeurVue) / TUILE));
  const l1 = Math.min(carte.hauteur - 1, Math.ceil((camera.y + hauteurVue) / TUILE));

  for (let l = l0; l <= l1; l++) {
    for (let c = c0; c <= c1; c++) {
      const x = c * TUILE;
      const y = l * TUILE;
      const caractere = tuile(carte, c, l);

      if (caractere === "#") {
        ctx.fillStyle = STYLE.mur;
        ctx.fillRect(x, y, TUILE, TUILE);
        ctx.fillStyle = STYLE.joint; // joints entre les blocs de pierre
        ctx.fillRect(x, y + TUILE - 2, TUILE, 2);
        ctx.fillRect(x + TUILE - 2, y, 2, TUILE);
        continue;
      }

      if (caractere === "M") {
        // L'entrée de mine : une ouverture sombre encadrée de bois
        ctx.fillStyle = STYLE.mineFond;
        ctx.fillRect(x, y, TUILE, TUILE);
        ctx.fillStyle = STYLE.mineCadre;
        ctx.fillRect(x, y, TUILE, 4);
        ctx.fillRect(x, y, 4, TUILE);
        ctx.fillRect(x + TUILE - 4, y, 4, TUILE);
        continue;
      }

      // Sols : damier discret, version ville ou version sauvage
      const couleurs = caractere === "," ? STYLE.solSauvage : STYLE.solVille;
      ctx.fillStyle = couleurs[(c + l) % 2];
      ctx.fillRect(x, y, TUILE, TUILE);
      // Quelques touffes de mousse sur le sol sauvage (motif fixe, sans hasard)
      if (caractere === "," && (c * 7 + l * 13) % 9 === 0) {
        ctx.fillStyle = STYLE.mousse;
        ctx.fillRect(x + 12, y + 18, 4, 3);
        ctx.fillRect(x + 20, y + 8, 3, 3);
      }
    }
  }
}
