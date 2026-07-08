// LA BARRE JOUR / NUIT (HUD, en haut à droite de la zone de jeu).
//
// Une barre horizontale qui DÉFILE : un repère FIXE au centre = « maintenant ».
// Derrière lui glisse une bande JAUNE (la journée) / NOIRE (la nuit) au rythme
// du cycle de Brütàl (cf. systems/temps.js). Quand le repère est dans le jaune,
// c'est le jour ; dans le noir, la nuit. La fenêtre affiche exactement UN cycle
// (jour = 2/3, nuit = 1/3) → on voit TOUJOURS une part de jour ET de nuit, ce
// qui donne l'échelle. Au-dessus : ☀/🌙 + « Day N · … » (compte à rebours).
// AUCUN effet sur l'éclairage du jeu (on est sous terre) : simple indicateur.
//
// Le canvas est rendu à 2× sa taille affichée (net comme le reste du HUD).

import { positionCycle, phase, numeroJour, tempsAvantSoir, DUREE_JOUR, DUREE_CYCLE } from "../systems/temps.js";
import { cheminArrondi } from "../core/style.js";

// Couleurs de la bande. La nuit reste SOMBRE mais assez bleutée pour se
// distinguer du fond (sinon, quasi-noir = « trou » invisible dans la barre).
const JOUR = "#e2b23c";     // jaune journée
const NUIT = "#222a44";     // bleu nuit sombre
const REPERE = "#ffffff";   // le trait « maintenant » au centre

let conteneur, canvas, ctx, texte, L = 0, H = 0;

export function installerHorloge() {
  conteneur = document.getElementById("hud-horloge");
  canvas = document.getElementById("horloge-barre");
  texte = document.getElementById("horloge-txt");
  ctx = canvas.getContext("2d");
  // Résolution interne 2× la taille CSS : barre nette.
  L = 132; H = 15;                 // taille logique (px)
  canvas.width = L * 2;
  canvas.height = H * 2;
  ctx.scale(2, 2);                 // on dessine dans le repère logique L×H
}

// Compte à rebours lisible (« 12m », « 45s »).
function court(s) {
  return s < 60 ? `${Math.max(1, Math.round(s))}s` : `${Math.ceil(s / 60)}m`;
}

// Dessine la barre à l'heure courante. Appelée chaque frame quand le HUD est visible.
export function dessinerHorloge(temps) {
  const pos = positionCycle(temps);
  const nuit = phase(temps) === "nuit";
  ctx.clearRect(0, 0, L, H);

  // Cadre arrondi : on clippe tout le dessin à l'intérieur de la « pilule ».
  ctx.save();
  cheminArrondi(ctx, 0, 0, L, H);
  ctx.clip();

  // Fond = NUIT (noir) ; on peindra les plages de JOUR (jaune) par-dessus.
  ctx.fillStyle = NUIT;
  ctx.fillRect(0, 0, L, H);

  // Fenêtre visible = UN cycle, centrée sur « maintenant » (le repère est au milieu).
  const echelle = L / DUREE_CYCLE;      // px par seconde de jeu
  const centre = L / 2;
  const maintenant = temps.total;       // temps absolu (le cycle se déduit par modulo)
  const tGauche = maintenant - DUREE_CYCLE / 2;
  const tDroite = maintenant + DUREE_CYCLE / 2;
  const versX = (t) => centre + (t - maintenant) * echelle;

  // Plages de JOUR (jaune) des cycles qui croisent la fenêtre. Chaque cycle k a
  // sa journée sur [k·CYCLE, k·CYCLE + DUREE_JOUR).
  ctx.fillStyle = JOUR;
  const kMin = Math.floor(tGauche / DUREE_CYCLE);
  const kMax = Math.floor(tDroite / DUREE_CYCLE);
  for (let k = kMin; k <= kMax; k++) {
    const debut = Math.max(k * DUREE_CYCLE, tGauche);
    const fin = Math.min(k * DUREE_CYCLE + DUREE_JOUR, tDroite);
    if (fin > debut) ctx.fillRect(versX(debut), 0, versX(fin) - versX(debut), H);
  }

  ctx.restore();

  // Contour de la pilule (par-dessus, non clippé).
  cheminArrondi(ctx, 0.5, 0.5, L - 1, H - 1);
  ctx.strokeStyle = "#3a2f26"; ctx.lineWidth = 1; ctx.stroke();

  // Le REPÈRE « maintenant » : un trait vertical net au centre + un petit chevron.
  ctx.fillStyle = REPERE;
  ctx.fillRect(centre - 1, 0, 2, H);
  ctx.beginPath();                       // chevron en haut (pointe vers le bas)
  ctx.moveTo(centre - 3, 0); ctx.lineTo(centre + 3, 0); ctx.lineTo(centre, 3);
  ctx.closePath(); ctx.fill();

  // Texte + icône AU-DESSUS de la barre.
  texte.textContent = nuit
    ? `🌙 Day ${numeroJour(temps)} · night`
    : `☀ Day ${numeroJour(temps)} · dusk in ${court(tempsAvantSoir(temps))}`;
}

export function montrerHorloge(visible) {
  if (conteneur) conteneur.hidden = !visible;
}
