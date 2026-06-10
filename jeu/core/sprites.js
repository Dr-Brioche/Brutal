// Chargement des images + découpe des planches de sprites.
//
// Une "planche" (spritesheet) est un PNG quadrillé en cases de 64x64 :
// chaque ligne = une direction ou une activité, chaque colonne = une
// étape d'animation. Pour animer, on affiche les cases l'une après l'autre.

export const TAILLE_CASE = 64;

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
  dessinerCaseEchelle(ctx, planche, colonne, ligne, x, y, 1);
}

// Comme dessinerCase, mais AGRANDIE d'un facteur (ex. ×3 en combat).
// N'agrandir que par un nombre ENTIER : les pixels restent nets, jamais flous.
export function dessinerCaseEchelle(ctx, planche, colonne, ligne, x, y, echelle) {
  const taille = TAILLE_CASE * echelle;
  ctx.drawImage(
    planche,
    colonne * TAILLE_CASE, ligne * TAILLE_CASE,   // où découper dans la planche
    TAILLE_CASE, TAILLE_CASE,
    Math.round(x), Math.round(y),                 // où poser à l'écran
    taille, taille
  );
}
