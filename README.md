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
- ✅ **Sauvegarde locale** : menu pause (**Échap**) avec **3 emplacements** —
  sauvegarder / charger sa partie. Tout est retenu par le navigateur,
  sans serveur.
- ✅ **Écran de démarrage** : au lancement, choix entre **New Game** et la
  reprise d'une sauvegarde (sauté s'il n'existe encore aucune sauvegarde).
- ✅ **Zone de test explorable** : caméra qui suit le nain, vrais murs
  (collisions), quartier de ville + zone sauvage, entrée de mine.
- ✅ **Rencontres aléatoires** : sur le sol sauvage, un monstre surgit —
  flash d'écran façon FF9 — et bascule sur le combat.
- ✅ **Combat, premier jet jouable** 🃏 : écran dédié (nain de profil à gauche,
  ennemi à droite), **cartes** à jouer, **Chaleur de Forge** comme énergie,
  défense **Pierre** qui persiste, intention de l'ennemi affichée, victoire /
  défaite. Chaque arme apporte **sa carte** (hache, marteau, pioche).
- ⏭️ Prochaine étape : **enrichir le combat** (butin, plus d'ennemis, sons &
  animations), puis le pilier **Forge** ⚒️

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
| `jeu/core/`         | Le moteur : boucle de jeu, clavier, sprites, caméra.    |
| `jeu/data/`         | Le contenu : armes, sets d'armure, plans des zones…     |
| `jeu/systems/`      | Les mécaniques : équipement, sauvegarde, rencontres.    |
| `jeu/ui/`           | L'interface : menus, écran de démarrage, effets.        |
| `jeu/entities/`     | Les personnages : le héros (PNJ et ennemis plus tard).  |
| `jeu/world/`        | Les lieux : le moteur de carte (collisions, dessin).    |
| `images/`           | Les visuels : planches de sprites 64×64.                |
| `outils/`           | Les outils de chantier (génération des sprites provisoires). |
| `docs/concept.md`   | Le concept complet du jeu — la « bible » du projet.     |
| `CLAUDE.md`         | Les règles de travail entre Brioche et Claude.          |
| `README.md`         | Ce fichier : la « notice » du projet.                   |
