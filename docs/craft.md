# La Forge — craft & qualité

> Arc de gameplay du **crafting**. Ouvert en parlant à **Ferran le forgeron** → « ⚒ Forger ».
> Rangé à part dans le code (données/logique dédiées) pour rester lisible.

## Vue d'ensemble

On assemble des **ressources** selon un **motif** (façon Minecraft) sur une **table 5×5**.
Quand le motif correspond à une **recette**, l'objet créé s'affiche à droite. « Forger »
lance un **mini-jeu** dont la réussite donne une **qualité** à l'objet forgé — c'est ce qui
rend la forge **plus intéressante que le loot** (un loot est toujours « Normal », sans bonus).

## Ressources

- Les ressources sont des objets de sac **empilables** (comme les minerais).
- **Bois (`bois`)** : nouvelle ressource. **Pas un minerai** (absente de `MINERAIS` → jamais dans
  les veines de mine). **Lâchée par tous les monstres** pour l'instant (source temporaire, cf.
  `tirerButin` dans `jeu/data/ennemis.js` : `BOIS_CHANCE` / `BOIS_QTE`).
- Onglet **« Resources »** chez le marchand de test (Renaud) : toutes les ressources **gratuites**,
  pour remplir le sac et tester.

## Recettes (cachées)

- Définies dans **`jeu/data/recettes.js`** (`RECETTES`). Format : `forme` (lignes de caractères,
  `.` = vide) + `legende` (clé → id d'ingrédient) + `resultat` (id de l'objet créé).
- **Le motif compte, pas la position** sur la table (façon Minecraft). Aucun ingrédient parasite
  toléré. Reconnaissance : `trouverRecette()` dans **`jeu/systems/craft.js`**.
- **Recettes NON montrées** au joueur : il les découvre. Des **indices** en jeu guideront vers
  les objets rares (à faire). L'aperçu du résultat n'apparaît que si le motif est juste.
- 1re recette : **Miner's Pick** = `FFF / .B. / .B.` (3 fer en ligne + 2 bois sous le centre).

## Parchemins de craft — `jeu/ui/parchemin.js` (ajout du 08/07/2026)

Un moyen de **découvrir une recette** en jeu : un objet **parchemin** (catégorie
`parchemin`, non équipable) qu'on **ouvre** depuis l'inventaire (clic droit →
« 📜 Read »). Une fenêtre façon vieux parchemin montre alors : le **motif** de la
recette (ingrédients + résultat, tiré de `RECETTES` via le champ `revele`) et un
petit **texte de lore** (champ `lore` du parchemin). Champ `illustration`
optionnel pour un dessin de parchemin (à venir). 1er exemple : **Recipe: Miner's
Pick** (`parchemin-pioche`), récupérable via l'onglet « Scrolls » du marchand de
test. But futur : ces parchemins tombent en butin et guident la découverte des
recettes cachées.

## Table (UI) — `jeu/ui/forge.js`

- **Palette** (gauche) : ressources du sac, cliquables, avec le « restant » (possédé − posé).
- **Table 5×5** (centre) : clic sur une ressource = on la prend ; clic sur une case = on pose ;
  clic sur une case pleine = on retire. *(Clic-pour-poser ; le drag pourra venir plus tard.)*
- **Résultat** (droite) : aperçu de l'objet + bouton **Forger** (actif si motif reconnu).

## Mini-jeu de forge

Jauge orange horizontale ; un curseur fait des va-et-vient (aller-retour ~1,3 s). On frappe
(**[Espace]** ou **clic**) ; **[Échap]** annule (rien perdu). Géométrie normalisée 0..1 dans
`MJ` (`jeu/systems/craft.js`), testable via `centreMarqueur()` / `outcomeFrappe()`.

- **Marqueur** placé au hasard (toujours hors des zones rouges), **3 bandes concentriques** :
  - **cœur or** (`HP`, très fin) → **Exceptional** (+3)
  - **milieu bleu** (`HM`) → **Master** (+2)
  - **large vert** (`HG`) → **Artisan** (+1)
- **Zone orange** (hors marqueur) → **Normal** (objet créé, sans bonus).
- **Zones rouges** aux extrémités (`ROUGE`) → **ratage EXTRÊME** : composants perdus, **aucun objet**.
- Les **ingrédients sont toujours consommés** à la frappe (sauf annulation Échap).

## Qualité (axe séparé de la rareté)

- `QUALITES` dans `jeu/data/recettes.js` : `normale`/`artisan`/`maitre`/`exceptionnel` → `force`
  0/1/2/3, + couleur.
- Stockée **par exemplaire** : sur l'objet du sac (`objet.qualite`) et, une fois équipé, dans
  **`inv.qualites[slot]`** (parallèle à `inv.slots`, maintenu à l'équipement/déséquipement,
  sauvegardé). Un objet **looté** n'a pas de qualité = **Normale**.
- **Effet en combat (choix 1a)** : chaque équipement forgé ajoute sa `force` de qualité en
  **Force permanente** (tout le combat). Calcul dans `demarrerCombat` (`jeu/ui/combat.js`).
- **Affichage** : ligne colorée « ⚒ Master · +2 Force » dans l'infobulle de l'objet.

## Fichiers

```
jeu/data/recettes.js    ← QUALITES + RECETTES (données pures)
jeu/systems/craft.js    ← reconnaissance de motif + géométrie du mini-jeu (logique pure)
jeu/ui/forge.js         ← table 5×5 + mini-jeu (UI)
jeu/systems/inventaire.js ← qualité par exemplaire (sac + inv.qualites, save/load)
jeu/ui/combat.js        ← Force de qualité en combat
jeu/ui/infobulle.js     ← ligne de qualité dans la bulle
```

## À faire / idées

- Aperçu du résultat plus riche (sprite de l'arme, infobulle au survol).
- Indices en jeu pour découvrir les recettes rares.
- Source du bois définitive (arbres à couper ? marchand ?) plutôt que loot des monstres.
- Recettes supplémentaires ; qualité applicable à d'autres stats que la Force selon l'objet.
