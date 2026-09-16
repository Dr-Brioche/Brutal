# Dossier `images/tuiles/` — le décor du jeu

Ici vivent les **planches d'autotuilage** : les images à partir desquelles le jeu
dessine les sols, les murs, les chemins. Une matière = **un fichier**.

```
images/tuiles/
  MODELE.png        ← canevas vide au bon format, à ouvrir et peindre par-dessus
  GUIDE.png         ← le même, ANNOTÉ : ce qui va dans chaque case (à regarder d'abord)
  sol-ville.png     ← le dallage de la cité
  sol-caverne.png   ← le sol des souterrains
```

## L'idée en une phrase

**Tu dessines une flaque de sol posée toute seule au milieu du vide. Le jeu la
découpe en petits morceaux, et recolle ces morceaux pour faire n'importe quelle
forme.**

C'est tout. Le reste de cette page ne fait que détailler ça.

> `GUIDE.png` raconte la même chose en trois images : ce que tu dessines,
> comment le jeu le découpe, ce qu'il en fait. **Regarde-le en premier.**

## Pourquoi on ne peut pas juste dessiner un carré de sol

Un carré de sol tout seul ne sait pas qu'il est **au bord** d'un chemin. Le
décor reste plat : pas de bordure, pas d'ombre au pied des murs, pas de recoin.

La méthode classique — celle que tu as vue sur internet — consiste à dessiner à
la main les **47 cas** possibles : bord du haut, bord du haut + bord de gauche,
angle, cul-de-sac, îlot isolé… C'est énorme, et c'est ce qui fait peur.

Le jeu utilise la version courte : **on découpe chaque case en quatre quarts**
(haut-gauche, haut-droite, bas-gauche, bas-droite). Un quart ne regarde que
**trois voisins** : celui d'à côté, celui du dessus (ou du dessous), et celui en
diagonale. Du coup un quart n'a que **cinq têtes possibles** :

| le quart… | s'appelle | on le voit |
|---|---|---|
| a de la matière partout autour | **remplissage** | au milieu d'une grande salle |
| a le vide d'un seul côté | **bord** | le long d'un mur droit |
| a le vide sur deux côtés | **coin sortant** | à l'angle d'un pilier |
| n'a le vide qu'en diagonale | **coin rentrant** | dans le creux d'un recoin |
| (variante du remplissage) | **variante** | facultatif, pour varier |

Ces cinq têtes, dans leurs quatre orientations, tiennent dans **six carrés
dessinés**. Le code recompose les 47 cas tout seul.

**Tu dessines 6 carrés, le jeu en fabrique 47.**

## Le format

Une image de **2 tuiles de large × 3 de haut**, soit **128 × 192 px**
(64 px par tuile — le jeu affiche à cette taille, donc c'est net).

```
┌──────────────┬──────────────┐
│  LES 4 COINS │ REMPLISSAGE  │   ← la rangée du haut : 2 petites cases
│  RENTRANTS   │  VARIANTE    │
├──────────────┴──────────────┤
│                             │
│         L'ÎLOT              │   ← les 2 rangées du bas : la flaque de sol
│   la flaque de sol posée    │      (2 tuiles × 2 tuiles)
│   toute seule dans le vide  │
│                             │
└─────────────────────────────┘
```

**L'ÎLOT** fait presque tout le travail. Dessine-le comme ce qu'il est : un bloc
de matière posé au milieu de rien, avec sa bordure tout autour. Le jeu le coupe
ensuite en 16 petits carrés, et chaque carré sert à quelque chose selon sa
place :

- ses **4 angles** → les coins sortants ;
- ses **4 milieux de côté** → les bords (haut, bas, gauche, droite) ;
- son **centre** → le remplissage.

**LES 4 COINS RENTRANTS** (en haut à gauche) : le seul cas que l'îlot ne
contient pas. C'est l'angle **en creux**, celui qu'on voit dans un recoin.
Range-les comme les quatre quarts d'une tuile — le coin rentrant « haut-gauche »
en haut à gauche, etc.

**REMPLISSAGE VARIANTE** (en haut à droite) : facultatif. Une deuxième version
du centre, tirée au hasard sur environ une case sur cinq, pour qu'un grand sol
ne se répète pas. Si tu n'en veux pas, recopie simplement le remplissage.

## ⭐ LA FAÇON LA PLUS SIMPLE : tu dessines UN carré, le script fait le reste

**Tu n'as pas besoin de dessiner la planche.** Dessine juste **une tuile**, un
carré qui se répète sans couture — c'est tout ce que le jeu demande de toi :

```bash
python3 outils/planche_depuis_carre.py sol-ville images/tuiles/sources/mon-carre.png
# avec une variante :
python3 outils/planche_depuis_carre.py sol-ville images/tuiles/sources/carre-1.png images/tuiles/sources/carre-2.png
```

Le script monte l'îlot, calcule les ombres de bordure, fabrique les quatre coins
rentrants, et écrit `images/tuiles/<nom>.png`. Les carrés d'origine restent dans
`images/tuiles/sources/` (le jeu ne les lit pas).

Par cette voie, **il n'y a AUCUNE contrainte de motif** : ton dessin peut occuper
la case entière. Le script place chaque morceau à la place pour laquelle il a été
dessiné, donc rien ne « saute ». La seule chose qui compte : **ton carré doit
boucler sur lui-même** (le bord droit doit continuer le bord gauche, idem haut et
bas). Des sites comme [texturize.app](https://texturize.app/tools/make-seamless)
font ça en un clic sur n'importe quelle image.

## Si un jour tu dessines une planche ENTIÈRE à la main

Là, et seulement là, une contrainte apparaît : un même quart de la planche sert à
plusieurs endroits d'une case, donc **le motif de fond doit se répéter tous les
32 px** (un quart) — sinon il « saute » d'un quart à l'autre.

- une dalle de **32 px** (ou 16, ou 8) : ✅
- une dalle de 64 px, ou une grande fresque qui traverse la tuile : ❌
- **un détail rare** (fissure, flaque, veine de minerai) posé dans le fond : ❌ —
  il réapparaîtrait tous les 32 px et dessinerait une grille. Les détails rares
  vont dans la case « remplissage variante ».

C'est pour ça que la voie « un carré » est presque toujours la bonne.

## Quelle taille dessiner ?

Une case du jeu fait **32 px de large à l'écran**, mais le jeu est rendu en
double résolution : les personnages, eux, sont dessinés à **64 px par case**.

- carré de **32×32** : simple à dessiner, mais tes pixels seront **deux fois plus
  gros** que ceux des nains. C'est un choix de style valable (décor plus rustique
  que les personnages), pas une erreur.
- carré de **64×64** : même finesse que le reste du jeu.

Le script accepte les deux et te prévient du rapport.

## Comment brancher une matière

1. Fabriquer la planche (ci-dessus), ou peindre `MODELE.png` à la main.
2. Dans `jeu/data/tuiles.js`, sur la tuile concernée :
   `planche: "images/tuiles/chemin-terre.png"` (et `variantes: true` seulement si
   la case du haut à droite contient un VRAI second remplissage).
3. Vérifier dans `outils/test-tuiles.html` — la page montre tous les cas de
   figure d'un coup, et permet de comparer avec l'ancien rendu peint au code.

**Rien à recâbler.** Si le fichier manque ou n'a pas le bon format, le jeu
repeint la case comme avant : on peut remplacer les matières **une par une**,
sans jamais rien casser.

## Ce qui est encore fabriqué par script

`sol-caverne.png` est **fabriquée par `outils/generer_tuiles.py`**, en attendant
un dessin. Elle est faite pour être écrasée. Tant qu'elle est là, on règle ses
couleurs en changeant les chiffres **dans le script**, puis en le relançant :

```bash
python3 outils/generer_tuiles.py              # tout (modèle + guide + planches)
python3 outils/generer_tuiles.py sol-caverne  # une seule
```

⚠ Ne pas retoucher ce PNG à la main : le prochain passage du script l'écraserait.
Dès qu'une matière passe au dessin, on la **retire de la table `MATIERES`** du
script — c'est ce qui a été fait pour `sol-ville`, qui vient maintenant de
`sources/City_floor_1.png`.

## Les murs, eux, sont encore peints par le code

`#` (roche brute) et `H` (pierre taillée) n'ont volontairement **pas** de
planche : leur rendu actuel est calculé en coordonnées du monde, donc il ne se
répète jamais, ce qu'une planche ne sait pas faire. Le jour où tu dessines une
vraie paroi, il suffira d'ajouter la ligne `planche:` dans `jeu/data/tuiles.js`.
