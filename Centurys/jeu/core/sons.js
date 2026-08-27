// ============================================================
//  SONS — fabriqués à la volée par le navigateur (WebAudio).
//  Aucun fichier audio : le jeu reste léger et fonctionne
//  hors ligne, ce qui simplifiera l'emballage en .exe.
//  Un vrai bruitage pourra remplacer chaque entrée plus tard.
// ============================================================

let audio = null;
let volumeGeneral = null;
let coupe = (localStorage.getItem('centurys.son') === 'off');
const dernier = {};   // pour ne pas empiler 50 fois le même bruit

function contexte() {
  if (!audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audio = new Ctx();
    volumeGeneral = audio.createGain();
    volumeGeneral.gain.value = 0.22;
    volumeGeneral.connect(audio.destination);
  }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

export function sonCoupe() { return coupe; }

export function basculerSon() {
  coupe = !coupe;
  try { localStorage.setItem('centurys.son', coupe ? 'off' : 'on'); } catch (e) {}
  return coupe;
}

// Un bip : forme d'onde, hauteur de départ/arrivée, durée, volume.
function bip({ type = 'square', de = 440, vers = de, duree = 0.12, gain = 0.5, retard = 0 }) {
  const a = contexte(); if (!a) return;
  const t0 = a.currentTime + retard;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(de, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, vers), t0 + duree);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
  osc.connect(g); g.connect(volumeGeneral);
  osc.start(t0); osc.stop(t0 + duree + 0.02);
}

// Un souffle (bruit blanc) : impacts, explosions.
function souffle({ duree = 0.2, gain = 0.4, filtre = 900, retard = 0 }) {
  const a = contexte(); if (!a) return;
  const t0 = a.currentTime + retard;
  const n = Math.floor(a.sampleRate * duree);
  const buffer = a.createBuffer(1, n, a.sampleRate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(); src.buffer = buffer;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtre;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(f); f.connect(g); g.connect(volumeGeneral);
  src.start(t0);
}

export function son(nom) {
  if (coupe) return;
  // On limite la répétition : sinon 20 épées qui tapent = bouillie.
  const maintenant = performance.now();
  const delaiMini = { coup: 70, tir: 90, mort: 120 }[nom] || 0;
  if (delaiMini && dernier[nom] && maintenant - dernier[nom] < delaiMini) return;
  dernier[nom] = maintenant;

  switch (nom) {
    case 'clic':      bip({ type: 'square',   de: 620, vers: 760, duree: 0.06, gain: 0.35 }); break;
    case 'achat':     bip({ type: 'triangle', de: 520, vers: 880, duree: 0.13, gain: 0.5 }); break;
    case 'erreur':    bip({ type: 'sawtooth', de: 220, vers: 120, duree: 0.16, gain: 0.4 }); break;
    case 'sortie':    bip({ type: 'triangle', de: 300, vers: 460, duree: 0.10, gain: 0.4 }); break;
    case 'coup':      souffle({ duree: 0.09, gain: 0.30, filtre: 1600 }); break;
    case 'tir':       bip({ type: 'square',   de: 900, vers: 400, duree: 0.07, gain: 0.25 }); break;
    case 'mort':      bip({ type: 'sawtooth', de: 320, vers: 90,  duree: 0.22, gain: 0.30 }); break;
    case 'explosion': souffle({ duree: 0.45, gain: 0.55, filtre: 700 });
                      bip({ type: 'sine', de: 150, vers: 40, duree: 0.4, gain: 0.4 }); break;
    case 'chateau':   souffle({ duree: 0.25, gain: 0.45, filtre: 500 }); break;
    case 'revenu':    bip({ type: 'sine', de: 700, vers: 1050, duree: 0.10, gain: 0.4 });
                      bip({ type: 'sine', de: 1050, vers: 1400, duree: 0.12, gain: 0.35, retard: 0.09 }); break;
    case 'evolution': [523, 659, 784, 1046].forEach((f, i) =>
                        bip({ type: 'triangle', de: f, vers: f * 1.02, duree: 0.30, gain: 0.45, retard: i * 0.11 })); break;
    case 'special':   bip({ type: 'sawtooth', de: 1200, vers: 180, duree: 0.5, gain: 0.4 });
                      souffle({ duree: 0.6, gain: 0.4, filtre: 1200 }); break;
    case 'victoire':  [523, 659, 784, 1046, 1319].forEach((f, i) =>
                        bip({ type: 'triangle', de: f, vers: f, duree: 0.35, gain: 0.5, retard: i * 0.15 })); break;
    case 'defaite':   [523, 440, 349, 262].forEach((f, i) =>
                        bip({ type: 'sawtooth', de: f, vers: f * 0.98, duree: 0.45, gain: 0.4, retard: i * 0.22 })); break;
  }
}
