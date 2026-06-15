// Le lecteur de sons du jeu. Chaque bruitage / musique est un fichier rangé
// dans le dossier `sons/`. On joue un son par son NOM logique (pas son chemin),
// ce qui permet de changer le fichier sans toucher au reste du code.
//
// Important : tant qu'un fichier n'est pas encore fourni, l'appel échoue EN
// SILENCE (pas d'erreur bloquante). On peut donc brancher l'appel dans le jeu
// dès maintenant, et le son se mettra à jouer tout seul le jour où le fichier
// arrive dans `sons/`. Pour ajouter un son : déposer le fichier, puis ajouter
// une ligne dans le tableau FICHIERS ci-dessous.

const DOSSIER = "sons/";

// Nom logique → nom de fichier dans `sons/`.
const FICHIERS = {
  levelup: "levelup.mp3", // joué quand le héros passe un niveau (à fournir)
};

const cache = new Map(); // nom → HTMLAudioElement « modèle » (chargé une seule fois)
let volumeGlobal = 0.7;   // 0..1, volume par défaut de tous les sons

// Récupère (et met en cache à la 1re demande) l'élément audio d'un son.
// Renvoie null si le son est inconnu. Le fichier est chargé paresseusement :
// aucun téléchargement tant qu'on n'a pas vraiment besoin du son.
function modele(nom) {
  const fichier = FICHIERS[nom];
  if (!fichier) return null;
  let audio = cache.get(nom);
  if (!audio) {
    audio = new Audio(DOSSIER + fichier);
    audio.preload = "auto";
    cache.set(nom, audio);
  }
  return audio;
}

// Joue un son par son nom. Sans effet (silencieux) si le son est inconnu, si le
// fichier n'existe pas encore, ou si le navigateur bloque la lecture. On clone
// l'élément pour autoriser des lectures rapprochées sans se couper.
// `opts.volume` (0..1) règle le volume de cette lecture précise.
export function jouerSon(nom, opts = {}) {
  const base = modele(nom);
  if (!base) return;
  const audio = base.cloneNode();
  audio.volume = Math.max(0, Math.min(1, opts.volume ?? volumeGlobal));
  // .play() renvoie une promesse rejetée si le fichier manque ou si l'autoplay
  // est bloqué : on l'avale pour ne jamais casser le jeu à cause d'un son.
  const p = audio.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

// Règle le volume par défaut de tous les sons (0 = muet, 1 = plein).
export function reglerVolume(v) {
  volumeGlobal = Math.max(0, Math.min(1, v));
}
