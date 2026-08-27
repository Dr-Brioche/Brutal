# Centurys — concept

> Ce document est **la référence du design**. À chaque modification du
> gameplay, il faut l'analyser et le mettre à jour dans le même mouvement :
> c'est lui qui survit si la conversation est effacée.

## 1. Le pitch

Deux châteaux se font face sur un terrain plat, vus **de côté**. Chacun
produit des troupes qui marchent vers l'autre et se battent quand elles se
rencontrent. Le premier qui détruit le château adverse gagne.

La tension du jeu tient à **un seul arbitrage, répété en boucle** :

> l'or que je dépense maintenant en troupes, c'est de l'or que je n'investis
> pas dans mon revenu — et donc dans l'armée que j'aurai dans deux minutes.

C'est le cœur de la boucle addictive. Tout le reste (âges, attaque spéciale,
file d'entraînement) sert à rythmer cet arbitrage.

## 2. Les trois ressources

| Ressource | D'où elle vient | À quoi elle sert |
|---|---|---|
| **Or** | revenu continu + butin des troupes tuées | acheter des troupes, monter le revenu |
| **Expérience** | uniquement en tuant des troupes | changer d'âge |
| **Points de vie du château** | 1600 au départ, +12 % à chaque évolution | c'est la barre de défaite |

L'expérience ne s'achète pas : **il faut se battre pour progresser**. Un
joueur qui se contente d'accumuler de l'or n'évoluera jamais.

## 3. Les cinq âges

| # | Âge | XP à payer | Corps à corps | Distance | Lourde |
|---|---|---|---|---|---|
| 1 | Âge de pierre | — | Homme au gourdin | Lanceur de pierres | Mastodonte |
| 2 | Antiquité | 280 | Légionnaire | Archer | Char de guerre |
| 3 | Âge médiéval | 850 | Chevalier | Arbalétrier | Catapulte |
| 4 | Âge moderne | 2 200 | Fusilier | Tireur d'élite | Char d'assaut |
| 5 | Âge futuriste | 5 200 | Cyborg | Fantassin laser | Méca de siège |

Chaque âge est environ **deux fois plus cher et deux fois plus fort** que le
précédent. Les trois rôles sont volontairement toujours les mêmes, pour que
le joueur n'ait jamais à réapprendre l'interface :

- **corps à corps** — pas cher, sort vite, sert de mur ;
- **distance** — tire par-dessus le mur, fragile si on l'atteint ;
- **lourde** — chère et lente, mais casse une ligne à elle seule.

Changer d'âge répare aussi le château de 12 % : c'est ce qui laisse une
chance de remonter quand on est mené, sans annuler l'avance de l'adversaire.

Le décor change à chaque âge (ciel, collines, sol, silhouette du château) :
la progression doit **se voir**, pas seulement se lire dans un chiffre.

## 4. L'attaque spéciale

Une par âge (pluie de météores, volée de javelots, pluie de flèches, frappe
d'artillerie, frappe orbitale). Elle frappe **toutes les troupes adverses
présentes sur le terrain**, gratuitement, avec 50 secondes de recharge.

Son rôle : **casser les blocages**. Sans elle, deux armées équivalentes
s'annulent au milieu du terrain et la partie s'enlise. Elle ne touche jamais
un château : ce n'est pas une arme de finition, c'est un tournevis.

## 5. La file d'entraînement

Une troupe achetée n'apparaît pas tout de suite : elle rejoint une file (5
places maximum) et sort après son temps d'entraînement (1,3 s pour un homme
au gourdin, 6,5 s pour un méca). Cliquer sur la dernière case, ou appuyer sur
Retour arrière, annule et rembourse.

Son rôle : empêcher d'acheter dix troupes d'un coup et de tout gagner sur un
seul pic d'or. Elle transforme l'or en **flux** plutôt qu'en **stock**.

## 6. Le combat, en détail

- Toutes les troupes marchent sur **une seule ligne**, vers l'adversaire.
- Une troupe **ne traverse jamais un allié** : elle fait la queue derrière.
  C'est ce qui crée les « murs » de corps à corps derrière lesquels les
  tireurs s'abritent.
- Elle s'arrête et attaque dès que l'ennemi le plus proche devant elle est
  à portée. Plus personne devant → elle tape le château.
- Les troupes à distance tirent un projectile ; catapulte, char d'assaut et
  méca font des **dégâts de zone** à l'impact.
- Tuer une troupe rapporte à peu près **72 % de son prix** en or, plus son
  expérience. Deux armées qui s'annulent ne s'appauvrissent donc pas
  complètement : la partie continue d'avancer.

## 7. L'adversaire

Un joueur artificiel qui suit les mêmes règles que le joueur — il ne triche
pas. Toutes les 0,7 seconde il prend **une** décision, dans cet ordre :

1. évoluer si c'est possible ;
2. lancer l'attaque spéciale s'il y a assez de cibles, ou s'il est en danger ;
3. investir dans son revenu si le terrain n'est pas menaçant ;
4. sinon acheter une troupe (la plus lourde qu'il peut se payer quand il est
   riche, la plus rapide à sortir quand il est débordé).

La difficulté ne change **que** son revenu et son agressivité :
facile ×0,75 — normal ×1 — difficile ×1,35.

## 8. Contraintes permanentes

- **Souris ET clavier** pour toute action, sans exception (ça prépare la manette).
- **Bilingue FR/EN** en permanence : une fonctionnalité livrée dans une seule
  langue est une fonctionnalité non terminée.
- **Zéro dépendance externe** : pas de serveur, pas de bibliothèque, pas de
  fichier image ou son. Le jeu doit rester emballable en `.exe` sans travail.
- **Coins arrondis partout** pour l'interface (`--rayon` en CSS,
  `cheminArrondi` sur le canvas).
- Le jeu est dessiné en **1280 × 720** puis mis à l'échelle d'un bloc : canvas
  et interface HTML bougent ensemble, rien ne se décale jamais.

## 9. Où sont les chiffres

| Quoi | Où |
|---|---|
| Économie, terrain, château, difficulté | `jeu/data/reglages.js` |
| Les 5 âges, les 15 troupes, les attaques spéciales | `jeu/data/ages.js` |
| Tous les textes affichés (FR + EN) | `jeu/data/textes.js` |

## 10. Pistes pour la suite (pas encore faites)

- **Tourelles de château** : un ou deux emplacements achetables qui tirent
  tout seuls — c'est la principale mécanique du genre qui manque encore.
- **Récompense de fin de partie** et progression entre les parties
  (débloquer une difficulté, un âge bonus, des statistiques).
- Une **musique** et de vrais bruitages (aujourd'hui tout est synthétisé).
- Des **sprites dessinés** pour remplacer les silhouettes géométriques :
  `jeu/rendu/unites.js` est isolé exprès, rien d'autre ne bougera.
- Un **classeur d'équilibrage** (comme sur Brutal) si le nombre de troupes
  augmente : aujourd'hui deux fichiers commentés suffisent.
