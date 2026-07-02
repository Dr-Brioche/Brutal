// Rendu visuel d'une carte, PARTAGÉ par le combat, le deck, l'infobulle et la
// Maîtrise. Système de CALQUES empilés sur un cadre PNG, de l'ARRIÈRE vers l'AVANT :
//
//   1. l'ILLUSTRATION (dans la fenêtre du cadre) — optionnelle ;
//   2. le CADRE (images/cartes/cadre-*.png), choisi selon le TYPE de la carte
//      (attaque = rouge, defense = bleu, buff = vert) ;
//   3. le NOM, dans le bandeau supérieur (au-dessus de l'illustration) ;
//   4. le TEXTE d'effet, sur le parchemin du bas ;
//   5. le COÛT (un chiffre), dans le médaillon en haut à gauche.
//
// L'illustration est cherchée automatiquement dans images/cartes/illustrations/
// d'après le NOM de la carte (normalisé : minuscules, tirets). Si le fichier
// n'existe pas, la fenêtre reste un aplat sombre (pas d'erreur visible).
//
// `el` est l'élément de carte déjà créé (un <button> en combat, un <div> ailleurs).

const CADRE_PAR_TYPE = {
  attaque: "images/cartes/cadre-attaque.png",
  defense: "images/cartes/cadre-defense.png",
  buff:    "images/cartes/cadre-buff.png",
};

// Chemins CANDIDATS de l'illustration d'une carte, essayés dans l'ordre. Un champ
// `illustration` explicite a la priorité ; sinon on déduit le nom de fichier du
// titre (sans accents ni apostrophes, espaces → tirets). Ex. "Lucky Draw" →
// ".../lucky-draw". On tente :
//   1. .webp — le format OPTIMISÉ (généré par outils/optimiser_illustrations.py) ;
//   2. .png  — un upload frais, pas encore passé à l'outil ;
//   3. .png avec 1re lettre majuscule — Windows capitalise parfois les noms.
function cheminsIllustration(carte) {
  if (carte.illustration) return [carte.illustration];
  const base = (carte.nom || carte.id || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // enlève les accents
    .replace(/['’]/g, "")                              // apostrophes
    .replace(/[^a-z0-9]+/g, "-")                        // tout le reste → tiret
    .replace(/^-+|-+$/g, "");
  if (!base) return [];
  const dossier = "images/cartes/illustrations/";
  const maj = base.charAt(0).toUpperCase() + base.slice(1);
  return [`${dossier}${base}.webp`, `${dossier}${base}.png`, `${dossier}${maj}.png`];
}

// Réduit la police du texte d'effet jusqu'à ce qu'il tienne dans le parchemin
// (largeur ET hauteur). Mesuré APRÈS le rendu (requestAnimationFrame) pour que la
// taille réelle de la carte — qui dépend de --carte-l en cqh — soit calculée. Le
// parchemin a `overflow:hidden`, donc scrollWidth/Height révèlent ce qui déborde.
function ajusterTextePourTenir(parchemin, texte) {
  if (typeof requestAnimationFrame !== "function") return;
  requestAnimationFrame(() => {
    // Carte pas (encore) affichée : pas de dimensions, on laisse la taille CSS.
    if (!parchemin.isConnected || parchemin.clientHeight === 0) return;
    let taille = parseFloat(getComputedStyle(texte).fontSize) || 0;
    let garde = 0;
    while (
      (parchemin.scrollWidth > parchemin.clientWidth + 1 ||
        parchemin.scrollHeight > parchemin.clientHeight + 1) &&
      taille > 5 && garde++ < 30
    ) {
      taille *= 0.94;
      texte.style.fontSize = `${taille}px`;
    }
  });
}

export function garnirCarte(el, carte) {
  el.classList.add(`combat-carte--${carte.type}`, "combat-carte--cadre");

  // Couche 1 : la fenêtre (aplat sombre par défaut) + l'illustration si elle existe.
  // On essaie les chemins candidats l'un après l'autre (webp → png → Png) ; si
  // aucun n'existe, l'image est retirée et la fenêtre reste un aplat sombre.
  const fenetre = document.createElement("div");
  fenetre.className = "carte-fenetre";
  const candidats = cheminsIllustration(carte);
  if (candidats.length) {
    const illu = document.createElement("img");
    illu.alt = "";
    let essai = 0;
    illu.onerror = () => {
      essai += 1;
      if (essai < candidats.length) illu.src = candidats[essai];
      else illu.remove();
    };
    illu.src = candidats[0];
    fenetre.append(illu);
  }
  el.append(fenetre);

  // Couche 2 : le cadre correspondant au type de la carte.
  const cadre = document.createElement("img");
  cadre.className = "carte-cadre";
  cadre.src = CADRE_PAR_TYPE[carte.type] ?? CADRE_PAR_TYPE.attaque;
  cadre.alt = "";
  el.append(cadre);

  // Couche 3 : le NOM, dans le bandeau supérieur (au-dessus de l'illustration).
  const nom = document.createElement("span");
  nom.className = "carte-nom";
  nom.textContent = carte.nom;
  el.append(nom);

  // Couche 4 : le TEXTE d'effet, sur le parchemin du bas.
  const parchemin = document.createElement("div");
  parchemin.className = "carte-parchemin";
  const texte = document.createElement("span");
  texte.className = "carte-texte";
  texte.textContent = carte.texte;
  // Taille de DÉPART par paliers de longueur (cf. CSS). C'est une approximation :
  // l'auto-ajustement ci-dessous garantit ensuite que le texte tient vraiment.
  const n = (carte.texte || "").length;
  if (n > 90) texte.classList.add("carte-texte--petit");
  else if (n > 55) texte.classList.add("carte-texte--moyen");
  parchemin.append(texte);
  el.append(parchemin);
  // Filet anti-débordement : une fois la carte dans le DOM (taille réelle connue),
  // si le texte dépasse encore le parchemin — cas limite mal capté par les paliers,
  // ou texte pile à la limite qui ne passe pas à la ligne à certaines tailles —, on
  // réduit la police par petits pas jusqu'à ce qu'il tienne. Vaut à toute échelle
  // (main, pioche en grand, deck…) puisque c'est mesuré, pas deviné.
  ajusterTextePourTenir(parchemin, texte);

  // Couche 5 : le coût, dans le médaillon en haut à gauche.
  const cout = document.createElement("span");
  cout.className = "combat-carte-cout";
  cout.textContent = carte.cout;
  el.append(cout);
}
