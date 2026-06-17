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

## Sons actuels

| Nom logique      | Fichier(s)                              | Quand                          |
|------------------|-----------------------------------------|--------------------------------|
| `ambiance-city`  | `ambiance/city/1.mp3` … `5.mp3`         | Ville — playlist (intro 1-2, boucle 3-4-5) |
| `levelup`        | `interface/levelup.mp3`                 | Passage de niveau (à fournir)  |

Musiques de combat (par chemin, pas par nom logique — voir `jeu/data/musiques.js`) :

| Fichier                                | Quand                              |
|----------------------------------------|------------------------------------|
| `combat/eastern-under-tunnels/1.mp3`   | Combat dans les Eastern Under-tunnels |

## Format conseillé

- **`.mp3`**, mono ou stéréo.
- Garder les fichiers **légers** (limite GitHub Pages : 100 Mo / fichier).
- Les volumes sont réglables en jeu (menu Pause) et persistés dans le navigateur.
