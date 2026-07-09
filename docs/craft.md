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
  les veines de mine). **Lâchée par les mobs de la famille `gobelin`** (table de butin par
  famille, cf. `BUTIN_FAMILLE` dans `jeu/data/butin.js`). Le **cuir** suit le même principe
  pour la famille `animal` (gabarit prêt).
- Onglet **« Resources »** chez le marchand de test (Renaud) : toutes les ressources **gratuites**,
  pour remplir le sac et tester.

## Recettes (cachées)

- Définies dans **`jeu/data/recettes.js`** (`RECETTES`). Format : `forme` (lignes de caractères,
  `.` = vide) + `legende` (clé → id d'ingrédient) + `resultat` (id de l'objet créé).
- **Le motif compte, pas la position** sur la table (façon Minecraft). Aucun ingrédient parasite
  toléré. Reconnaissance : `trouverRecette()` dans **`jeu/systems/craft.js`**.
- **Recettes NON montrées** au joueur : il les découvre. Des **indices** en jeu guideront vers
  les objets rares (à faire). L'aperçu du résultat n'apparaît que si le motif est juste.

### Tous les objets qui donnent des cartes ont une recette (source = le classeur Excel)

> **118 recettes** : les 37 **armes** + tous les **équipements** qui apportent des
> cartes (armures, bottes, gants, bagues, colliers, mains secondes). Bref, tout ce
> qui se **fabrique et se joue** peut se forger.

> **La SOURCE, c'est `docs/BRUTAL-items-et-cartes.xlsx`, onglet « Recettes ».**
> On édite les grilles là-bas (cases colorées, lisibles), puis on régénère le jeu :
> `python3 outils/importer_recettes.py`. Le script réécrit **seulement** le bloc
> balisé `// <<RECETTES-AUTO>> … // <<FIN-RECETTES-AUTO>>` de `recettes.js` (les
> `QUALITES` de forge ne sont jamais touchées). Il **vérifie** au passage que
> chaque ingrédient existe et qu'**aucune** recette n'a le même motif qu'une autre
> (sinon la forge ne saurait laquelle fabriquer).
>
> **Colonne A = CATÉGORIE** de l'objet (« Arme », « Arme à deux mains »,
> « Armure », « Main seconde », « Gant », « Botte », « Bague », « Collier ») :
> elle range chaque recette ET sert de repère de bloc à l'import (une en-tête =
> colonne A non vide + colonne B = un id valide).
>
> **Matériaux souples adaptés** (09/07/2026) : le **cuir** pour les armures /
> bottes / gants (fini le bois « bizarre » sur les armures), le **bois** pour les
> armes / mains secondes ; et ils **montent en gamme avec la rareté** — commun =
> Wood / Leather, uncommon = Dark Wood / Thick Leather, rare & épique = Enchanted
> Wood / Strange Leather.

Trois règles guident le design des patterns :

1. **La rareté fixe le coût.** Plus l'arme est rare, plus il faut de matière *et* de
   matière rare :
   - **Commun** → uniquement des ressources communes (fer, cuivre, charbon, pierre taillée, bois), 3 à 6 pièces.
   - **Uncommon** → base **argent/or**, + **au plus UNE** gemme rare comme cœur élémentaire, 4 à 7 pièces.
   - **Rare** → **gemmes rares obligatoires** au cœur (malachite, lapis, améthyste, titane, émeraude, rubis), 5 à 9 pièces.
   - **Épique** → **minerai épique obligatoire** (saphir, diamant, mithril, onyx, sunstone), 7 à 9 pièces.
2. **Le minerai colle au thème de l'arme.** Sang/saignement → **rubis** ; poison →
   **émeraude/malachite** ; glace → **lapis/saphir** ; feu → **charbon + rubis** ;
   pierre → **pierre taillée + titane** ; brute → **fer/titane** ; arcane →
   **améthyste + diamant** ; sacré → **or/sunstone/diamant** ; onyx → **onyx**.
3. **Les formes VARIENT.** Deux objets du même thème n'ont pas la même silhouette
   (ex. Frostbrand et Emberblade sont toutes deux élémentaires mais ont des motifs
   différents) : impossible de deviner tout le catalogue en testant un seul patron
   avec chaque minerai. Chaque **type d'objet a sa famille de formes** : armures =
   grands blocs « plastron », bottes = « pied » en L, gants = moufles compactes,
   bagues = petits anneaux (2-4 pièces), colliers = pendentif (chaîne + goutte),
   mains secondes = boucliers / livres / sceptres.

**Cas des bijoux** (bagues, colliers) : ce sont de petits objets, donc peu de
pièces. Leur identité EST leur gemme → une bague/collier tient dans un **métal de
monture** (cuivre commun → argent uncommon → or/mithril pour les plus rares) + **une
gemme signature** du thème, même en commun (une bague, c'est une gemme sur un
anneau). Les versions « parfaites » d'une même ligne montent en gemme (ex. la ligne
Saphir : argent+1 saphir → or+2 saphir → saphir+diamant).

- 1re recette historique : **Miner's Pick** = `FFF / .W. / .W.` (3 fer en ligne + 2 bois sous le centre).

## Parchemins de craft — `jeu/ui/parchemin.js` (ajout du 08/07/2026)

Un moyen de **découvrir une recette** en jeu : un objet **parchemin** (catégorie
`parchemin`, non équipable) qu'on **ouvre** depuis l'inventaire (clic droit →
« 📜 Read »). Une fenêtre façon vieux parchemin montre alors : le **motif** de la
recette (ingrédients + résultat, tiré de `RECETTES` via le champ `revele`) et un
petit **texte de lore** (champ `lore` du parchemin). Champ `illustration`
optionnel pour un dessin de parchemin (à venir). 1er exemple : **Recipe: Miner's
Pick** (`parchemin-pioche`), récupérable via l'onglet « Scrolls » du marchand de
test. But futur : ces parchemins tombent en butin et guident la découverte des
recettes cachées. **Lire un parchemin ENREGISTRE sa recette dans le Livre
d'artisanat** (cf. ci-dessous) — même si le motif est déjà connu, il reste acquis.

## Livre d'artisanat — `jeu/ui/livre.js` + `jeu/systems/bibliotheque.js` (09/07/2026)

Une **bibliothèque des recettes DÉCOUVERTES**, qui s'alimente toute seule. Une
recette n'y apparaît **que si on l'a APPRISE**, par l'un des deux seuls chemins :

1. **Lire un parchemin** de craft (on gagne le savoir, même sans les matériaux) ;
2. **Forger l'objet « par hasard »** à la forge (en trouvant le bon motif à la main).

À chaque nouvelle découverte, un message le signale (« ✨ Recette apprise : … »).
Le reste des recettes reste **caché** : le livre est un savoir qui **s'accumule**.

- **Logique pure** (`systems/bibliotheque.js`) : un `Set` d'ids de résultat.
  `decouvrir(biblio, id)` renvoie `true` seulement pour une **vraie nouveauté**
  (id qui correspond à une recette existante et pas encore connue). Rangé **par
  catégorie** (colonne A de l'Excel : Arme / Arme à deux mains / Main seconde /
  Armure / Gant / Botte / Bague / Collier), dérivée du résultat. **Sauvegardé**
  (`etatBibliotheque` / `chargerBibliotheque`, champ `bibliotheque` de la save).
- **Écran** (`ui/livre.js`) : ouvert par le **bouton 📖 de la barre** (bas-droite)
  ou la **touche `L`** (fermeture `L`/`Échap`). Consultable **à tout moment**.
  Chaque recette = une carte : résultat (nom coloré + rareté) + **motif en petite
  grille** + légende (×N par ingrédient). Compteur « X / 118 apprises ».
- **Depuis la forge** : le bouton **« 📖 Livre d'artisanat »** ouvre le livre en
  **mode CHOISIR**. On clique une recette → elle s'affiche **en petit**, comme
  **modèle à recopier** sur la table (panneau de référence à droite). Pratique
  pour reproduire un motif compliqué sans tout retenir.

## Le FEU — carburant à fournir (ajout du 09/07/2026)

Forger demande de **NOURRIR LE FEU** : on charge du **charbon** et/ou du **bois**
dans une **case auxiliaire** de la forge (panneau « 🔥 Feu », à droite). **Efficacité :
1 charbon = 2 bois.** Le besoin monte avec la **rareté** de l'objet (en charbon) :

| Rareté | Charbon requis | (ou en bois) |
|---|---|---|
| Commun | 5 | 10 |
| Uncommon | 15 | 30 |
| Rare | 40 | 80 |
| Épique | 100 | 200 |
| Légendaire | 250 | 500 |

- **Source ÉDITABLE** : `CARBURANT_REQUIS` + `VALEUR_CARBURANT` dans
  **`jeu/data/recettes.js`** (`carburantRequis(rarete)` / `valeurCarburant(id)`).
- **UI** (`ui/forge.js` + panneau `#forge-feu`) : jauge « chargé / requis » (verte
  quand c'est bon), deux tuiles **Coal / Wood** (clic = **+1** depuis le sac, clic
  droit = **−1**), bouton **Vider**. Le charbon/bois chargé est **réservé** du sac
  (il compte dans le « restant » de la palette, comme les ingrédients posés).
- **Au clic sur Forger** : si le feu est trop faible → message, **rien n'est
  consommé**, pas de mini-jeu. Sinon, ingrédients **et** carburant sont consommés à
  la frappe (le feu a brûlé, même en cas de ratage). Le contrôle « sac plein »
  prend aussi le carburant en compte (les cases libérées comptent).

## Table (UI) — `jeu/ui/forge.js`

- **Palette** (gauche) : ressources du sac, cliquables, avec le « restant » (possédé − réservé table+feu).
- **Table 5×5** (centre) : clic sur une ressource = on la prend ; clic sur une case = on pose ;
  clic sur une case pleine = on retire. *(Clic-pour-poser ; le drag pourra venir plus tard.)*
- **Résultat** (droite) : aperçu de l'objet + bouton **Forger** (actif si motif reconnu).

## Mini-jeu de forge

Jauge orange horizontale ; un curseur fait des va-et-vient. On frappe (**[Espace]** ou
**clic**) ; **[Échap]** annule (rien perdu). Géométrie normalisée 0..1 dans `MJ`
(`jeu/systems/craft.js`), testable via `centreMarqueur()` / `outcomeFrappe()`.

- **Marqueur** placé au hasard (toujours hors des zones rouges), **3 bandes concentriques** :
  - **cœur or** (`HP`, très fin) → **Exceptional**
  - **milieu bleu** (`HM`) → **Master**
  - **large vert** (`HG`) → **Artisan**
- **Zone orange** (hors marqueur) → **Normal** (objet créé, sans bonus).
- **Zones rouges** aux extrémités (`ROUGE`) → **ratage EXTRÊME** : composants perdus, **aucun objet**.
- Les **ingrédients sont toujours consommés** à la frappe (sauf annulation Échap).
- **VITESSE selon la rareté** (`MJ_PERIODE`, ms/aller-retour) : plus l'objet est rare,
  plus le curseur file → plus dur d'attraper les petites bandes. Commun 1600 · **uncommon
  1300 (référence)** · rare 1000 · épique 700 · légendaire 480. Talent **Master Craftsman**
  (3 rangs) : −15 %/rang sur TOUTES les raretés (`periodeMiniJeu`), ce qui rend chaque
  palier ~1 cran plus facile.

## Qualité (axe séparé de la rareté)

- **Noms/couleurs** dans `QUALITES` (`jeu/data/recettes.js`) : `normale`/`artisan`/`maitre`/
  `exceptionnel`. Le **bonus de Force**, lui, dépend de la **RARETÉ** de l'objet forgé
  (`FORCE_QUALITE` + helper `forceQualite(rarete, qualite)`) — plus c'est rare, plus une
  belle forge paie :

  | Rareté | Artisan | Master | Exceptional |
  |---|---|---|---|
  | Commun *(à confirmer)* | +1 | +1 | +2 |
  | Uncommon *(référence)* | +1 | +2 | +3 |
  | Rare | +2 | +3 | +5 |
  | Épique | +5 | +8 | +10 |
  | Légendaire | +10 | +15 | +20 |

- Stockée **par exemplaire** : sur l'objet du sac (`objet.qualite`) et, une fois équipé, dans
  **`inv.qualites[slot]`** (parallèle à `inv.slots`, maintenu à l'équipement/déséquipement,
  sauvegardé). Un objet **looté** n'a pas de qualité = **Normale**.
- **Effet en combat** : chaque équipement forgé ajoute `forceQualite(rareté, qualité)` en
  **Force permanente** (tout le combat). Calcul dans `demarrerCombat` (`jeu/ui/combat.js`),
  qui croise `inv.slots[slot]` (→ rareté) et `inv.qualites[slot]`.
- **Bonus de VALEUR** (`MULT_QUALITE` + `multQualite(qualité)`) : un objet forgé vaut
  **plus cher partout** (marchand, HV, enchère) — **Artisan +15 %**, **Master +30 %**,
  **Exceptional +60 %** sur sa valeur de base. Appliqué dans `valeurEstimee(id, qualité)` /
  `prixVente(id, qualité)` (data/items.js) et propagé (marché, HV, enchères prennent la
  qualité de l'exemplaire vendu/déposé). Forger devient doublement payant : **stats ET
  revente**.
- **Affichage** : ligne colorée « ⚒ Master · +8 Force » dans l'infobulle de l'objet.

## Fichiers

```
docs/BRUTAL-items-et-cartes.xlsx  ← onglet « Recettes » : LA SOURCE éditable des patterns
outils/importer_recettes.py       ← régénère RECETTES depuis le classeur (+ contrôle d'unicité)
jeu/data/recettes.js    ← QUALITES + RECETTES (données pures ; bloc RECETTES auto-généré)
jeu/systems/craft.js    ← reconnaissance de motif + géométrie du mini-jeu (logique pure)
jeu/systems/bibliotheque.js ← Livre d'artisanat : recettes découvertes (logique pure, save/load)
jeu/ui/livre.js         ← écran du Livre d'artisanat (feuilleter + choisir un modèle)
jeu/ui/forge.js         ← table 5×5 + mini-jeu + bouton/panneau de référence du livre (UI)
jeu/systems/inventaire.js ← qualité par exemplaire (sac + inv.qualites, save/load)
jeu/ui/combat.js        ← Force de qualité en combat
jeu/ui/infobulle.js     ← ligne de qualité dans la bulle
```

## À faire / idées

- Aperçu du résultat plus riche (sprite de l'arme, infobulle au survol).
- Indices en jeu pour découvrir les recettes rares.
- Source du bois définitive (arbres à couper ? marchand ?) plutôt que loot des monstres.
- Recettes supplémentaires ; qualité applicable à d'autres stats que la Force selon l'objet.
