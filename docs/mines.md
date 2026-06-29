# Les Mines — exploration procédurale (design + journal)

> Document de référence pour le système de mines. À relire pour comprendre le
> gameplay et savoir où en est l'implémentation (même après un effacement de la
> conversation). La **référence de design** reste `concept.md` ; ce fichier en est
> le détail pour la feature « mines ».

## 1. Concept & boucle de jeu

Depuis le monde d'exploration, une **entrée de mine** (tuile `M`, à droite de la
carte pour l'instant) mène à une **mine générée procéduralement**. La boucle :

1. On entre par l'entrée → on atterrit dans une **mine inconnue, générée au hasard**.
2. On **explore** des galeries reliées à des **zones plus aérées** (pas un couloir
   tout droit).
3. On **mine des veines de minerai** (matériaux pour le farm / le craft) et on
   **combat** des monstres.
4. On **ressort** par la sortie → retour au monde, à l'entrée.
5. **Si on revient, une mine TOUTE NEUVE est générée** (rien n'est persistant).

## 2. Décisions de design (validées avec Brioche)

**Génération de carte**
- Style **galerie de mine** : des galeries/couloirs reliant des **zones aérées**
  (salles), **pas un chemin tout droit** → on doit explorer pour trouver la sortie.
- **Connectivité garantie** : départ, sortie et veines toujours atteignables.
- Le **type de salles / la génération dépend de l'endroit où l'on entre** dans la
  Profondeur (pour l'instant une seule entrée → un seul profil).

**Entrée / sortie / sauvegarde**
- Marcher sur l'entrée `M` (monde) → **génère + charge** une mine fraîche.
- Une **sortie** (porte) dans la mine **ramène au monde** (à l'entrée).
- **Re-entrer régénère** une mine neuve.
- **Sauvegarde INTERDITE en mine** (comme en combat) — l'état généré n'est pas
  sérialisé.

**La Profondeur (rareté & difficulté)**
- Chaque **zone de profondeur** a un **pourcentage FIXE** (plus ou moins élevé)
  d'y croiser des **ressources et monstres RARES**.
- Un **tableau de rareté par élément** (par zone) pilote les tirages aléatoires
  (quel minerai / quel monstre, et sa rareté).
- On pourra **descendre plus profond** depuis une mine : ça **augmente la rareté**
  des trouvailles **MAIS aussi la difficulté**.

**Outils (inventaire)**
- Nouvel **espace « outils »** dans l'inventaire.
- **Pioche basique** : l'outil qui permet de miner (point de départ, pour tester).
  Plus tard : meilleurs outils = minage plus rapide / meilleur rendement.

**Minage (veines / filons)**
- Une veine = un **objet posé sur la carte** générée (modèle d'interaction de la
  fontaine : proximité + touche/clic).
- Miner joue une **légère animation** + un **court temps où l'on ne peut pas
  bouger**.
- Un filon se mine **2 à 5 fois** (tiré au hasard) avant d'être **épuisé** (il
  change alors d'aspect et ne donne plus rien).
- Chaque coup verse **1 matériau** (selon la table de la zone) dans le sac.

**Matériaux**
- **Sac à ressources** séparé du sac à objets (à grille).
- Les matériaux **s'empilent**, **pile max 10** par défaut (exceptions à préciser
  au cas par cas par Brioche).
- Servent au **farming** et au **craft** (futur).

## 3. Architecture technique (comment ça s'emboîte)

Le moteur de carte est **piloté par les données** : `creerCarte(zone)`
(`jeu/world/carte.js`) transforme un `zone.plan` (tableau de lignes de caractères)
en monde jouable. **On ne touche donc pas au moteur** — on **fabrique** un objet
« zone » au lieu de le lire dans `data/zones.js`.

- **Générateur** : `jeu/world/mine.js` → `genererMine(profil)` renvoie un objet
  zone-compatible : `{ nom, plan, depart, portails, monstres, veines, … }`.
- **Sortie** : on réutilise le système de **portails** existant — la mine générée
  contient un portail (tuile `P`) qui pointe vers la zone d'origine.
- **Entrée** : marcher sur `M` (monde) déclenche la génération + le chargement
  (variante de `allerVersZone` qui accepte une zone-objet, pas seulement un id).
- **Veines** : objets `{ x, y, type, coupsRestants }` posés par le générateur,
  gérés comme les points d'intérêt (proximité + interaction).
- **Profil de zone** : un objet de config (rareté, tables, profil de salles) passé
  au générateur → toute la variété et les futures mécaniques passent par là.

Tuiles utilisées (Phase 1) : `#` roche (mur), `,` sol de galerie (réutilise le sol
souterrain → active les rencontres), `P` sortie. Un rendu « galerie » dédié viendra
en phase décor.

## 4. Plan par phases

- **Phase 1 — La boucle (squelette)** : générateur (galeries + zones aérées,
  connectivité garantie), entrer dans `M` → mine générée → sortie → retour →
  re-entrée régénère. Sauvegarde interdite en mine. *But : c'est jouable.*
- **Phase 2 — Outils & matériaux** : espace outils + pioche basique ; sac à
  ressources (stack 10) ; veines minables (animation + blocage + 2–5 coups +
  épuisement) ; 2–3 minerais de base.
- **Phase 3 — Rareté & Profondeur** : table de rareté par zone (ressources +
  monstres rares) ; option de descendre plus profond (rareté ↑, difficulté ↑).
- **Phase 4 — Décor & variété** : éléments de décor aléatoires, profils de salles
  selon l'entrée, rendu « galerie », polish.
- **(plus tard) — Craft** : consommer les matériaux.

## 5. État d'avancement (mis à jour à chaque commit — point de reprise)

- [x] **Phase 1** — boucle entrer/générer/sortir/régénérer ✅
  - [x] Générateur `jeu/world/mine.js` (galeries + salles aérées, connexité TOTALE
        garantie + testée sur 300 tirages ; salle d'entrée = départ + sortie `P`)
  - [x] Entrée `M` → génère + charge la mine (`verifierEntreeMine` / `entrerEnMine`
        dans `principal.js` ; `allerVersZone` accepte désormais une zone-OBJET)
  - [x] Sortie (porte `P` de la mine) → retour au monde via le système de portails
  - [x] Re-entrer régénère une mine neuve (rien n'est persistant)
  - [x] Sauvegarde interdite en mine (menu pause ouvert en mode `sansSauvegarde`)

  **Reprise** : Phase 1 terminée et testée (générateur + boot). À tester EN JEU :
  entrer dans `M` (souterrains est) → mine générée → ressortir par `P` → re-entrer
  = nouvelle mine. Prochaine étape : **Phase 2** (outils + pioche, sac à ressources
  stack 10, veines minables avec animation + 2–5 coups).
- [x] **Phase 2** — outils, matériaux, veines minables ✅ (cœur)
  - [x] Sac à ressources (`inv.materiaux`) + `ajouterMateriau` ; 3 minerais de base
        (`data/materiaux.js` : Iron / Copper / Coal)
  - [x] Slot **« outil »** dans l'inventaire + **pioche de base** (équipée au départ)
  - [x] Veines posées par le générateur (3–6/mine, type au hasard, 2–5 coups)
  - [x] **Minage** : approcher une veine (liseré doré) + **Espace** → coup de pioche
        (≈0,55 s, héros FIGÉ) → +1 minerai ; le filon s'épuise après 2–5 coups et disparaît
  - [ ] *Reste à finir (2bis)* : capacité / piles de 10 du sac, et **affichage** du
        sac à ressources dans l'écran d'inventaire (pour l'instant accumulation libre
        + message « ⛏ +1 Iron (×N) »)
- [ ] **Phase 3** — rareté & profondeur (table de rareté par zone, descendre plus bas)
- [ ] **Phase 4** — décor & variété (rendu galerie, profils de salles, décor)

  **Reprise (Phase 2)** : codée + boot/runtime vérifiés en lançant une partie.
  À TESTER EN JEU : entrer en mine → s'approcher d'une veine (liseré doré) → Espace
  pour miner → « ⛏ +1 Iron (×N) », épuisement après 2–5 coups. Le slot **Tool**
  apparaît dans l'inventaire (touche B) avec la pioche.

## 6. Risques connus (à surveiller)

1. **Connectivité** : ne jamais enfermer départ / sortie / veine derrière la roche
   → vérif par remplissage (flood-fill) après génération.
2. **Spawn du héros** : la case de départ doit être dégagée (pas dans un mur).
3. **Taux de rencontre en mine** : une mine pleine de `,` peut spammer les combats
   → doser (période de grâce, densité).
4. **Sauvegarde** : résolu — interdite en mine.
5. **Équilibrage de la rareté** : à régler pour que « rare » reste rare mais
   atteignable.
