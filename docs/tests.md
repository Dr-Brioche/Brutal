# Comment TESTER Brütàl (mémo pour Claude)

> **À lire avant tout test visuel.** Ce fichier existe parce qu'une session s'est
> perdue ~20 tours à faire marcher le héros dans la ville à l'aveugle pour
> atteindre un PNJ. **Ne refais pas ça** : il y a des pages de test dédiées.

---

## 1. Règle d'or : ne PAS traverser le jeu pour voir un visuel

Pour vérifier un rendu (armure, arme, monstre, effet), on ne joue **pas** la
partie. On ouvre une page de test qui appelle directement le module concerné.

| Ce que tu veux voir | Utilise |
|---|---|
| Le héros en combat (armure de set, skin d'arme) | `outils/test-armures.html` |
| Plusieurs monstres à l'écran (barres qui se chevauchent) | `outils/test-armures.html`, menu « Monstres » |
| Les règles du Fou du roi (marché, butin, fuite) | `outils/test-fou.html` |
| La mise en scène du Fou (combat gelé → marché → reprise) | `outils/test-fou-marche.html` |
| Que le jeu démarre sans erreur | la sonde de démarrage (§3) |

`outils/test-armures.html` : deux menus déroulants (armure / arme) + un bouton,
et le combat démarre. Elle appelle le **vrai** `demarrerCombat()` — donc ce
qu'elle montre est ce que le jeu montre. Elle expose `window.__lancerTest()`
pour être pilotée depuis un script Playwright.

`outils/test-fou-marche.html` : rejoue la rencontre du Fou (combat gelé une
seconde, puis son marché par-dessus). Deux menus : l'or du héros (pour tester le
cas « pas assez ») et l'étape du marché (1re offre / 2e / 3e / rancune). Elle
expose `window.__rejouer()` et `window.__phase()` — cette dernière rend lisible
depuis un script ce qui, en jeu, ne se voit qu'à l'absence de réaction.

**Ajouter une page de test** pour un autre écran suit le même patron (voir §5) :
c'est presque toujours plus rapide que de naviguer.

---

## 2. Serveur + navigateur

Le jeu est en modules ES : il faut un serveur (pas d'ouverture `file://`).

```bash
cd /home/user/Brutal && python3 -m http.server 8900 &
# … puis un script Playwright sur http://localhost:8900/…
pkill -f "http.server 8900"
```

Chromium est déjà installé : `executablePath: "/opt/pw-browsers/chromium"`.
**Ne jamais lancer `playwright install`.**

> Le `pkill` fait sortir le shell en code **144** : c'est normal, ce n'est pas un échec.

---

## 3. Démarrer la partie — par SÉLECTEUR, jamais par coordonnées

**⚠ Le piège le plus coûteux.** Cliquer « Play » à des coordonnées en dur
(`page.mouse.click(640, 603)`) ne marche que pour une taille de fenêtre précise :
change la hauteur du `viewport` et le clic tombe à côté. Le jeu **ne démarre
pas**, mais rien ne le signale — les touches suivantes ne font rien et on croit à
un bug de navigation. Toujours viser les boutons :

```js
await page.locator("#bouton-jouer").click({ timeout: 15000 });   // écran-titre
await page.waitForTimeout(700);
await page.locator("#demarrage-nouvelle").click({ timeout: 15000 }); // Nouvelle partie
await page.waitForTimeout(2500);
```
(Ne pas grouper les deux en `"#a, #b"` + `.first()` : `.first()` prend le premier
dans l'ORDRE DU DOM, donc le bouton déjà cliqué — le second clic est perdu.)

Sonde de non-régression, à faire à chaque tâche :
```js
const js = []; page.on("pageerror", e => js.push(e.message));
// … démarrage comme ci-dessus …
console.log("PROBE_ERRORS=", JSON.stringify(js));
```
`PROBE_ERRORS= []` → propre.

**Pour vérifier que la partie a bien démarré** : `#ecran-titre` doit être masqué.
Au moindre doute, faire une capture — l'écran-titre saute aux yeux.

---

## 4. Pièges vérifiés (ils coûtent chacun plusieurs tours)

**Le canvas est `hidden` dans index.html.** C'est le démarrage du jeu qui le
révèle. Une page de test qui court-circuite le démarrage doit faire elle-même
`document.getElementById("jeu").hidden = false` (idem `cadre-jeu`) — sinon
l'écran reste noir alors que le dessin a bien lieu.

**Une page dans `outils/` doit poser `<base href="../">.** Le jeu construit ses
chemins d'images en relatif depuis la racine (`images/…`) ; sans ça tout part
chercher `outils/images/…`. Et avec cette base, les imports de modules doivent
s'écrire `"./jeu/…"` — un spécificateur nu (`"jeu/…"`) est refusé par le
navigateur.

**Le canvas ne contient QUE les sprites.** Le fond de combat est un `<div>`
derrière. Donc lire l'alpha du canvas isole parfaitement héros et monstres :
c'est LE moyen fiable de mesurer une position (bien plus sûr que l'œil).
Attention à **restreindre la fenêtre de mesure** : l'interface dessinée sur le
canvas (barres de vie, dérouleur) noie la silhouette sinon.

**Le fond de combat est tiré au hasard.** Deux captures ne sont comparables que
si on passe un `fond` FIXE.

**Le héros bouge pendant les animations** (bond d'attaque, recul, respiration).
Deux captures prises à des instants différents ne sont **pas** comparables :
comparer des mesures, pas des impressions d'écran.

**Une capture d'écran dépend de la mise en page de la page de test.** Si une
barre d'outils change de hauteur (texte d'état plus long), tout se décale et on
croit à un bug du jeu. Capturer **le canvas seul** : `page.locator("#jeu").screenshot()`.

**Une boucle `requestAnimationFrame` par combat lancé.** Relancer sans arrêter
la précédente fait peindre plusieurs combats sur le même canvas. Toujours
invalider l'ancienne boucle (cf. `boucleId` dans `test-armures.html`).

---

## 5. Si tu dois VRAIMENT jouer (dernier recours)

Raccourcis utiles :
- **GOD MODE** : talent 😇 dans l'arbre (touche `T`) → kit Croisé complet
  (set + épée sacrée), 1 000 000 🪙, niveau 30. Sert à tester l'équipement rare.
- **Marchand** : tous les objets sont **gratuits** en test. Il est en
  colonne 38 / rangée 11, soit juste au-dessus du point de départ (37/14) :
  quelques pressions sur ↑ suffisent. **Clic droit** sur un objet = acheter ET
  équiper d'un coup.
- **Maître d'arène** (simulateur de combat) : colonne 21 / rangée 3, en haut à
  gauche. Recette VÉRIFIÉE (l'invite apparaît vers le 14e pas) :
  ```js
  await pas("ArrowUp", 8000);     // coller au mur du haut
  await pas("ArrowLeft", 12000);  // coller au mur de gauche
  await pas("ArrowDown", 220);    // UN cran plus bas (cf. la portée dy ci-dessous)
  for (let i = 0; i < 40 && !trouve; i++) { await pas("ArrowRight", 120); trouve = await invite(); }
  ```
  Le simulateur permet aussi de tester **le Fou du roi** : le choisir dans la
  liste rejoue sa vraie rencontre (marché → dialogue → combat d'un tour).
  ⚠ Le **commissaire-priseur** est dans la MÊME colonne (21/11), plus bas : si
  l'invite s'affiche, vérifier le nom du dialogue avant de conclure.
- **Les dialogues s'affichent PAGE PAR PAGE** : les choix n'apparaissent qu'après
  la dernière ligne de texte. Lire `#dialogue-choix` trop tôt renvoie une liste
  vide — ce n'est pas un bug. Appuyer sur Espace jusqu'à ce que les choix soient là.

**Portée de dialogue** (`jeu/entities/pnj.js`) : `|dx| < 50` **et `|dy| < 40`**.
C'est le `dy` qui piège : collé au mur du haut, le héros est ~45 px trop haut
pour parler au Maître d'arène — d'où le « ↓ un cran ».

Détection de la proximité côté script :
```js
const el = document.getElementById("invite");
const proche = el && !el.hidden ? el.textContent.trim() : null;
```

---

## 6. Préparer une nouvelle planche d'armure

```bash
python3 outils/caler_planche_heros.py source-fond-vert.png 1 -o images/heros/mon-set-1.webp
python3 outils/caler_planche_heros.py --verifier   # non-régression du calage
```
Puis déclarer la paire dans `PLANCHES_SET` (`jeu/ui/combat.js`).
Détails et raisons du calage : `docs/concept.md`, section « Planches d'ARMURE ».
