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
- ✅ **Affichage plein écran** : le jeu remplit toute la fenêtre (fini les
  marges noires) et on voit **plus loin** sur la carte. Réglable d'une valeur.
- ✅ **Deux zones reliées par une porte** : la **ville** (sûre) et les
  **souterrains** (roche style Moria, dangereux), **agrandies** — on passe de
  l'une à l'autre en marchant sur une **porte**, avec un fondu au noir. Tout est
  sous terre.
- ✅ **Rencontres aléatoires** : dans les souterrains, un monstre surgit —
  flash d'écran façon FF9 — et bascule sur le combat.
- ✅ **Combat, premier jet jouable** 🃏 : écran dédié (nain de profil à gauche,
  ennemi à droite), **cartes** à jouer, défense **Pierre** qui persiste,
  intention de l'ennemi affichée, victoire / défaite. Chaque arme apporte
  **sa carte** (hache, marteau, pioche).
- ✅ **Chaleur de Forge avec surchauffe** 🌋 : jauge de lave qui s'accumule
  (+1/tour) ; au-delà du seuil (3) on **surchauffe** et on brûle de
  **(chaleur−seuil)²** PV/tour. La jauge chauffe en couleur et fume de plus en
  plus haut. (Réglages bientôt modifiés par l'équipement.)
- ✅ **Cartes de base à 0 énergie** : un set commun faible (Tap, Brace) toujours
  jouable ; les cartes fortes coûtent de la Chaleur et viennent du **stuff**.
- ✅ **La vie persiste** entre les combats (plus de soin gratuit). À la défaite,
  on se réveille en ville à 1 PV.
- ✅ **Butin & inventaire** 🎒 : les monstres lâchent de l'**or** et des **objets**
  (selon leur rareté). **Inventaire (touche B)** façon Diablo : un **sac** en cases
  (les objets prennent de la place) et une **poupée d'équipement** (arme(s),
  armure, gants, bottes, collier, 5 bagues, sac). Clic pour équiper / déséquiper.
  L'équipement change le **skin**, les **cartes** et les stats. (Plus de R/E :
  on a un stuff de départ et on s'équipe via le sac.)
- ✅ **Dialogues** 💬 : près du **fanatique**, *[Space] Talk* ouvre un dialogue
  avec un choix — se faire **soigner** ou partir. (Le soin, c'est lui pour l'instant.)
- ✅ **Tout au clavier** : déplacements ZQSD/WASD/flèches, **Espace** pour
  parler/valider, dialogue et **cartes de combat** navigables au clavier.
- ✅ **Premiers vrais sprites** : le **gobelin** de combat est animé
  (idle / attaque / coup reçu) ; le **fanatique** arpente la ville. Les planches
  sont découpées par les outils de `outils/` — méthode rejouable.
- ⏭️ Prochaine étape : **enrichir le combat** (butin, plus d'ennemis, sons),
  les **items** qui modifient la Chaleur, puis le pilier **Forge** ⚒️

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
