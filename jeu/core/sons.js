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

const CLE_VOL_B  = "brutal_vol_bruitages";
const CLE_VOL_M  = "brutal_vol_musique";
const CLE_VOL_MC = "brutal_vol_musique_combat";

function clamp(v) { return Math.max(0, Math.min(1, v)); }
function lireVol(cle, defaut) {
  const v = parseFloat(localStorage.getItem(cle));
  return isNaN(v) ? defaut : clamp(v);
}

let volBruitages     = lireVol(CLE_VOL_B,  0.7);
let volMusique       = lireVol(CLE_VOL_M,  0.10);
let volMusiqueCombat = lireVol(CLE_VOL_MC, 0.30);

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

let musiqueEnCours = null; // { audio, cle }

// Cœur commun : lance une musique en boucle. `cle` sert à éviter de relancer
// (et donc de couper) le même morceau s'il tourne déjà ; `src` est l'URL finale ;
// `vol` est le volume à appliquer ; `estCombat` distingue ambiance et combat pour
// que le réglage de volume en live touche le bon curseur.
function lancerMusique(cle, src, vol, estCombat = false) {
  if (musiqueEnCours?.cle === cle) return;
  arreterMusique();
  if (!src) return;
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = vol;
  const p = audio.play();
  if (p?.catch) p.catch(() => {});
  musiqueEnCours = { audio, cle, estCombat };
}

// Joue une musique par son NOM logique (table MUSIQUES ci-dessus) — ambiances.
export function jouerMusique(nom) {
  const fichier = MUSIQUES[nom];
  lancerMusique(nom, fichier ? DOSSIER + fichier : null, volMusique);
}

// Joue une musique par son CHEMIN complet (depuis la racine du projet). Utilisé
// pour les bibliothèques de musiques de combat (data/musiques.js), tirées au
// hasard par zone — volume séparé de l'ambiance (réglable indépendamment).
export function jouerMusiqueFichier(chemin) {
  lancerMusique(chemin, chemin || null, volMusiqueCombat, true);
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
  // Met à jour le volume en direct si c'est une musique d'ambiance qui tourne.
  // (Les musiques de combat ont leur propre réglage ci-dessous.)
  if (musiqueEnCours && !musiqueEnCours.estCombat) musiqueEnCours.audio.volume = volMusique;
}

export function getVolumeMusique() { return volMusique; }

export function reglerVolumeMusiqueCombat(v) {
  volMusiqueCombat = clamp(v);
  localStorage.setItem(CLE_VOL_MC, volMusiqueCombat);
  if (musiqueEnCours?.estCombat) musiqueEnCours.audio.volume = volMusiqueCombat;
}

export function getVolumeMusiqueCombat() { return volMusiqueCombat; }
