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

## Pourquoi une « planche », et pas juste un carré ?

Si une tuile est un seul carré, elle ne peut pas savoir qu'elle est **au bord**
d'un chemin. Le décor reste plat, sans bordure ni recoin. La solution classique
serait de dessiner à la main les **47 cas** possibles (bord haut, bord haut +
gauche, coin, cul-de-sac, îlot…). C'est ce que tu as vu sur internet.

Le jeu utilise la version courte : **on découpe chaque case en quatre quarts**.
Un quart ne regarde que trois voisins, donc il n'a que **cinq aspects
possibles** — remplissage, bord horizontal, bord vertical, coin sortant, coin
rentrant. Ces cinq aspects, dans leurs quatre orientations, tiennent dans
**six carrés dessinés**. Le code recompose les 47 cas tout seul.

**Tu dessines 6 carrés, le jeu en fabrique 47.**

## Le format

Une image de **2 tuiles de large × 3 de haut**, soit **128 × 192 px**
(64 px par tuile — le jeu affiche à cette taille, donc c'est net).

```
┌──────────────┬──────────────┐
│  LES 4 COINS │ REMPLISSAGE  │
│  RENTRANTS   │  VARIANTE    │
├──────────────┴──────────────┤
│                             │
│      L'ÎLOT : la matière    │
│   ENTOURÉE de sa bordure    │
│      sur ses 4 côtés        │
│                             │
└─────────────────────────────┘
```

- **L'ÎLOT** (les deux rangées du bas) fait presque tout le travail : ses quatre
  angles donnent les **coins sortants**, ses quatre milieux donnent les
  **bords**, son centre donne le **remplissage**. Dessine-le comme un bloc de
  matière posé tout seul au milieu du vide.
- **LES 4 COINS RENTRANTS** (en haut à gauche) : le seul cas que l'îlot ne
  contient pas — l'angle **en creux**, celui d'un recoin. Range-les comme les
  quatre quarts d'une tuile (le coin rentrant « haut-gauche » en haut à gauche).
- **REMPLISSAGE VARIANTE** (en haut à droite) : facultatif. Une deuxième version
  du centre, tirée au hasard sur environ une case sur trois, pour qu'un grand
  sol ne se répète pas. Si tu n'en veux pas, recopie simplement le remplissage.

`GUIDE.png` montre tout ça en image, avec un vrai sol dessous.

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
