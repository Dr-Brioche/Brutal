# Dossier `sons/`

Tous les bruitages et musiques du jeu vivent ici, organisés en sous-dossiers.

```
sons/
  ambiance/   ← musiques de fond en boucle (une par zone/ambiance)
  combat/     ← musiques de combat, rangées par zone (un sous-dossier par zone)
  interface/  ← bruitages courts (niveau, clics, actions…)
```

## Comment ça marche

Le jeu joue les sons par un **nom logique** (ex. `levelup`), pas par leur chemin.
La correspondance nom → fichier est définie dans `jeu/core/sons.js`.

- **Bruitages** (`jouerSon`) : courts, peuvent se chevaucher, clonés à chaque lecture.
- **Musique d'ambiance** (`jouerMusique`) : boucle continue, une seule active à la fois.
  La musique de chaque zone est déclarée dans `jeu/data/zones.js` (`musique: "…"`).
- **Musique de combat** (`jouerMusiqueFichier`) : rangée **par zone** dans
  `sons/combat/<zone>/`, tirée au hasard à chaque combat. La bibliothèque est dans
  `jeu/data/musiques.js` (même logique que les fonds de combat). Détails dans
  `sons/combat/LISEZMOI.txt`.

Tant qu'un fichier est absent, le jeu **ne plante pas** : le son est simplement silencieux.

## Sons actuels

| Nom logique      | Fichier                    | Quand                          |
|------------------|----------------------------|--------------------------------|
| `ambiance-city`  | `ambiance/city.mp3`        | Musique de fond — ville        |
| `levelup`        | `interface/levelup.mp3`    | Passage de niveau (à fournir)  |

Musiques de combat (par chemin, pas par nom logique — voir `jeu/data/musiques.js`) :

| Fichier                                | Quand                              |
|----------------------------------------|------------------------------------|
| `combat/eastern-under-tunnels/1.mp3`   | Combat dans les Eastern Under-tunnels |

## Format conseillé

- **`.mp3`**, mono ou stéréo.
- Garder les fichiers **légers** (limite GitHub Pages : 100 Mo / fichier).
- Les volumes sont réglables en jeu (menu Pause) et persistés dans le navigateur.
