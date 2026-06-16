// Le lecteur de sons du jeu. Sons rangés dans sons/ambiance/ et sons/interface/.
// On joue un son par son NOM logique (pas son chemin) — changer le fichier ne
// touche qu'une ligne ici. Tant qu'un fichier manque, l'appel échoue en silence.
//
// Deux familles :
//   BRUITAGES  — sons courts (se clonent pour autoriser les chevauchements)
//   MUSIQUES   — ambiances en boucle (une seule active à la fois)
//
// Les volumes sont persistés dans localStorage entre les sessions.

const DOSSIER = "sons/";

const BRUITAGES = {
  levelup: "interface/levelup.mp3",
};

const MUSIQUES = {
  "ambiance-city": "ambiance/city.mp3",
};

const CLE_VOL_B = "brutal_vol_bruitages";
const CLE_VOL_M = "brutal_vol_musique";

function clamp(v) { return Math.max(0, Math.min(1, v)); }
function lireVol(cle, defaut) {
  const v = parseFloat(localStorage.getItem(cle));
  return isNaN(v) ? defaut : clamp(v);
}

let volBruitages = lireVol(CLE_VOL_B, 0.7);
let volMusique   = lireVol(CLE_VOL_M, 0.22);

// ---- Bruitages --------------------------------------------------------------

const cache = new Map();

function modele(nom) {
  const fichier = BRUITAGES[nom];
  if (!fichier) return null;
  let audio = cache.get(nom);
  if (!audio) {
    audio = new Audio(DOSSIER + fichier);
    audio.preload = "auto";
    cache.set(nom, audio);
  }
  return audio;
}

export function jouerSon(nom, opts = {}) {
  const base = modele(nom);
  if (!base) return;
  const audio = base.cloneNode();
  audio.volume = clamp(opts.volume ?? volBruitages);
  const p = audio.play();
  if (p?.catch) p.catch(() => {});
}

export function reglerVolumeBruitages(v) {
  volBruitages = clamp(v);
  localStorage.setItem(CLE_VOL_B, volBruitages);
}

export function getVolumeBruitages() { return volBruitages; }

// Ancien nom (import dans gainXp.js).
export { reglerVolumeBruitages as reglerVolume };

// ---- Musique d'ambiance -----------------------------------------------------

let musiqueEnCours = null; // { audio, nom }

export function jouerMusique(nom) {
  if (musiqueEnCours?.nom === nom) return;
  arreterMusique();
  const fichier = MUSIQUES[nom];
  if (!fichier) return;
  const audio = new Audio(DOSSIER + fichier);
  audio.loop = true;
  audio.volume = volMusique;
  const p = audio.play();
  if (p?.catch) p.catch(() => {});
  musiqueEnCours = { audio, nom };
}

export function arreterMusique() {
  if (!musiqueEnCours) return;
  musiqueEnCours.audio.pause();
  musiqueEnCours.audio.currentTime = 0;
  musiqueEnCours = null;
}

export function reglerVolumeMusique(v) {
  volMusique = clamp(v);
  localStorage.setItem(CLE_VOL_M, volMusique);
  if (musiqueEnCours) musiqueEnCours.audio.volume = volMusique;
}

export function getVolumeMusique() { return volMusique; }
