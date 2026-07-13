// Préférences joueur : cases à cocher et options d'interface.
// Persistées dans localStorage ; rechargées au lancement, sans serveur.

const CLE = "brutal_prefs";

const DEFAUTS = {
  confirmVente: true,    // Confirm before selling rare+ items (cochée par défaut)
  gameplayRapide: false, // Combat au rythme RAPIDE (décochée = rythme posé, lisible)
};

let prefs = { ...DEFAUTS };
try {
  const s = localStorage.getItem(CLE);
  if (s) Object.assign(prefs, JSON.parse(s));
} catch (_) {}

function sauvegarder() {
  try { localStorage.setItem(CLE, JSON.stringify(prefs)); } catch (_) {}
}

export function getPreference(cle) { return prefs[cle] ?? DEFAUTS[cle] ?? null; }
export function setPreference(cle, val) { prefs[cle] = val; sauvegarder(); }
