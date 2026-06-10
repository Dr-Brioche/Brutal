// Chargement des images + découpe des planches de sprites.
//
// Une "planche" (spritesheet) est un PNG quadrillé en cases de 32x32 :
// chaque ligne = une direction ou une activité, chaque colonne = une
// étape d'animation. Pour animer, on affiche les cases l'une après l'autre.

export const TAILLE_CASE = 32;

export function chargerImage(chemin) {
  return new Promise((resoudre, rejeter) => {
    const image = new Image();
    image.onload = () => resoudre(image);
    image.onerror = () => rejeter(new Error("Image introuvable : " + chemin));
    image.src = chemin;
  });
}

// Dessine UNE case de la planche aux coordonnées (x, y) de l'écran.
export function dessinerCase(ctx, planche, colonne, ligne, x, y) {
  ctx.drawImage(
    planche,
    colonne * TAILLE_CASE, ligne * TAILLE_CASE,   // où découper dans la planche
    TAILLE_CASE, TAILLE_CASE,
    Math.round(x), Math.round(y),                 // où poser à l'écran
    TAILLE_CASE, TAILLE_CASE
  );
}
