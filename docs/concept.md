# BRUTAL — Concept du jeu

> Document vivant : c'est la « bible » du projet. On le modifie au fil de l'eau.
> Dernière mise à jour : 2026-06-21.

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
  monte avec la profondeur, période de grâce après un combat. Le talent
  **Tunnel Sense** (branche forge) le réduit déjà de 35 % ; d'autres objets/
  talents pourront s'y ajouter (nourrit la progression).
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
  TEMPORAIRES** qui tickent par tour (comme le poison) : **Hâte** sur le héros,
  **Gel** (carte *Frostbite*, **−30 %** fixe) sur l'ennemi visé. La **Hâte** fonctionne
  en **stacks** : chaque tick actif = **+5 %** de vitesse (3 stacks = +15 %,
  10 stacks = +50 %). On perd 1 stack par tour ; rejouer la carte cumule les stacks.
  Le **Gel** reste à −30 % fixe. Des monstres **véloces** (ex. *Goblin
  Skirmisher*, vitesse 18, **teinté plus froid** pour le repérer d'un coup d'œil)
  peuvent jouer 2× contre un héros lent.
- **Annulation feu ↔ gel** : appliquer du **feu sur un ennemi gelé** supprime
  immédiatement le gel (la glace fond), puis le feu s'applique normalement.
  Appliquer du **gel sur un ennemi en feu** éteint toute la brûlure, puis le
  gel s'applique normalement. Vaut aussi **sur le héros** (futur, si des ennemis
  peuvent appliquer ces statuts au héros). Les deux éléments s'annulent toujours
  en totalité — pas de neutralisation partielle.
- **Glace brisée (révisé 21/06/2026)** : le Gel **s'empile** (chaque carte de givre
  en ajoute). Au **début de son tour**, tout combattant — **héros OU ennemi** — qui a
  **5 stacks de Gel ou plus** se **brise** : il **saute ce tour**, **perd 5 stacks** de
  Gel (le surplus reste : 7 → 2) et subit **5 dégâts directs** (ignorent la Pierre).
  Le Gel **continue par ailleurs de s'écouler de 1 par tour** comme une durée de
  ralentissement (choix de design : règle ajoutée *par-dessus* le ralentissement, pas
  à la place) → il faut **empiler vite** pour atteindre 5 avant qu'il fonde. Le badge
  `❄N` passe à **`❄💥N`** dès 5 stacks pour **télégraphier** la brisure imminente.
  *(Réglages — seuil 5, dégâts 5 — calibrables plus tard.)*
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
> `"attaque"` (frappe directe), `"soigner"` (soigne un allié — cible verrouillée,
> cf. ci-dessous), `"haste-allie"` (donne `N` tours de Hâte à tous les alliés
> vivants — +30 % vitesse).

> **Cible de soin VERROUILLÉE à la préparation (validé 17/06/2026)** : quand un
> soigneur prépare son sort, il choisit **une seule fois** sa cible — l'allié
> vivant au **% de PV le plus bas** à cet instant — et la **verrouille**. Il n'en
> change **plus**, même si un autre allié descend plus bas en % ensuite. **Seule
> exception** : si la cible verrouillée **meurt** avant le lancement, il en
> reverrouille une autre (pour ne pas soigner dans le vide). Moteur et fil vert
> partagent la même cible (`cibleSoinVerrou`, `systems/combat.js`).

> **Télégraphe visuel des sorts (validé 15/06/2026)** : pour qu'on lise d'un
> coup d'œil qui fait quoi, deux conventions communes à tous les sorts ennemis :
> - **Sort sur une cible alliée unique** (ex. soin) → un **fil coloré pointillé**
>   en **arc** part du lanceur et rejoint sa cible (sens source → cible), icône du
>   sort au bout (💚 vert = soin). L'arc **passe au-dessus de toutes les
>   annotations** (intentions, NEXT, barres) et monte assez haut pour ne jamais
>   croiser les sprites. La cible est **verrouillée à la préparation** (cf.
>   ci-dessus) : le fil ne suit PAS le plus blessé du moment, il ne **bascule que
>   si la cible verrouillée meurt** avant le lancement. Lève l'ambiguïté quand
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

#### Fonds de combat : une bibliothèque par zone (décidé 16/06/2026)

- Chaque **zone de la carte** (cf. `data/zones.js`) est reliée à **2-3 fonds de
  combat** rangés dans une **bibliothèque** (`data/fonds.js`).
- Ces fonds partagent la **même dynamique** (cadre 16:9, même ligne de sol en bas)
  mais varient l'**ambiance** (éclairage, décor). À chaque combat, on en **tire un
  au hasard** → moins de répétition visuelle, **sans toucher au gameplay** ni au
  placement des sprites.
- **Deux calques** : le PNG de fond est posé **sous** le canvas (`#fond-combat`,
  z-index 0) ; l'interface du joueur (cartes, jauges, compteurs) reste **par-dessus**.
  La ligne de séparation (`SOL_FOND` dans `ui/combat.js`) marque la frontière
  basse du décor / haut de l'interface — elle n'est PAS calée sur les pieds des
  sprites (les barres de vie peuvent descendre en dessous).
- Le PNG est **calé sur la scène** (le cadre 16:9, pas la fenêtre) et son **bas
  s'arrête EXACTEMENT sur la ligne** `SOL_FOND` : l'image remplit la largeur de la
  scène, ancrée en bas (`cover`), le haut étant rogné si l'image est plus haute
  que la zone. → dessiner les fonds avec **le décor important vers le bas**.
- **État actuel** : une seule zone de combat, **Eastern Under-tunnels** (porte est de
  Brütàl, repaire des 3 gobelins). Sa bibliothèque démarre avec 1 fond provisoire ;
  on en ajoutera 2 autres pour la variété.

#### Musiques de combat : une bibliothèque par zone (décidé 17/06/2026)

- **Même logique que les fonds**, côté son : chaque zone a une **bibliothèque de
  musiques de combat** (`data/musiques.js`), rangées dans `sons/combat/<zone>/`
  (mêmes noms de sous-dossiers que les fonds et les zones).
- La musique **démarre au flash de rencontre** (juste avant l'écran de combat) :
  on en **tire une au hasard** dans la liste de la zone. Elle tourne en boucle
  pendant la baston, puis le jeu **revient à l'ambiance d'exploration** de la zone
  (silence si la zone n'en a pas) à la fin du combat (victoire comme défaite).
- Pour **éviter le délai** au premier combat (un .mp3 pèse quelques Mo), les
  musiques de la zone sont **préchargées à l'entrée** de la zone, comme les fonds.
- **État actuel** : 1 musique provisoire pour les Eastern Under-tunnels
  (`sons/combat/eastern-under-tunnels/1.mp3`) ; on en ajoutera d'autres.

### Modèle de deck — VERROUILLÉ (décision d'architecture majeure)

**Le deck est le miroir de l'équipement.**

- Un **deck de suppléance** : des cartes **faibles** (souvent 0 Chaleur),
  présentes **tant qu'un SLOT d'équipement est VIDE** (filet de sécurité :
  toujours quelque chose à jouer). Couvre **les deux mains** ET **les trois
  pièces d'armure** (torse, gants, bottes) : un emplacement nu = des cartes
  « bouche-trou » qui polluent le deck → **incitation à équiper CHAQUE slot**
  (cf. *« Pourquoi remplir tous les slots »* plus bas). → **on démarre sans
  arme, sans gants et sans bottes** (seul le torse a des habits de base) : le
  deck de suppléance est presque complet au lancement.
  - ***Tap*** (5×, 3 dégâts) : tant que la **main principale** (arme1) est libre.
    Équiper une arme principale → **Tap disparaît**.
  - ***Brace*** (3×, 3 Pierre) : tant que la **main secondaire** est libre.
    Équiper l'off-hand (bouclier, livre, 2e arme) **ou** une **arme à deux mains**
    (elle occupe les deux mains) → **Brace disparaît**.
  - ***Exposed*** (4×, 2 Pierre, 0 Chaleur) : tant que le **torse** est nu.
  - ***Bare Hands*** (2×, 0 Chaleur) : **défausse 1 carte au hasard, repioche 1**
    — tant que les **gants** sont vides (échange sec, aucune pioche gratuite si la
    main est vide).
  - ***Bare Foot*** (2×, 1 Chaleur) : **+2 Hâte** — tant que les **bottes** sont vides.
  - **Retour automatique, MÊME EN COMBAT** : si on déséquipe / perd une pièce
    (future mécanique), les cartes de suppléance du slot libéré **reviennent
    aussitôt** dans le deck en cours (`majCartesDeBase`).
  - Les cartes **fortes coûtent de la Chaleur** et viennent du **stuff**.
    → sans équipement on « bricole », bien équipé on frappe fort.
- Chaque **arme / armure / rune / gemme équipée injecte ses propres cartes**,
  et les **retire au déséquipement**.
- Changer d'arme = gagner ses cartes, perdre celles de l'ancienne
  (sauf si on la rééquipe).
- **But** : éviter la collection de 1000 cartes (trop = lassant).
- **Collier à gemmes** : chaque gemme sertie offre une **carte spécifique**
  (souvent rare) → optimisation de stratégie. Retirer la gemme = perdre la carte.
- **Cartes qui manipulent la pioche** : certaines cartes n'infligent pas d'effet
  mais agissent sur le **deck en cours** — p. ex. *Master's Hand* (gants de mineur)
  **pioche 2 cartes** (tempo / fluidité). La pioche se recompose depuis la défausse
  si elle se vide, comme en début de tour.
- **Main plafonnée à 8 cartes** : on ne peut pas tenir plus de **8 cartes** en main.
  Toute carte piochée au-delà est bien **tirée** de la pioche, mais part **directement
  à la défausse** (surplus perdu) → les cartes de grosse pioche (*Master's Hand*,
  *Outnumbered*…) ne s'accumulent pas indéfiniment.

→ Optimiser son équipement = optimiser son deck. Le sertissage de gemmes nourrit
directement la **collecte** et le **marché**.

#### Pourquoi remplir TOUS les slots (cartes de suppléance, décidé juin 2026)

**Problème** : dans un deck-builder, un **petit deck** est souvent meilleur (on
revoit plus souvent ses meilleures cartes). Risque pour BRUTAL : le joueur équipe
**une seule arme** et laisse les autres slots vides pour garder un deck minuscule
et ultra-cohérent.

**Réponse (option retenue)** : on **étend la logique Tap/Brace aux pièces
d'armure**. Un slot **torse / gants / bottes** laissé vide injecte des cartes
**faibles** (Exposed / Bare Hands / Bare Foot) qui **diluent** le deck — exactement
ce qu'un petit-deck cherche à éviter. Résultat : **chaque emplacement rempli
améliore le deck** (on remplace une carte nulle par une carte d'item), sans jamais
imposer un build précis. C'est cohérent avec « deck = miroir de l'équipement » : un
nain torse/mains/pieds nus se bat mal, point.

Ces cartes restent **volontairement plus faibles** que n'importe quelle pièce
d'armure, même commune → on a toujours intérêt à équiper quelque chose. Elles sont
**exclues de la Maîtrise** (comme Tap/Brace) pour qu'on ne puisse pas en faire un
build. *(À enrichir plus tard : des **synergies cross-slots** arme + armure +
bague, pour récompenser le joueur qui combine au mieux — option « C » gardée en
réserve.)*

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
- **Trempe (« Quench ») — passerelle Chaleur → Pierre** :
  carte **gratuite** qui **vide toute la Chaleur** et la **fige en Pierre (×10 par
  point)**, puis la forge **refroidit (chaleur → 0)**. Récompense de jouer en
  **surchauffe** (plus on a chauffé, plus le bouclier est gros) et **fait retomber
  la surchauffe** d'un coup → mécanique qui **relie** les deux ressources naines
  (Chaleur ↔ Pierre). Apportée par la **Forgemaster's Mail** : 3× *Mail Armor*
  (7 Pierre × nb d'ennemis vivants, pour 1 Chaleur) + 1× *Quench* + 2× *Heavy
  Armor* (20 Pierre pour 2 Chaleur). La maille **donne 22 Pierre de départ** au
  combat.
- **Embrasement (« Dragon's Blaze ») — détonateur de feu** :
  carte qui **consomme TOUT le Feu** en cours sur les ennemis et le **convertit en
  dégâts instantanés (×2 par point de Feu)**, sur **tous les ennemis** (AOE). Ouvre
  un **combo « brûlure »** : on **empile le Feu**, puis on le **fait exploser d'un
  coup** au lieu d'attendre qu'il s'égrène tour par tour. Apportée par l'**Onyx
  Guard Plate** (build « dragon ») : 3× *Onyx Armor* (30 Pierre pour 2 Chaleur),
  1× *Dragon's Blaze* (4 Chaleur), 2× *Onyx Breath* (20 Feu sur tous, 3 Chaleur),
  1× *All Should Be Fire* (convert tous les statuts ennemis en Feu ×2). La plaque
  **donne 30 Pierre de départ** au combat.
- **Statuts (1er jet)** : effets qui durent dans le temps, affichés **sous la
  barre de vie**, apportés par des **cartes** (que l'équipement ajoute au deck).
  Implémentés :
  - **Poison** : ronge la cible en début de son tour, baisse de 1/tour, ignore la
    Pierre (ex. *Croc de basilic* → carte *Venom Stab*).
  - **Enflammé (feu) — propagation simplifiée (révisée 18/06/2026)** : ronge la
    cible chaque tour comme le poison (baisse de 1/tour, ignore la Pierre). **À la
    fin du tour du héros où une CARTE a posé du Feu**, chaque ennemi ainsi enflammé
    **répand la MOITIÉ de son Feu (arrondie au supérieur) à chacun de ses voisins
    vivants**, en **une seule vague simultanée** : le Feu reçu par un voisin ne se
    propage pas à son tour → **jamais de réaction en chaîne**. La propagation n'a
    lieu **qu'une fois, le tour où la carte est jouée** (pas à chaque tour tant qu'il
    reste du Feu, et un ennemi déjà mort ne répand rien). Ex. : 3 ennemis 1-2-3,
    *Lava Hammer* (Feu 4) sur le centre → fin de tour : **+2 sur le 1 et +2 sur le
    3**. *Onyx Breath* (Feu 8 sur les 3) → fin de tour : **12 / 16 / 12** (chacun
    garde ses 8 et reçoit 4 par voisin vivant). Ex. d'arme : *Magma Hammer* →
    carte *Lava Hammer*.
  - **Saignement (sang)** : applique des **ticks** à l'ennemi. Chaque tour
    l'ennemi prend **1 dégât plat** et perd 1 tick. La vraie puissance vient du
    **combo** : frapper un ennemi qui saigne avec une carte qui a elle-même un
    effet sang → les ticks actuels font des **dégâts bonus immédiats** (autant
    de dégâts que de ticks restants), et les ticks **restent** et **s'empilent**
    avec les nouveaux. Un ennemi en vie ne vaut rien — une carte pure dégâts ne
    déclenche pas ce bonus. Ex. : ennemi à 5 ticks, attaque « 2 dégâts + 3
    saignement » → 2 + 5 (bonus) = 7 dégâts, sang passe à 8.
    **Le saignement ne soigne plus le héros** — SAUF via le **set de Sang**
    (vampirisme + cartes de soin, cf. plus bas) : c'est l'« item spécifique » prévu.
    **Ordre** : poison, puis feu, puis saignement. Si l'ennemi meurt du poison
    ou du feu avant, il ne saigne plus ce tour-là.
  - **Étourdissement (stun) — implémenté** : l'ennemi **saute ses tours** (n'attaque
    pas, **aucune animation d'attaque**) tant que son compteur de stun > 0 ; il
    baisse de 1 à chaque tour sauté. **Cumulable** (les ticks s'additionnent →
    plusieurs tours). Affiché en badge `💫 N` sous l'ennemi (N = tours restants), et
    son intention d'attaque est masquée. Ex. *Tower Shield* (bouclier) → carte
    *Shield Bash* (10 dégâts + stun 3).
  - **Confusion (éblouissement) — implémenté** : l'ennemi **ébloui** frappe une
    cible **AU HASARD** parmi le **héros**, **un autre ennemi**, ou **lui-même**
    (tirage à chances égales à chaque attaque). Sa puissance d'attaque ne change
    pas, seul le destinataire devient aléatoire → redoutable à plusieurs ennemis
    (ils se tapent dessus). Compteur en **tours**, baisse de 1 par tour de l'ennemi,
    **cumulable**. Badge `✨ N` sous l'ennemi. L'intention reste affichée (on voit
    la valeur du coup, mais pas qui il touchera). Vient des cartes de **lumière**
    du set *Chevalier Croisé* et de son bonus de panoplie.
- **Actions au RALENTI** : chaque action (ennemi qui attaque, etc.) se joue **une
  à la fois**, avec une petite pause, pilotée par l'**initiative** (voir la section
  *Initiative / vitesse* plus haut) — on comprend ce qui arrive.

### Cartes « combo » (récompensent une mise en place)

Plusieurs cartes ont un effet RENFORCÉ selon l'état de la cible ou du héros :

- **Wound Opening** (Basilisk Fang) : 18 dégâts, **DOUBLÉS** si la cible porte au
  moins un malus (poison, feu, saignement, étourdissement, gel). `degats-execution`.
- **Poison Dance** (Basilisk Fang, AOE) : **3 frappes** de 3 dégâts sur tous,
  + poison à chaque frappe — **1** normalement, **2** si l'ennemi était **déjà
  empoisonné** au début de la carte. `danse-poison`.
- **Armor Forging** (Magma Hammer, AOE) : **10 brûlure** à tous ; un ennemi **déjà
  en feu** en reçoit le **double**, puis **toute sa brûlure est consommée et forgée
  en Pierre** pour le héros (1 brûlure = 1 Pierre). `forgeage`.
- **All Should Be Fire** (Onyx Guard Plate, AOE) : **convertit TOUS les statuts**
  de chaque ennemi (poison, feu, sang, stun, gel, hâte) en Feu × 2. Un ennemi
  avec 3 stun + 5 poison → 16 de brûlure. `tout-en-feu`.
- **Stacking Shield** (Tower Shield) : **double la Pierre actuelle** du héros.
  Juste après une longue série de Shield Wall, c'est un multiplicateur massif. `doublerPierre`.
- **Mail Armor** (Forgemaster's Mail) : **7 Pierre × nombre d'ennemis vivants**
  (scalait avec la menace). 3 ennemis → 21 Pierre. `pierre-par-ennemi`.
- **Pickaxe Jab** (Miner's Pick) : 3+3 dégâts ; si la cible **meurt**, un 3e coup
  de 3 part sur un **autre ennemi au hasard**. `coup-de-grace`.
- **Rusty Cleave** (Rusty Axe) : 6 à la cible + **4 à chacun des deux voisins**
  directs. `cleave-adjacent`.
- **Splash Strike** (Forge Hammer) : 15 à la cible ; chaque voisin a **50 %** de
  prendre 5 brûlure. `brulure-adjacent`.
- **Frost Cascade** (Perfect Frost Ring) : 8 dégâts + 3 Gel ; si la cible était
  **déjà gelée**, le coup **rebondit** sur l'ennemi suivant, et ainsi de suite tant
  que chaque cible touchée était déjà gelée (chaîne de gel). `gel-cascade`.

### Cartes de tempo / conversion (gèrent l'énergie et la main)

Un sous-ensemble de cartes ne fait ni dégât ni Pierre : elles **manipulent les
ressources** (énergie, main, vitesse). Elles donnent de la profondeur aux builds
sans surcharger le combat de dégâts.

- **Outnumbered** (Mail Glove) : pioche **1 carte par ennemi vivant**. `piocher-par-ennemi`.
- **Forge from Ashes** (Onyx Glove) : défausse la main et **repioche autant** de
  cartes (relance propre, sans brûler). `refaire-main`.
- **Mail Advantage** (Mail Glove/Boots) : **8 Pierre + 2 tours de Hâte** (liant tank/tempo).
- **Second Wind** (Swift Boots) : échange **5 tours de Hâte → 3 Chaleur**
  (rien sous 5 Hâte). `celerite-vers-energie`.
- **Fire Boost** (Onyx Boots) : transforme **4 ticks de Feu du héros → 2 Chaleur**
  (rien sous 4 Feu). `feu-vers-energie`.
- **Boost** (Onyx/Mail Boots) : +3 Chaleur gratuite.

### Set Chevalier Croisé : lumière & Confusion

Set **rare** à 3 pièces (Crusader Plate / Gauntlets / Greaves) : **contrôle par
Confusion** (cf. statut *Confusion* plus haut) **+ soutien lumineux** (soin,
purification, Pierre). Peu de dégâts bruts, beaucoup d'utilité. Cartes :
- **Armor of light** (torse) : 6 Pierre + éblouit l'ennemi **le plus proche** (2 Confusion).
- **Blinding Flash** (torse, AOE, coût 5) : 2 Confusion à **tous** les ennemis.
- **Holy light** (torse) : **soigne 30 PV** (le pan « soutien »).
- **Halo Burst** (gants, AOE) : **+1 Confusion** à chaque ennemi **déjà confus**
  (amplifie la mise en place). `confusion-si-confus`.
- **Lay on Hands** (gants) : retire **1 malus du héros** au hasard. `purifier-hero`.
- **Kick of light** (bottes) : 6 dégâts + 1 Confusion.

**Combo** : éblouir en masse (*Blinding Flash* / *Armor of light*), puis **amplifier**
avec *Halo Burst* sur tous les confus. Le **bonus de panoplie** : tout attaquant de
mêlée a **50 % de chance** d'être ébloui (1 Confusion). La Crusader Plate donne
**+30 Pierre de départ** (skin provisoire = nain de base, à dessiner).

### Set de Sang : sacrifice & vampirisme (rare)

Set **rare** à 3 pièces, à coupler à une **arme à saignement** (War Axe, Blood
Ring…). On **paie en sang** (PV **directs** — la Pierre ne protège PAS de son propre
sacrifice) pour empiler du saignement de masse, puis on le **convertit** en soin /
Pierre / énergie / contrôle. Très gros **sustain**. Cartes (combo inter-pièces) :
- **Sanguine Guard** (torse, coût 1) : par point de saignement TOTAL, **+3 Pierre
  ET +2 PV de soin**. `pierre-par-sang` + `soin-par-sang`.
- **Bloodbath** (torse, AOE) : le héros **perd 10 PV** (directs), puis 5 saignement à tous. `auto-degats`.
- **Drink blood** (torse, AOE) : sacrifice **20 PV** → 10 dégâts + 1 saignement à
  tous ; **+20 PV par ennemi tué** par ce coup (cumulable). `boire-le-sang`.
- **Open Veins** (gants) : le héros **perd 10 PV** (directs), 4 saignement à la cible.
- **Contagion** (gants) : les **deux voisins ÉGALISENT** leur saignement sur celui
  de la cible (montée comme descente). `contagion`.
- **Blood Absorption** (gants) : soigne **5 PV par saignement TOTAL**, puis **efface
  tout** le saignement ennemi. `absorption-sang`.
- **Blood Slide** (bottes, AOE) : **étourdit 2 tours** tous les ennemis qui saignent. `stun-si-sang`.
- **Blood Rush** (bottes) : **1 Chaleur par 5 points** de saignement total. `chaleur-par-sang`.

**Boucle type** : *Bloodbath*/*Drink blood* posent du saignement partout (en payant
des PV) → *Contagion* égalise → *Sanguine Guard* rend Pierre+soin, *Blood Slide*
verrouille, *Blood Absorption* encaisse le tout en gros soin. Le **bonus de
panoplie** (vampirisme) soigne en plus à chaque combo de saignement. La **Blood
Plate** donne **+20 Pierre de départ** (skin provisoire = nain de base, à dessiner).

### Items génériques & métas d'archétype (commons / uncommons)

Au-delà des sets rares/épiques, un **large socle d'items communs et uncommon**
(armes, armures, bottes, gants, **bagues**, colliers, et **main seconde / off-hand** :
boucliers, grimoires, sceptres, torches) alimente des **archétypes** qu'on assemble
en combinant des objets — façon *Slay the Spire* / *Monster Train*. La **main seconde**
(slot « Off », catégorie `bouclier`) penche défense / utilité / caster pour compléter
l'arme principale ; signatures off-hand : *Fireball* (feu AOE), *Rally* (Force+pioche),
*Aegis* (Pierre+régén), *Arcane Surge* (dégâts AOE+énergie).
Principe (validé 19/06/2026) :
- Les **commons** donnent surtout des **cartes de base PARTAGÉES** (réutilisées par
  beaucoup d'items) : *Strike, Slash, Heavy Blow, Guard, Iron Wall, Poison Dart,
  Ice Shard, Ember, Gash, Spark, Nimble Hands, Flex, Stone Fist, Regenerate*…
- Chaque **uncommon** porte **1-2 cartes « signature »** qui définissent son
  identité (parfois partagées entre 2-3 objets du même archétype) ; un **common**
  en a de temps en temps.
- Les archétypes **alimentent les sets rares** : poison → *Basilisk Fang*, feu →
  *Onyx*, saignement → *Blood*, gel → *Frost*, énergie → *Sapphire*, bloc → *Mail*.

**Nouvelles métas (mécaniques moteur ajoutées)** :
- **Force** (`force`) — buff qui ajoute **+N à chaque coup de MÊLÉE** du héros pour
  tout le combat (affiché 💪). ⚠ N'affecte **pas** les sorts ni les attaques à
  distance (`portee: "range"` sur la carte — ex. *Poison Dart, Ice Shard, Fireball,
  Arcane Bolt, Drain…*). Énorme avec le **multi-hit de mêlée** (*Double Strike*,
  *Flurry* : +Force par coup). Sources : *Flex, Power Strike, Empower, Bloodrage*.
- **Stone Fist** (`pierre-vers-degats`) — inflige des **dégâts = ta Pierre actuelle**
  (sans la consommer) : transforme un build bloc (*Mail*, armures) en attaque
  (« Body Slam »). Sources : *Stone Fist, Earthshatter, Stonetread/Stone Hammer*.
- **Régénération** (`regen`) — fonctionne comme le **poison à l'envers** : au début
  de chaque tour, soigne **N PV** puis perd **1 stack** (8 regen → soin 8 ce tour,
  soin 7 le suivant, etc.). Affiché ❤N. Sources : *Regenerate, Aegis*. À venir :
  une **Regen permanente** (ne décroît pas) affichée en haut à gauche, comme
  la Force permanente.
- **Shatter** (`degats-si-gel`) — dégâts **+bonus si la cible est gelée** (paie le gel).
- **Execute** (`degats-si-faible`) — dégâts **doublés sous 50 % de PV** (achève).
- **Épines** (passif `frappeMelee` de dégâts) — l'attaquant **se blesse** en frappant
  (ex. *Spiked Armor* : 2 dégâts de rétorsion).

**Révision Excel (juin 2026) — reworks & nouvelles mécaniques** :
- **Drain** (Vampiric Pendant) — **consomme tout le Saignement** de la cible, **soigne
  d'autant** de PV, et **+1 Chaleur** (`drain-sang`). Carte combo avec *Gash*.
- **Bonus ennemis (statuts positifs)** — système **générique** (`CLES_BONUS_ENNEMI`,
  aujourd'hui juste la **Hâte alliée**). Deux usages :
  - **Dissiper** (`supprimer-bonus`) — retire un bonus au hasard ; si réussi, **+4 Regen**
    au héros. Sources : *Lay on Hands* (réécrite), *Glory Strike*.
  - **Voler** (`voler-bonus`) — le héros **prend** le bonus (la Hâte alliée → sa propre
    célérité). Source : *Gimme That*.
- **Nimble Hands** (réécrite) — pioche 1 carte **et gagne en Pierre le double de son coût**
  (`piocher-pierre`).
- **Riposte** (`riposte`, statut héros) — renvoie à l'attaquant les **dégâts de MÊLÉE**
  reçus (pas les attaques à distance), **−1 tick par renvoi**. Source : *Rebound*.
- **Hâte permanente** (`hatePerm`) — Hâte qui **ne s'écoule pas**. *Long Run* en ajoute
  **+1/tour tout le combat** (cumulable) : la vitesse **monte** progressivement.
- **Tour bonus** (`toursBonus`) — le héros **enchaîne un tour de plus** sans laisser
  agir les ennemis (jauge d'initiative remplie en fin de tour). Source : *Unstoppable*.
- **Set Stone Age** — compteur `cartesPierre` (cartes pierre jouées : *Stone* = 1,
  *Many Stone* = 3). Les combos lisent ce total : *Stone Coagulation* (Pierre = compteur),
  *Pebble Sale* (pioche = compteur/6, borné 1–6), *Melt Stones* (énergie = compteur/8, borné 1–6).
- **Énergie aléatoire** (`chaleur-aleatoire`) — *Roll 1 Dice* (0–3), *Roll 2 Dice* (1–5).
- **Pioche filtrée** (`pioche-filtre`) — *Lucky Draw* : pioche 3, garde les cartes **< 3 Chaleur**.
- **Soin par cible** (`degats-soin-cible`) — *Healing Cleave* : dégâts AOE + soin par ennemi touché.
- **Anti-feu héros** (`retirer-feu-hero`) — *Fresh Wind* : retire des ticks de brûlure au héros.

**Armes à DEUX MAINS (nouvelles)** — pas d'off-hand → plus de cartes (7-8) et
valeurs **~1.5×** les armes à une main, chacune avec son **combo** :
- **Claymore** (Uncommon) — Force qui monte + multi-coups. *Decisive Strike*
  (`degats-si-force`) : dégâts **doublés si Force ≥ 6**.
- **Halberd** (Uncommon) — allonge (transperce cible + ennemi derrière) + contrôle (gel).
- **Siege Maul** (Rare) — tank Pierre. *Tremor* (`stun-si-pierre`) : étourdit toute la
  rangée **si la Pierre ≥ 20** ; *Stonestrike* convertit la Pierre en dégâts.
- **Great Scythe** (Epic) — saignement + exécution + récolte. *Harvest*
  (`soin-par-ennemi-saignant`) : soigne **par ennemi qui saigne** ; *Soul Reap*
  (`recompense-mort`) : si la cible meurt, **+Force et soin** (récolte d'âme).

> **Revue dans l'Excel** : tout nouvel item/carte porte un champ `nouveau: true`
> dans le code ; le générateur du catalogue **surligne ces lignes en jaune** pour
> que Brioche les relise facilement. (À retirer une fois validés.)

## Items, butin & inventaire (1er jet implémenté)

- **Butin par monstre** : chaque ennemi a une table (`butin`) — de l'**or** + des
  **objets**, chacun avec une **rareté de drop** (probabilité). Le gobelin lâche
  2–3 or et de l'**XP**, parfois sa pioche, rarement une bague. Le loot s'affiche
  dans une **fenêtre de butin** en fin de combat (clic / Espace pour récupérer).
  À l'ouverture, la **barre d'XP du héros se remplit** (montée animée du gain) et
  **« explose » en doré** à chaque palier de niveau — animation zappable (clic /
  touche) ; un son de level up se jouera dès que le fichier sera fourni.
- **Inventaire façon Diablo** (touche **B**) : un **sac** en cases ; chaque objet
  a une **empreinte** (l×h) et prend de la place. Le sac est **petit au départ**
  et s'**agrandira** avec des sacs (loot/craft). Rangement automatique pour l'instant.
  Lignée de sacs (rangées ajoutées) : Leather Pouch **+1**, Big **+2**, Huge **+3**,
  Backpack **+4**, Bottomless Bag **+6** (épique), Master Miner's Bag **+10** (légendaire).
- **Poupée d'équipement** (« sur soi ») : **arme1 + arme2** (2 mains, ou 1 main +
  bouclier), **armure** (= skin), **gants**, **bottes**, **collier**, **5 bagues**,
  **sac à dos**. Catalogue dans `jeu/data/items.js`.
- **L'équipement = des CARTES** (décision du 13/06/2026) : il définit le **skin**
  (armure) et les **cartes** injectées dans le deck (deck = miroir de l'équipement).
  Il ne donne **pas de stats chiffrées** — les CHIFFRES viennent de l'**arbre de
  talents** (voir section *Progression*). La bulle d'un objet montre **ses cartes**.
  On part avec un stuff de base ; on s'équipe ensuite **via le sac** (plus de touches R/E).
- **Armure de départ** : certains items donnent de la **Pierre** dès le début du
  combat (champ `armureDepart`). Cette Pierre persiste comme les autres. Exemples :
  *Traveler's Garb* (+8), *Blood Plate* (+20), *Forgemaster's Mail* (+22),
  *Crusader Plate* (+30), *Onyx Guard Plate* (+36). C'est le remplacement des stats
  de défense statiques — la différence de niveau se lit directement sur la barre
  Pierre dès le premier tour.
- **Bottes : deux stats distinctes (refonte juin)** — à ne pas confondre :
  - **Agilité** (`agilite`, plat) = **vitesse d'ATTAQUE** en combat (base **10**,
    cumulée avec l'agilité des talents). Les bottes en donnent un montant fixe
    (*Worn* +1 … *Onyx* +18) ; passe par `stats.agilite` au lancement du combat.
  - **Vitesse de déplacement** (`vitesseDeplPct`, **%**) = bonus de **déplacement en
    EXPLORATION** (base **160**), appliqué en pourcentage (*Worn* +5 % … *Onyx* +50 %).
    Recalculé dans `appliquerEquipement` (`heros.vitesseEquipPct`) ; le déplacement
    devient `heros.vitesse × (1 + pct/100)`. Talents/items pourront aussi pousser la base.
- **Combo de dagues** (`comboArme` sur l'arme principale, +Force au début du combat) :
  - **Twin Daggers** : +3 Force permanente si la **même** Twin Dagger est en off-hand
    (type `memeArme`, nécessite Ambidextrie).
  - **Basilisk Fang** : +5 Force permanente si **une autre dague** est en off-hand
    (type `dagueOffhand` ; les dagues portent `sousType: "dague"`).
  Affiché dans la bulle de l'arme comme un bonus de set. Helper `comboArmeActif`.
- **Passifs individuels d'items** : en plus des sets, un item peut avoir son propre
  **passif déclencheur**. Ex. *Tower Shield* — quand le héros est frappé en mêlée,
  il gagne **+2 Pierre** (s'empile avec le passif du set Onyx si les deux sont actifs).
  Déclaré dans `passifPropre` sur l'item, collecté et passé à `combat.passifs` au
  lancement du combat.
- **Sets d'armure (bonus de panoplie)** : porter **toutes les pièces d'armure d'un
  set** (torse + gants + bottes — **l'arme ne compte PAS**) débloque un **bonus
  passif** déclenché par un **événement de combat**. Données dans `SETS`
  (`jeu/data/items.js`), appliquées via `combat.passifs`. Cinq sets aujourd'hui,
  chacun avec sa **thématique** :
  - **Onyx** (feu) — déclencheur *frappeMelee* : quand le héros est frappé en
    mêlée, l'attaquant prend **3 brûlure** (sans propagation).
  - **Mail** (tank) — déclencheur *debutCombat* : au tout début du combat, le héros
    gagne **10 Pierre par ennemi** rencontré (s'empile sur l'armure de départ de la
    Forgemaster's Mail → on entre d'autant plus blindé qu'on est en surnombre).
  - **Chevalier Croisé** (lumière) — déclencheur *frappeMelee* : quand le héros est
    frappé en mêlée, l'attaquant a **50 % de chance** d'être **ébloui (1 Confusion)**
    → il risque de frapper ses propres alliés. Complète les cartes de Confusion du set.
  - **Sang** (saignement) — déclencheur *saignementCombo* : chaque fois qu'un
    **combo de saignement** inflige des dégâts bonus (frapper un ennemi qui saigne
    déjà avec une carte de saignement), le héros est **soigné d'autant**
    (**vampirisme**). C'est la **réintroduction du soin par saignement**, réservée
    par le concept à un « item spécifique » — ici, gated derrière le set complet.
  - **Stone Age** (pierre) — déclencheur *paliersPierre* : à chaque **palier de 10
    cartes « pierre »** jouées dans le combat (compteur `cartesPierre`, *Stone* = 1,
    *Many Stone* = 3), **tous les ennemis sont étourdis 1 tour**. Récompense d'empiler
    les cartes pierre (set Stone Armor + Stone Glove + Stone Boots).
- **Bulle d'info** : au survol d'un objet (sac OU marchand), on voit le **visuel
  des cartes** qu'il ajoute au deck (mini-cartes, même rendu que le deck) → on sait
  ce qu'on récupère / achète. **Au survol d'un SLOT d'équipement VIDE** (main, off,
  torse, gants, bottes), la même bulle montre les **cartes de suppléance** que ce
  slot nu injecte dans le deck (Tap, Brace, Exposed, Bare Hands, Bare Foot) → on
  comprend d'où viennent ces cartes faibles et qu'équiper le slot les remplace.
- **Vente au marchand** : on peut revendre les objets du sac contre de l'**or**
  (prix selon la rareté : commun 2, uncommon 4, rare 6, épique 15, légendaire 40). Trois façons
  de vendre : via la liste **« Sell items »** ; ou en **glissant un objet du sac
  sur la fenêtre du marchand** (vente directe). Un choix **« Sell all… »** (dès
  2 objets) vend tout le sac d'un coup, **après une confirmation** dont le défaut
  est « Non ». Pour les objets **rare et au-dessus**, chaque vente demande une
  **confirmation** (évite de vendre un bon objet par mégarde) — désactivable dans
  l'onglet **Interface** du menu pause.
- **Navigation des menus marchand** : **Échap** dans un **sous-menu** (une
  catégorie d'achat, la liste de vente, une confirmation) **revient au menu
  parent** au lieu de quitter la boutique ; il ne **ferme la boutique** qu'au
  **menu racine** (comme « Leave »). Convention générique du système de dialogue
  (`surEchap`) : un sous-menu déclare son menu de retour. Le **curseur retrouve sa
  place** : revenir d'une confirmation (ou y revenir après un achat/une vente)
  **resélectionne l'objet** où on était, et remonter d'un cran resélectionne la
  catégorie / l'entrée d'où l'on venait (l'index de la ligne est mémorisé et
  rejoué au `selInitial` du dialogue).
- **Glisser-déposer dans le sac** : on soulève un objet d'un clic, on le repose sur
  une case (réorganisation) ou un slot (équiper). Le lâcher **dans le vide** (hors
  de toute fenêtre) le **jette** (confirmation pour les objets rares) ; **Échap**
  annule sans rien jeter.
- *À venir* : navigation clavier complète, vraies icônes pixel art,
  agrandissement du sac, prix d'**achat** (le marchand de test est encore gratuit).

## Progression : niveaux & arbre de talents (décision du 13/06/2026)

**Séparation nette pour « ne pas tout mélanger »** :
- **L'équipement définit les CARTES** (le deck) — au survol d'un objet, on voit
  les cartes qu'il débloque, pas des stats.
- **L'arbre de talents définit les CHIFFRES** — vie, vitesse, ingéniosité (pioche),
  réglages de Chaleur (seuil, plafond, énergie de départ, recharge)…

On gagne de l'**XP en combat** (chaque ennemi en donne) ; un palier d'XP fait
**monter de niveau**, donne **1 point de talent** et **restaure tous les PV**
du héros (soins complets automatiques au passage de niveau). On dépense ces points dans
l'**arbre** (écran touche **T**) : des nœuds reliés en arborescence, débloqués
selon leurs prérequis. La montée d'XP est **rejouée en animation** sur la fenêtre
de fin de combat (barre qui se remplit, halo doré + éclats au passage de niveau).
*(1er jet implémenté : XP/niveau/points sauvegardés, écran de l'arbre, effets
appliqués. À venir : plus de nœuds, rangs multiples.)*

**Courbe de progression (validée 17/06/2026)** : les 3 premiers niveaux sont
rapides (récompense dès les premiers combats) ; à partir du niveau 4, la courbe
devient exponentielle — chaque level up est un vrai événement.

| Passage | XP requis | Combats* |
|---|---|---|
| 1 → 2 | 35 | ~2-3 |
| 2 → 3 | 80 | ~5-6 |
| 3 → 4 | 160 | ~11 |
| 4 → 5 | **500** | **~33 ← chute drastique** |
| 5 → 6 | 1 100 | ~73 |
| 6 → 7 | 2 200 | ~147 |
| 7 → 8 | 4 400 | ~293 |
| 8+ | ×2 par niveau | |

*\*Calibré sur ~15 XP/combat (Eastern Under-tunnels).*

### Talents légendaires (coût 3, prérequis cumulés)

| ID | Nom | Prérequis | Effet |
|---|---|---|---|
| `maitrise1` | **Ancestral Mastery** | forge4 + agile1 | Jouer une carte 200 fois = la maîtriser ; **3 emplacements** pour ajouter des maîtrisées au deck |
| `maitrise2` | **Ancestral Legacy** | maitrise1 | **+2 emplacements** de Maîtrise (5 au total) ; coût 2 |
| `ambidextrie` | **Ambidexterity** | agile1 | Équiper **deux armes à 1 main** simultanément (main + main off) ; les cartes des deux armes s'ajoutent au deck |
| `deuxMains` | **Giant's Grip** | agile1 | Équiper les **armes à deux mains** (haches/épées massives) ; sans ce talent elles sont **trop lourdes** pour être portées |

> Les deux styles d'arme avancés — **Giant's Grip** (2 mains) et **Ambidexterity**
> (dual-wield) — partent du **même nœud** *Fleet Strikes* (`agile1`) : c'est un
> **choix d'orientation** au combat, pas dispo au tout début de la partie.

### Règles de la Maîtrise des Ancêtres

- **Maîtrisables : seulement les cartes d'ÉQUIPEMENT.** On compte les usages
  d'une carte (une fois le talent débloqué) ; à 200 elle devient maîtrisable.
- **Exclues du comptage** :
  - les cartes du **deck de base** (*Tap*, *Brace* — cartes de secours, sans intérêt à maîtriser) ;
  - les cartes **« unique »** (`unique: true`) : les cartes **très puissantes**
    (à venir) sont marquées ainsi pour qu'on **ne puisse pas** les rendre
    permanentes via la maîtrise — sinon le jeu deviendrait déséquilibré.
- **Bibliothèque rangée par TYPE de carte** (Attack / Defense / **Buff**) : on
  retrouve vite ses cartes, et les couleurs regroupent les familles. Le type
  **« buff »** (vert) regroupe les cartes qui ne font ni dégât ni bouclier
  (ex. *Sapphire Surge*, *Quicken*).
- **Cartes déjà maîtrisées** : entourées d'une **lueur dorée** ; au survol (ou au
  curseur clavier), la carte se soulève et montre sa progression dessous. Les
  cartes **non maîtrisées** portent un **cadenas** (visuel provisoire).
- **Emplacements** : `maitrise1` en débloque **3**, `maitrise2` **+2** (5 au
  total). Les emplacements non encore débloqués s'affichent **verrouillés
  (cadenas)** dans le menu.
- **Modification en ville uniquement** : on ne peut changer sa sélection qu'à
  Brütàl. Hors ville, tenter d'ajouter/retirer une carte affiche un **message
  flottant** au centre de l'écran (au lieu d'un texte permanent dans le menu).
- **Navigation clavier** : flèches pour déplacer le curseur, **Espace/Entrée**
  pour ajouter/retirer, **Tab** pour changer d'onglet.

### Règles d'Ambidextrie

- **Slot arme2** : normalement réservé aux **boucliers**. Avec le talent, une
  **arme à 1 main** peut y être posée.
- **Comportement automatique** : si arme1 porte déjà une arme 1M et qu'arme2
  est libre, équiper une 2e arme la pose directement en arme2.
- **Arme à 2 mains** : nécessite le talent **Giant's Grip** pour être équipée
  (sinon « trop lourde »). Une fois portée, elle bloque arme2 comme d'habitude
  (l'équiper renvoie l'arme off-hand au sac).
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
- **En place** : ambiance de fond par zone (`jouerMusique` par nom logique) **et**
  musiques de **combat tirées au hasard par zone** (`jouerMusiqueFichier` par chemin,
  bibliothèque `data/musiques.js`, fichiers dans `sons/combat/<zone>/`). Volumes
  réglables dans le menu Pause (curseurs Musique / Combat / Bruitages) et persistés.
  Le **menu Pause est accessible AUSSI en plein combat** (Échap) : il fige le combat
  et permet de régler le son sans quitter la baston. En combat, les emplacements
  **Save/Load sont masqués** (l'état du combat n'est pas sérialisé) — on n'y garde
  que *Resume* + les curseurs de son.
- **Ambiance en PLAYLIST** (décidé 17/06/2026) : une zone peut enchaîner plusieurs
  morceaux au lieu d'une boucle unique. Deux formes (déclarées dans `PLAYLISTS`,
  `jeu/core/sons.js`, fichiers dans `sons/ambiance/<zone>/`, tous préchargés →
  enchaînements sans silence) :
  - **intro + boucle** : un **intro** joué une seule fois à l'arrivée, puis une
    **boucle** sans fin (sans jamais rejouer l'intro). La **ville** l'utilise :
    `1-2.mp3` = intro d'arrivée, puis `3-4-5` en boucle.
  - **pool aléatoire** (décidé 18/06/2026) : pas d'intro, on **tire un morceau au
    hasard** à chaque fois (sans répéter deux fois de suite). Les **zones
    d'exploration** l'utilisent : un morceau aléatoire à l'**entrée** de la zone,
    un autre à chaque **fin de morceau**, et un nouveau **à chaque retour de
    combat** (l'ambiance reprend fraîche). Les **Eastern Under-tunnels** piochent
    parmi leurs 5 morceaux, **distincts** de leur musique de combat
    (`sons/combat/eastern-under-tunnels/`, elle aussi tirée au hasard).

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
