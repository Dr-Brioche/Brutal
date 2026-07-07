# Les bâtiments à acheter (pilier économie)

> Design + journal d'avancement. Créé le 07/07/2026.
> Code : `jeu/systems/batiments.js` (logique pure) + intégration ville dans
> `jeu/principal.js` (panneau, dialogues, dessin).

## L'idée en une phrase

Investir une **grosse somme une fois** dans un bâtiment de la ville, qui verse
ensuite un **revenu passif** — mais qu'il faut venir **récolter à pied**
régulièrement, sinon la production s'arrête.

## Comment ça marche (règles)

1. **Le panneau** : chaque bâtiment à vendre a un panneau planté devant lui.
   S'en approcher affiche *[Space] Read* ; le lire ouvre l'**écran bâtiment**
   (`jeu/ui/batiment.js`, fenêtre `panneau-ui` au-dessus du jeu) qui explique
   **tout** avant l'achat : prix, revenu par heure, bonus en nature, plafond
   de la trésorerie et règle d'arrêt de production. Aucune surprise.
   **Particularité unique : le temps de jeu CONTINUE de s'écouler tant que cet
   écran est ouvert** (contrairement aux autres écrans qui figent l'horloge) —
   on peut regarder la jauge du prochain versement se remplir en direct. Pas
   d'abus AFK possible : le plafond de trésorerie arrête la production seul.
2. **L'achat** : une somme conséquente, payée une fois. Refusé proprement si
   l'or manque (le dialogue rappelle combien on a).
3. **Le revenu** : toutes les **1 h de JEU ACTIF**, le bâtiment verse son
   revenu dans **sa trésorerie** (pas directement dans la poche du joueur).
   - Temps de jeu ACTIF = exploration + combat. Les menus, dialogues, la
     Forge et l'HV **figent l'horloge** (la même que le marché) → impossible
     de laisser tourner le jeu dans un menu pour farmer.
4. **Le plafond** : la trésorerie a un **maximum**. Pleine → **la production
   s'arrête** et le rendement est **perdu** tant qu'on ne vide pas la caisse.
   C'est LA règle qui force à repasser en ville (et rend le tour de ville
   vivant), en écho aux annonces de l'HV qu'on va aussi récolter soi-même.
5. **La récolte** : sur l'écran bâtiment, bouton *Collect* → l'or + le bonus
   en nature vont dans le sac. Si le sac ne peut pas tout prendre (bois…), le
   reste **attend au bâtiment** (rien n'est perdu).
6. **Bonus spécial** : chaque bâtiment a sa production **en nature** en plus
   de l'or (champ `bonus` du catalogue), plafonnée elle aussi.

## Le 1er bâtiment : la Scierie (test)

Elle débite du bois importé depuis la surface (c'est le lore : on ne va jamais
à la surface, mais le bois, lui, descend).

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Prix d'achat | **1 200 🪙** | Somme conséquente : plusieurs sessions d'économies |
| Revenu | **120 🪙 / h de jeu actif** | Remboursée en **~10 h de jeu** — un vrai investissement, pas une machine à sous |
| Bonus | **+2 bois / versement** | Petit plus utile à la forge (plafonné à 8) |
| Trésorerie max | **480 🪙** (4 versements) | Force un passage **toutes les ~4 h de jeu** maxi |

Tous ces chiffres vivent dans `BATIMENTS` (`jeu/systems/batiments.js`) —
l'équilibrage se règle à UN endroit.

### Anti-abus (pourquoi ce n'est pas cassé)

- L'horloge ne tourne **qu'en jeu actif** : pas de farm AFK dans un menu.
- Le **plafond** borne ce qu'une absence peut rapporter (480 🪙 maxi en stock).
- Le remboursement en ~10 h de jeu fait de l'achat un **choix** (s'équiper
  maintenant vs revenu plus tard), pas une évidence.
- La récolte **à pied** ajoute un coût en temps réel à chaque encaissement.

## Côté écran (état actuel)

- **Emplacement** : le bloc de murs (cols 15-16, rangées 9-10) de la ville,
  près de la place du marché ; **façade placeholder** dessinée par-dessus
  (planches + porte + lame de scie) en attendant le vrai visuel.
- **Le panneau** (poteau + écriteau, obstacle solide) affiche :
  - avant l'achat : **« FOR SALE »** ;
  - après : **« SAWMILL »** + une **pastille dorée qui pulse** quand il y a de
    l'or à récolter, **rouge clignotante** si la caisse est pleine (production
    à l'arrêt).
- **L'écran bâtiment** (ouvert en lisant le panneau) : bandeau d'état
  (🪧 à vendre / ● en production / ⛔ à l'arrêt), rangées d'infos
  étiquette→valeur, **jauges vivantes** (trésorerie + progression du prochain
  versement, rafraîchies 4×/s), encart de règles, boutons *Buy* / *Collect* /
  *Close*. Souris OU clavier : [Space] action principale, [Esc] fermer,
  clic hors du panneau ferme aussi.
- **Messages flottants** en jeu : à chaque versement (« +120 🪙 in its
  treasury ») et quand la caisse se remplit (« production STOPPED »).
- **Sauvegarde** : l'état des bâtiments (possédés, trésorerie, progression,
  stock de bonus) voyage dans les emplacements de sauvegarde, validé champ par
  champ au chargement.

## À venir (idées, non décidé)

- D'autres bâtiments avec d'autres bonus (brasserie → potions ? entrepôt →
  place de sac ?) et des prix/rendements étagés.
- Des améliorations par bâtiment (niveau 2 : trésorerie plus grande, meilleur
  rendement…).
- Un vrai sprite de scierie + une animation de scie qui tourne quand elle
  produit (et s'arrête quand la caisse est pleine — feedback visuel gratuit).
