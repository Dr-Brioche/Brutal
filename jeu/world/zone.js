// La zone de test : un bout de caverne de Brütàl.
// Pour l'instant : un sol de pierre et des murs, dessinés par programme.
// Plus tard, ce dossier accueillera les vraies zones de la ville.

const TUILE = 16;

// L'intérieur jouable (les murs font une tuile d'épaisseur)
export const limites = {
  gauche: TUILE,
  haut: TUILE,
  droite: 320 - TUILE,
  bas: 180 - TUILE,
};

export function dessinerZone(ctx) {
  const largeur = ctx.canvas.width;
  const hauteur = ctx.canvas.height;

  // Sol : damier discret de deux gris très sombres
  for (let y = 0; y < hauteur; y += TUILE) {
    for (let x = 0; x < largeur; x += TUILE) {
      const claire = ((x + y) / TUILE) % 2 === 0;
      ctx.fillStyle = claire ? "#211c18" : "#1d1916";
      ctx.fillRect(x, y, TUILE, TUILE);
    }
  }

  // Murs : blocs de pierre taillée tout autour
  for (let y = 0; y < hauteur; y += TUILE) {
    for (let x = 0; x < largeur; x += TUILE) {
      const estMur =
        x === 0 || y === 0 || x === largeur - TUILE || y === hauteur - TUILE;
      if (!estMur) continue;
      ctx.fillStyle = "#4a505a";
      ctx.fillRect(x, y, TUILE, TUILE);
      ctx.fillStyle = "#2b2f36"; // joints entre les blocs
      ctx.fillRect(x, y + TUILE - 1, TUILE, 1);
      ctx.fillRect(x + TUILE - 1, y, 1, TUILE);
    }
  }
}
