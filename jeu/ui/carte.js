// Rendu visuel d'une carte, PARTAGÉ par l'écran de combat et l'écran de deck.
//
// Deux cas :
//   - la carte a une `image` (PNG) → toute l'info est dans l'illustration ;
//     on ne pose PAR-DESSUS que le COÛT (un chiffre, pour qu'il puisse changer
//     plus tard si un effet réduit le coût).
//   - sinon → la fiche « rectangle » habituelle : coût + nom + texte.
//
// `el` est l'élément de carte déjà créé (un <button> en combat, un <div> dans
// le deck) ; on lui ajoute sa classe de type et son contenu.
export function garnirCarte(el, carte) {
  el.classList.add(`combat-carte--${carte.type}`);

  const cout = document.createElement("span");
  cout.className = "combat-carte-cout";
  cout.textContent = carte.cout;

  if (carte.image) {
    el.classList.add("combat-carte--image");
    const img = document.createElement("img");
    img.src = carte.image;
    img.alt = carte.nom;
    el.append(img, cout); // le coût par-dessus l'illustration
  } else {
    const nom = document.createElement("span");
    nom.className = "combat-carte-nom";
    nom.textContent = carte.nom;

    const texte = document.createElement("span");
    texte.className = "combat-carte-texte";
    texte.textContent = carte.texte;

    el.append(cout, nom, texte);
  }
}
