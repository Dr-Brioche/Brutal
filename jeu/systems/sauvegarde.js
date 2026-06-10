// La sauvegarde locale : le navigateur retient la partie entre deux visites.
//
// localStorage = un petit carnet (~5 Mo) que le navigateur garde pour chaque
// site, chez le joueur. Aucun serveur : conforme à notre règle "100 % local".
// Le carnet peut être indisponible (navigation privée) ou abîmé : dans ces
// cas on repart simplement d'une partie neuve, sans jamais planter.

const CLE = "brutal.sauvegarde";
const VERSION = 1; // permettra de faire évoluer le format sans tout casser

export function chargerSauvegarde() {
  try {
    const texte = localStorage.getItem(CLE);
    if (!texte) return null;
    const donnees = JSON.parse(texte);
    return donnees && donnees.version === VERSION ? donnees : null;
  } catch {
    return null; // carnet indisponible ou contenu illisible
  }
}

export function enregistrerSauvegarde(donnees) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ version: VERSION, ...donnees }));
  } catch {
    // stockage indisponible : on jouera sans mémoire, ce n'est pas grave
  }
}

// Servira au futur menu (bouton "New Game")
export function effacerSauvegarde() {
  try {
    localStorage.removeItem(CLE);
  } catch {}
}
