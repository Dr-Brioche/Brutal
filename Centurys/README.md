# Centurys

Un jeu de bataille 2D vu de côté, jouable **en solo, dans le navigateur**.
Tu envoies des troupes sur un terrain, tu défends ton château, tu détruis
celui d'en face — et avec assez d'expérience tu **traverses cinq âges**,
de l'homme au gourdin au méca de siège.

*A 2D side-view battle game, playable solo in the browser. Send troops,
defend your castle, destroy the enemy one, and evolve through five ages.*

---

## Jouer

- **En ligne** : https://dr-brioche.github.io/Centurys/ *(à activer, voir plus bas)*
- **En local** : le jeu utilise des modules JavaScript, il faut donc un petit
  serveur — ouvrir `index.html` directement dans le navigateur ne marchera pas.

  ```bash
  cd Centurys
  python3 -m http.server 8000
  # puis ouvrir http://localhost:8000
  ```

## Commandes

Tout se fait **à la souris OU au clavier**, sans exception.

| Touche | Action |
|---|---|
| `1` `2` `3` | acheter la troupe correspondante |
| `4` | améliorer le revenu |
| `E` | évoluer (changer d'âge) |
| `A` | attaque spéciale |
| `Retour arrière` | annuler le dernier entraînement (remboursé) |
| `P` ou `Échap` | pause |
| `M` | couper / remettre le son |
| `Tab` + `Entrée` | naviguer entre les boutons |

## Les règles en trois phrases

1. Ton **revenu** te donne de l'or en continu ; tuer une troupe adverse en
   rapporte aussi. L'or sert à acheter des troupes **et** à augmenter le revenu.
2. Chaque troupe tuée donne de l'**expérience** ; assez d'expérience permet de
   passer à l'**âge suivant**, qui débloque trois troupes bien plus fortes.
3. Le premier qui met le **château adverse** à zéro gagne.

## Comment c'est rangé

```
Centurys/
├── index.html              ← la porte d'entrée du jeu (+ toute la mise en page)
├── jeu/
│   ├── principal.js        ← assemble tout : boucle, clavier, écrans
│   ├── data/               ← LES CHIFFRES : réglages, âges et troupes, textes
│   ├── systems/            ← les règles : combat, adversaire, langue, état
│   ├── rendu/              ← le dessin : le terrain, les troupes
│   ├── ui/                 ← l'interface : boutons du bas, messages
│   └── core/               ← briques communes : style, sons
├── outils/                 ← pages de test (voir docs/tests.md)
└── docs/                   ← concept.md (le design) et tests.md (comment vérifier)
```

**Pour régler l'équilibrage, deux fichiers suffisent :**
`jeu/data/reglages.js` (économie, terrain, difficulté) et
`jeu/data/ages.js` (les cinq âges et leurs quinze troupes).
Chaque chiffre y est commenté en français.

## Bilingue FR / EN

Le jeu existe en français **et** en anglais, au même niveau. Aucun texte
affiché au joueur n'est écrit en dur dans le code : tout vit dans
`jeu/data/textes.js`, avec ses deux versions. Ajouter un écran ou un
bouton, c'est écrire son texte dans les deux langues **tout de suite**.

## Autonome, donc emballable

Aucun serveur, aucune bibliothèque externe, aucune image ni son à
télécharger : les troupes sont dessinées par le code et les bruitages sont
fabriqués par le navigateur. Le jeu marche hors ligne tel quel, ce qui
rendra un emballage ultérieur (Electron / Tauri) simple.

## Mettre le jeu en ligne (GitHub Pages)

Dans le dépôt GitHub : **Settings → Pages → Source : Deploy from a branch**,
puis choisir la branche `main` et le dossier `/ (root)`. Quelques minutes
plus tard le jeu est visible sur `https://dr-brioche.github.io/Centurys/`.
