// La fenêtre de BUTIN, au centre de l'écran à la fin d'un combat gagné. Elle
// liste ce qu'on a looté ; on prend les OBJETS un par un (clic), et quand on a
// tout pris la fenêtre se ferme seule. On peut aussi tout prendre d'un coup
// (« Take all » / Espace) ou laisser le reste (« Discard rest » / Échap).
// L'or est acquis à la fermeture ; l'XP, elle, est déjà appliquée au héros par
// principal.js (la fenêtre ne fait que REJOUER la montée en animation).
//
// À l'ouverture, au lieu d'une simple attente, la BARRE D'XP du héros se remplit
// (cf. gainXp.js) : on voit le gain monter, et chaque palier « explose » en doré.
// Les boutons (Take all / Discard) et Espace/Échap n'apparaissent qu'à la fin de
// cette animation — qu'on peut zapper (clic / touche). Les clics sur les objets,
// eux, restent immédiats.

import { ITEMS, couleurRarete, bonusPassifs } from "../data/items.js";
import { t } from "../systems/langue.js";
import { demanderConfirmation, confirmationActive } from "./confirmation.js";
import { animerGainXp } from "./gainXp.js";

export function installerButin() {
  const overlay = document.getElementById("butin");
  const panneau = overlay.querySelector(".butin-panneau");
  const liste = document.getElementById("butin-liste");
  const boutons = document.getElementById("butin-boutons");
  const aide = document.getElementById("butin-aide");
  const btnTout = document.getElementById("butin-tout");
  const btnLaisser = document.getElementById("butin-laisser");
  // Les éléments de la barre d'XP animée (cf. gainXp.js).
  const xpRefs = {
    barre: document.getElementById("butin-xp-barre"),
    fill: document.getElementById("butin-xp-fill"),
    txt: document.getElementById("butin-xp-txt"),
    niveau: document.getElementById("butin-xp-niveau"),
    eclats: document.getElementById("butin-xp-eclats"),
  };
  const xpGain = document.getElementById("butin-xp-gain");

  let prendre = null;   // (id) => bool : tente de ranger l'objet dans le sac
  let surFin = null;    // () => void  : applique l'or + reprend le jeu
  let restants = 0;     // objets pas encore pris
  let pret = false;     // l'animation d'XP est finie → boutons/Espace/Échap actifs
  let anim = null;      // contrôleur de l'animation d'XP en cours (cf. gainXp.js)
  let ouvertLe = 0;     // horodatage d'ouverture (sert au verrou anti-zap)

  function ligneInfo(html) {
    const d = document.createElement("div");
    d.className = "butin-ligne butin-info";
    d.innerHTML = html;
    return d;
  }

  // Une ligne = UN TAS. Plusieurs exemplaires du même objet sont regroupés (le
  // cadeau du Fou du roi faisait 60 lignes…) : la ligne porte sa quantité dans
  // `dataset.n` et se ramasse d'un geste. Si le sac ne peut pas tout prendre, la
  // ligne RESTE avec ce qu'il n'a pas pu avaler.
  function ligneObjet(id, n) {
    const d = ITEMS[id];
    const el = document.createElement("button");
    el.className = "butin-ligne butin-objet";
    el.dataset.id = id;
    el.dataset.n = n;
    // Bonus passifs (Agilité, Vitesse, Pierre…) affichés SOUS le nom, pour voir ce
    // qu'apporte la pièce (ex. des bottes) avant même de la ramasser.
    const passifs = bonusPassifs(id);
    const visuel = d.image
      ? `<img class="butin-pastille butin-pastille--img" src="${d.image}" style="border-color:${couleurRarete(id)}">`
      : `<span class="butin-pastille" style="background:${d.icone};border-color:${couleurRarete(id)}"></span>`;
    el.innerHTML =
      visuel +
      `<span class="butin-corps"><span class="butin-nom">${d.nom}</span>` +
      (passifs.length ? `<span class="butin-passif">${passifs.join(" · ")}</span>` : ``) +
      `</span><span class="butin-qte"></span><span class="butin-hint">Take</span>`;
    majQuantite(el);
    el.addEventListener("click", (e) => { e.stopPropagation(); prendreUn(el); });
    return el;
  }

  // Affiche « ×N » tant qu'il reste plus d'un exemplaire (rien pour un objet seul).
  function majQuantite(el) {
    const n = Number(el.dataset.n);
    el.querySelector(".butin-qte").textContent = n > 1 ? `×${n}` : "";
  }

  // Sac plein : on secoue la ligne et on la laisse en place.
  function refuser(el) {
    el.classList.remove("butin-ligne--pleine");
    void el.offsetWidth; // force un reflow pour rejouer l'animation
    el.classList.add("butin-ligne--pleine");
  }

  // Ramasse un TAS. `prendre` renvoie COMBIEN d'exemplaires sont entrés dans le
  // sac (0 = plus une case). Ce qui reste ne disparaît pas : la ligne le garde, et
  // on pourra le reprendre après avoir fait de la place dans l'inventaire (ouvert
  // juste à côté) — ou l'abandonner en fermant la fenêtre.
  function ramasser(el) {
    const reste = Number(el.dataset.n);
    const pris = prendre(el.dataset.id, reste) || 0;
    if (pris <= 0) { refuser(el); return 0; }
    restants -= pris;
    el.dataset.n = reste - pris;
    if (reste - pris <= 0) el.remove();
    else { majQuantite(el); refuser(el); } // partiel : la ligne reste et le signale
    return pris;
  }

  function prendreUn(el) {
    if (!prendre) return;
    ramasser(el);
    if (restants <= 0) fermer(); // tout pris → la fenêtre se ferme seule
  }

  function prendreTout() {
    if (!prendre) return;
    for (const el of [...liste.querySelectorAll(".butin-objet")]) ramasser(el);
    if (restants <= 0) fermer();
  }

  // Ferme la fenêtre et applique l'or (une seule fois). Coupe l'animation d'XP
  // si elle tournait encore (cas : on a tout looté avant la fin de la montée).
  function fermer() {
    if (!surFin) return;
    const cb = surFin;
    surFin = null;
    prendre = null;
    if (anim) { anim.arreter(); anim = null; }
    overlay.hidden = true;
    window.removeEventListener("keydown", surTouche, true);
    cb();
  }

  // Quitter en laissant des objets → on confirme (ne pas perdre du loot par erreur).
  function tenterFermer() {
    if (restants > 0) {
      demanderConfirmation({
        titre: t("butin.laisserTitre"),
        message: t("butin.laisserMsg", { n: restants, s: restants > 1 ? "s" : "" }),
        texteOui: t("butin.laisserOui"),
        texteNon: t("butin.laisserNon"),
        danger: true,
      }, fermer);
    } else {
      fermer();
    }
  }

  // Fin de l'animation d'XP : on révèle les boutons (Espace/Échap deviennent
  // actifs). Ignoré si la fenêtre a déjà été fermée entre-temps.
  function reveler() {
    if (overlay.hidden) return;
    pret = true;
    boutons.hidden = false;
    aide.hidden = false;
  }

  // Tant que l'animation n'est pas finie, un geste la « zappe » (le verrou
  // anti-accident est géré par gainXp.js via l'horodatage d'ouverture).
  function zapper() {
    if (anim) anim.zapper(ouvertLe);
  }

  function surTouche(e) {
    if (confirmationActive()) return;

    // ↑/↓ : naviguer parmi les objets (focus natif → Enter/Espace les prend un par un).
    if (e.code === "ArrowUp" || e.code === "ArrowDown") {
      e.preventDefault(); e.stopPropagation();
      const objets = [...liste.querySelectorAll(".butin-objet")];
      if (!objets.length) return;
      const cur = objets.indexOf(document.activeElement);
      const suivant = e.code === "ArrowDown"
        ? (cur < 0 ? 0 : Math.min(objets.length - 1, cur + 1))
        : (cur < 0 ? objets.length - 1 : Math.max(0, cur - 1));
      objets[suivant].focus();
      return;
    }

    // Espace/Entrée : si un objet est focusé → on le laisse gérer nativement
    // (le bouton reçoit le clic → prendreUn). Sinon → prendre tout ou zapper.
    if (e.code === "Space" || e.code === "Enter") {
      if (document.activeElement?.classList.contains("butin-objet")) return;
      e.preventDefault(); e.stopPropagation();
      if (pret) prendreTout(); else zapper();
    } else if (e.code === "Escape") {
      e.preventDefault(); e.stopPropagation();
      if (pret) tenterFermer(); else zapper();
    }
  }

  btnTout.addEventListener("click", (e) => { e.stopPropagation(); prendreTout(); });
  btnLaisser.addEventListener("click", (e) => { e.stopPropagation(); tenterFermer(); });
  // Clic dans la fenêtre pendant l'animation (les objets/boutons stoppent la
  // propagation) → on zappe la montée d'XP.
  panneau.addEventListener("click", () => { if (!pret) zapper(); });

  return {
    // `loot` = { or, xp, items, xpAnim }. `opts` = { prendre, surFin }.
    // `xpAnim` = { niveauDepart, xpDepart, gain } : l'état d'AVANT le gain.
    ouvrir({ or = 0, xp = 0, items = [], xpAnim = null }, opts) {
      prendre = opts.prendre;
      surFin = opts.surFin;
      liste.replaceChildren();
      if (or > 0) liste.append(ligneInfo(t("butin.or", { or }))); // l'XP est dans la barre
      // On REGROUPE les exemplaires identiques en un seul tas, dans l'ordre où ils
      // sont arrivés. `items` peut aussi contenir des { id, n } tout faits.
      restants = 0;
      const tas = new Map();
      for (const it of items) {
        const id = typeof it === "string" ? it : it?.id;
        const n = typeof it === "string" ? 1 : (it?.n ?? 1);
        if (!ITEMS[id] || n <= 0) continue;
        tas.set(id, (tas.get(id) ?? 0) + n);
        restants += n;
      }
      for (const [id, n] of tas) liste.append(ligneObjet(id, n));
      // Sans objet à trier, un seul bouton « Close » (or + XP seulement).
      btnTout.textContent = restants ? t("butin.prendreTout") : t("butin.fermer");
      btnLaisser.hidden = restants === 0;

      // Barre d'XP : on montre le gain total, puis on lance la montée animée.
      // Les boutons restent cachés jusqu'à la fin de l'animation (zappable).
      xpGain.textContent = xp > 0 ? `+${xp} XP` : "";
      pret = false;
      boutons.hidden = true;
      aide.hidden = true;
      ouvertLe = performance.now();
      overlay.hidden = false;

      const etat = xpAnim || { niveauDepart: 1, xpDepart: 0, gain: 0 };
      anim = animerGainXp(xpRefs, etat);
      anim.promesse.then(() => { anim = null; reveler(); });

      window.addEventListener("keydown", surTouche, true);
    },
    fermer,
  };
}
