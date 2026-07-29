# Dossier `sons/`

Tous les bruitages et musiques du jeu vivent ici, organisés en sous-dossiers.

```
sons/
  ambiance/   ← musiques de fond (boucle simple OU playlist, par zone)
    city/     ← playlist de la ville (1-2 = intro d'arrivée, 3-4-5 = boucle)
  combat/     ← musiques de combat, rangées par zone (un sous-dossier par zone)
  interface/  ← bruitages courts (niveau, clics, actions…)
```

## Comment ça marche

Le jeu joue les sons par un **nom logique** (ex. `levelup`), pas par leur chemin.
La correspondance nom → fichier est définie dans `jeu/core/sons.js`.

- **Bruitages** (`jouerSon`) : courts, peuvent se chevaucher, clonés à chaque lecture.
- **Musique d'ambiance** (`jouerMusique`) : une seule active à la fois. Deux formes :
  - **simple** : un morceau en boucle (table `MUSIQUES` dans `sons.js`) ;
  - **playlist** : une suite de morceaux qui s'enchaînent — un **intro** joué une
    fois à l'arrivée, puis une **boucle** sans fin (table `PLAYLISTS`). C'est le
    cas de la **ville** : `1-2` = intro d'arrivée, puis `3-4-5` en boucle (au bout
    de `5`, on revient à `3`, jamais à l'intro).
  La musique de chaque zone est déclarée dans `jeu/data/zones.js` (`musique: "…"`).
- **Musique de combat** (`jouerMusiqueFichier`) : rangée **par zone** dans
  `sons/combat/<zone>/`, tirée au hasard à chaque combat. La bibliothèque est dans
  `jeu/data/musiques.js` (même logique que les fonds de combat). Détails dans
  `sons/combat/LISEZMOI.txt`.

Tant qu'un fichier est absent, le jeu **ne plante pas** : le son est simplement silencieux.

## 🎙 LES BRUITAGES À ENREGISTRER — la liste de courses

**Tous ces fichiers vont dans `sons/interface/`, en `.mp3`.** Il suffit de les
déposer : le jeu les trouve tout seul, il n'y a rien à recâbler.

Un son peut avoir **plusieurs prises** numérotées (`coup-1.mp3`, `coup-2.mp3`…).
Le jeu en tire une **au hasard** à chaque fois et lui donne une petite variation
de hauteur (±6 %). C'est ce qui empêche le son de devenir insupportable quand on
l'entend 200 fois dans une soirée. **On peut n'en fournir qu'une seule au début**
et ajouter les autres plus tard.

> **Les numéros n'ont pas besoin de se suivre.** Le jeu cherche de `-1` à `-8` et
> se sert de tout ce qu'il trouve. Déposer `bouclier-1` et `bouclier-3` sans `-2`
> marche très bien : il alternera entre les deux.

### Assembler plusieurs enregistrements en UN son

Un bon son d'impact n'est presque jamais une seule prise : c'est un son **grave**
pour le poids, plus un son **claquant** par-dessus pour la netteté. Aucun
enregistrement ne donne les deux à la fois.

Pour ça, il suffit d'ajouter un second numéro :

```
coup-1.1.mp3   ← la couche grave  (poing dans un coussin)
coup-1.2.mp3   ← la couche claquante (couteau sur une planche)
        ↓  outils/preparer_bruitage.py
coup-1.mp3     ← les deux SUPERPOSÉS, attaques calées
```

Autant de couches qu'on veut (`.1`, `.2`, `.3`…). L'outil isole d'abord le son
utile de chaque prise, puis les superpose en **faisant coïncider les attaques** —
c'est cette coïncidence qui les fait entendre comme UN coup et non deux bruits.
Les couches partent ensuite dans `sources/` : le jeu ne voit que le résultat.

**Le rapport entre les couches est respecté.** Si une couche doit rester
discrète, enregistre-la plus bas : l'outil normalise seulement le mélange final,
jamais les couches une à une.

> **Tant qu'un fichier n'existe pas, le jeu rejoue le son de synthèse d'avant.**
> On peut donc remplir ce dossier **un son à la fois**, dans l'ordre qu'on veut,
> sans jamais rien casser.

### Priorité 1 — les plus entendus (à faire en premier)

| Fichiers | Quand ça se déclenche | Idée d'enregistrement |
|---|---|---|
| `coup-1.mp3` `coup-2.mp3` `coup-3.mp3` | Une arme touche la **chair** d'un monstre. **Le son le plus joué du jeu.** | Poing dans un coussin + claquement d'un couteau sur une planche |
| `coup-armure-1.mp3` `coup-armure-2.mp3` | Une arme touche la **Pierre** (armure) — héros ou monstre | Clé à molette sur un radiateur, casserole |
| `heros-touche-1.mp3` `heros-touche-2.mp3` | **Le héros** encaisse un coup. Doit se distinguer nettement de `coup` : c'est l'info « je prends cher » | Impact plus sourd, plus grave, + un souffle de voix |
| `carte-piochee-1.mp3` `-2` `-3` | Une carte quitte la pioche (plusieurs par tour) | Frottement d'une carte à jouer sur une autre |
| `carte-jouee-1.mp3` `-2` | Une carte part de la main vers sa cible | Carte qu'on claque sur une table |
| `minage-1.mp3` `-2` `-3` | La pioche mord la roche (à **chaque** coup de minage) | Marteau sur une brique, un pavé, du carrelage |

### Priorité 2 — les moments forts

| Fichiers | Quand ça se déclenche | Idée d'enregistrement |
|---|---|---|
| `minerai-ramasse-1.mp3` | Le minerai tombe dans le sac (fin d'un coup réussi) | Des pièces / billes dans un bol, cailloux entrechoqués |
| `sortilege-1.mp3` `-2` | Un sort ou un buff est lancé | Souffle + froissement de papier renversé, verre frotté |
| `bouclier-1.mp3` | La **Pierre** (armure) se pose sur le héros | Choc grave + un léger tintement métallique |
| `levelup-1.mp3` | Passage de niveau *(le jeu l'appelle déjà, le fichier manque : c'est muet aujourd'hui)* | Montée claire, quelque chose de gratifiant |
| `echec-1.mp3` | Action refusée / dé raté | Note descendante courte, « plop » mat |

### Priorité 3 — le liant

| Fichiers | Quand ça se déclenche | Idée d'enregistrement |
|---|---|---|
| `monstre-mort-1.mp3` `-2` | Un ennemi s'effondre (explosion de braises) | Chute molle + expiration ; ta voix ralentie pour les gros |
| `or-1.mp3` | Achat ou vente chez le marchand | Poignée de pièces qu'on lâche |
| `forge-marteau-1.mp3` `-2` `-3` | Le marteau frappe l'enclume (mini-jeu de forge) | Marteau sur du métal lourd |
| `clic-1.mp3` | N'importe quel bouton d'interface, **à la souris comme au clavier** | Clic sec et court, très discret |
| `objet-1.mp3` `-2` | **⏳ À ENREGISTRER.** On attrape ou on repose un objet — dans le sac, et au ramassage du butin de victoire (même geste, même son) | Froissement de cuir, objet posé sur une table en bois |

**Tous ces sons sont branchés** : dépose le fichier, il se joue.

### Comment enregistrer — le NETTOYAGE EST AUTOMATIQUE

**Enregistre, dépose le fichier, c'est tout.** Pas besoin de couper, normaliser
ni faire de fondu à la main : `outils/preparer_bruitage.py` s'en charge.

```bash
python3 outils/preparer_bruitage.py --tous            # nettoie sons/interface/
python3 outils/preparer_bruitage.py --tous --verifier  # ne modifie rien, mesure
```

Il fait les cinq gestes d'un coup, sur chaque fichier :

1. **coupe le silence du début** (le défaut n°1 : sinon le son arrive en retard
   sur l'image, et ça se sent énormément) ;
2. **coupe le silence de la fin** ;
3. **normalise le pic à −3 dB** — aucun son ne fait sursauter, aucun n'est noyé ;
4. **fondu de sortie de 30 ms** — supprime le « clac » de coupure ;
5. **exporte en mp3 mono 128 kbps** → 5 à 25 Ko par fichier.

L'original est gardé dans `sons/interface/sources/` : rien n'est jamais perdu.
Un fichier déjà propre est reconnu et laissé tranquille (repasser un mp3 dans un
encodeur mp3 le dégrade un peu à chaque fois).

### Les sons qui ne s'enregistrent pas

On n'enregistre pas une montée de niveau. `levelup` et `echec` sont donc
**fabriqués** par `outils/synthetiser_bruitage.py` — du métal frappé (cloche,
enclume), pas des bips de synthèse : le jeu est en pixel art détaillé avec de la
vraie musique, un blip 8-bit jurerait.

```bash
python3 outils/synthetiser_bruitage.py            # refait les deux
python3 outils/synthetiser_bruitage.py levelup    # un seul
```

**Pour les régler, on change les chiffres DANS le script** (fréquences, durées,
niveaux) — jamais le mp3 dans un éditeur, sinon le réglage est perdu au prochain
passage. Si tu enregistres un jour un vrai son pour l'un des deux, dépose-le
normalement : le fichier enregistré remplacera le fichier fabriqué.

Il reste **deux choses que la machine ne peut pas faire à ta place** :

- **la durée** — vise 100 à 400 ms pour un impact, moins d'1 s pour tout ce qui
  se répète. Un son trop long alourdit le combat ;
- **la variété** — les prises d'un même son doivent être **proches mais pas
  identiques**. C'est la variation qui empêche la lassitude, pas la différence.

## Sons actuels

| Nom logique      | Fichier(s)                              | Quand                          |
|------------------|-----------------------------------------|--------------------------------|
| `ambiance-city`  | `ambiance/city/1.mp3` … `5.mp3`         | Ville — playlist (intro 1-2, boucle 3-4-5) |
| `victoire`       | `interface/victoire.mp3`                | Jingle de fin de combat gagné  |

Musiques de combat (par chemin, pas par nom logique — voir `jeu/data/musiques.js`) :

| Fichier                                | Quand                              |
|----------------------------------------|------------------------------------|
| `combat/eastern-under-tunnels/1.mp3`   | Combat dans les Eastern Under-tunnels |

## Format conseillé

- **`.mp3`**, mono ou stéréo.
- Garder les fichiers **légers** (limite GitHub Pages : 100 Mo / fichier).
- Les volumes sont réglables en jeu (menu Pause) et persistés dans le navigateur.

## ⚖ Licence — à ne pas oublier (le jeu vise Steam)

Si un son ne vient pas d'un enregistrement maison, il lui faut une licence
**CC0** ou explicitement « **royalty-free, commercial use** ». Un son « gratuit »
en CC-BY (attribution obligatoire) ou non-commercial **ne peut pas** partir dans
un build vendu. Bonnes sources : **Sonniss GDC Bundle**, **Kenney.nl**,
**Freesound filtré sur CC0**.
