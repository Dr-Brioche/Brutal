# BRUTAL — Concept du jeu

> Document vivant : c'est la « bible » du projet. On le modifie au fil de l'eau.
> Dernière mise à jour : 2026-06-10.

## Pitch

Jeu web **solo**, en pixel art, dans une **cité naine souterraine** nommée
(provisoirement) **Brütàl**. Le héros, un nain inconnu, doit **maîtriser l'un des
trois grands domaines** de la cité pour rejoindre **The Triad of the Vault**, le
cercle le plus influent qui dirige Brütàl avec le meilleur de chaque faction.

## Direction artistique

- Pixel art **détaillé**, personnages et univers en **64×64**.
  (Décision du 10/06/2026 : on assume le surcoût de travail de pixel art
  pour avoir des personnages réellement détaillés.)
- **Armes & outils** visibles cosmétiquement, chacun son skin.
- **Armures = sets complets** qui changent le sprite global du héros
  (pas pièce par pièce indépendamment).
- Deux bibliothèques de contenu : **armes** (stats + skin) et **sets d'armure**
  (stats + sprite/skin).

## Langue

- **Anglais d'abord** (dialogues + interface) pour toucher un large public.
- **Version française** ajoutée ensuite. → prévoir une structure i18n (`en/`, `fr/`).

## Univers & factions

Trois factions = trois domaines = trois gameplay :

| Faction | Rôle | Domaine de gameplay |
|---|---|---|
| **Rune-Awakener** | les artisans | la **Forge** / craft |
| **Onyx-Guardians** | les légendes militaires | le **combat** |
| **Deep-Market** | les marchands (les plus riches) | l'**économie** |

Objectif : devenir le meilleur **d'une** faction → entrer dans **The Triad of the Vault**.

## Monde & déplacement (validé le 10/06/2026)

- **Tout est SOUS TERRE** : on ne va **jamais** à la surface. Le monde, c'est
  la cité naine et les galeries qui l'entourent.
- **À pied, caméra qui suit le héros** (style Pokémon Bleu). Le monde est
  découpé en **zones**, reliées par des **portes** : marcher sur une porte fait
  passer dans la zone voisine (court fondu au noir). *(fait)*
- **La ville Brütàl** se parcourt à pied ; les bâtiments des factions sont
  les **entrées** vers les écrans d'activité.
- **PNJ de ville** : personnages d'ambiance. Près d'eux, *[Space] Talk* ouvre un
  **dialogue** (texte + choix, navigable au clavier — Z/S, Espace). Le *fanatique*
  propose de **soigner** le héros (ou de l'envoyer balader). À terme : vraies
  quêtes. Format sprite : échelle carte, découpé par un outil dans `outils/`.
- **La vie PERSISTE entre les combats** (pas de soin gratuit). On se soigne par
  des **PNJ** (le fanatique), et plus tard des **items / cartes**. À la défaite :
  réveil en ville à 1 PV (un vrai système de mort viendra).
- **Les souterrains autour de Brütàl** : galeries et cavernes de **roche
  (style Moria)** — l'exploration et les dangers. C'est là qu'on croise les
  monstres. *(1er jet : une zone reliée à la ville par une porte)*
- **La « Profondeur »** : niveaux de minage plus profonds, **générés +/-
  aléatoirement** (procédural — aléatoire encadré par des règles), atteints
  via les **entrées de mine** (`M`). À venir.
- **Monstres invisibles sur la carte** : pas de sprite d'ennemi en exploration.
  Dans les zones d'exploration, **chance de rencontre aléatoire** →
  **flash d'écran façon FF9** → bascule sur l'écran de combat.
  Un ennemi n'a donc qu'un **skin de combat**.
- **Taux de rencontre = variable d'équilibrage clé** : ville 0 %, taux qui
  monte avec la profondeur, période de grâce après un combat ; plus tard,
  objets/talents pour le réduire (nourrit la progression).
- **Les 3 piliers (combat, forge, marché) = écrans dédiés plein écran.**
  La carte sert à circuler, explorer et déclencher — l'activité prend tout
  l'écran.

### Décor : catalogue de tuiles (décision d'architecture)

- Le décor est fait de **tuiles** (un **tileset**), **pas** d'images de fond
  peintes + obstacles invisibles. Raisons : léger, réutilisable, indispensable
  pour générer la **Profondeur** procéduralement, et la **collision = la tuile**
  (jamais de décalage visuel/collision).
- **Catalogue** `jeu/data/tuiles.js` : chaque tuile a un **id** (`mur`,
  `sol-caverne`…), et des propriétés (`solide`, `rencontre`, `porte`, `interet`).
  Les cartes restent des **grilles de caractères** (faciles à éditer).
- Quand Brioche fournira du pixel art : on range les images dans une **galerie**
  (ids type `mur-01`, `sol-02`…) et on remplace `couleurs` par des images dans le
  catalogue — sans toucher aux cartes. Prévus : **variantes auto** (le moteur
  pioche un sol parmi plusieurs) et **auto-mur** (raccord des bords/coins).

## Les piliers de gameplay

1. **Collecte** de ressources (minage : minerais, pierres précieuses…).
2. **Craft** à la Forge.
3. **Combat** tour par tour, **deck de cartes** (façon *Slay the Spire*), avec loot.
4. **Commerce** : achat / revente + une **bourse qui fluctue dans le temps**.
5. **Arbre de talents** : se spécialiser dans un domaine, tout en visant des
   talents transverses utiles aux autres spécialisations.

## Trois piliers complets, reliés par l'économie

**Principe de design (validé 10/06/2026)** : les **trois gameplay** (combat, forge,
marché) doivent être **complets et satisfaisants chacun en soi**, avec juste **assez
de passerelles** pour donner envie de toucher aux trois — sans jamais l'imposer.
On peut viser à devenir le meilleur d'**une** faction pour gagner.

Le liant naturel = **matériaux + or** :
- le **combat** rapporte butin (matériaux) et or ;
- la **forge** transforme les matériaux en équipement (qui sert au combat… et se revend) ;
- le **marché** achète / vend / spécule (finance la forge, écoule le butin).

(« Combat d'abord » = ordre de **construction**, pas hiérarchie : c'est le pilier qui
définit ce que font les cartes, donc les items, donc le craft.)

## Le premier pilier : le combat (deck-builder)

Grammaire de base éprouvée : **ressource par tour + défense + intentions ennemies
télégraphées**. Mise en scène : **héros à gauche, ennemis à droite**, on joue ses cartes.

### Mise en scène du combat (validé 10/06/2026)

- **Le nain est visible**, de profil à gauche : on **réutilise son sprite de carte**
  (pose latérale) **agrandi ×3** — pas de nouveau sprite à dessiner pour démarrer.
- **L'arme** est une **couche posée par-dessus**, animée vers l'avant pendant l'attaque
  (« poussée d'arme »). Plus tard : vrai pivot/rotation + frames d'attaque & de coup reçu.
- **Ennemis** : un **skin de combat** par type (placeholder « au feutre » pour l'instant).
- Le visuel se **branche par-dessus** une logique de combat déjà jouable : on n'attend
  pas les jolis sprites pour avancer.

### Modèle de deck — VERROUILLÉ (décision d'architecture majeure)

**Le deck est le miroir de l'équipement.**

- Un **deck de base commun**, permanent : des cartes **à 0 Chaleur mais faibles**
  (ex. *Tap* 3 dégâts, *Brace* 3 Pierre). Elles évitent les tours vides quand la
  Chaleur est basse ; les cartes **fortes coûtent de la Chaleur** et viennent du
  **stuff**. → sans équipement on « bricole », bien équipé on frappe fort.
- Chaque **arme / armure / rune / gemme équipée injecte ses propres cartes**,
  et les **retire au déséquipement**.
- Changer d'arme = gagner ses cartes, perdre celles de l'ancienne
  (sauf si on la rééquipe).
- **But** : éviter la collection de 1000 cartes (trop = lassant).
- **Collier à gemmes** : chaque gemme sertie offre une **carte spécifique**
  (souvent rare) → optimisation de stratégie. Retirer la gemme = perdre la carte.

→ Optimiser son équipement = optimiser son deck. Le sertissage de gemmes nourrit
directement la **collecte** et le **marché**.

### Twist nain (l'identité du combat)

- **Moteur principal : « Chaleur de Forge » avec SURCHAUFFE — implémenté.**
  Jauge qui **persiste** entre les tours et **se recharge** (+1/tour de
  base). Le combat **démarre forge froide (chaleur 1)** : la puissance vient du
  temps et de l'équipement, et on ne se brûle pas dès le 1er tour.
  Seuil de base **3** ; on peut le dépasser jusqu'à un plafond (**8**),
  mais au-dessus du seuil on **surchauffe** : on subit chaque tour
  **(chaleur − seuil)²** dégâts directs (ex. à 4 → 1, à 5 → 4, à 6 → 9). Tous ces
  réglages (énergie de départ, recharge, seuil, plafond) sont **modifiés par
  l'équipement** (`bonusStats`) — ex. le *Magma Hammer* monte le seuil à **4/8** et
  donne **+1 d'énergie de départ**. Monter en chaleur = jouer plus fort, mais
  brûler. La jauge est une
  **barre horizontale** posée à gauche du deck ; elle rougeoie et **pulse** en
  surchauffe (un **cadre en image fixe** viendra l'habiller plus tard).
- Gardés en réserve comme **archétypes de cartes** (pas la ressource générale) :
  **Runes-à-charger** et **Élan-de-l'Enclume**.
- **Défense « Pierre » — CONFIRMÉ et implémenté** : la Pierre **persiste entre
  les tours** (≠ Blocage qui disparaît chaque tour). Les nains sont coriaces →
  le jeu défensif/tank devient une vraie stratégie.
- **Statuts (1er jet)** : effets qui durent dans le temps, affichés **sous la
  barre de vie**, apportés par l'équipement. Implémentés :
  - **Poison** : ronge la cible en début de son tour, baisse de 1/tour, ignore la
    Pierre (ex. *Croc de basilic* → carte *Venom Stab*).
  - **Enflammé (feu)** : même principe que le poison, **mais se propage aux
    ennemis adjacents NON encore enflammés** à la fin du tour ennemi (ils prennent
    le feu du voisin le plus ardent ; un ennemi déjà en feu ne se ré-enflamme pas,
    il continue de brûler). Ex. *Magma Hammer* → carte *Lava Hammer*.
  - À venir : stun, saignement…

## Items, butin & inventaire (1er jet implémenté)

- **Butin par monstre** : chaque ennemi a une table (`butin`) — de l'**or** + des
  **objets**, chacun avec une **rareté de drop** (probabilité). Le gobelin lâche
  2–3 or, parfois sa pioche, rarement un anneau.
- **Inventaire façon Diablo** (touche **B**) : un **sac** en cases ; chaque objet
  a une **empreinte** (l×h) et prend de la place. Le sac est **petit au départ**
  et s'**agrandira** avec des sacs (loot/craft). Rangement automatique pour l'instant.
- **Poupée d'équipement** (« sur soi ») : **arme1 + arme2** (2 mains, ou 1 main +
  bouclier), **armure** (= skin), **gants**, **bottes**, **collier**, **5 bagues**,
  **sac à dos**. Catalogue dans `jeu/data/items.js`.
- **L'équipement est la source de puissance** : il définit le **skin** (armure),
  les **cartes** injectées dans le deck (deck = miroir de l'équipement) et les
  **stats** (ex. bague qui monte le seuil de surchauffe). On part avec un stuff de
  base ; on s'équipe ensuite **via le sac** (plus de touches R/E).
- *À venir* : glisser-déposer, navigation clavier, vraies icônes pixel art,
  effets des bijoux/gants, agrandissement du sac, vente au Deep-Market.

## La grande boucle (le moteur d'addiction)

```
   FORGE (Rune-Awakener)   →  fabrique l'équipement qui DONNE des cartes
            ↓
   ÉQUIPEMENT (armes/sets) →  définit ton deck de base + tes skins
            ↓
   COMBAT (Onyx-Guardians) →  tu joues le deck, le loot fait tomber des cartes
            ↓
   DEEP-MARKET             →  tu achètes / revends / spécules sur les cartes rares
            ↑___________________________________________|  (on réinvestit dans la forge)
```

La **bourse** est le meilleur hameçon : la boucle « miner → forger → spéculer →
réinvestir » est ce qui accroche le joueur sur la durée.

## Ordre de construction (méthode : tranches verticales)

On construit un socle + **UN** pilier complet et fun à la fois, on teste, on valide
que c'est addictif, **puis** on empile le suivant.

0. **Socle commun** *(fait)* : héros 64×64 qui se déplace + équipement avec
   skins + sauvegarde (3 emplacements, menu Échap, écran de démarrage).
0bis. **Monde / exploration** *(en cours)* : zone de test explorable (caméra
   qui suit, collisions, point d'intérêt, rencontres-flash), puis transitions
   entre zones, décor montagne, et zone de minage procédurale.
1. **Combat** (deck-builder) — *premier jet jouable fait* : écran de combat
   (nain de profil agrandi + ennemis), main de cartes piochée, **Chaleur de
   Forge** comme énergie, défense **Pierre** persistante, statuts (poison, feu),
   intentions télégraphées, victoire/défaite. Chaque arme injecte sa carte
   signature. **Combat à plusieurs ennemis** : 1 à 3 monstres, les cartes
   d'attaque visent une **cible** — au **clavier** (on arme la carte puis on
   choisit la cible aux flèches, une flèche rouge la pointe) ou à la **souris**
   (on tire une flèche de la carte vers le monstre et on lâche dessus).
   *À enrichir* : pioche/deck plus riche, variété d'ennemis, sons.
2. **Craft / Forge** — second.
3. **Économie / bourse** — en dernier.

## Contraintes techniques

- **100 % côté client, zéro serveur** (solo, local). → le même code tourne en ligne
  (GitHub Pages) **et** s'empaquette plus tard en **.exe** sans réécriture.
- Empaqueteur visé : **Tauri** (binaire léger ~5 Mo) plutôt qu'Electron (~150 Mo).
- Sauvegardes du joueur en **localStorage** (navigateur).
- GitHub Pages sert un **arbre de fichiers normal** (dossiers + plusieurs fichiers JS)
  → la structure modulaire est possible **nativement, sans outil à installer**.

## Son / audio (prévu)

- Format **mp3** (fichiers fournis par Brioche), rangés dans `sons/`.
- **Catalogue centralisé** prévu (`jeu/core/son.js`) : on déclare un son une fois,
  puis n'importe quelle phase appelle `jouer("…")` / `musique("…")`. Ajouter un son = une ligne.
- Détail technique **déjà couvert** : les navigateurs coupent le son tant que le joueur
  n'a pas cliqué → le bouton **Play** du titre débloque l'audio pour toute la partie.
  Marchera à l'identique une fois empaqueté en `.exe`.

## Questions ouvertes (à trancher plus tard, non bloquantes)

- **Unité de temps de la bourse** : tours ? jours ? actions ? (le combat fige le
  temps, mais la bourse évolue avec le temps).
- Détail de l'**arbre de talents** (et des talents transverses entre factions).
- **Nom définitif** de la cité (Brütàl est provisoire).

## Rangement prévu (cohérent avec `CLAUDE.md`)

```
Brutal/
├── index.html        ← porte d'entrée (publiée par GitHub Pages)
├── jeu/              ← le code, en modules
│   ├── core/         ← moteur : boucle, rendu pixel, scènes, input, save/load
│   ├── entities/     ← héros (+ rendu équipement), PNJ, ennemis
│   ├── data/         ← contenu pur : armes, sets, items, recettes, ennemis, talents, factions
│   ├── systems/      ← un dossier par pilier : combat/ forge/ economy/ collection/ progression/
│   ├── ui/           ← HUD, menus, dialogues (+ i18n en/ fr/)
│   └── world/        ← ville Brütàl, zones, navigation
├── images/           ← sprites 64×64
├── sons/             ← bruitages, musiques
└── docs/             ← ce document + notes de conception
```
