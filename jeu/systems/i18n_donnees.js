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
import { ITEMS, RARETES, SETS, bonusSet } from "../data/items.js";
import { CARTES } from "../data/cartes.js";
import { TALENTS, BRANCHES } from "../data/talents.js";
import { QUALITES } from "../data/recettes.js";
import { BATIMENTS } from "./batiments.js";
import { tr, surChangementLangue } from "./langue.js";

// Réécrit `nom` (et `description` si présente) d'un objet depuis la clé `prefixe.id`.
function traduireEntree(obj, prefixe, id) {
  if (obj._nomEn === undefined) obj._nomEn = obj.nom;
  if (obj.nom !== undefined) obj.nom = tr(`${prefixe}.${id}`, obj._nomEn);
  if ("description" in obj) {
    if (obj._descEn === undefined) obj._descEn = obj.description;
    obj.description = tr(`${prefixe}.${id}.desc`, obj._descEn);
  }
  // Texte d'effet d'une carte (`texte`) : même principe.
  if ("texte" in obj) {
    if (obj._texteEn === undefined) obj._texteEn = obj.texte;
    obj.texte = tr(`${prefixe}.${id}.texte`, obj._texteEn);
  }
  // Combo d'arme (`comboArme.texte`) et passif propre (`passifPropre.texte`) d'un objet.
  if (obj.comboArme && "texte" in obj.comboArme) {
    if (obj.comboArme._texteEn === undefined) obj.comboArme._texteEn = obj.comboArme.texte;
    obj.comboArme.texte = tr(`${prefixe}.${id}.combo`, obj.comboArme._texteEn);
  }
  if (obj.passifPropre && "texte" in obj.passifPropre) {
    if (obj.passifPropre._texteEn === undefined) obj.passifPropre._texteEn = obj.passifPropre.texte;
    obj.passifPropre.texte = tr(`${prefixe}.${id}.passif`, obj.passifPropre._texteEn);
  }
  // Lore (texte d'ambiance d'un parchemin fait main). Les parchemins GÉNÉRÉS ont
  // leur lore reconstruit plus bas depuis un modèle.
  if ("lore" in obj) {
    if (obj._loreEn === undefined) obj._loreEn = obj.lore;
    obj.lore = tr(`${prefixe}.${id}.lore`, obj._loreEn);
  }
}

export function appliquerLangueDonnees() {
  // SETS d'armure : leur NOM et le texte de CHACUN de leurs bonus (un set peut en
  // cumuler plusieurs, cf. bonusSet). Ils n'étaient pas traduits du tout : en
  // français, l'infobulle d'une pièce annonçait encore son bonus en anglais.
  for (const id in SETS) {
    traduireEntree(SETS[id], "set", id);
    bonusSet(SETS[id]).forEach((b, i) => {
      if (b._texteEn === undefined) b._texteEn = b.texte;
      b.texte = tr(`set.${id}.bonus${i + 1}`, b._texteEn);
    });
  }
  for (const e of ENNEMIS) traduireEntree(e, "mob", e.id);
  for (const id in ITEMS) traduireEntree(ITEMS[id], "item", id);
  for (const id in CARTES) traduireEntree(CARTES[id], "carte", id);
  for (const id in TALENTS) traduireEntree(TALENTS[id], "talent", id);
  for (const id in RARETES) traduireEntree(RARETES[id], "rarete", id);
  for (const id in BRANCHES) traduireEntree(BRANCHES[id], "branche", id);
  for (const id in QUALITES) traduireEntree(QUALITES[id], "qualite", id);
  for (const id in BATIMENTS) traduireEntree(BATIMENTS[id], "batiment", id);

  // RECETTES (parchemins) : leur nom est « préfixe + objet produit ». On le reconstruit
  // APRÈS avoir traduit les objets, à partir de l'objet enseigné (champ `revele`), au
  // lieu d'une entrée par recette. (Le repli laisse le nom anglais d'origine.)
  const prefixe = tr("item.recettePrefixe", "Recipe: ");
  const modeleLore = tr("item.loreParchemin", null);
  for (const id in ITEMS) {
    const it = ITEMS[id];
    if (it.categorie === "parchemin" && it.revele && ITEMS[it.revele]) {
      it.nom = prefixe + ITEMS[it.revele].nom;
      // Parchemin GÉNÉRÉ (id == "parchemin-" + résultat) : son lore suit un modèle.
      // On le reconstruit avec le nom traduit du résultat. (Repli : l'anglais d'origine.)
      if (id === "parchemin-" + it.revele && modeleLore) {
        it.lore = modeleLore.split("{nom}").join(ITEMS[it.revele].nom);
      }
    }
  }
}

// S'applique tout de suite et se réabonne aux changements de langue.
export function installerLangueDonnees() {
  appliquerLangueDonnees();
  surChangementLangue(appliquerLangueDonnees);
}
