# L'Hôtel des ventes (Deep-Market Exchange) — le marché

> Arc de gameplay du pilier **ÉCONOMIE** (faction Deep-Market). Ouvert en parlant à
> **Baldrik le courtier** (place du marché, à gauche du forgeron) → « 📈 Trade ».
> C'est le pendant de la Forge : la Forge récompense l'**habileté** (mini-jeu), le
> marché récompense la **lecture des prix** (acheter bas, vendre haut).

## Vue d'ensemble

Écran plein écran (comme la Forge). Deux mondes de prix :
- **Ressources** (minerais + bois) : prix **VIVANTS**, qui bougent avec l'offre/la
  demande, le temps et des événements.
- **Objets** (armes, armures, bijoux…) : **valeur réelle fixe** ; on les met en
  **annonce** au prix qu'on veut — plus on est gourmand, plus la vente est lente.

⏱ **L'horloge du marché tourne EN PERMANENCE** — le temps de Brütàl s'écoule
toujours. **Seul le menu pause** (Échap) la fige : c'est le bouton « stop »
quand on s'absente. Le reste du temps (exploration, combat, dialogues, écrans…)
les prix vivent et les annonces s'écoulent. Pas d'abus d'AFK : le marché est
anti-exploit au moment de l'échange et une annonce vendue ne paie pas toute
seule (on va la récolter à l'HV).

## Les prix des ressources

Prix affiché = **prix de base** × **multiplicateur vivant** × **facteur
d'événement**. Le **prix de base** est une **donnée éditable** : onglet
**« Ressources »** du classeur Excel → `data/valeurs.js` (`VALEUR_RESSOURCE`),
régénéré par `outils/importer_valeurs.py` (même workflow que la valeur des
objets). En secours (ressource absente de la table), l'ancien barème par `rang`
1→12 (~×1,8/rang, `PRIX_RANG1 × RATIO_RANG^(rang-1)`) s'applique. Les valeurs
semées **reprennent exactement** l'ancien barème → aucun changement de balance
tant que Brioche n'édite pas. Le multiplicateur bouge avec :

1. **Les échanges du joueur** — vendre fait **baisser**, acheter fait **monter**,
   au même taux. Mouvement **asymptotique** vers un plancher (−60 %) / plafond
   (+150 %) : chaque unité de plus déplace moins le prix (ça ne s'arrête jamais
   vraiment, mais ça devient insignifiant).
   **⚠ Anti-exploit** : le prix bouge **AVANT** l'échange — on achète au prix déjà
   monté, on vend au prix déjà baissé → un aller-retour achat/vente **perd
   toujours** de l'or (testé). Aucune machine à or possible.
2. **Le contrecoup** — échanger beaucoup de X pousse **2 autres ressources au
   hasard** en sens inverse, avec une ampleur réduite (30 % de la poussée).
3. **La dérive naturelle** — toutes les 20 s de jeu actif : petite marche
   aléatoire (±1,5 %, « la zone normale respire ») + **retour doux vers le prix
   de base** (~2 %/pas) : les pics s'estompent, tant pis si on n'en a pas profité.
4. **Les événements** (rares, ~1 toutes les ~20 min de jeu actif, 5-10 min) :
   - **PÉNURIE** : prix ×2,6-3,4 → le moment de **vendre** son stock.
   - **SURPLUS** : prix ×0,35-0,45 → le moment d'**acheter** pas cher.
   Le bandeau de l'écran l'affiche, et **Baldrik glisse l'indice** dans son
   dialogue d'accueil (sans donner les chiffres) — parler au courtier
   régulièrement paie.

**Historique** : le prix de chaque ressource est échantillonné toutes les 60 s de
jeu actif (1 h conservée) et affiché en **graphique** (courbe façon trading, ligne
pointillée = prix de base) pour la ressource sélectionnée.

**Tri** : la liste des ressources peut se trier par ordre par défaut, ou par
**momentum sur 30 min** (Top gainers / Top losers) — le badge « 30m: +N % » de
chaque ligne, différent de la tendance vs prix de base, sert à repérer d'un coup
d'œil ce qui grimpe vite (vendre) ou s'effondre (acheter).

## Les objets : annonces à prix libre

> **Vendre coûte toujours** (refonte 09/07/2026) : un objet a une **valeur de
> référence** (data/items.js + data/valeurs.js, éditable dans le classeur) et se
> revend TOUJOURS en dessous. Le marchand paie **−25 %** tout de suite ; l'HV
> paie un peu mieux (**−20 % à −10 %**) mais il faut attendre. Jamais au-dessus
> de la valeur (ça, c'est réservé aux enchères et à la Luck).

- **Valeur réelle** = la valeur de référence de l'objet (`valeurEstimee`),
  surchargeable via `it.valeur`.
- **Bande HV** = de **−20 %** (vente rapide) à **−10 %** (vente patiente) de la
  valeur. **Prix conseillé** = milieu (−15 %). On règle le prix librement dans
  cette bande ; viser haut = attendre plus longtemps :

  ```
  f = position dans la bande [−20 %, −10 %]        (0 = rapide, 1 = patient)
  délai médian = 120 s × (21600/120)^f             borné 45 s … 72 h
  tirage réel  = médian × 2^(u·w)   u ∈ [−1;1],     w = 0,3 + 0,5·f
  ```

  En pratique : bas de bande (−20 %) ≈ **1-3 min** · milieu (−15 %) ≈ **20-40 min**
  · haut (−10 %) ≈ **3-10 h**. La fourchette de hasard **s'élargit** quand on
  vise haut (acheteur patient plus imprévisible).
- L'objet **quitte le sac** à la mise en annonce. Quand le délai s'écoule (en
  jouant), l'annonce passe en état **VENDUE** (bord doré, bouton « 💰 Collect ») —
  **rien n'est payé automatiquement**. Un message prévient sans créditer d'or.
  Il faut retourner à l'HV et **cliquer dessus** (ou **[C]**) pour toucher l'or.
  La **case Collect affiche DÈS AVANT le clic la PLUS-VALUE** en % (vert) : le gain
  réalisé par la patience **par rapport à la vente immédiate au marchand**
  (`prixVente`) — pour bien voir le bonus d'avoir attendu (rouge si on a fixé un
  prix SOUS celui du marchand). Le message de récolte rappelle ce même %. La
  **qualité de forge** voyage avec l'annonce.
- Des **talents de marchand** pourront plus tard réduire ces délais (prévu).

**Échelle des valeurs** (cible par rareté, semée ± 20 %, éditable dans l'onglet
« Valeurs » du classeur → `data/valeurs.js`) : commun 400 · uncommon 2 000 ·
rare 10 000 · épique 80 000 · légendaire 250 000. Cf. `docs/concept.md`,
section « Valeur des objets ».

## Fichiers

```
jeu/systems/marche.js  ← tout le modèle (prix, événements, annonces, horloge) + réglages
jeu/ui/hv.js           ← l'écran (ressources, historique, annonces, mise en vente)
jeu/data/pnj.js        ← COURTIER (Baldrik) — planche du marchand TEINTÉE (provisoire)
jeu/principal.js       ← tick du marché (jeu actif), notification (sans paiement), save/load
```

Tous les **réglages d'équilibrage** (taux, planchers, fréquence des événements,
formule des délais) sont des constantes commentées en tête de `marche.js`.

## À faire / idées

- **Planche dédiée** pour Baldrik (il réutilise le sprite du marchand teinté en bleu).
- **Achat d'objets** à l'HV (offres tournantes) — sans intérêt tant que le marchand
  de test donne tout gratuitement ; à activer quand l'économie deviendra réelle.
- **Talents de marchand** : délais de vente réduits, meilleure lecture du marché
  (prévisions), frais réduits…
- Annulation d'une annonce (récupérer l'objet) ; la qualité de forge est déjà
  conservée pour ce jour-là.
- Graphique (courbe) en plus du tableau d'historique.
