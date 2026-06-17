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

// Musiques SIMPLES : un morceau joué en boucle, par nom logique. (Les zones à
// musique d'ambiance unique se déclarent ici ; la ville, elle, est une PLAYLIST.)
const MUSIQUES = {
};

// PLAYLISTS d'ambiance : une SUITE de morceaux qui s'enchaînent. `intro` est
// joué UNE SEULE FOIS à l'arrivée, puis `boucle` tourne sans fin (jamais de
// retour à l'intro). Chemins relatifs à sons/.
//   Ville : 1-2 = intro d'arrivée, puis 3-4-5 en boucle (3 suit 5, pas 1).
const PLAYLISTS = {
  "ambiance-city": {
    intro:  ["ambiance/city/1.mp3", "ambiance/city/2.mp3"],
    boucle: ["ambiance/city/3.mp3", "ambiance/city/4.mp3", "ambiance/city/5.mp3"],
  },
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

// ---- Son de remplissage synthétisé (Web Audio API) --------------------------
// Bruit blanc filtré + trémolo LFO → effet « drdrdrdrdr ».
// Renvoie une fonction stop() à appeler à la fin de l'animation.

let audioCtx = null;
function obtenirContexte() {
  if (!audioCtx) audioCtx = new AudioContext();
  // Navigateurs suspendent le contexte si la page perd le focus : on le réveille.
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

export function creerSonRemplissage() {
  try {
    const ctx = obtenirContexte();

    // Source : bruit blanc bouclé (1 s, reutilisé indéfiniment)
    const bufSize = ctx.sampleRate;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    // Filtre passe-bande : coloration « rouleau mécanique »
    const filtre = ctx.createBiquadFilter();
    filtre.type = "bandpass";
    filtre.frequency.value = 280;
    filtre.Q.value = 3;

    // Trémolo : LFO (25 Hz) module l'amplitude → pulsation « dr-dr-dr »
    // gain oscille entre 0,15 (offset 0,5 - depth 0,35) et 0,85 (+ depth)
    // → jamais totalement silencieux, mais nettement pulsé
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 25;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.35;   // profondeur de trémolo
    lfo.connect(lfoGain);

    const gate = ctx.createGain();
    gate.gain.value = 0.5;       // offset DC : gain oscille entre 0,15 et 0,85
    lfoGain.connect(gate.gain);

    // Volume global calé sur les bruitages (discret : × 0,3 car son long)
    const master = ctx.createGain();
    master.gain.value = volBruitages * 0.3;

    src.connect(filtre).connect(gate).connect(master).connect(ctx.destination);
    src.start();
    lfo.start();

    let stoppe = false;
    return function stop() {
      if (stoppe) return;
      stoppe = true;
      try { src.stop(); lfo.stop(); } catch (_) {}
    };
  } catch (_) {
    // Web Audio non disponible ou bloqué : pas de son, l'animation reste intacte.
    return function stop() {};
  }
}

// ---- Musique ----------------------------------------------------------------
//
// Une seule musique active à la fois (`musiqueEnCours`), identifiée par une `cle`
// (rejouer la même clé ne la relance pas → pas de coupure). Deux formes :
//   SIMPLE   — un morceau en boucle (ambiance d'une zone, musique de combat)
//   PLAYLIST — une suite : intro joué une fois, puis boucle sans fin (la ville)
// `estCombat` distingue le volume combat du volume ambiance pour les réglages.

let musiqueEnCours = null; // { audio, cle, estCombat, seq? }

// Crée + démarre un élément audio. `boucle` = répéter CE morceau indéfiniment.
function nouvelAudio(src, estCombat, boucle) {
  const audio = new Audio(src);
  audio.loop = boucle;
  audio.volume = estCombat ? volMusiqueCombat : volMusique;
  const p = audio.play();
  if (p?.catch) p.catch(() => {});
  return audio;
}

// Musique SIMPLE en boucle. `cle` sert à la déduplication ; `src` l'URL finale.
function lancerMusique(cle, src, estCombat = false) {
  if (musiqueEnCours?.cle === cle) return;
  arreterMusique();
  if (!src) return;
  musiqueEnCours = { audio: nouvelAudio(src, estCombat, true), cle, estCombat };
}

// Joue une musique par son NOM logique. Si le nom désigne une PLAYLIST, on
// enchaîne les morceaux ; sinon c'est un morceau simple en boucle (table MUSIQUES).
export function jouerMusique(nom) {
  const pl = PLAYLISTS[nom];
  if (pl) { lancerPlaylist(nom, pl); return; }
  const fichier = MUSIQUES[nom];
  lancerMusique(nom, fichier ? DOSSIER + fichier : null);
}

// Joue une musique par son CHEMIN complet (depuis la racine du projet). Utilisé
// pour les bibliothèques de musiques de combat (data/musiques.js), tirées au
// hasard par zone — volume séparé de l'ambiance (réglable indépendamment).
export function jouerMusiqueFichier(chemin) {
  lancerMusique(chemin, chemin || null, true);
}

// ---- Playlist : enchaînement intro (une fois) → boucle (sans fin) -----------

// Démarre une playlist (objet { intro:[...], boucle:[...] }, chemins relatifs).
function lancerPlaylist(cle, pl) {
  if (musiqueEnCours?.cle === cle) return; // déjà en cours : ne pas relancer l'intro
  arreterMusique();
  const intro  = pl.intro.map((f) => DOSSIER + f);
  const boucle = pl.boucle.map((f) => DOSSIER + f);
  precharger([...intro, ...boucle]); // morceaux suivants en cache → enchaînement net
  const seq = { intro, boucle, i: 0 };
  musiqueEnCours = { audio: null, cle, estCombat: false, seq };
  avancerPlaylist(seq);
}

// Joue le morceau d'indice `seq.i`, puis enchaîne le suivant à sa fin.
//   i <  intro.length → on est dans l'intro (joué une seule fois)
//   i >= intro.length → on boucle sur `boucle` (ex. 3-4-5-3-4-5…), jamais l'intro
function avancerPlaylist(seq) {
  if (musiqueEnCours?.seq !== seq) return; // playlist arrêtée/remplacée entre-temps
  const src = seq.i < seq.intro.length
    ? seq.intro[seq.i]
    : seq.boucle[(seq.i - seq.intro.length) % seq.boucle.length];
  seq.i++;
  const audio = nouvelAudio(src, false, false); // pas de loop : on enchaîne nous-mêmes
  audio.addEventListener("ended", () => avancerPlaylist(seq));
  musiqueEnCours.audio = audio;
}

// Précharge (cache navigateur) une liste d'URLs pour des enchaînements sans
// silence. Chaque URL n'est demandée qu'une seule fois sur toute la partie.
const precharges = new Map();
function precharger(urls) {
  for (const url of urls) {
    if (precharges.has(url)) continue;
    const a = new Audio();
    a.preload = "auto";
    a.src = url;
    precharges.set(url, a);
  }
}

export function arreterMusique() {
  if (!musiqueEnCours) return;
  const a = musiqueEnCours.audio;
  if (a) { a.pause(); a.currentTime = 0; }
  musiqueEnCours = null; // coupe aussi une playlist (avancerPlaylist vérifie `seq`)
}

export function reglerVolumeMusique(v) {
  volMusique = clamp(v);
  localStorage.setItem(CLE_VOL_M, volMusique);
  // Volume en direct si une musique d'ambiance (simple ou playlist) tourne.
  if (musiqueEnCours && !musiqueEnCours.estCombat && musiqueEnCours.audio)
    musiqueEnCours.audio.volume = volMusique;
}

export function getVolumeMusique() { return volMusique; }

export function reglerVolumeMusiqueCombat(v) {
  volMusiqueCombat = clamp(v);
  localStorage.setItem(CLE_VOL_MC, volMusiqueCombat);
  if (musiqueEnCours?.estCombat && musiqueEnCours.audio)
    musiqueEnCours.audio.volume = volMusiqueCombat;
}

export function getVolumeMusiqueCombat() { return volMusiqueCombat; }

// ---- Sons de combat synthétisés (Web Audio API) -----------------------------
//
// Quatre familles, à remplacer plus tard par de vrais fichiers :
//   jouerSonCoup()        — impact sur chair/monstre (choc sourd)
//   jouerSonCoupArmure()  — impact sur armure Pierre (clac métallique + résonance)
//   jouerSonSortilege()   — sort ou buff lancé (héros ou ennemi)
//   jouerSonPierre()      — armure Pierre posée sur le héros (choc + tintement)
//
// Remplacer par de vrais fichiers : ajouter les chemins dans BRUITAGES (en haut
// du fichier) et faire appeler jouerSon("nom") à la place de la synthèse.

export function jouerSonCoup() {
  try {
    const ctx = obtenirContexte();
    const t = ctx.currentTime;

    // Oscillateur grave descendant (le « thud »)
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    // Bruit blanc court filtré passe-bas (l'« impact »)
    const bufSize = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const bruit = ctx.createBufferSource();
    bruit.buffer = buf;
    const filtre = ctx.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.frequency.value = 350;

    const gOsc   = ctx.createGain();
    gOsc.gain.setValueAtTime(0.55, t);
    gOsc.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    const gBruit = ctx.createGain();
    gBruit.gain.setValueAtTime(0.35, t);
    gBruit.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    const master = ctx.createGain();
    master.gain.value = volBruitages * 0.8;

    osc.connect(gOsc).connect(master).connect(ctx.destination);
    bruit.connect(filtre).connect(gBruit).connect(master);
    osc.start(t); osc.stop(t + 0.1);
    bruit.start(t); bruit.stop(t + 0.06);
  } catch (_) {}
}

export function jouerSonCoupArmure() {
  try {
    const ctx = obtenirContexte();
    const t = ctx.currentTime;

    // Impact grave (poids du coup)
    const choc = ctx.createOscillator();
    choc.type = "sine";
    choc.frequency.setValueAtTime(200, t);
    choc.frequency.exponentialRampToValueAtTime(75, t + 0.06);
    const gChoc = ctx.createGain();
    gChoc.gain.setValueAtTime(0.5, t);
    gChoc.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    // Anneau métallique : deux triangles légèrement désaccordés → shimmer
    for (const [freq, det] of [[520, 0], [783, 9]]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      o.detune.value = det;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = freq;
      f.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.28, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      const m = ctx.createGain();
      m.gain.value = volBruitages * 0.7;
      o.connect(f).connect(g).connect(m).connect(ctx.destination);
      o.start(t); o.stop(t + 0.5);
    }

    const master = ctx.createGain();
    master.gain.value = volBruitages * 0.8;
    choc.connect(gChoc).connect(master).connect(ctx.destination);
    choc.start(t); choc.stop(t + 0.08);
  } catch (_) {}
}

export function jouerSonSortilege() {
  try {
    const ctx = obtenirContexte();
    const t = ctx.currentTime;

    // Balayage fréquentiel ascendant (sweep)
    const sweep = ctx.createOscillator();
    sweep.type = "sine";
    sweep.frequency.setValueAtTime(280, t);
    sweep.frequency.exponentialRampToValueAtTime(880, t + 0.28);
    const gSweep = ctx.createGain();
    gSweep.gain.setValueAtTime(0, t);
    gSweep.gain.linearRampToValueAtTime(0.4, t + 0.04);
    gSweep.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    // Scintille haute (sparkle)
    const spark = ctx.createOscillator();
    spark.type = "sine";
    spark.frequency.setValueAtTime(1400, t + 0.08);
    spark.frequency.exponentialRampToValueAtTime(2800, t + 0.32);
    const gSpark = ctx.createGain();
    gSpark.gain.setValueAtTime(0, t + 0.08);
    gSpark.gain.linearRampToValueAtTime(0.18, t + 0.12);
    gSpark.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    const master = ctx.createGain();
    master.gain.value = volBruitages * 0.75;

    sweep.connect(gSweep).connect(master).connect(ctx.destination);
    spark.connect(gSpark).connect(master);
    sweep.start(t); sweep.stop(t + 0.35);
    spark.start(t + 0.08); spark.stop(t + 0.4);
  } catch (_) {}
}

export function jouerSonPierre() {
  try {
    const ctx = obtenirContexte();
    const t = ctx.currentTime;

    // Choc grave (pose du bouclier de pierre)
    const choc = ctx.createOscillator();
    choc.type = "sine";
    choc.frequency.setValueAtTime(190, t);
    choc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    const gChoc = ctx.createGain();
    gChoc.gain.setValueAtTime(0.65, t);
    gChoc.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    // Tintement aigu (métal qui résonne)
    const ting = ctx.createOscillator();
    ting.type = "triangle";
    ting.frequency.value = 1050;
    const gTing = ctx.createGain();
    gTing.gain.setValueAtTime(0, t + 0.05);
    gTing.gain.linearRampToValueAtTime(0.28, t + 0.07);
    gTing.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    const master = ctx.createGain();
    master.gain.value = volBruitages * 0.85;

    choc.connect(gChoc).connect(master).connect(ctx.destination);
    ting.connect(gTing).connect(master);
    choc.start(t); choc.stop(t + 0.1);
    ting.start(t + 0.05); ting.stop(t + 0.38);
  } catch (_) {}
}
