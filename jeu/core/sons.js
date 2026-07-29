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
  victoire: "interface/victoire.mp3", // jingle joué à la fin d'un combat GAGNÉ
};

// Musiques SIMPLES : un morceau joué en boucle, par nom logique. (Les zones à
// musique d'ambiance unique se déclarent ici ; la ville, elle, est une PLAYLIST.)
const MUSIQUES = {
};

// PLAYLISTS d'ambiance : une SUITE de morceaux. Chemins relatifs à sons/.
// Deux formes possibles :
//   { intro:[...], boucle:[...] } — `intro` joué UNE FOIS à l'arrivée, puis
//     `boucle` tourne sans fin (jamais de retour à l'intro). Pour les ambiances
//     qui veulent une ouverture posée : écran-titre, ville.
//   { pool:[...] } — à chaque morceau, on en TIRE UN AU HASARD dans la liste
//     (sans répéter deux fois de suite). Pas d'intro : les morceaux sont
//     interchangeables. Pour les ZONES D'EXPLORATION → variété, et un nouveau
//     morceau à chaque (re)lancement (entrée dans la zone, fin de combat…).
const PLAYLISTS = {
  // Écran de titre et menus de démarrage (avant l'entrée dans le jeu).
  "ambiance-titre": {
    intro:  ["ambiance/titre/1.mp3"],
    boucle: ["ambiance/titre/2.mp3", "ambiance/titre/3.mp3"],
  },
  "ambiance-city": {
    intro:  ["ambiance/city/1-2.mp3"],
    boucle: ["ambiance/city/3.mp3", "ambiance/city/4.mp3", "ambiance/city/5.mp3"],
  },
  // Eastern Under-tunnels : ambiance d'EXPLORATION (le combat a sa propre
  // musique, cf. data/musiques.js). Pool aléatoire : un morceau au hasard parmi
  // les 5, renouvelé à chaque fin de morceau et à chaque retour d'un combat.
  "ambiance-eastern-under-tunnels": {
    pool: [
      "ambiance/eastern-under-tunnels/1.mp3",
      "ambiance/eastern-under-tunnels/2.mp3",
      "ambiance/eastern-under-tunnels/3.mp3",
      "ambiance/eastern-under-tunnels/4.mp3",
      "ambiance/eastern-under-tunnels/5.mp3",
    ],
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

// Dernier exemplaire joué de chaque son, pour pouvoir l'INTERROMPRE. Sans ça,
// `jouerSon` clonait puis oubliait : le jingle de victoire continuait tout seul
// après la fermeture de la fenêtre de butin, par-dessus la musique d'après.
const enCours = new Map();

// ---- Bruitages à VARIANTES (les prises enregistrées par Brioche) -------------
//
// PRINCIPE : un son logique (« coup ») peut avoir PLUSIEURS prises enregistrées,
// nommées `sons/interface/coup-1.mp3`, `coup-2.mp3`… Le jeu en tire une AU HASARD
// et lui applique une petite variation de HAUTEUR — sans ça, le même claquement
// répété 200 fois dans une soirée devient insupportable.
//
// ⚠ LE POINT IMPORTANT : tant qu'un fichier n'existe pas, le jeu REJOUE le son
// de synthèse d'avant (plus bas dans ce fichier). On peut donc remplir le dossier
// UN SON À LA FOIS, sans jamais rien casser ni rien avoir à recâbler.
//
// AJOUTER UN SON : une ligne ici (le nom logique), et déposer les fichiers.
// Rien d'autre. La liste complète, avec le nom exact de chaque fichier et quand
// il se déclenche, est dans `sons/README.md`.
//
// ⚠ PIÈGE PAYÉ (29/07/2026) : cette table donnait AVANT un NOMBRE de prises, et le
// jeu ne cherchait que `nom-1` … `nom-N`. Brioche a déposé `bouclier-3.mp3` (sans
// `-2`) et `monstre-mort-3.mp3` : les deux ont été purement IGNORÉS, sans le
// moindre signe. Compter les prises à l'avance était une mauvaise idée — on ne
// peut pas demander à quelqu'un qui enregistre de se souvenir d'un chiffre écrit
// dans le code. Le jeu SONDE donc maintenant `-1` à `-MAX_PRISES` et se sert de
// tout ce qui répond : les trous de numérotation n'ont plus aucune importance.
const MAX_PRISES = 8;

const VARIANTES = [
  "coup",            // arme qui touche la chair
  "coup-armure",     // arme qui touche la Pierre (armure)
  "heros-touche",    // le HÉROS encaisse
  "monstre-mort",    // un ennemi s'effondre
  "carte-piochee",   // une carte quitte la pioche
  "carte-jouee",     // une carte part vers sa cible
  "sortilege",       // sort / buff lancé
  "bouclier",        // Pierre posée sur le héros
  "echec",           // action refusée / dé raté
  "minage",          // la pioche mord la roche
  "minerai-ramasse", // le minerai tombe dans le sac
  "forge-marteau",   // le marteau frappe l'enclume
  "levelup",         // passage de niveau
  "or",              // achat / vente
  "clic",            // bouton d'interface
  "objet",           // on attrape / on repose un objet (sac, butin de victoire)
];

// Variation de hauteur appliquée à chaque lecture (±6 %). `preservesPitch = false`
// est OBLIGATOIRE : sans lui les navigateurs changent la vitesse en gardant la
// hauteur, et on n'entend plus aucune différence.
const VARIATION_HAUTEUR = 0.06;

// Les <audio> modèles. Créés À LA DEMANDE, au premier usage de chaque son.
//
// ⚠ Pourquoi PAS tout au chargement : 15 sons × 8 prises = 120 requêtes, dont
// aujourd'hui 116 en 404, à CHAQUE ouverture du jeu — et ça grandit à chaque nom
// ajouté ici. En sondant à la demande, un son jamais joué ne coûte rien, et les
// requêtes se répartissent au lieu de tomber toutes au démarrage.
// Le sondage est lancé soit au premier usage d'un son, soit d'un coup par
// `prechargerBruitages()` QUAND UNE PARTIE DÉMARRE (pas à l'ouverture de la
// page) : l'écran-titre reste ainsi léger, et en combat tout est déjà chargé.
const prises = new Map();
const sondes = new Set();

function sonder(nom) {
  if (sondes.has(nom)) return;
  sondes.add(nom);
  for (let i = 1; i <= MAX_PRISES; i++) {
    const cle = `${nom}-${i}`;
    const audio = new Audio(`${DOSSIER}interface/${cle}.mp3`);
    audio.preload = "auto";
    prises.set(cle, audio);
  }
}

// ⚠ PIÈGE PAYÉ (29/07/2026) : on testait la présence du fichier avec un écouteur
// `error` qui marquait la prise morte. Mais l'erreur 404 arrive APRÈS le premier
// appel — donc au tout premier coup du jeu on répondait « joué » pour un fichier
// inexistant, la synthèse était sautée, et l'attaque était MUETTE. Le seul test
// fiable est l'état de CHARGEMENT : `readyState >= 2` (HAVE_CURRENT_DATA) veut
// dire que des données audio sont réellement là. Un fichier absent n'y arrive
// jamais → on tombe proprement sur le son de synthèse.
function prisePrete(cle) {
  const a = prises.get(cle);
  return a && a.readyState >= 2 ? a : null;
}

// Joue une prise au hasard du son `nom`. Renvoie `true` si un fichier a pu être
// joué, `false` s'il n'y en a aucun — c'est CE booléen qui décide du repli sur la
// synthèse chez l'appelant.
export function jouerVariante(nom, opts = {}) {
  if (!VARIANTES.includes(nom)) return false;
  sonder(nom);   // 1er appel : lance le chargement, et repart sur la synthèse
  const vivantes = [];
  for (let i = 1; i <= MAX_PRISES; i++) {
    const p = prisePrete(`${nom}-${i}`);
    if (p) vivantes.push(p);
  }
  if (!vivantes.length) return false;
  const base = vivantes[Math.floor(Math.random() * vivantes.length)];
  const audio = base.cloneNode();
  audio.volume = clamp(opts.volume ?? volBruitages);
  audio.preservesPitch = false;
  audio.mozPreservesPitch = false;   // Firefox ancien
  audio.webkitPreservesPitch = false; // Safari ancien
  audio.playbackRate = 1 + (Math.random() * 2 - 1) * VARIATION_HAUTEUR;
  enCours.set(nom, audio);
  audio.addEventListener("ended", () => { if (enCours.get(nom) === audio) enCours.delete(nom); });
  const p = audio.play();
  if (p?.catch) p.catch(() => {});
  return true;
}

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
  // Une prise ENREGISTRÉE l'emporte toujours sur le fichier unique historique.
  if (jouerVariante(nom, opts)) return enCours.get(nom) ?? null;
  const base = modele(nom);
  if (!base) return null;
  const audio = base.cloneNode();
  audio.volume = clamp(opts.volume ?? volBruitages);
  enCours.set(nom, audio);
  audio.addEventListener("ended", () => { if (enCours.get(nom) === audio) enCours.delete(nom); });
  const p = audio.play();
  if (p?.catch) p.catch(() => {});
  return audio;
}

// Coupe NET le son `nom` s'il joue encore (jingle de victoire à la fermeture du
// butin, par exemple). Sans effet s'il est déjà fini.
export function arreterSon(nom) {
  const a = enCours.get(nom);
  if (!a) return;
  try { a.pause(); a.currentTime = 0; } catch { /* déjà libéré */ }
  enCours.delete(nom);
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

    // Volume global calé sur les bruitages (× 0,6 pour que le son soit audible)
    const master = ctx.createGain();
    master.gain.value = volBruitages * 0.6;

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

// Tintement de fin d'animation XP : ton de clochette clair qui résonne ~1,8 s.
// Fondamental Do6 (1046 Hz) + shimmer inharmonique (2637 Hz) qui s'évanouit vite.
export function jouerSonDing() {
  try {
    const ctx = obtenirContexte();
    const t = ctx.currentTime;

    const f1 = ctx.createOscillator();
    f1.type = "sine";
    f1.frequency.value = 1046; // Do6 : ton net de clochette
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(0.7, t + 0.008);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    const f2 = ctx.createOscillator(); // shimmer métallique (~2,5× fondamental)
    f2.type = "sine";
    f2.frequency.value = 2637;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.25, t + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    const master = ctx.createGain();
    master.gain.value = volBruitages * 0.7;

    f1.connect(g1).connect(master).connect(ctx.destination);
    f2.connect(g2).connect(master);
    f1.start(t); f1.stop(t + 1.8);
    f2.start(t); f2.stop(t + 0.7);
  } catch (_) {}
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

// Démarre une playlist (cf. PLAYLISTS pour les deux formes intro/boucle ou pool).
function lancerPlaylist(cle, pl) {
  if (musiqueEnCours?.cle === cle) return; // déjà en cours : ne pas relancer
  arreterMusique();
  // Forme « pool » : tirage aléatoire sans intro (zones d'exploration).
  if (pl.pool) {
    const pool = pl.pool.map((f) => DOSSIER + f);
    precharger(pool); // tous les morceaux en cache → enchaînement net
    const seq = { pool, dernier: -1 };
    musiqueEnCours = { audio: null, cle, estCombat: false, seq };
    avancerPlaylist(seq);
    return;
  }
  // Forme « intro/boucle » : ouverture jouée une fois puis boucle séquentielle.
  const intro  = pl.intro.map((f) => DOSSIER + f);
  const boucle = pl.boucle.map((f) => DOSSIER + f);
  precharger([...intro, ...boucle]); // morceaux suivants en cache → enchaînement net
  const seq = { intro, boucle, i: 0 };
  musiqueEnCours = { audio: null, cle, estCombat: false, seq };
  avancerPlaylist(seq);
}

// Joue le morceau courant, puis enchaîne le suivant à sa fin.
//   pool : on TIRE AU HASARD (sans répéter deux fois de suite tant qu'il y a le choix).
//   intro/boucle : i < intro.length = intro (une seule fois) ; sinon boucle (3-4-5-3-4-5…).
function avancerPlaylist(seq) {
  if (musiqueEnCours?.seq !== seq) return; // playlist arrêtée/remplacée entre-temps
  let src;
  if (seq.pool) {
    let k = Math.floor(Math.random() * seq.pool.length);
    if (seq.pool.length > 1 && k === seq.dernier) k = (k + 1) % seq.pool.length;
    seq.dernier = k;
    src = seq.pool[k];
  } else {
    src = seq.i < seq.intro.length
      ? seq.intro[seq.i]
      : seq.boucle[(seq.i - seq.intro.length) % seq.boucle.length];
    seq.i++;
  }
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

// Relance la musique si le navigateur l'avait bloquée (politique autoplay :
// certains navigateurs refusent le son avant la 1re interaction utilisateur).
// À appeler dès qu'un clic se produit sur la page.
export function relancerMusiqueBloquee() {
  const a = musiqueEnCours?.audio;
  if (a && a.paused) {
    const p = a.play();
    if (p?.catch) p.catch(() => {});
  }
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
  if (jouerVariante("coup")) return;   // une vraie prise existe → elle gagne
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
  if (jouerVariante("coup-armure")) return;   // une vraie prise existe → elle gagne
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
  if (jouerVariante("sortilege")) return;   // une vraie prise existe → elle gagne
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

export function jouerSonPioche() {
  if (jouerVariante("carte-piochee")) return;   // une vraie prise existe → elle gagne
  try {
    const ctx = obtenirContexte();
    const t = ctx.currentTime;

    // Bruit blanc filtré passe-haut (frottement du papier)
    const bufSize = Math.floor(ctx.sampleRate * 0.11);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const bruit = ctx.createBufferSource();
    bruit.buffer = buf;
    const filtrePapier = ctx.createBiquadFilter();
    filtrePapier.type = "highpass";
    filtrePapier.frequency.value = 2800;
    const gBruit = ctx.createGain();
    gBruit.gain.setValueAtTime(0.55, t);
    gBruit.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    // Sweep descendant court (le "fwip" de la carte tirée)
    const sweep = ctx.createOscillator();
    sweep.type = "sine";
    sweep.frequency.setValueAtTime(950, t);
    sweep.frequency.exponentialRampToValueAtTime(280, t + 0.075);
    const gSweep = ctx.createGain();
    gSweep.gain.setValueAtTime(0.18, t);
    gSweep.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    const master = ctx.createGain();
    master.gain.value = volBruitages * 0.75;

    bruit.connect(filtrePapier).connect(gBruit).connect(master).connect(ctx.destination);
    sweep.connect(gSweep).connect(master);
    bruit.start(t); bruit.stop(t + 0.11);
    sweep.start(t); sweep.stop(t + 0.09);
  } catch (_) {}
}

// Son « échec » (carte Lucky Draw rejetée, dé trop bas) : descente rapide + choc sourd.
export function jouerSonNegatif() {
  if (jouerVariante("echec")) return;   // une vraie prise existe → elle gagne
  try {
    const ctx = obtenirContexte();
    const t = ctx.currentTime;

    // Balayage descendant (scie) : ton grave et dissonant
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.28);
    const gOsc = ctx.createGain();
    gOsc.gain.setValueAtTime(0.35, t);
    gOsc.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    // Choc grave court (impact sourd)
    const choc = ctx.createOscillator();
    choc.type = "sine";
    choc.frequency.setValueAtTime(110, t + 0.08);
    choc.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    const gChoc = ctx.createGain();
    gChoc.gain.setValueAtTime(0.28, t + 0.08);
    gChoc.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    const master = ctx.createGain();
    master.gain.value = volBruitages * 0.65;

    osc.connect(gOsc).connect(master).connect(ctx.destination);
    choc.connect(gChoc).connect(master);
    osc.start(t); osc.stop(t + 0.32);
    choc.start(t + 0.08); choc.stop(t + 0.28);
  } catch (_) {}
}

export function jouerSonPierre() {
  if (jouerVariante("bouclier")) return;   // une vraie prise existe → elle gagne
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

// ---- Sons SANS synthèse : ils ne parlent que si le fichier existe ------------
//
// Ceux-là n'ont jamais eu de son de remplacement en code. Tant que la prise n'est
// pas enregistrée, l'appel est silencieux — c'est voulu : mieux vaut le silence
// qu'un bip qui ne ressemble à rien. Le nom du fichier attendu est dans le
// tableau `VARIANTES` en haut de ce fichier, et détaillé dans `sons/README.md`.

// La pioche mord la roche (un par coup de minage). Repli : le choc de Pierre.
export function jouerSonMinage() {
  if (jouerVariante("minage")) return;
  jouerSonPierre();
}

// UNE VOLÉE DE TROIS COUPS (décision Brioche 29/07/2026). Un coup isolé sonnait
// maigre : miner, c'est frapper plusieurs fois. Les trois coups tirent chacun
// une prise au hasard avec sa propre variation de hauteur — sans ça on
// entendrait un écho, pas un mineur au travail.
export const COUPS_PAR_VOLEE = 3;
export const ECART_COUP_MS = 130;
let volee = [];
export function jouerVoleeMinage() {
  arreterVoleeMinage();                 // jamais deux volées superposées
  jouerSonMinage();
  for (let i = 1; i < COUPS_PAR_VOLEE; i++) {
    volee.push(setTimeout(jouerSonMinage, i * ECART_COUP_MS));
  }
}
// Le minage s'interrompt (on bouge, on change d'étage) : les coups en attente ne
// doivent pas continuer à résonner dans le vide.
export function arreterVoleeMinage() {
  for (const id of volee) clearTimeout(id);
  volee = [];
}

// Le minerai tombe dans le sac (fin d'un coup réussi).
export function jouerSonMinerai() { jouerVariante("minerai-ramasse"); }

// Une carte part de la main vers sa cible.
export function jouerSonCarteJouee() { jouerVariante("carte-jouee"); }

// Le HÉROS encaisse un coup. Repli : le son d'impact générique (ce que le jeu
// faisait jusqu'ici — héros et monstres partageaient le même bruit).
export function jouerSonHerosTouche() {
  if (jouerVariante("heros-touche")) return;
  jouerSonCoup();
}

// Un ennemi s'effondre (explosion de braises, cf. ui/combat.js).
export function jouerSonMonstreMort() { jouerVariante("monstre-mort"); }

// Une transaction : achat ou vente chez le marchand.
export function jouerSonOr() { jouerVariante("or"); }

// Le marteau frappe l'enclume (validation du mini-jeu de forge).
export function jouerSonForge() { jouerVariante("forge-marteau"); }

// On ATTRAPE ou on REPOSE un objet : dans le sac, et au ramassage du butin de
// victoire (même geste, même son — décision Brioche 29/07/2026).
export function jouerSonObjet() { jouerVariante("objet"); }

// Bouton d'interface. Branché GLOBALEMENT (cf. installerClicUI ci-dessous) : pas
// besoin de toucher à chaque écran.
export function jouerSonClic() { jouerVariante("clic", { volume: volBruitages * 0.5 }); }

// Va chercher toutes les prises d'un coup. À appeler AU DÉMARRAGE D'UNE PARTIE
// (pas au chargement de la page) : ainsi l'écran-titre ne paie rien, et le
// premier coup d'épée du combat joue déjà le vrai son.
export function prechargerBruitages() { for (const nom of VARIANTES) sonder(nom); }

// Écoute UNE fois tous les clics de la page et fait tinter les vrais boutons.
// On délègue sur `document` plutôt que d'ajouter un écouteur par bouton : les
// panneaux du jeu se construisent et se détruisent en permanence, un par bouton
// serait à recâbler sans arrêt (et à oublier une fois sur deux).
const SELECTEUR_BOUTON = "button, .bouton, [role=button]";

export function installerClicUI() {
  document.addEventListener("pointerdown", (ev) => {
    const el = ev.target?.closest?.(SELECTEUR_BOUTON);
    if (el && !el.disabled) jouerSonClic();
  }, true);

  // AU CLAVIER AUSSI (29/07/2026). Le jeu se joue entièrement au clavier : ne
  // sonner qu'à la souris laissait la moitié des joueurs sans retour sonore.
  // Ici on couvre les boutons qui ont vraiment le FOCUS (confirmation, butin,
  // banque, coffre, écran-titre…). Les menus qui gèrent eux-mêmes leur
  // sélection — dialogue, marchand, arbre de talents — n'ont pas de focus à
  // observer : ils appellent `jouerSonClic()` directement au moment de valider.
  document.addEventListener("keydown", (ev) => {
    if (ev.code !== "Enter" && ev.code !== "NumpadEnter" && ev.code !== "Space") return;
    const el = document.activeElement;
    if (el && el.matches?.(SELECTEUR_BOUTON) && !el.disabled) jouerSonClic();
  }, true);
}
