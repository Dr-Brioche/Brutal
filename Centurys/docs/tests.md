# Tester Centurys — à lire AVANT tout test visuel

La règle : **on ne traverse pas une partie entière pour vérifier un visuel.**
Une bataille dure une dizaine de minutes ; attendre l'âge futuriste pour
regarder un méca est une perte de temps.

## Les pages de test

| Page | Ce qu'elle montre |
|---|---|
| `outils/test-unites.html` | **Toutes** les troupes des cinq âges, dans les deux camps, avec marche et attaque animées. C'est la page à ouvrir dès qu'on touche à `jeu/rendu/unites.js`. |

En créer une nouvelle pour un autre écran est presque toujours plus rapide
que de jouer jusqu'à lui.

## Lancer un serveur

Le jeu utilise des modules JavaScript : ouvrir le fichier directement
(`file://`) **ne marche pas**, le navigateur refuse les imports.

```bash
cd Centurys
python3 -m http.server 8000
```

## Raccourcis pour tester en jeu

Ouvrir la console du navigateur (F12) pendant une partie :

```js
const { etat } = await import('/jeu/systems/etat.js');

etat.camps.joueur.or = 99999;          // riche
etat.camps.joueur.xp = 99999;          // évolution immédiate (touche E)
etat.camps.joueur.age = 4;             // directement à l'âge futuriste
etat.camps.joueur.specialRecharge = 0; // attaque spéciale prête (touche A)
etat.camps.ennemi.pv = 40;             // fin de partie en quelques coups
etat.camps.ennemi.bonusRevenu = 0;     // l'adversaire n'achète plus rien
etat.unites.length = 0;                // vider le terrain
```

Attention : changer `age` à la main ne redessine les boutons qu'à l'image
suivante, c'est normal.

## Vérifier l'équilibrage sans jouer

On peut faire jouer le jeu **contre lui-même en accéléré** : on appelle
`majJeu(0.05)` en boucle au lieu d'attendre les images. Une partie de 13
minutes se simule en quelques secondes. C'est comme ça que la durée des
parties et les niveaux de revenu atteints ont été réglés — voir la
section « L'adversaire » de `concept.md` pour la logique de décision.

## Pièges déjà payés

- **Ouvrir `index.html` en `file://`** → écran noir, imports refusés. Serveur obligatoire.
- **Une page dans `outils/`** doit remonter d'un cran dans ses imports
  (`../jeu/...`), sinon rien ne se charge.
- **Modifier une taille de troupe** change aussi son encombrement (`largeur`) :
  c'est lui qui décide de l'espacement dans la file de bataille, pas le dessin.
- **La portée d'une troupe se mesure de bord à bord**, pas de centre à centre.
  Une portée de 30 sur une troupe large de 100 laisse un vrai espace visible.
- **Le camp se reconnaît à la couleur du bandeau et de l'ombre au sol**
  (bleu = joueur, rouge = ennemi). Une nouvelle silhouette doit recevoir sa
  pièce aux couleurs du camp, sinon on ne distingue plus les deux armées.
- **Vérifier les deux langues** avant de clore une tâche : un libellé anglais
  plus long peut déborder d'un bouton.
