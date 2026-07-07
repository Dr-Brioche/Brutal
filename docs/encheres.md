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

`systems/temps.js` fait avancer le temps de la cité sur l'horloge de **jeu
actif** (exploration + combat ; menus/écrans figés — sauf l'écran bâtiment).

| Phase | Durée (jeu actif) |
|---|---|
| Journée | **1 h** (3600 s) |
| Nuit | **30 min** (1800 s) |
| Cycle complet | 1 h 30 (5400 s) |

La **vente a lieu à la tombée du soir** (fin de journée) → **une vente toutes
les 1 h 30** de jeu. À l'aube, un nouveau jour commence (compteur de jours).
*(Le jour/nuit n'est pas encore visuel — teinte d'écran à venir ; la mécanique
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
   souvent un **gros paquet de minerai cher**. Mise à prix **basse** (30-50 %
   de la valeur) → les bonnes affaires existent…
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
| `MISE_A_PRIX` | 30–50 % | Mise à prix = valeur × ce facteur |
| `INCREMENT_PCT` | 6 % | Un cran d'enchère = valeur × ceci |
| `NB_RIVAUX` | 2–4 | Rivaux PNJ par lot |
| `BUDGET_ACHAT` | 55–105 % | Budgets sur les lots de la maison (frileux) |
| `BUDGET_DEPOT` | 85–135 % | Budgets sur le lot du joueur (salle plus chaude) |
| `OBSTINE_FACTEUR` | ×1,15–1,50 | Un obstiné gonfle son budget d'autant |
| `OBSTINE_PAR_RANG` | 10/15/25/40/60 % | Proba d'obstiné selon la rareté (commun→légendaire) |
| `PAQUET_RANG_MIN` | 6 | Minerai « paquet » : rang minimum (métaux/gemmes chers) |
| `PAQUET_QTE` | 8–18 | Taille d'un paquet de ressources |
| `LOT_RARETES` | 60/30/10 | Poids de tirage rare/épique/légendaire |
| `DEPOT_RARETE_MIN` | rare | Rareté minimale pour confier un objet |

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

## Côté ville

- **Magnar le commissaire-priseur** : nouveau PNJ (place du marché, à gauche de
  Baldrik). *Sprite provisoire : planche du marchand teintée pourpre & or.*
  Règle absolue des PNJ respectée (regard 4 sens sans retouche).
- **Son dialogue** s'adapte : refus si pas noble ; compte à rebours vers la
  vente ; vente du ticket en fenêtre d'inscription ; dépôt d'un objet en
  journée ; « entrez ! » quand la salle est ouverte ; collecte des gains dus.
- **L'écran d'enchères** (temps réel) : lot présenté (valeur de marché
  rappelée), prix courant, rivaux nommés, jauge-marteau « once/twice/SOLD »,
  bouton **Bid** (souris) / **[Space]** (clavier), journal de la salle, résumé
  de fin. Le lot du joueur passe en dernier (on regarde, on ne mise pas).
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
