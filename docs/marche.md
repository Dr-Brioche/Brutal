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

⏱ **L'horloge du marché ne tourne qu'en JEU ACTIF** (exploration + combat). Les
menus, dialogues, la Forge et l'HV lui-même la **figent** — les prix n'évoluent
jamais « sous nos yeux » dans l'écran, et les annonces n'avancent pas quand on
n'y joue pas.

## Les prix des ressources

Prix affiché = **prix de base** (selon le `rang` 1→12, ~×1,45 par rang ; bois = 5)
× **multiplicateur vivant** × **facteur d'événement**. Le multiplicateur bouge avec :

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

- **Valeur réelle** = **prix marchand (`prixVente`) + 10 %** — surchargeable par
  objet via `it.valeur`. Garantit que l'HV est toujours plus rentable que le
  marchand, même sans marge supplémentaire.
- **Prix conseillé** à l'HV = valeur réelle **+10 %** (donc ≈ +21 % par rapport au
  marchand).
- On règle le prix librement (du prix marchand au **double** de la valeur). Le
  **délai de vente** suit une croissance exponentielle de la marge `m` (% au-dessus
  de la valeur réelle) :

  ```
  délai médian (min) = 12 × 3,2^((m − 10) / 10)        borné 45 s … 72 h
  tirage réel        = médian × 2^(u·w)   u ∈ [−1;1],  w = 0,3 + 0,015·m
  ```

  Ce qui donne en pratique : **+10 % ≈ 9-16 min** · **+30 % ≈ 1-3 h** ·
  **+50 % ≈ 10-43 h** · +100 % plafonné à 72 h. La fourchette de hasard
  **s'élargit** avec la marge (gros prix = acheteur imprévisible).
- L'objet **quitte le sac** à la mise en annonce. Quand le délai s'écoule (en
  jouant), l'annonce passe en état **VENDUE** (bord doré, bouton « 💰 Collect ») —
  **rien n'est payé automatiquement**. Un message prévient sans créditer d'or
  (« … sold at the Exchange — go collect your N 🪙 ! »). Il faut retourner à l'HV
  et **cliquer dessus** (ou touche **[C]**) pour toucher l'or ; un résumé de la
  **plus-value réalisée (%)** vs. la valeur réelle s'affiche à ce moment-là.
  La **qualité de forge** voyage avec l'annonce.
- Des **talents de marchand** pourront plus tard réduire ces délais (prévu).

⚠️ **Numéros de test** : le marchand de test a des prix très bas (2/4/6/15/40 or
selon la rareté). Avec la règle « valeur = marchand +10 % », l'arrondi absorbe
souvent le +10 % sur les objets communs/uncommon/rare (2,2 → 2 or, par ex.) — la
plus-value affichée peut donc paraître nulle sur ces objets tant que
`PRIX_VENTE` (data/items.js) restera à ces valeurs symboliques. À rééquilibrer
quand l'économie deviendra réelle.

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
