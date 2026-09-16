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

## LA RÈGLE À NE PAS OUBLIER : le fond se répète tous les 32 px

Un même quart de la planche peut servir à plusieurs endroits d'une case. Du coup,
**le motif de fond doit se répéter tous les 32 px** (un quart) — sinon il
« saute » d'un quart à l'autre et on voit des décrochages partout.

En pratique :

- une dalle de **32 px** (ou 16, ou 8) : ✅
- une dalle de 64 px, ou une grande fresque qui traverse la tuile : ❌
- **un détail rare** (une fissure, une flaque, une veine de minerai) posé dans le
  fond : ❌ — il réapparaîtrait tous les 32 px et dessinerait une grille.
  **Les détails rares vont dans la case « remplissage variante »**, où ils
  n'apparaissent qu'une fois, sur les cases tirées au sort.

## Comment ajouter une matière

1. Copier `MODELE.png`, le peindre (n'importe quel éditeur de pixel art).
2. L'enregistrer ici sous un nom simple, ex. `chemin-terre.png`.
3. Dans `jeu/data/tuiles.js`, sur la tuile concernée, ajouter :
   `planche: "images/tuiles/chemin-terre.png"` (et `variantes: true` si la case
   du haut à droite est remplie).
4. Vérifier dans `outils/test-tuiles.html` — la page montre tous les cas de
   figure d'un coup, et permet de comparer avec l'ancien rendu peint au code.

**Rien à recâbler.** Si le fichier manque ou n'a pas le bon format, le jeu
repeint la case comme avant : on peut remplacer les matières **une par une**,
sans jamais rien casser.

## Les planches actuelles sont provisoires

`sol-ville.png` et `sol-caverne.png` ont été **fabriquées par un script**
(`outils/generer_tuiles.py`) pour que le mécanisme soit visible tout de suite.
Elles sont faites pour être écrasées par du vrai dessin. Tant qu'elles sont là,
on peut régler leurs couleurs en changeant les chiffres **dans le script**, puis
en le relançant :

```bash
python3 outils/generer_tuiles.py            # tout (modèle + guide + planches)
python3 outils/generer_tuiles.py sol-ville  # une seule
```

⚠ Ne pas retoucher ces deux PNG à la main : le prochain passage du script les
écraserait. Dès que tu dessines ta version, **supprime la matière du script**
(ou ne le relance plus pour elle) — le PNG devient alors ton dessin, point.

## Les murs, eux, sont encore peints par le code

`#` (roche brute) et `H` (pierre taillée) n'ont volontairement **pas** de
planche : leur rendu actuel est calculé en coordonnées du monde, donc il ne se
répète jamais, ce qu'une planche ne sait pas faire. Le jour où tu dessines une
vraie paroi, il suffira d'ajouter la ligne `planche:` dans `jeu/data/tuiles.js`.
