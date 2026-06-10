// La boucle de jeu : le cœur qui bat ~60 fois par seconde.
// À chaque battement : on met à jour le monde, puis on le dessine.

export function lancerBoucle({ mettreAJour, dessiner }) {
  let dernierTemps = performance.now();

  function battement(maintenant) {
    // dt = temps écoulé depuis la dernière image, en secondes.
    // Plafonné à 0,1 s : si l'onglet est mis en pause, le jeu ne "saute" pas.
    const dt = Math.min((maintenant - dernierTemps) / 1000, 0.1);
    dernierTemps = maintenant;

    mettreAJour(dt);
    dessiner();
    requestAnimationFrame(battement);
  }

  requestAnimationFrame(battement);
}
