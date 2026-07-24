// ═══════════════════════════════════════════════════════════════════════════
// TRADUCTION DES DONNÉES (noms & descriptions des objets, cartes, talents,
// monstres, raretés…). — cf. systems/langue.js
//
// Astuce clé : plutôt que de toucher les CENTAINES d'endroits qui lisent `.nom`
// ou `.description`, on RÉÉCRIT ces champs sur place dans la langue courante, à
// partir du dictionnaire (data/textes.js). L'anglais d'origine est mémorisé une
// fois (`_nomEn`, `_descEn`) et sert de repli — donc un texte non encore traduit
// reste en anglais, sans rien casser.
//
// Appelé au démarrage ET à chaque changement de langue (les écrans canvas se
// redessinent tout seuls ; les écrans DOM se reconstruisent à leur prochaine
// ouverture).
// ═══════════════════════════════════════════════════════════════════════════

import { ENNEMIS } from "../data/ennemis.js";
import { ITEMS, RARETES } from "../data/items.js";
import { CARTES } from "../data/cartes.js";
import { TALENTS, BRANCHES } from "../data/talents.js";
import { tr, surChangementLangue } from "./langue.js";

// Réécrit `nom` (et `description` si présente) d'un objet depuis la clé `prefixe.id`.
function traduireEntree(obj, prefixe, id) {
  if (obj._nomEn === undefined) obj._nomEn = obj.nom;
  if (obj.nom !== undefined) obj.nom = tr(`${prefixe}.${id}`, obj._nomEn);
  if ("description" in obj) {
    if (obj._descEn === undefined) obj._descEn = obj.description;
    obj.description = tr(`${prefixe}.${id}.desc`, obj._descEn);
  }
}

export function appliquerLangueDonnees() {
  for (const e of ENNEMIS) traduireEntree(e, "mob", e.id);
  for (const id in ITEMS) traduireEntree(ITEMS[id], "item", id);
  for (const id in CARTES) traduireEntree(CARTES[id], "carte", id);
  for (const id in TALENTS) traduireEntree(TALENTS[id], "talent", id);
  for (const id in RARETES) traduireEntree(RARETES[id], "rarete", id);
  for (const id in BRANCHES) traduireEntree(BRANCHES[id], "branche", id);

  // RECETTES (parchemins) : leur nom est « préfixe + objet produit ». On le reconstruit
  // APRÈS avoir traduit les objets, à partir de l'objet enseigné (champ `revele`), au
  // lieu d'une entrée par recette. (Le repli laisse le nom anglais d'origine.)
  const prefixe = tr("item.recettePrefixe", "Recipe: ");
  for (const id in ITEMS) {
    const it = ITEMS[id];
    if (it.categorie === "parchemin" && it.revele && ITEMS[it.revele]) {
      it.nom = prefixe + ITEMS[it.revele].nom;
    }
  }
}

// S'applique tout de suite et se réabonne aux changements de langue.
export function installerLangueDonnees() {
  appliquerLangueDonnees();
  surChangementLangue(appliquerLangueDonnees);
}
