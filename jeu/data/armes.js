// Bibliothèque des armes : les stats + le skin de chaque arme.
//
// C'est ICI qu'on ajoutera chaque nouvelle arme du jeu (une ligne par arme).
// Valeurs provisoires : l'équilibrage viendra avec le pilier combat.
// Plus tard, chaque arme injectera aussi SES CARTES dans le deck du joueur
// (notre règle : « le deck est le miroir de l'équipement »).

export const ARMES = [
  {
    id: "hache-rouillee",
    nom: "Rusty Axe",            // les noms d'objets sont en anglais (langue du jeu)
    degats: 5,
    planche: "images/armes/hache.png",
    cartes: ["coup-de-hache"],   // carte injectée dans le deck quand on l'équipe
  },
  {
    id: "marteau-de-forge",
    nom: "Forge Hammer",
    degats: 4,
    planche: "images/armes/marteau.png",
    cartes: ["ecrasement"],
  },
  {
    id: "pioche-de-mineur",
    nom: "Miner's Pick",
    degats: 3,
    planche: "images/armes/pioche.png",
    cartes: ["coup-de-pioche"],
  },
];
