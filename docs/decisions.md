# Journal des décisions — BRUTAL

> Récapitulatif des choix de design et de rendu **déjà décidés et implémentés**.
> But : survivre si la conversation est effacée. Chaque entrée dit **ce qu'on a
> décidé**, **où ça vit dans le code**, et **la valeur de réglage** quand il y en a une.
> Le design de fond reste dans `concept.md` ; ici c'est le « qui/quoi/où » concret.
> Les docs spécialisés existants : `mines.md`, `encheres.md`, `marche.md`,
> `batiments.md`, `craft.md`.

---

## 1. Combat — rendu de la scène

**Échelle & sol** (`jeu/ui/combat.js`, constantes en tête) :
- `SOL_Y = 224` (pieds des sprites, rang avant), `SOL_ARRIERE = SOL_Y - 18` (rang arrière).
- `ECHELLE_AVANT = 0.36` (rang avant), `ECHELLE_ARRIERE = ×0.85` (rang arrière, 15 % plus petit).
- Deux rangs de mobs en **quinconce** (avant/arrière selon la parité de l'index).

**Le nain (héros)** :
- Affiché via une **illustration** (`images/heros/nain-combat.png`), pas un sprite par arme.
  Rendu **lissé** (l'illustration reste nette). Repli sur l'ancien sprite pixel le temps du chargement.
- **Agrandi de 30 %** : `ECHELLE_HEROS_ILLU = 1.30`.
- **Remonté** entre les deux rangs de mobs : `DECAL_HEROS = 11` (px écran) → pieds ~213.
- **Tête dans la file des tours** (en haut) : découpée dans l'illustration de combat
  (`TETE_HEROS_COMBAT`), pas l'ancienne vignette pixel.

**Monstres** = illustrations « image fixe + effets » (`sprite.statique`) :
- Toute la vie vient du CODE (respiration, bond d'attaque, recul + flash blanc au coup,
  bascule à la mort). Inspiration Slay the Spire (le vivant vient des réactions).
- Skins détourés depuis des **illustrations sur fond vert** via `outils/preparer_skin.py`
  (chroma key + despill). Les **3 gobelins** sont calibrés à la même taille (basée sur le
  visage) ; l'**ogre** est plus grand.
- **Halo de lisibilité** : léger dégradé clair derrière chaque ennemi (mode additif) pour
  détacher les silhouettes sombres du fond sombre. `HALO_OPACITE = 0.16`.

**Ombres au sol** (`ombreOvale`, `scanPieds`, `dessinerOmbreSol`) :
- Ovale dégradé sombre sous **chaque ennemi ET sous le nain**.
- Calée sous les **pieds RÉELS** (détectés par scan du bas de l'illustration, en cache) —
  car les persos ne sont pas centrés dans leur image. Marche pour tout futur monstre sans réglage.
- Large (couvre les jambes écartées). **Bien visible** : ovale peu aplati (ry = 34 % du
  rayon), foncé (cœur 0.75), **posé sous les pieds** (légèrement descendu pour ne pas être
  coupé en deux par le sprite). Plus grande sous un **grand monstre** (×1.12).
  Helper `ombreOvale` (partagé nain + ennemis).

**Fonds de combat** : voir §4.

---

## 2. Combat — rythme & interactions

**Rythme** (`jeu/ui/combat.js`) :
- Par défaut **posé/lisible** ; option « **Fast gameplay** » (menu → Interface) rétablit le rythme rapide.
  `lenteur = getPreference("gameplayRapide") ? 1.0 : 1.8` multiplie toutes les pauses.
- Délai **carte jouée → effet** : `DELAI_CARTE` (le temps que la carte s'écarte vers la gauche,
  hors des monstres).
- Pauses ATB : `PAS_AVANT` (après End Turn, avant le 1er ennemi), `PAS_ENNEMI` (après chaque
  action ennemie).
- **+0,5 s avant la pioche du héros** après les attaques ennemies : `PAUSE_AVANT_PIOCHE = 500` (ms).
- Le **coup encaissé par le héros** (flash blanc + chiffre + son + poussière) tombe au **CONTACT**
  du bond ennemi (≈ 56 % de l'anim d'attaque), pas pendant l'armement.

**Cartes / sélection** :
- **Aucune carte relevée par défaut** après « Fin du tour » ET après avoir **joué** une carte
  (`selection = -1`). Une carte ne se relève qu'à une action explicite : flèche clavier ou
  survol souris de la main. Objectif : écran lisible pendant l'action.
- Pas de carte piochée affichée en grand dans la main pendant le délai avant sa révélation
  (les cartes piochées sont retirées de la main tout de suite, révélées au centre ensuite).
- Ciblage : la carte armée se **range dans la main** (surlignée, classe `.armee`), elle ne
  s'agrandit plus par-dessus les monstres.
- Tout jouable **souris ET clavier** (règle absolue du projet).

---

## 3. Combat — skins d'ARME à deux mains (calques)

Système générique : `SKINS_ARME_2M` dans `jeu/ui/combat.js` (une ligne par arme, clé = id de l'arme).

**Déclenchement** : quand une arme **à deux mains** (`mains: 2`) est équipée, le nain prend
l'illustration « poings tendus » (`images/heros/nain-combat-2mains.png`).

**Pose de l'arme, méthode « calques »** (sans repeindre de bras) :
1. On dessine le NAIN (base).
2. L'ARME **par-dessus** (la lame passe devant le corps et la main arrière).
3. On **repose les POINGS** (fraction droite du sprite) au-dessus de l'arme → les doigts
   tiennent l'arme, la lame traverse la prise.
4. **Détail subtil** : au-dessus de `poingsTopFrac`, on ne repose PAS les poings → le **dessus
   de la main reste derrière la lame** (l'épée semble sortir de la main).

**Réglages par arme** (tous dans la ligne du skin) :
- `gcx, gcy` : point de prise dans l'image de l'arme (px).
- `echelle` : taille de l'arme relative à l'illustration du héros.
- `angle` : inclinaison de la lame (° ; + = vers le haut).
- `fx, fy` : point de prise sur le héros (fraction de largeur/hauteur).
- `poingsFrac` : à partir de quelle fraction de largeur on repose les poings (~0.71).
- `poingsTopFrac` : au-dessus de cette fraction de hauteur, poings NON reposés (détail subtil, ~0.15).

**Armes validées** (valeurs dans `SKINS_ARME_2M`) :
- **Claymore** (`epee-large`) : `angle 73`, `fx 0.94`, `fy 0.37`, `echelle 0.1783`,
  `poingsFrac 0.71`, `poingsTopFrac 0.15`.
- **War Axe** (`hache-de-guerre`) : `angle 73`, `fx 0.90`, `fy 0.40`, `echelle 0.21`,
  `gcx 470`, `gcy 285`, `poingsFrac 0.71`, `poingsTopFrac 0.15`.

**Règles pour les futures armes** :
- Fournir l'image (fond vert de préférence), orientée **manche à gauche / lame à droite, horizontale**.
- **Détourer en HAUTE résolution** (≥ ~1400 px de large) : sinon la lame pixélise une fois
  affichée en grand (leçon apprise sur la claymore, re-détourée à 1400 px).
- Chaque arme demande une petite passe de calage (un marteau ≠ une hache ≠ une lance).

---

## 4. Fonds de combat — par décor

`jeu/data/fonds.js` : `FONDS_COMBAT` (bibliothèque par clé). Le fond est tiré au hasard
selon **où on est** (`fondCombat(zoneId, zone)`), format conseillé ratio ~2.4, sol en bas,
**JPG < 400 Ko** (les PNG lourds pixélisent/gonflent le dépôt — tout est converti en JPG).

- **Mine à BIOME** → uniquement ses fonds dédiés : `mine-glace`, `mine-feu` (lave),
  `mine-cristal`, `mine-inondee`.
- **Mine profonde sans biome** → bibliothèque `profondeur` (décor générique).
- **Surface** (souterrains est) → `eastern-under-tunnels`.
- **Cité** → `city` (dossier `brutal/`), prêt pour de futurs combats en ville.

Nettoyage : les anciens fonds inutilisés (1.png, 2.png, nouveau.png) ont été **supprimés**.

---

## 5. Monstres — composition des groupes

`jeu/data/ennemis.js` :
- Taille du groupe en **EMPLACEMENTS** (1 à 5), `DISTRIBUTION_GROUPE = [0.30,0.30,0.20,0.15,0.05]`.
- Tirage **pondéré par niveau** : les monstres plus faibles sortent plus souvent
  (`FACTEUR_NIVEAU = 2` → +1 niveau ≈ 2× plus rare).
- **Grands monstres** (`grand: true` dans l'Excel) : occupent **2 emplacements**, centrés
  dessus, toujours au **premier rang**, plus **gros** (ex. ogre).
  - Rares dans les petits groupes : `GRAND_RARETE = 0.5`.
  - **Favorisés dans les GROS groupes** (> `GROS_GROUPE = 3` places) : `GRAND_BONUS_GROS = 3.0`
    → ~52 % des gros groupes contiennent un grand (vs ~4 % des petits).
- Placement/affichage des grands géré dans `jeu/ui/combat.js` (`placesMonstre`, spans centrés).

---

## 6. Mine — minerais & biomes

`jeu/data/items.js` + `jeu/world/mine.js` (design complet : `mines.md`).

**Fenêtre de profondeur des minerais** (`minerauxDisponibles`) :
- Chaque minerai a une `profMin` ET disparaît quand le rang favorisé grimpe trop au-dessus
  du sien (`FENETRE_MINERAI = 4`). → les communs s'effacent après quelques étages
  (pierre ~étage 6, fer ~8-10) ; au fond seuls les rares restent ; la liste n'est jamais vide.

**Biomes de mine** (décor, palette, fonds dédiés) — apparition selon la **profondeur** :
- **glace ≥ 3**, **lave ≥ 4**, **inondée ≥ 5**, **cristal ≥ 6**.
- À partir de l'étage 6 les quatre sont possibles ; `CHANCE_THEME = 0.4` (~60 % d'étages normaux).
- `mine.js` : `tirerTheme`, `THEME_NOM`. Teintes d'exploration dans `jeu/world/carte.js` (`THEMES_MINE`).

**Bonus de minerai emblématique par biome** (`MINERAI_THEME`, `BONUS_THEME = 0.15`) :
si le minerai est déjà trouvable à l'étage, **+15 %** de chance dans son biome :
**lave→rubis**, **cristal→diamant**, **glace→lapis-lazuli**, **inondée→titane**.

**HUD mine** (`principal.js`, `majHudInfo`) : niveau des mobs + **liste des minerais repliable**
(en-tête « Ores ▾/▸ », état retenu dans les préférences `mineraisReplies`) + buffs de run.

**Descente = RUN** : à chaque étage, 1 buff parmi 2 (Force/Célérité/Armure/Or) qui s'accumulent
et disparaissent en ressortant. Pas de boon au tout 1er étage (option C), seulement aux descentes.

---

## 7. Objets & interface

- **Bonus de stat passif** des objets affichés dans l'**écran de butin** (sous le nom) et
  l'infobulle (`bonusPassifs` dans `items.js`) : Pierre au combat/par tour, Agilité, Move Speed,
  passif spécial. (Ex. bottes : « +18 Agility · +50 % Move Speed ».)
- **Bonus de set d'armure actif** affiché en haut à gauche en combat.

---

## 8. Sauvegarde

`jeu/systems/sauvegarde.js` + `menu.js`/`demarrage.js`/`slots.js` :
- 3 emplacements manuels **+ 1 slot « auto » spécial** (`SLOT_AUTO`), séparé et teinté doré,
  intitulé « Auto-save (auto only) » — **Load uniquement** (jamais écrit à la main).
- **Sauvegarde automatique à chaque entrée/sortie de la cité** (`allerVersZone`, `principal.js`) —
  filet de sécurité. Jamais en mine (état non sérialisé).
- Tout en **localStorage**, jamais de serveur (règle du projet : 100 % local).

---

## 9. Outillage (chantier)

- `outils/preparer_skin.py` : détoure une illustration (fond vert / blanc / déjà transparent),
  rogne, redimensionne. Bords doux conservés (combat rend en lissé).
- `outils/importer_monstres.py` : Excel « Monstres » → bloc `STATS_MONSTRES` de `ennemis.js`
  (colonne « grand » incluse).
- `outils/generer_catalogue_items.py` : LIT `items.js` (ne le réécrit pas).
- Excel source : `docs/BRUTAL-items-et-cartes.xlsx`.

---

## Rappels de méthode (cf. `CLAUDE.md`)

- Une amélioration = une tâche = un commit, message **en français** étiqueté
  (`[gameplay]`, `[visuel]`, `[interface]`, `[technique]`, `[équilibrage]`, `[son]`).
- Développement sur la branche `claude/brutal-v2-75hb9h`, publication en poussant AUSSI sur
  la branche en ligne (GitHub Pages).
- Tout jouable **souris ET clavier**. PNJ solides + se tournent vers le héros au dialogue.
- Coins arrondis par défaut, texte canvas via `police()`, fenêtres `panneau-ui`.
