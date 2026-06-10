# BRUTAL

Jeu web **solo** en pixel art, jouable dans le navigateur.

## Le concept en bref

Le héros — un nain inconnu — débarque dans **Brütàl**, une cité naine souterraine
dirigée par trois grandes factions :

- ⚒️ **Rune-Awakener** — les artisans → la **Forge** (craft)
- 🛡️ **Onyx-Guardians** — les légendes militaires → le **Combat** (deck de cartes, façon *Slay the Spire*)
- 💰 **Deep-Market** — les marchands → le **Marché** (commerce & bourse)

Pour gagner, il faut **devenir le meilleur d'une de ces factions** et rejoindre
**The Triad of the Vault**, le cercle qui dirige la cité.

👉 Concept complet et à jour : **[`docs/concept.md`](docs/concept.md)**

## Où en est le projet ?

- ✅ L'écran de titre est **en ligne** : https://dr-brioche.github.io/Brutal/
- ✅ Le **concept est posé** (voir ci-dessus).
- ✅ **Socle, premier morceau** : le nain (placeholder) se déplace dans une zone
  de test — clavier ZQSD / WASD / flèches.
- ✅ **Équipement + skins** : bibliothèques d'armes et de sets d'armure
  (stats + sprites), visibles sur le nain — touches R (arme) et E (armure).
- ✅ **Passage en 64×64** : héros plus détaillé, écran de jeu agrandi.
- ⏭️ Prochaine étape : la sauvegarde locale, puis le premier pilier jouable,
  le **combat**.

## Comment voir le jeu ?

👉 **En ligne** : https://dr-brioche.github.io/Brutal/ — rien à installer,
tout tourne dans le navigateur.

(Pour les curieux : ouvrir `index.html` directement sur son ordinateur ne
suffit plus — le code est découpé en modules, et les navigateurs exigent un
mini-serveur local pour ça. On teste en ligne, c'est notre méthode de toute façon.)

## Les fichiers

| Fichier / dossier   | À quoi ça sert                                          |
|---------------------|---------------------------------------------------------|
| `index.html`        | La porte d'entrée : écran de titre + lancement du jeu.  |
| `jeu/principal.js`  | Le chef d'orchestre : assemble les briques du jeu.      |
| `jeu/core/`         | Le moteur : boucle de jeu, clavier, planches de sprites.|
| `jeu/data/`         | Le contenu : bibliothèques d'armes, de sets d'armure…   |
| `jeu/systems/`      | Les mécaniques : équipement (combat, forge… plus tard). |
| `jeu/entities/`     | Les personnages : le héros (PNJ et ennemis plus tard).  |
| `jeu/world/`        | Les lieux : la zone de test (la ville Brütàl plus tard).|
| `images/`           | Les visuels : planches de sprites 64×64.                |
| `outils/`           | Les outils de chantier (génération des sprites provisoires). |
| `docs/concept.md`   | Le concept complet du jeu — la « bible » du projet.     |
| `CLAUDE.md`         | Les règles de travail entre Brioche et Claude.          |
| `README.md`         | Ce fichier : la « notice » du projet.                   |
