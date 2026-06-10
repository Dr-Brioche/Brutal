// La caméra : suit le héros, sans jamais montrer l'extérieur de la carte.

export function creerCamera() {
  return { x: 0, y: 0 };
}

export function mettreAJourCamera(camera, heros, carte, largeurVue, hauteurVue) {
  // Centrer la vue sur le milieu du sprite du héros…
  const cibleX = heros.x + 32 - largeurVue / 2;
  const cibleY = heros.y + 32 - hauteurVue / 2;
  // …mais rester dans les limites de la carte
  camera.x = Math.max(0, Math.min(carte.largeurPx - largeurVue, cibleX));
  camera.y = Math.max(0, Math.min(carte.hauteurPx - hauteurVue, cibleY));
}
