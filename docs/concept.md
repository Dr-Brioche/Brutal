# BRUTAL — Concept du jeu

> Document vivant : c'est la « bible » du projet. On le modifie au fil de l'eau.
> Dernière mise à jour : 2026-06-15.

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

### Initiative / vitesse (ATB) — implémenté le 14/06/2026

Le combat n'est PLUS un simple « je joue tout / ils jouent tout » : chacun (héros
+ chaque ennemi) a une **vitesse** et une **jauge d'initiative** qui se remplit à
cette vitesse ; **le premier à la remplir agit**. Vitesse égale → alternance 1:1
(comme avant) ; **2× plus rapide → 2 tours pour 1** de l'autre, réparti
proportionnellement (≠ tout-ou-rien). « Agir » = un **tour** pour le héros (pioche,
joue, End Turn) ou **une attaque** pour un ennemi.
- **Agilité** = la vitesse. Le héros a une base (10), montée en permanence par des
  **talents** (*Fleet Strikes*). Les cartes, elles, posent des **statuts de vitesse
  TEMPORAIRES** qui tickent par tour (comme le poison) : **Hâte** (carte *Quicken*,
  **+30 %** d'agilité) sur le héros, **Gel** (carte *Frostbite*, **−30 %** de vitesse)
  sur l'ennemi visé. La carte donne la **durée en tours** (pas un montant de vitesse) ;
  jouer la carte deux fois **cumule la durée**. Des monstres **véloces** (ex. *Goblin
  Skirmisher*, vitesse 18, **teinté plus froid** pour le repérer d'un coup d'œil)
  peuvent jouer 2× contre un héros lent.
- **Tension** : chaque tour du héros recharge la Chaleur **et** subit la surchauffe
  → foncer vite quand on est en surchauffe, ça brûle plus souvent.
- **Affichage** : une **file d'ordre des tours** en haut (carrés-portraits : tête
  de chaque combattant, acteur courant en doré) + une fine **barre d'initiative
  orange** sous chaque barre de vie. Le tour ennemi se joue au ralenti (une action
  à la fois) pour rester lisible.

> **Statuts BONUS vs MALUS — lisibilité (validé 15/06/2026)** : les statuts sont
> rangés en **deux zones** autour de la barre de vie. Les **bonus** (buffs, ex.
> Hâte) au-**dessus** dans une **pastille VERTE** arrondie ; les **malus** (debuffs :
> poison, feu, saignement, étourdissement, Gel) en-**dessous** dans une **pastille
> ROUGE**. Convention « vert = bon / rouge = mauvais **pour le porteur** » (un malus
> rouge sur l'ennemi = bon pour le joueur). Vaut pour tous les statuts à venir.

> **Stats des monstres — FIXES en entrée de combat (validé 15/06/2026)** : chaque
> **type** de monstre a des stats **fixes** inscrites dans sa fiche (PV, attaque,
> vitesse, XP) — **identiques à chaque rencontre, aucun tirage aléatoire** à
> l'apparition. Deux types peuvent différer fortement (ex. *Cave Goblin* 24 PV /
> lent vs *Goblin Skirmisher* 16 PV / rapide). Ces valeurs ne bougent **qu'une fois
> le combat lancé**, via les **bonus/malus** (statuts : Gel −30 % vitesse, etc.).
> Quand deux types **partagent une même planche**, on les distingue par une
> **teinte** (filtre couleur appliqué au sprite ET à son portrait dans la file).

> **Affix `melee` / `range` (validé 15/06/2026)** : chaque type de monstre porte
> un **affix de portée**, qui sert à **deux** choses (et **pas** au placement
> avant/arrière, voir plus bas) :
> - **Spawn** : les monstres `range` n'apparaissent que dans les groupes de 3+
>   (cf. *Rencontres par zone*).
> - **Ordre horizontal** : le groupe est **trié** avant le combat, `melee` d'abord
>   et `range` à la fin de l'array → les casters/soigneurs se regroupent **à
>   droite**, en retrait du héros (qui combat à gauche).
>
> **Placement avant/arrière = quinconce STRICT par position, PAS par affixe**
> (revu le 15/06/2026) : indice **pair** = **avant-plan** (taille normale), indice
> **impair** = **arrière-plan** (15 % plus petit, 18 px plus haut, perspective).
> Barre de vie / états / intention de l'arrière sont mis à la même échelle.
> Soit « 1 devant, 1 derrière, 1 devant… » quel que soit le nombre de monstres et
> leur affixe. Un `range` peut donc se retrouver à l'avant si son indice est pair :
> l'alignement régulier prime sur l'affixe pour la lisibilité.

### Rencontres par zone (validé 15/06/2026)

**Chaque zone déclare sa liste de monstres** (`monstres: [...]` dans
`data/zones.js`). La ville n'en a aucun → c'est un havre. À chaque rencontre,
`composerGroupe()` (`data/ennemis.js`) tire un groupe parmi les monstres de la
zone courante.

**Taille du groupe** (1 à 5 monstres, défaut commun à toutes les zones *sauf
indication contraire* — une zone peut imposer sa propre courbe) :

| Taille | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Chance | 30 % | 30 % | 20 % | 15 % | 5 % |

**Types tirés** : chaque emplacement est tiré **indépendamment** et **à chances
égales** parmi les types éligibles de la zone (*sauf indication contraire* — pas
de poids différenciés pour l'instant). Règle des affixes :
- **Groupe de 1-2** : uniquement des monstres **`melee`**.
- **Groupe de 3+** : **tous** les types (melee **et** range), à chances égales →
  un même type peut sortir plusieurs fois, et le groupe peut même être **composé
  uniquement de monstres `range`**.

Conséquence : un `range` est **plus rare** au global (il lui faut un groupe de 3+),
mais une fois ce seuil atteint il n'est ni limité en nombre ni désavantagé.

> **Actions pondérées des ennemis (validé 15/06/2026)** : les monstres
> « intelligents » (ex. chamans, lanceurs de sorts) ont un tableau `actions` avec
> un champ **`poids`** par action. À chaque tour, leur intention est tirée à la
> roulette pondérée (tirage proportionnel au poids). Les monstres sans `actions`
> attaquent toujours (comportement par défaut). Exemples d'actions possibles :
> `"attaque"` (frappe directe), `"soigner"` (soigne l'allié le plus blessé),
> `"haste-allie"` (donne `N` tours de Hâte à tous les alliés vivants — +30 %
> vitesse).

> **Télégraphe visuel des sorts (validé 15/06/2026)** : pour qu'on lise d'un
> coup d'œil qui fait quoi, deux conventions communes à tous les sorts ennemis :
> - **Sort sur une cible alliée unique** (ex. soin) → un **fil coloré pointillé**
>   en **arc** part du lanceur et rejoint sa cible (sens source → cible), icône du
>   sort au bout (💚 vert = soin). L'arc **passe au-dessus de toutes les
>   annotations** (intentions, NEXT, barres) et monte assez haut pour ne jamais
>   croiser les sprites. **Recalculé en continu** : si la cible meurt avant que le
>   lanceur agisse, il glisse sur la nouvelle cible. Lève l'ambiguïté quand
>   plusieurs lanceurs agissent en même temps.
> - **Sort de groupe** (touche tous les alliés, ex. hâte) → **pas de fil** : son
>   intention, affichée au-dessus du lanceur, porte une petite case **« ALL »**
>   collée à l'icône (⚡ ALL). Inutile de désigner une cible puisque c'est global.
>
> **Cohérence des flèches** : la **flèche de ciblage du joueur** (quand on tire une
> carte d'attaque vers un monstre) utilise le **même rendu courbé et pointillé**,
> en **rouge** et à opacité fixe, avec une pointe au bout — plus naturel qu'un
> trait droit rigide.

### Bestiaire actuel (1er jet)

| Nom | PV | Vitesse | Affix | Notes |
|---|---|---|---|---|
| *Cave Goblin* | 24 | 10 | melee | Gobelin de base. |
| *Goblin Skirmisher* | 16 | 18 | melee | Très rapide, teinte froide pour le repérer. |
| *Goblin Shaman* | 14 | 7 | range | **Healer/caster rouge.** Actions pondérées : soigner allié (50 %), hâte de groupe (30 %), attaque (20 %). Affix `range` → groupes de 3+ uniquement, regroupé à droite (placement en quinconce strict). |

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

- Un **deck de base** : des cartes **à 0 Chaleur mais faibles**, présentes
  **seulement quand une MAIN est VIDE** (filet de sécurité : toujours quelque
  chose à jouer). → **on démarre sans arme**, donc avec le deck de base complet.
  - ***Tap*** (5×, 3 dégâts) : tant que la **main principale** (arme1) est libre.
    Équiper une arme principale → **Tap disparaît**.
  - ***Brace*** (3×, 3 Pierre) : tant que la **main secondaire** est libre.
    Équiper l'off-hand (bouclier, livre, 2e arme) **ou** une **arme à deux mains**
    (elle occupe les deux mains) → **Brace disparaît**.
  - **Retour automatique, MÊME EN COMBAT** : si on déséquipe / perd une arme
    (future mécanique), la carte de base de la main libérée **revient aussitôt**
    dans le deck en cours (`majCartesDeBase`).
  - Les cartes **fortes coûtent de la Chaleur** et viennent du **stuff**.
    → sans équipement on « bricole », bien équipé on frappe fort.
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
  l'arbre de talents** — ex. *Stoked Coals* monte le seuil, *Deep Reserves* le
  plafond, *Ready Forge* l'énergie de départ. Monter en chaleur = jouer plus fort, mais
  brûler. La jauge est une
  **barre horizontale** posée à gauche du deck ; elle rougeoie et **pulse** en
  surchauffe (un **cadre en image fixe** viendra l'habiller plus tard).
- Gardés en réserve comme **archétypes de cartes** (pas la ressource générale) :
  **Runes-à-charger** et **Élan-de-l'Enclume**.
- **Régénération d'énergie (effet `chaleur`) — implémenté** : des cartes rendent
  de la Chaleur (énergie). 1re carte : *Sapphire Surge* (du *Sapphire Amulet*,
  collier), +2 Chaleur à 0 coût. Tension de design : pousser au-dessus du seuil
  donne de l'énergie tout de suite mais **fait surchauffer** au tour suivant.
- **Défense « Pierre » — CONFIRMÉ et implémenté** : la Pierre **persiste entre
  les tours** (≠ Blocage qui disparaît chaque tour). Les nains sont coriaces →
  le jeu défensif/tank devient une vraie stratégie.
- **Statuts (1er jet)** : effets qui durent dans le temps, affichés **sous la
  barre de vie**, apportés par des **cartes** (que l'équipement ajoute au deck).
  Implémentés :
  - **Poison** : ronge la cible en début de son tour, baisse de 1/tour, ignore la
    Pierre (ex. *Croc de basilic* → carte *Venom Stab*).
  - **Enflammé (feu)** : même principe que le poison, **mais se propage aux
    ennemis adjacents NON encore enflammés** à la fin du tour ennemi (ils prennent
    le feu du voisin le plus ardent ; un ennemi déjà en feu ne se ré-enflamme pas,
    il continue de brûler). Un ennemi qui **meurt de son propre feu** ce tour-ci
    **propage quand même** ses flammes avant de disparaître. Ex. *Magma Hammer* →
    carte *Lava Hammer*.
  - **Saignement (sang)** : comme le poison, mais le sang absorbé **soigne le
    héros** du même montant à chaque tick (vol de vie lent). Ex. *Blood Ring* →
    carte *Bloodletting*. **Ordre des malus dans le temps** : poison, puis feu,
    et le **vol de vie TOUJOURS en dernier**. Conséquence : si l'ennemi **meurt
    du poison ou du feu** avant l'étape du vol de vie, **il ne saigne plus** →
    **aucune régénération** pour le héros (on ne vole pas la vie d'un mort).
  - **Étourdissement (stun) — implémenté** : l'ennemi **saute ses tours** (n'attaque
    pas, **aucune animation d'attaque**) tant que son compteur de stun > 0 ; il
    baisse de 1 à chaque tour sauté. **Cumulable** (les ticks s'additionnent →
    plusieurs tours). Affiché en badge `💫 N` sous l'ennemi (N = tours restants), et
    son intention d'attaque est masquée. Ex. *Tower Shield* (bouclier) → carte
    *Shield Bash* (3 dégâts + stun 2).
- **Actions au RALENTI** : chaque action (ennemi qui attaque, etc.) se joue **une
  à la fois**, avec une petite pause, pilotée par l'**initiative** (voir la section
  *Initiative / vitesse* plus haut) — on comprend ce qui arrive.

## Items, butin & inventaire (1er jet implémenté)

- **Butin par monstre** : chaque ennemi a une table (`butin`) — de l'**or** + des
  **objets**, chacun avec une **rareté de drop** (probabilité). Le gobelin lâche
  2–3 or et de l'**XP**, parfois sa pioche, rarement une bague. Le loot s'affiche
  dans une **fenêtre de butin** en fin de combat (clic / Espace pour récupérer).
- **Inventaire façon Diablo** (touche **B**) : un **sac** en cases ; chaque objet
  a une **empreinte** (l×h) et prend de la place. Le sac est **petit au départ**
  et s'**agrandira** avec des sacs (loot/craft). Rangement automatique pour l'instant.
- **Poupée d'équipement** (« sur soi ») : **arme1 + arme2** (2 mains, ou 1 main +
  bouclier), **armure** (= skin), **gants**, **bottes**, **collier**, **5 bagues**,
  **sac à dos**. Catalogue dans `jeu/data/items.js`.
- **L'équipement = des CARTES** (décision du 13/06/2026) : il définit le **skin**
  (armure) et les **cartes** injectées dans le deck (deck = miroir de l'équipement).
  Il ne donne **pas de stats chiffrées** — les CHIFFRES viennent de l'**arbre de
  talents** (voir section *Progression*). La bulle d'un objet montre **ses cartes**.
  On part avec un stuff de base ; on s'équipe ensuite **via le sac** (plus de touches R/E).
- **Bulle d'info** : au survol d'un objet (sac OU marchand), on voit le **visuel
  des cartes** qu'il ajoute au deck (mini-cartes, même rendu que le deck) → on sait
  ce qu'on récupère / achète.
- **Vente au marchand** : on peut revendre les objets du sac contre de l'**or**
  (prix selon la rareté : commun 2, rare 6, épique 15, légendaire 40).
- *À venir* : glisser-déposer, navigation clavier, vraies icônes pixel art,
  agrandissement du sac, prix d'**achat** (le marchand de test est encore gratuit).

## Progression : niveaux & arbre de talents (décision du 13/06/2026)

**Séparation nette pour « ne pas tout mélanger »** :
- **L'équipement définit les CARTES** (le deck) — au survol d'un objet, on voit
  les cartes qu'il débloque, pas des stats.
- **L'arbre de talents définit les CHIFFRES** — vie, vitesse, ingéniosité (pioche),
  réglages de Chaleur (seuil, plafond, énergie de départ, recharge)…

On gagne de l'**XP en combat** (chaque ennemi en donne) ; un palier d'XP fait
**monter de niveau** et donne **1 point de talent**. On dépense ces points dans
l'**arbre** (écran touche **T**) : des nœuds reliés en arborescence, débloqués
selon leurs prérequis. *(1er jet implémenté : XP/niveau/points sauvegardés, écran
de l'arbre, effets appliqués. À venir : plus de nœuds, rangs multiples.)*

### Talents légendaires (coût 3, prérequis cumulés)

| ID | Nom | Prérequis | Effet |
|---|---|---|---|
| `maitrise1` | **Ancestral Mastery** | forge4 + agile1 | Jouer une carte 200 fois = la maîtriser ; choisir 3 maîtrisées à ajouter définitivement au deck |
| `ambidextrie` | **Ambidexterity** | agile1 | Équiper **deux armes à 1 main** simultanément (main + main off) ; les cartes des deux armes s'ajoutent au deck |

### Règles de la Maîtrise des Ancêtres

- **Maîtrisables : seulement les cartes d'ÉQUIPEMENT.** On compte les usages
  d'une carte (une fois le talent débloqué) ; à 200 elle devient maîtrisable.
- **Exclues du comptage** :
  - les cartes du **deck de base** (*Tap*, *Brace* — cartes de secours, sans intérêt à maîtriser) ;
  - les cartes **« unique »** (`unique: true`) : les cartes **très puissantes**
    (à venir) sont marquées ainsi pour qu'on **ne puisse pas** les rendre
    permanentes via la maîtrise — sinon le jeu deviendrait déséquilibré.

### Règles d'Ambidextrie

- **Slot arme2** : normalement réservé aux **boucliers**. Avec le talent, une
  **arme à 1 main** peut y être posée.
- **Comportement automatique** : si arme1 porte déjà une arme 1M et qu'arme2
  est libre, équiper une 2e arme la pose directement en arme2.
- **Arme à 2 mains** : bloque arme2 comme d'habitude (l'équiper renvoie l'arme
  off-hand au sac).
- **Deck** : les cartes des deux armes s'empilent normalement dans la composition
  du deck (`cartesEquipees` lit tous les slots sans distinction).

> **Outil de TEST (à retirer)** : une **fontaine** au centre de la ville donne
> **+1 niveau** quand on lui parle, pour essayer les talents sans farmer.

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
   signature. **Combat à plusieurs ennemis** : 1 à 5 monstres (composés par zone,
   cf. *Rencontres par zone*), les cartes
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
