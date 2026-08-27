// ============================================================
//  L'ADVERSAIRE — un joueur artificiel très simple.
//  Toutes les X secondes il prend UNE décision, dans cet ordre :
//  évoluer > frapper fort > investir dans le revenu > acheter.
//  Sa difficulté ne triche pas sur les règles : elle change
//  seulement son revenu et son agressivité (voir reglages.js).
// ============================================================

import { R, coutRevenu } from '../data/reglages.js';
import { AGES } from '../data/ages.js';
import { etat } from './etat.js';
import { acheterUnite, ameliorerRevenu, evoluer, peutEvoluer, lancerSpecial } from './combat.js';

export function majIA(dt) {
  const camp = etat.camps.ennemi;
  camp.iaTimer -= dt;
  if (camp.iaTimer > 0) return;
  camp.iaTimer = R.ia.reflexion;

  // Combien de monde sur le terrain, et où ?
  let menace = 0, nos = 0, plusProche = Infinity;
  for (const u of etat.unites) {
    if (u.mort) continue;
    if (u.camp === 'joueur') {
      menace++;
      plusProche = Math.min(plusProche, Math.abs(u.x - camp.x));
    } else nos++;
  }
  const enDanger = plusProche < 420 || camp.pv < camp.pvMax * 0.45;

  // 1. Changer d'âge dès que possible : c'est toujours le meilleur coup.
  if (peutEvoluer(camp)) { evoluer(camp); return; }

  // 2. L'attaque spéciale, quand elle vaut le coup (assez de cibles, ou danger).
  if (camp.specialRecharge <= 0 && (menace >= 4 || (enDanger && menace >= 2))) {
    if (lancerSpecial(camp)) return;
  }

  if (camp.file.length >= R.fileMax) return;

  // 3. Investir dans le revenu quand le terrain est calme.
  const prix = coutRevenu(camp);
  const veutInvestir = camp.revenuNiveau < 11 && camp.or >= prix && !enDanger
                    && (camp.revenuNiveau < 4                   // les premiers niveaux sont prioritaires
                        || camp.or >= prix * 1.8                // assez riche pour investir ET acheter
                        || (menace <= 1 && Math.random() < 0.6 / camp.agressivite));
  if (veutInvestir) { ameliorerRevenu(camp); return; }

  // 4. Sinon, acheter une troupe.
  const index = choisirUnite(camp, menace, nos, enDanger);
  if (index >= 0) acheterUnite(camp, index);
}

function choisirUnite(camp, menace, nos, enDanger) {
  const unites = AGES[camp.age].unites;
  const abordables = [];
  for (let i = 0; i < unites.length; i++) {
    if (unites[i].cout <= camp.or) abordables.push(i);
  }
  if (!abordables.length) return -1;

  // Débordé : on prend ce qui sort le plus vite pour boucher le trou.
  if (enDanger && menace > nos + 1) return abordables[0];

  const plusCher = abordables[abordables.length - 1];
  // Riche : on préfère la grosse unité, bien plus rentable.
  if (plusCher === unites.length - 1 && Math.random() < 0.55 * camp.agressivite) return plusCher;
  if (abordables.length >= 2 && Math.random() < 0.55) return abordables[abordables.length - 2];
  return abordables[0];
}
