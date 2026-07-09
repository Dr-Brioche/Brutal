# La vente aux enchères du soir (pilier économie)

> Design + journal + **table d'équilibrage**. Créé le 07/07/2026.
> Code : `jeu/systems/temps.js` (cycle jour/nuit), `jeu/systems/encheres.js`
> (logique pure), `jeu/ui/encheres.js` (l'écran temps réel), intégration ville
> dans `jeu/principal.js` (Magnar le commissaire).

## L'idée en une phrase

Un **rendez-vous** : chaque soir, un commissaire-priseur met aux enchères
quelques lots de valeur. On peut y faire de **bonnes affaires** ou se faire
**piéger** par la salle — et y **vendre ses propres objets d'exception**.

## Le cycle jour / nuit (nouveau socle)

`systems/temps.js` fait avancer le temps de la cité **en permanence** (même
horloge que le marché) ; **seul le menu pause** (Échap) le fige.

| Phase | Durée (temps de jeu) |
|---|---|
| Journée | **1 h** (3600 s) |
| Nuit | **30 min** (1800 s) |
| Cycle complet | 1 h 30 (5400 s) |

La **vente a lieu à la tombée du soir** (fin de journée) → **une vente toutes
les 1 h 30** de jeu. À l'aube, un nouveau jour commence (compteur de jours).
Une **barre jour/nuit** (HUD, en haut à droite, `jeu/ui/horloge.js`) : une
bande jaune (jour) / bleu nuit qui DÉFILE derrière un repère fixe au centre
(= « maintenant ») — on voit toujours une part de jour et de nuit pour
l'échelle, avec ☀/🌙 + compte à rebours vers le soir au-dessus. Elle montre
l'avancée du cycle — sans toucher à l'éclairage (on est sous terre).
*(Une éventuelle teinte d'écran reste à voir plus tard ; la mécanique
est déjà là et s'y branchera.)*

## Les règles (décisions Brioche du 07/07/2026)

1. **Accès réservé aux nobles** : il faut le talent **« Title of Nobility »**
   (arbre, branche économie, prérequis `esprit2`, coût 2). Sans lui, Magnar
   éconduit le joueur. → contenu de **fin de progression économique**.
2. **Être là un peu avant** : pendant la **fenêtre d'inscription** (les 10
   dernières minutes de la journée), on achète un **ticket d'entrée**. À la
   cloche, on **entre** (fenêtre d'entrée : les 5 premières minutes de nuit).
   Vente ratée = **tant pis**, prochaine au cycle suivant.
3. **Lots sérieux, pas de remplissage** : équipement **rare et au-delà**, et
   souvent un **gros paquet de minerai cher**. Mise à prix **proche de la
   vraie valeur** (~85 %, relevé 09/07/2026 — **aucun prix de référence n'est
   affiché à l'écran** : juger « est-ce une affaire ? » à l'œil fait partie du
   jeu) → les bonnes affaires existent, mais restent modestes et crédibles…
4. **…mais la salle a un budget secret** : chaque rival PNJ tire un budget.
   La plupart sont **frileux** ; les **obstinés** poussent au-delà de la
   valeur. **Plus l'objet est rare, plus la salle s'enflamme** (plus d'obstinés).
   Savoir **s'arrêter** est LE skill — d'où l'intérêt d'avoir vérifié les prix
   à l'Hôtel des ventes avant.
5. **Dépôt d'objets** : on confie **un** objet d'exception (rare+) par jour ;
   il passe **en dernier** (on le regarde partir, sans pouvoir enchérir dessus).
   Le prix peut **dépasser** la valeur HV… ou finir **en dessous (perte)** :
   improbable sur du très rare, **jamais impossible**. **Plancher = prix
   marchand** (jamais pire que le marchand). Le commissaire encaisse une part
   implicite (la mise à prix basse fait le travail).
6. **Pas assisté = vendu hors écran** : si on rate la vente de son propre dépôt,
   il est adjugé automatiquement (même modèle de salle) et **l'or attend chez
   Magnar** (à réclamer).

## Table d'équilibrage (tout se règle dans `systems/encheres.js`)

| Constante | Valeur | Rôle |
|---|---|---|
| `TICKET` | 50 🪙 | Prix du billet d'entrée du soir |
| `FENETRE_INSCRIPTION` (temps.js) | 600 s | Durée d'ouverture des inscriptions (avant la cloche) |
| `FENETRE_ENTREE` | 300 s | Délai pour entrer après la cloche |
| `NB_LOTS` | 3–4 | Nombre de lots de la maison |
| `MISE_A_PRIX` | 80–90 % | Mise à prix = valeur × ce facteur (relevé du 30-50 % initial le 09/07/2026 — aucun prix n'est affiché au joueur, les bonnes affaires doivent rester crédibles) |
| `INCREMENT_PCT` | 6 % | Un cran d'enchère = valeur × ceci |
| `NB_RIVAUX` | 2–4 | Rivaux PNJ par lot |
| `BUDGET_ACHAT` | 55–105 % | Budgets sur les lots de la maison (frileux) |
| `BUDGET_DEPOT` | 85–135 % | Budgets sur le lot du joueur (salle plus chaude) |
| `OBSTINE_FACTEUR` | ×1,15–1,50 | Un obstiné gonfle son budget d'autant |
| `OBSTINE_PAR_RANG` | 10/15/25/40/60 % | Proba d'obstiné selon la rareté (commun→légendaire) |
| `PRIME_RARETE` | ×1 / ×55 / ×125 / ×400 / ×450 | **Prime d'enchère** par rareté (commun→légendaire) : gonfle la valeur du lot (mise à prix, cran ET budgets). N'affecte QUE l'enchère, pas le marchand |
| `PLANCHER_RARETE` | uncommon 2 000 / rare 10 000 / épique 80 000 / légendaire 250 000 | **Plancher GARANTI** : la mise à prix d'un équipement uncommon+ ne descend jamais sous ce seuil, quoi qu'il arrive (paquets de minerai brut non concernés) |
| `PAQUET_RANG_MIN` | 6 | Minerai « paquet » : rang minimum (métaux/gemmes chers) |
| `PAQUET_QTE` | 8–18 | Taille d'un paquet de ressources |
| `LOT_RARETES` | 60/30/10 | Poids de tirage rare/épique/légendaire |
| `DEPOT_RARETE_MIN` | rare | Rareté minimale pour confier un objet |
| `CATEGORIES_LOT` | équipement + `tresor` | Catégories éligibles (lots maison ET dépôt joueur). Les **trésors** (Gilded Idol, Crystal Chalice, Ancient Signet…) y sont depuis le 09/07/2026 — bibelots sans usage, leur seule fonction est d'être vendus |

Rythme de l'écran (temps réel, `ui/encheres.js`) : marteau à **4,2 s** sans
enchère (annonces « once/twice » à 1,4 s / 2,8 s), les rivaux réfléchissent
0,5–2,2 s, 2,6 s d'entracte entre deux lots.

### Chiffres observés aux tests (à ajuster après jeu réel)

- Salle qui chauffe avec la rareté : **~25 %** d'obstinés sur du *rare*,
  **~61 %** sur du *légendaire*. ✓ (l'objectif « plus rare = plus haut »)
- Dépôt d'un objet *rare* (valeur ~110, plancher 100) : prix moyen **~134 🪙**,
  **~9 %** de ventes en dessous de la valeur, **0 %** sous le plancher. ✓
  (« bénéfice le plus souvent, perte possible mais rare, jamais sous le
  marchand »)
- **Prime de rareté (08/07/2026, relevée 09/07/2026 ×2)** : chaque palier a
  maintenant un plancher GARANTI (`PLANCHER_RARETE`) qui fluidifie la
  progression entre raretés — vérifié par simulation (2000 ventes/rareté) :

  | Rareté | Plancher garanti | Prix de vente moyen | Jusqu'à |
  |---|---|---|---|
  | Uncommon | 2 000 🪙 | ~3 300 🪙 | ~4 800 🪙 |
  | Rare | 10 000 🪙 | ~16 700 🪙 | ~24 800 🪙 |
  | Épique | 80 000 🪙 | ~139 000 🪙 | ~206 000 🪙 |

  L'épique reste « le meilleur stuff du jeu actuellement » (Brioche) : un
  gouffre volontaire au-dessus du rare, ça doit se mériter (temps de jeu +
  économie), pas s'acheter en passant. Idem au dépôt : revendre un objet
  rapporte gros dès l'uncommon (même plancher garanti). Le prix marchand
  normal, lui, ne bouge pas.

### Aucun prix affiché à l'écran (09/07/2026)

La ligne « market value ~X 🪙 » (sur le lot en cours) et le rappel « (value
~X) » dans le résumé de fin de soirée ont été **retirés** : le joueur ne voit
JAMAIS un prix de référence calculé par le jeu, seulement le prix courant de
l'enchère. Juger si un lot vaut le coup redevient un vrai pari (comparé à ce
qu'on sait déjà des prix du marché/marchand), pas une lecture de chiffres.

### Arnaques d'enchère (09/07/2026, redesign le même jour)

Deux trésors "rare" truqués (**Floating Pebble**, **Elixir of Youth**,
`data/items.js`, `camelote: true`) — l'indice est dans le nom, pas dans un
chiffre caché. Contrairement aux autres trésors "rare", leur prix d'enchère
est **totalement déconnecté** de leur rareté affichée (pas le plancher de
10 000 🪙 — ça les rendrait suspects : personne ne pourrait jamais enchérir
dessus). Trois prix, ancrés sur la référence d'un objet rare normal
(`VALEUR_RARE_REF = 100`, cf. `PRIX_VENTE.rare`) :

| Moment | Prix | Détail |
|---|---|---|
| 1er tour (lot de la maison) | ~3 600–4 800 🪙 | Même formule ~85 % que n'importe quel lot, sur une valeur interne de 4 500 : « plusieurs milliers », mais moins qu'un vrai rare. **De vraies enchères** (~40 % des ventes sans surenchère, ~60 % avec un peu de compétition, jusqu'à ~6 400) — ni silence suspect, ni bagarre |
| Revente au marchand/HV | **10 🪙** | `valeurVente: 10` — ça ne vaut presque rien, mais pas littéralement 1 pièce |
| Remis en DÉPÔT par le joueur | ~40–70 🪙 | Le bouche-à-oreille a fait son effet : ça ne retrompe plus personne à ce prix-là |

Vérifié par simulation (code réel) : lot de la maison à 3 780-4 048 🪙 de mise
à prix, vente moyenne ~4 200 (jusqu'à ~6 400) ; dépôt à 40 de mise à prix,
vente moyenne ~48-49 ; revente marchand à 10 pile.

## Côté ville

- **Magnar le commissaire-priseur** : nouveau PNJ (place du marché, à gauche de
  Baldrik). *Sprite provisoire : planche du marchand teintée pourpre & or.*
  Règle absolue des PNJ respectée (regard 4 sens sans retouche).
- **Son dialogue** s'adapte : refus si pas noble ; compte à rebours vers la
  vente ; vente du ticket en fenêtre d'inscription ; dépôt d'un objet en
  journée ; « entrez ! » quand la salle est ouverte ; collecte des gains dus.
- **L'écran d'enchères** (temps réel, **plein écran aéré** comme la Forge/HV —
  socle commun `.eco-zone`, prête à recevoir un visuel de salle des ventes) :
  lot présenté (valeur de marché rappelée), prix courant, rivaux nommés,
  jauge-marteau « once/twice/SOLD », bouton **Bid** (souris) / **[Space]**
  (clavier), journal de la salle, résumé de fin. Le lot du joueur passe en
  dernier (on regarde, on ne mise pas).
- **Sauvegarde** : cycle du temps, ticket, dépôt en cours, gains à réclamer.

## Raccourci de TEST (à retirer avant l'export)

Touche **K** en exploration (⚠ balisé `TODO EXPORT FINAL` dans `principal.js`) :
« saut au crépuscule ». Elle octroie le **titre de noblesse** + un **ticket
gratuit** et avance le temps juste après la prochaine tombée du soir → on va
voir Magnar et on entre dans la salle **tout de suite**, sans attendre 1 h 30
de jeu. À supprimer pour le build Steam (comme la fontaine et le talent
« No Encounters »).

## À venir (idées, non décidé)

- Cycle jour/nuit **visuel** (teinte d'écran, horloge au HUD) branché sur
  `systems/temps.js`.
- Plusieurs ventes par jour, ou des ventes « spéciales » (thème, pièce unique).
- Sprite propre pour Magnar + une petite animation de marteau.
- Réputation : trop de dépôts invendus → la salle se méfie ; bons coups → des
  acheteurs plus généreux.
