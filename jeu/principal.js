// Point d'entrée du jeu : assemble les briques et démarre la boucle.

import { lancerBoucle } from "./core/boucle.js";
import { clavier } from "./core/clavier.js";
import { chargerImage } from "./core/sprites.js";
import { creerCamera, mettreAJourCamera } from "./core/camera.js";
import { creerHeros, mettreAJourHeros, dessinerHeros } from "./entities/heros.js";
import { creerCarte, dessinerCarte, piedsLibres, tuileSousLesPieds, TUILE } from "./world/carte.js";
import { VILLE, ZONES } from "./data/zones.js";
import { tuileDef, estPorte } from "./data/tuiles.js";
import { ITEMS } from "./data/items.js";
import {
  creerInventaire, appliquerEquipement, armeEquipee, armureEquipee,
  ajouterObjet, ajouterOr, etatInventaire, chargerInventaire,
} from "./systems/inventaire.js";
import { installerInventaire } from "./ui/inventaire.js";
import { installerDeck } from "./ui/deck.js";
import { installerMenu } from "./ui/menu.js";
import { afficherMessage, flashCombat, fondu, alerteVie } from "./ui/effets.js";
import { ouvrirDialogue, dialogueActif } from "./ui/dialogue.js";
import { creerRencontres, avancerRencontres } from "./systems/rencontres.js";
import { demarrerCombat } from "./ui/combat.js";
import { ennemiParId, ENNEMIS, tirerButin } from "./data/ennemis.js";
import { FANATIQUE, MARCHAND } from "./data/pnj.js";
import { creerPnj, mettreAJourPnj, dessinerPnj, piedsPnj } from "./entities/pnj.js";

const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");

// Le canvas remplit TOUTE la fenêtre (plus de marges noires). Sa résolution
// interne = fenêtre / ZOOM : ZOOM = taille d'un pixel-jeu à l'écran. Plus ZOOM
// est petit, plus on voit loin (mais plus les sprites sont petits). Bornée pour
// garder une vue raisonnable sur très grand écran.
const ZOOM = 2;
const VUE_MAX = { l: 1344, h: 800 };
function ajusterEchelle() {
  canvas.width = Math.min(VUE_MAX.l, Math.ceil(innerWidth / ZOOM));
  canvas.height = Math.min(VUE_MAX.h, Math.ceil(innerHeight / ZOOM));
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.imageSmoothingEnabled = false; // redimensionner le canvas réinitialise le contexte
}
window.addEventListener("resize", ajusterEchelle);

// Place le héros pour que ses PIEDS soient centrés sur une case (colonne, ligne).
function poserHeros(heros, colonne, ligne) {
  heros.x = colonne * TUILE - 16;
  heros.y = ligne * TUILE - 38;
}

// `donneesInitiales` : la sauvegarde choisie sur l'écran de démarrage
// (ou null pour une nouvelle partie).
export async function demarrerJeu(donneesInitiales = null) {
  ajusterEchelle(); // règle la taille du canvas + coupe le lissage

  // On charge toutes les planches (items équipables + ennemis + PNJ), dédoublonnées
  const aPlanche = [...Object.values(ITEMS), ...ENNEMIS, FANATIQUE, MARCHAND].filter((o) => o.planche);
  const chemins = [...new Set(aPlanche.map((o) => o.planche))];
  const images = await Promise.all(chemins.map(chargerImage));
  const planches = new Map(chemins.map((chemin, i) => [chemin, images[i]]));

  // La zone courante (on démarre dans la ville). `carte` et `rencontres`
  // changent à chaque passage de porte, d'où le `let`.
  let zoneActuelle = "ville";
  let carte = creerCarte(VILLE);
  let rencontres = creerRencontres();
  const camera = creerCamera();
  const heros = creerHeros();
  heros.x = carte.departX;
  heros.y = carte.departY;
  const inventaire = creerInventaire();
  inventaire.slots.arme1 = "hache-rouillee";      // équipement de base
  inventaire.slots.armure = "tenue-de-voyageur";
  appliquerEquipement(heros, inventaire, planches);

  let enPause = false;
  let enTransition = false;
  let combatEnCours = null;        // non-null = on est en combat
  let menuPauseOuvert = false;     // le menu pause (Échap) est-il ouvert ?

  // Un PNJ d'ambiance : un fanatique qui arpente la place de la ville (rangée 8).
  const fanatique = creerPnj({
    modele: FANATIQUE,
    planche: planches.get(FANATIQUE.planche),
    x: 18 * TUILE - 11,
    y: 8 * TUILE - 56,
    xMin: 14 * TUILE - 11,
    xMax: 28 * TUILE - 11,
  });
  // Marchand de TEST (rangée 11, près du départ). Placeholder visuel = fanatique.
  const marchand = creerPnj({
    modele: MARCHAND,
    planche: planches.get(MARCHAND.planche),
    x: 11 * TUILE - 11,
    y: 11 * TUILE - 56,
    xMin: 9 * TUILE - 11,
    xMax: 13 * TUILE - 11,
  });
  const invite = document.getElementById("invite");

  // Parler au fanatique : un petit laïus, puis un choix (se faire soigner ou partir).
  function parlerAuFanatique() {
    if (dialogueActif() || combatEnCours || enPause) return;
    enPause = true;
    invite.hidden = true;
    ouvrirDialogue({
      nom: "The Fanatic",
      texte: [
        "Repent, dwarf — the Deep stirs, and it knows your name.",
        "Kneel, and its forge-fire shall mend your broken flesh.",
      ],
      choix: [
        {
          texte: "I have faith — heal me.",
          action: () => {
            heros.pv = heros.pvMax;
            afficherMessage("✨ Warmth floods your bones — fully healed.");
          },
        },
        {
          texte: "Your religion is a cult.",
          action: () => afficherMessage("The Fanatic sneers and turns away."),
        },
      ],
    }, () => { enPause = false; });
  }

  // Marchand de TEST : toutes les armes et armures, gratuites, ajoutées au sac
  // (on choisit ensuite quoi équiper via l'inventaire). Le menu reste ouvert
  // tant qu'on n'a pas choisi « Leave », pour en prendre plusieurs d'affilée.
  const articlesTest = Object.values(ITEMS)
    .filter((it) => it.categorie === "arme" || it.categorie === "armure")
    .map((it) => it.id);

  function parlerAuMarchand() {
    if (dialogueActif() || combatEnCours || enPause) return;
    enPause = true;
    invite.hidden = true;
    document.body.classList.add("en-boutique"); // inventaire à côté (feedback des achats)
    inventaireUI.ouvrir();
    ouvrirBoutique();
  }
  function ouvrirBoutique() {
    let reouvrir = false;
    const choix = articlesTest.map((id) => ({
      texte: `${ITEMS[id].nom}  ·  free`,
      action: () => {
        reouvrir = true;
        if (ajouterObjet(inventaire, id)) {
          afficherMessage(`🛒 ${ITEMS[id].nom} added to your bag.`);
        } else {
          afficherMessage("Your bag is full — equip or drop something first.");
        }
        inventaireUI.rendre(); // l'objet apparaît tout de suite dans le sac
      },
    }));
    choix.push({ texte: "Leave", action: () => { reouvrir = false; } });
    ouvrirDialogue({ nom: "Test Merchant", choix }, () => {
      if (reouvrir) ouvrirBoutique(); // on reste à la boutique pour en reprendre
      else fermerBoutique();
    });
  }
  function fermerBoutique() {
    document.body.classList.remove("en-boutique");
    inventaireUI.fermer();
    enPause = false;
  }

  // L'état qu'un emplacement de sauvegarde retient.
  function obtenirEtat() {
    return {
      zone: zoneActuelle,
      x: heros.x,
      y: heros.y,
      pv: heros.pv,
      direction: heros.direction,
      inventaire: etatInventaire(inventaire),
      armeNom: armeEquipee(inventaire)?.nom ?? "Unarmed", // pour l'affichage du slot
      armureNom: armureEquipee(inventaire).nom,
    };
  }

  // L'état qu'on applique en chargeant (vérifié champ par champ : une
  // sauvegarde abîmée ne doit jamais casser le jeu).
  function appliquerEtat(donnees) {
    if (!donnees) return;
    if (donnees.inventaire) chargerInventaire(inventaire, donnees.inventaire);
    // Recharger la bonne zone AVANT de valider la position
    if (donnees.zone && ZONES[donnees.zone] && donnees.zone !== zoneActuelle) {
      carte = creerCarte(ZONES[donnees.zone]);
      zoneActuelle = donnees.zone;
      rencontres = creerRencontres();
    }
    if (
      Number.isFinite(donnees.x) && Number.isFinite(donnees.y) &&
      piedsLibres(carte, donnees.x, donnees.y) // jamais dans un mur
    ) {
      heros.x = donnees.x;
      heros.y = donnees.y;
    }
    if (["bas", "gauche", "droite", "haut"].includes(donnees.direction)) {
      heros.direction = donnees.direction;
    }
    if (Number.isFinite(donnees.pv)) {
      heros.pv = Math.max(1, Math.min(heros.pvMax, donnees.pv)); // jamais 0 ni au-delà du max
    }
    appliquerEquipement(heros, inventaire, planches);
    mettreAJourCamera(camera, heros, carte, canvas.width, canvas.height);
  }

  const menu = installerMenu({
    obtenirEtat,
    appliquerEtat,
    surChangementPause: (pause) => {
      enPause = pause;
      menuPauseOuvert = pause;
      if (pause) invite.hidden = true;
    },
  });

  appliquerEtat(donneesInitiales); // reprise choisie au démarrage (sinon null = neuf)

  // L'inventaire (touche B) : équiper/déséquiper réapplique le skin + le HUD.
  const inventaireUI = installerInventaire({
    inventaire,
    heros,
    surChangement: () => {
      appliquerEquipement(heros, inventaire, planches);
    },
    surFermer: () => basculerInventaire(),
  });
  let inventaireOuvert = false;
  function basculerInventaire() {
    if (combatEnCours || dialogueActif() || enTransition) return;
    if (inventaireOuvert) { inventaireOuvert = false; enPause = false; inventaireUI.fermer(); return; }
    // Pour ouvrir : soit rien d'autre n'est ouvert, soit on vient du deck (B
    // depuis le deck) — dans ce cas on referme le deck d'abord.
    if (enPause && !deckOuvert) return; // menu pause ou autre écran déjà ouvert
    if (deckOuvert) { deckOuvert = false; deckUI.fermer(); }
    inventaireOuvert = true; enPause = true; invite.hidden = true; inventaireUI.ouvrir();
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyB" && !e.repeat) { e.preventDefault(); basculerInventaire(); }
  });

  // La consultation du deck (touche N + bouton de l'inventaire). Le deck = miroir
  // de l'équipement ; on l'étudie ici, JAMAIS en combat (effort de mémoire voulu).
  const deckUI = installerDeck({
    inventaire,
    surFermer: () => basculerDeck(),
  });
  let deckOuvert = false;
  function basculerDeck() {
    if (combatEnCours || dialogueActif() || enTransition) return;
    if (deckOuvert) { deckOuvert = false; enPause = false; deckUI.fermer(); return; }
    // Pour ouvrir : soit rien d'autre n'est ouvert, soit on vient de l'inventaire
    // (le bouton 🃏) — dans ce cas on referme l'inventaire d'abord.
    if (enPause && !inventaireOuvert) return; // menu pause ou autre écran déjà ouvert
    if (inventaireOuvert) { inventaireOuvert = false; inventaireUI.fermer(); }
    deckOuvert = true; enPause = true; invite.hidden = true; deckUI.ouvrir();
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyN" && !e.repeat) { e.preventDefault(); basculerDeck(); }
  });
  document.getElementById("inv-deck").addEventListener("click", basculerDeck);

  // Échap : ferme d'abord l'écran ouvert (inventaire, deck, menu pause) ; si rien
  // n'est ouvert, ouvre le menu pause (sauvegarder / quitter).
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Escape" || e.repeat) return;
    if (combatEnCours || dialogueActif()) return; // gérés ailleurs (le combat capte Échap)
    e.preventDefault();
    if (inventaireOuvert) { basculerInventaire(); return; }
    if (deckOuvert) { basculerDeck(); return; }
    if (menuPauseOuvert) { menu.fermer(); return; }
    if (enPause) return;          // état transitoire (transition de zone, flash) : on ignore
    menu.ouvrir();
  });

  // Espace : parler au PNJ tout proche
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat || enPause || combatEnCours || dialogueActif()) return;
    if (zoneActuelle !== "ville") return;
    if (fanatique.proche) { e.preventDefault(); parlerAuFanatique(); }
    else if (marchand.proche) { e.preventDefault(); parlerAuMarchand(); }
  });

  // Les points d'intérêt : le message vient du catalogue (champ `interet`),
  // affiché une seule fois par passage (pas en boucle tant qu'on reste dessus).
  let surInteret = false;
  function verifierPointsInteret(tuile) {
    const message = tuileDef(tuile.caractere).interet;
    if (message && !surInteret) afficherMessage(message);
    surInteret = Boolean(message);
  }

  // Les portes : marcher sur une tuile-porte fait passer dans la zone reliée.
  let surPorte = false;
  function verifierPorte(tuile) {
    if (estPorte(tuile.caractere) && !surPorte && !enTransition) {
      const portail = (ZONES[zoneActuelle].portails || []).find(
        (p) => p.colonne === tuile.colonne && p.ligne === tuile.ligne
      );
      if (portail) allerVersZone(portail.vers, portail.entree);
    }
    surPorte = estPorte(tuile.caractere);
  }

  async function allerVersZone(zoneId, entree) {
    if (enTransition) return;
    enTransition = true;
    enPause = true;
    await fondu(1);                  // écran au noir
    carte = creerCarte(ZONES[zoneId]);
    zoneActuelle = zoneId;
    poserHeros(heros, entree.colonne, entree.ligne);
    rencontres = creerRencontres();  // période de grâce fraîche dans la zone
    surPorte = true;                 // on arrive : ne pas re-déclencher
    mettreAJourCamera(camera, heros, carte, canvas.width, canvas.height);
    afficherMessage(carte.nom);
    await fondu(0);                  // on rouvre l'écran
    enPause = false;
    enTransition = false;
  }

  // Les rencontres : sur les tuiles de souterrain, un monstre invisible surgit.
  // Flash façon FF9, puis bascule sur l'écran de combat.
  async function declencherRencontre() {
    enPause = true;                 // le monde se fige pendant le flash
    await flashCombat();
    // Un groupe de 1 à 3 gobelins (même définition, mais chacun son état de combat).
    const nb = 1 + Math.floor(Math.random() * 3);
    const ennemis = Array.from({ length: nb }, () => ennemiParId("gobelin"));
    combatEnCours = demarrerCombat({
      ctx, heros, inventaire, planches, ennemis,
      surFin: (resultat) => {
        combatEnCours = null;
        if (resultat === "defaite") {
          // Pas encore mort : on se réveille en ville, à 1 PV (à soigner).
          heros.pv = 1;
          afficherMessage("💀 You collapse... and wake up back in Brütàl.");
          allerVersZone("ville", VILLE.depart); // retour sûr (gère le fondu + la pause)
        } else {
          enPause = false;
          // Butin : chaque ennemi vaincu lâche son or + ses objets (selon rareté).
          let or = 0;
          const recus = [];
          for (const e of ennemis) {
            const butin = tirerButin(e);
            or += butin.or;
            for (const id of butin.objets) {
              if (ajouterObjet(inventaire, id)) recus.push(ITEMS[id].nom);
            }
          }
          ajouterOr(inventaire, or);
          let msg = `⚔ ${nb > 1 ? "The goblins fall" : "The goblin falls"}.  +${or} 🪙`;
          if (recus.length) msg += `  ·  ${recus.join(", ")}`;
          afficherMessage(msg);
        }
      },
    });
  }

  lancerBoucle({
    mettreAJour(dt) {
      // Pendant un combat, c'est lui qui pilote tout (le monde est figé)
      if (combatEnCours) { combatEnCours.mettreAJour(dt); return; }
      if (enPause) return;          // figé : menu ouvert ou transition en cours
      mettreAJourHeros(heros, clavier, dt, carte);
      const tuile = tuileSousLesPieds(carte, heros);
      verifierPointsInteret(tuile);
      verifierPorte(tuile);
      if (avancerRencontres(rencontres, tuile)) declencherRencontre();
      if (zoneActuelle === "ville") {
        mettreAJourPnj(fanatique, dt, heros);
        mettreAJourPnj(marchand, dt, heros);
      }
      // L'invite « parler » s'affiche quand on est à portée d'un PNJ
      invite.hidden = !(zoneActuelle === "ville" && (fanatique.proche || marchand.proche));
      mettreAJourCamera(camera, heros, carte, canvas.width, canvas.height);
      alerteVie(heros.pv / heros.pvMax); // liseré rouge si la vie est basse
    },
    dessiner() {
      if (combatEnCours) { combatEnCours.dessiner(); return; } // la scène de combat
      ctx.fillStyle = "#0b0a08";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      // Tout est dessiné dans le repère du monde, décalé par la caméra
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
      dessinerCarte(ctx, carte, camera, canvas.width, canvas.height);
      // Les PNJ n'existent que dans la ville. Profondeur : on dessine héros et
      // PNJ du plus « haut » (pieds les plus en arrière) au plus « bas ».
      if (zoneActuelle === "ville") {
        const acteurs = [
          { pieds: piedsPnj(fanatique), dessiner: () => dessinerPnj(ctx, fanatique) },
          { pieds: piedsPnj(marchand), dessiner: () => dessinerPnj(ctx, marchand) },
          { pieds: heros.y + 54, dessiner: () => dessinerHeros(ctx, heros) },
        ];
        acteurs.sort((a, b) => a.pieds - b.pieds);
        for (const a of acteurs) a.dessiner();
      } else {
        dessinerHeros(ctx, heros);
      }
      ctx.restore();
    },
  });
}
