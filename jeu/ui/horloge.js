// LE CADRAN JOUR / NUIT (HUD, en haut à droite de la zone de jeu).
//
// Un petit disque qui montre l'avancée du cycle de Brütàl (cf. systems/temps.js) :
//   - l'arc DORÉ = la journée (2/3 du tour), l'arc BLEU NUIT = la nuit (1/3) ;
//   - une encoche marque la TOMBÉE DU SOIR (le moment des enchères) ;
//   - une aiguille tourne selon l'heure courante ; au centre, ☀ le jour / 🌙 la nuit.
// AUCUN effet sur l'éclairage du jeu (on est sous terre) : c'est un simple
// indicateur. Le texte dessous donne le n° de jour + un compte à rebours.
//
// Le canvas est rendu à 2× sa taille affichée (net comme le reste du HUD).

import { positionCycle, phase, numeroJour, tempsAvantSoir, DUREE_JOUR, DUREE_CYCLE } from "../systems/temps.js";

const TAU = Math.PI * 2;
const HAUT = -Math.PI / 2;          // midi = en haut du cadran
const FRAC_JOUR = DUREE_JOUR / DUREE_CYCLE; // part de la journée sur le tour

let conteneur, canvas, ctx, icone, texte, R = 0, cx = 0, cy = 0;

export function installerHorloge() {
  conteneur = document.getElementById("hud-horloge");
  canvas = document.getElementById("horloge-cadran");
  icone = document.getElementById("horloge-icone");
  texte = document.getElementById("horloge-txt");
  ctx = canvas.getContext("2d");
  // Résolution interne 2× la taille CSS (48 px → 96 px) : cadran net.
  const cote = 48;
  canvas.width = cote * 2;
  canvas.height = cote * 2;
  R = cote - 4;            // rayon en unités « rendues » (2×) : ~44
  cx = cote; cy = cote;
}

// Compte à rebours lisible (« 12m », « 45s »).
function court(s) {
  return s < 60 ? `${Math.max(1, Math.round(s))}s` : `${Math.ceil(s / 60)}m`;
}

// Dessine le cadran à l'heure courante. Appelé chaque frame quand le HUD est visible.
export function dessinerHorloge(temps) {
  const pos = positionCycle(temps);
  const nuit = phase(temps) === "nuit";
  const w = canvas.width;
  ctx.clearRect(0, 0, w, w);

  // Piste de fond.
  ctx.lineWidth = 7;
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#1d1913";
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();

  // Arc JOUR (doré) puis arc NUIT (bleu profond).
  const finJour = HAUT + TAU * FRAC_JOUR;
  ctx.strokeStyle = "#e2b23c";
  ctx.beginPath(); ctx.arc(cx, cy, R, HAUT, finJour); ctx.stroke();
  ctx.strokeStyle = "#2c3e73";
  ctx.beginPath(); ctx.arc(cx, cy, R, finJour, HAUT + TAU); ctx.stroke();

  // Encoche « tombée du soir » (les enchères) : un petit trait clair à la frontière.
  const encx = cx + Math.cos(finJour) * R, ency = cy + Math.sin(finJour) * R;
  ctx.strokeStyle = "#ffe9b0"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(finJour) * (R - 7), cy + Math.sin(finJour) * (R - 7));
  ctx.lineTo(cx + Math.cos(finJour) * (R + 5), cy + Math.sin(finJour) * (R + 5));
  ctx.stroke();

  // Aiguille : de l'heure courante, du centre vers le bord.
  const ang = HAUT + TAU * (pos / DUREE_CYCLE);
  ctx.strokeStyle = "#f3efe7"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang) * (R - 5), cy + Math.sin(ang) * (R - 5));
  ctx.stroke();
  // Pastille au bout de l'aiguille.
  ctx.fillStyle = nuit ? "#9fb4ff" : "#ffd873";
  ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * (R - 5), cy + Math.sin(ang) * (R - 5), 4, 0, TAU); ctx.fill();
  // Moyeu central.
  ctx.fillStyle = "#2a231b";
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();

  // Icône centrale (DOM) + texte : jour n° + phase / compte à rebours vers le soir.
  icone.textContent = nuit ? "🌙" : "☀";
  texte.textContent = nuit
    ? `Day ${numeroJour(temps)} · night`
    : `Day ${numeroJour(temps)} · dusk in ${court(tempsAvantSoir(temps))}`;
}

export function montrerHorloge(visible) {
  if (conteneur) conteneur.hidden = !visible;
}
