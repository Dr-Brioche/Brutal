# Règles de travail — Projet BRUTAL

> Ce fichier est relu par Claude au début de chaque session de travail.
> Il définit comment on travaille sur ce projet. Modifiable à tout moment par Brioche.

## Le projet en bref

- **Brutal** est un jeu web, jouable **en solo, en local** (pas de multijoueur, pas de serveur).
- Il est développé et testé **directement en ligne** via GitHub Pages :
  https://dr-brioche.github.io/Brutal/
- **Finalité** : pouvoir l'exporter en **.exe** (via un emballeur type Electron/Tauri)
  pour une présentation sur **Steam**. → Le code doit rester 100 % autonome
  (pas de dépendance à un serveur), pour que l'emballage final reste simple.
- Le concept du jeu est décrit dans `docs/concept.md` (résumé en tête de README).
- **Objectif n°1 du gameplay : un jeu intéressant et addictif.**

## Rôles

- **Brioche** : créateur du jeu, décideur final. Il apprend la programmation :
  toujours expliquer simplement, avec des analogies si besoin. Parler en français.
- **Claude** : programmeur du projet, pas simple exécutant.
  - Proposer des améliorations quand il y a un intérêt.
  - Poser des questions avant toute grosse décision (avec options + avis).
  - Prévenir / contredire Brioche si une idée semble aller contre
    l'objectif « intéressant et addictif » — argumenter, puis le laisser trancher.
  - Pas de formules de flatterie (« bonne question », « excellente idée »…) :
    aller droit au contenu.
  - Terminer chaque réponse par la phrase « **J'ai fini Brioche** » (en gras)
    pour signaler clairement la fin du tour.

## Organisation du travail

- **Une amélioration = une tâche = un commit.** Ne jamais tout mélanger en un bloc.
- **`docs/concept.md` est la référence du design.** À chaque modification de
  gameplay, analyser ce document et le mettre à jour en conséquence :
  c'est lui qui survit si la conversation est effacée.
- Chaque commit est étiqueté par type, au choix parmi :
  - `[gameplay]` — règles du jeu, mécaniques, contenu
  - `[visuel]` — graphismes, animations, effets
  - `[son]` — bruitages, musiques
  - `[interface]` — menus, boutons, affichage des infos
  - `[technique]` — structure du code, outils, hébergement
  - `[équilibrage]` — réglage des valeurs (difficulté, vitesse, points…)
- Messages de commit **en français**, clairs pour un non-programmeur.

## L'Excel = base d'équilibrage (À NE JAMAIS OUBLIER)

Le classeur **`docs/BRUTAL-items-et-cartes.xlsx`** est la **base de référence de
l'équilibrage** du jeu. C'est **l'interface entre le code (que Claude gère) et les
décisions de Brioche** : Brioche y règle les chiffres, Claude les applique dans le code.

- **À tenir À JOUR en permanence.** Dès qu'on ajoute/modifie un **monstre, un objet,
  une carte, une ressource, une recette, un loot de profondeur, ou un réglage général**,
  on met à jour l'onglet correspondant **dans le même mouvement** — jamais « plus tard ».
- **Onglets** : `Cartes`, `Items`, `Sets`, `Effets`, `Valeurs`, `Ressources`, `Recettes`,
  `Profondeurs`(+`-chances`), `Monstres`, `Héros`, et **`Général`** (tous les réglages
  secondaires d'équilibrage, avec une phrase d'explication + le fichier où ça vit).
- **Sens de circulation** : Brioche édite l'Excel → Claude **réimporte** (`outils/importer_*.py`)
  ou **reporte à la main** (onglet `Général`, qui n'a pas d'importer). Les importers
  régénèrent des blocs balisés du code (`<<...-AUTO>>`) : l'Excel prime sur ces chiffres.
  L'**art et la technique** (sprites, planches, `attaqueHits`, évolutions…) restent dans
  le code, pas dans l'Excel.
- **Réflexe** : à chaque tâche touchant un chiffre d'équilibrage, se demander
  « **est-ce dans l'Excel ?** » avant de clore. (Rappel écrit ici pour survivre à un
  effacement de conversation.)

## Rangement des fichiers

Le rangement doit rester lisible pour Brioche, qui doit pouvoir retrouver
un fichier seul sur GitHub :

```
Brutal/
├── index.html      ← la porte d'entrée du jeu
├── jeu/            ← le code, découpé par rôle
├── images/         ← tous les visuels
├── sons/           ← bruitages et musiques
├── outils/         ← scripts de chantier (ex. génération des sprites provisoires)
└── docs/           ← concept, idées, notes de conception
```

(La structure interne de `jeu/` sera précisée avec le concept du jeu.)

## Points techniques à ne pas oublier

- **Tout doit être jouable à la souris OU au clavier** : chaque action a ses
  deux entrées. Y penser dès qu'on ajoute un écran, un menu ou un bouton.
  C'est aussi ce qui rendra le portage **manette** simple plus tard (le clavier
  se mappe facilement sur une manette).
- **PNJ — RÈGLE ABSOLUE : ils se tournent vers le héros et ils sont solides.**
  Tout PNJ (présent ou futur) doit :
  1. **se tourner vers le héros QUAND ON LUI PARLE** (ouverture du dialogue), pas
     juste en passant à côté — 4 sens (bas/haut/gauche/droite) selon d'où on vient.
     Sa planche fournit donc 4 frames « debout » de regard, déclarées dans
     `sprite.regard` (`jeu/data/pnj.js`) ; l'import (`outils/importer_*.py`) découpe
     pour ça la ligne **face** (bas), **dos** (haut) et les deux **profils**
     (gauche/droite) de la source. Côté code : `regarderHeros(pnj, heros)` est appelé
     à l'ouverture de chaque dialogue (`jeu/principal.js`) ; le reste du temps le PNJ
     garde son comportement (il s'arrête juste s'il marchait, pour ne pas traverser
     le héros). Aucune autre retouche par PNJ : renseigner `regard` suffit.
  2. **être un obstacle** : on ne le traverse pas. Sa boîte de blocage (aux pieds)
     est ajoutée dans `obstaclesVille()` de `jeu/principal.js`, passée à
     `mettreAJourHeros`. Idem pour les objets fixes (fontaine…).
- **Texte dessiné sur le canvas** (noms de PNJ, niveau/HP des monstres, dégâts…) :
  tout est centralisé dans **`jeu/core/texte.js`** (police + résolution). Règle :
  pour tout nouveau texte canvas, utiliser `police(taille)` — **jamais** une
  famille de police en dur. Ne rien faire de spécial pour la netteté : le canvas
  est déjà rendu à `RES×` (le texte est donc net). Changer la police ou la
  résolution de TOUT le jeu = modifier ce seul fichier. (Le texte d'interface —
  HUD, cartes, menus, bulles — est en HTML/CSS : déjà net, indépendant de ça.)
- **Coins arrondis PAR DÉFAUT** : toute fenêtre, cadre ou zone de texte a des
  coins arrondis (jamais de rectangle à angles vifs pour un élément d'interface).
  Centralisé dans **`jeu/core/style.js`** (constante `RAYON` + helper
  `cheminArrondi`) et, côté CSS, la variable `--rayon` (dans `index.html`).
  Règle : en CSS `border-radius: var(--rayon)` ; sur le canvas
  `cheminArrondi(ctx, x, y, w, h)` puis `fill()`/`stroke()` — jamais un `fillRect`
  nu. Changer l'arrondi de tout le jeu = modifier `RAYON` et `--rayon`.
- **Fenêtres d'interface : classe `panneau-ui` OBLIGATOIRE.** Le cadre doré borde
  la **zone 16:9** (letterboxée, centrée), PAS la fenêtre du navigateur. Toute
  fenêtre flottante (menu, dialogue, inventaire, deck, talents, butin, confirmation…)
  doit donc tenir dans l'**ouverture du cadre**, même quand la fenêtre de jeu est
  petite. Pour ça : donner la classe **`panneau-ui`** au panneau. Un petit script
  (bas de `index.html`) le **réduit automatiquement** (`--echelle-ui`) juste ce qu'il
  faut pour rentrer dans l'ouverture (jamais agrandi ; pleine taille sur grand écran).
  Variables partagées : `--zl`/`--zh` (zone) et `--ouv-x`/`--ouv-y` (marge du cadre),
  dans `:root`. Un panneau plein écran déjà responsive (unités `cqw`, ex. la Forge)
  n'en a PAS besoin. Sans `panneau-ui`, la fenêtre déborde sous les barres du cadre.
- GitHub Pages publie la branche `claude/epic-wright-69hom4` : c'est elle
  qui est en ligne. Pousser dessus = mettre à jour le jeu visible.
- Les scores/sauvegardes du joueur se font en local dans le navigateur
  (`localStorage`), jamais sur un serveur.
- Garder le jeu léger (limite GitHub Pages : 1 Go au total, 100 Mo par fichier). Si cette règle te limite préviens-moi.
- **⚠ À SUPPRIMER AVANT L'EXPORT FINAL (Electron/Steam) :** le système de remarques debug
  (`index.html` contient deux blocs marqués `TODO EXPORT FINAL` à retirer entièrement) :
  - le **tampon d'erreurs** (petit `<script>` en tête de `<head>`) ;
  - le **bouton "Remarque"** avec son overlay, ses styles `#dbgr-*`, et le grand `<script>` IIFE
    en bas de `<body>`.
  Ces deux blocs sont clairement balisés dans le code (`TODO EXPORT FINAL`). Ils n'ont aucune
  utilité dans la version packagée : le serveur `/debug/remarque` n'existe pas en build final.
