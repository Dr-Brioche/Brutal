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

// Chemin de l'illustration d'une carte. Un champ `illustration` explicite a la
// priorité ; sinon on déduit le nom de fichier du titre de la carte (sans accents
// ni apostrophes, espaces → tirets). Ex. "Lucky Draw" → ".../lucky-draw.png".
function cheminIllustration(carte) {
  if (carte.illustration) return carte.illustration;
  const base = (carte.nom || carte.id || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // enlève les accents
    .replace(/['’]/g, "")                              // apostrophes
    .replace(/[^a-z0-9]+/g, "-")                        // tout le reste → tiret
    .replace(/^-+|-+$/g, "");
  return base ? `images/cartes/illustrations/${base}.png` : null;
}

export function garnirCarte(el, carte) {
  el.classList.add(`combat-carte--${carte.type}`, "combat-carte--cadre");

  // Couche 1 : la fenêtre (aplat sombre par défaut) + l'illustration si elle existe.
  const fenetre = document.createElement("div");
  fenetre.className = "carte-fenetre";
  const src = cheminIllustration(carte);
  if (src) {
    const illu = document.createElement("img");
    illu.src = src;
    illu.alt = "";
    illu.onerror = () => illu.remove(); // pas d'illustration → on garde l'aplat sombre
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
  parchemin.append(texte);
  el.append(parchemin);

  // Couche 5 : le coût, dans le médaillon en haut à gauche.
  const cout = document.createElement("span");
  cout.className = "combat-carte-cout";
  cout.textContent = carte.cout;
  el.append(cout);
}
