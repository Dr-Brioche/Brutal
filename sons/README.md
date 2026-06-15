# Dossier `sons/`

Tous les bruitages et musiques du jeu vivent ici.

## Comment ça marche

Le jeu joue les sons par un **nom logique** (ex. `levelup`), pas par leur chemin.
La correspondance nom → fichier est définie dans `jeu/core/sons.js`
(tableau `FICHIERS`). Pour brancher un son :

1. Déposer le fichier audio dans ce dossier (`.mp3` de préférence : léger et
   lu partout).
2. Vérifier (ou ajouter) la ligne correspondante dans `FICHIERS`.

Tant qu'un fichier est absent, le jeu **ne plante pas** : le son est simplement
silencieux.

## Sons attendus

| Nom logique | Fichier attendu | Quand            |
|-------------|-----------------|------------------|
| `levelup`   | `levelup.mp3`   | Passage de niveau (fin de combat) |

## Format conseillé

- **`.mp3`** (ou `.ogg`), mono ou stéréo, court pour les bruitages.
- Garder les fichiers **légers** (limite GitHub Pages : 100 Mo / fichier, 1 Go
  au total) — quelques dizaines de Ko suffisent pour un bruitage.
