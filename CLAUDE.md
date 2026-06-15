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
- GitHub Pages publie la branche `claude/epic-wright-69hom4` : c'est elle
  qui est en ligne. Pousser dessus = mettre à jour le jeu visible.
- Les scores/sauvegardes du joueur se font en local dans le navigateur
  (`localStorage`), jamais sur un serveur.
- Garder le jeu léger (limite GitHub Pages : 1 Go au total, 100 Mo par fichier).
