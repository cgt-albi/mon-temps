// Mon Temps — onglet Outils : salaire, calculateurs, contact.
import * as M from './moteur.js';
import { S, sauver } from './etat.js';
import { esc, ic, chevron, enteteRetour, mailto, badgeProvisoire } from './commun.js';
import { barreHaut } from './entete.js';
import { iconeReseau, NOMS } from './reseaux.js';
import { carteElections, lignePaie } from './extras.js';
import { carteMesPrimes, brancherPrimes, baseProfil, totalPrimes } from './primes.js';
const primesAuto = () => { const t = totalPrimes(baseProfil(partPayee)).total; return t ? Math.round(t * 100) / 100 : ''; };

const eur = (v, d = 2) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }).format(Number.isFinite(v) ? v : 0);
const num = (el, id) => { const v = Number(String(el.querySelector('#' + id).value).replace(',', '.')); return Number.isFinite(v) ? v : 0; };
const profil = () => S.etat.profil || {};
const lien = (h, icone, t, s) => `<li><a class="lien" href="${h}"><span style="display:flex;gap:.75rem;align-items:flex-start">${ic(icone)}<span>${t}<span class="sous">${s}</span></span></span>${chevron()}</a></li>`;
// Part du traitement versée à temps partiel (80 % et 90 % sont mieux payés que le prorata).
export const partPayee = (q) => (q === 80 ? 6 / 7 : q === 90 ? 32 / 35 : q / 100);
const tauxHoraire = (brutPleinTemps) => brutPleinTemps * 12 / (S.cfg.regles.heuresAnnuellesTauxHoraire || 1820);
const ligne = (l, v, fort) => `<div class="res-ligne${fort ? ' fort' : ''}"><span>${l}</span><b>${v}</b></div>`;
const note = (t) => `<p class="petit" style="margin:0">${t}</p>`;
const AVERT = 'Estimation en brut, pour t\'aider à vérifier. Seule ta fiche de paie fait foi.';

// ---------- Accueil des outils ----------
export function vueOutils() {
  const liens = (S.cfg.liens || []).filter((l) => l && l.titre && l.url);
  return {
    nav: 'outils',
    html: `${barreHaut()}<div class="ligne-titre"><h1>Outils</h1></div>
      <div class="page" style="margin-top:.875rem">
        ${carteElections()}
        <p class="etiquette">Salaire</p>
        <ul class="liste">
          ${lien('#/salaire', 'euro', 'Mon salaire', 'Traitement, taux horaire, ce que mes saisies doivent rapporter')}
          ${lien('#/calc/maladie', 'coeur', 'Arrêt maladie : ce que je perds', 'Jour de carence et traitement à 90 %')}
          ${lien('#/calc/greve', 'megaphone', 'Grève : la retenue', 'Pour une heure, une demi-journée, un jour')}
          ${lien('#/calc/partiel', 'parts', 'Temps partiel : ce que je touche', '80 % payé 85,7 %, 90 % payé 91,4 %')}
          ${lien('#/simuler', 'calendrier', 'Et si je pose… ?', 'Essayer des dates de congés avant de les demander')}
          ${lien('#/calc/heuressup', 'horloge', 'Heures supplémentaires', 'Ce que valent mes heures en plus')}
          ${lien('#/calc/dimanche', 'soleil', 'Nuit, dimanche, férié', 'Les indemnités pour une garde')}
        </ul>
        <p class="etiquette">Démarches</p>
        <ul class="liste">
          ${lien('#/courriers', 'mail', 'Modèles de courriers', 'Récupération, temps partiel, relevé d\'heures, alerte…')}
          ${lien('#/desiderata', 'calendrier', 'Désiderata de congés', 'Tes dates, mises en forme pour ton cadre')}
          ${lien('#/greve', 'megaphone', 'Déclarer mon intention de grève', 'Le mail à ton cadre, prêt à partir')}
          ${lien('#/dossier', 'preuves', 'Dossier pour le syndicat', 'Bilan, alertes, rappels : un PDF prêt à envoyer')}
          ${lien('#/droits', 'livre', 'Mes droits', 'Temps de travail et repos, en clair')}
          ${lien(`#/releve/${M.aujourdhui().slice(0, 4)}`, 'imprimer', 'Mon relevé annuel', 'À imprimer ou à enregistrer en PDF')}
        </ul>
        ${liens.length ? `<p class="etiquette">Liens utiles</p><ul class="liste">${liens.map((l) => `<li><a class="lien" href="${esc(l.url)}" target="_blank" rel="noopener"><span style="display:flex;gap:.75rem;align-items:flex-start">${ic('web')}<span>${esc(l.titre)}${l.description ? `<span class="sous">${esc(l.description)}</span>` : ''}</span></span>${chevron()}</a></li>`).join('')}</ul>` : ''}
        <a class="btn plein" href="#/contact">${ic('telephone')}Contacter le syndicat</a>
      </div>`
  };
}

// ---------- Mon salaire ----------
export function vueSalaire(p) {
  const R = S.cfg.regles; const pr = profil(); const today = M.aujourdhui();
  const cle = /^\d{4}-\d{2}$/.test(p[1] || '') ? p[1] : today.slice(0, 7);
  const [y, m] = cle.split('-').map(Number);
  const voisin = (k) => { const d = new Date(Date.UTC(y, m - 1 + k, 1)); return `${d.getUTCFullYear()}-${M.pad(d.getUTCMonth() + 1)}`; };
  return {
    html: `${enteteRetour('Mon salaire', '#/outils')}
      <div class="page" style="margin-top:.75rem">
        ${lignePaie()}
        <section class="carte" style="display:flex;flex-direction:column;gap:.75rem">
          <h2>Mon traitement de base</h2>
          <div class="rangee"><label class="champ"><span>Indice majoré</span><input type="number" inputmode="numeric" id="im" min="300" max="1100" value="${pr.indiceMajore || ''}" placeholder="Ex. : 420"></label>
            <label class="champ"><span>Quotité</span><select id="q">${[100, 90, 80, 70, 60, 50].map((x) => `<option value="${x}" ${Number(pr.quotite || 100) === x ? 'selected' : ''}>${x} %</option>`).join('')}</select></label></div>
          ${S.cfg.grilles.length ? `<div class="rangee"><label class="champ"><span>Mon grade</span><select id="grade"><option value="">Choisir…</option>${S.cfg.grilles.map((g, i) => `<option value="${i}">${esc(g.nom)}</option>`).join('')}</select></label>
            <label class="champ"><span>Mon échelon</span><select id="ech" disabled><option value="">—</option></select></label></div>` : ''}
          ${note('L\'indice majoré est écrit en haut de ta fiche de paie (« IM » ou « indice »). Il dépend de ton grade et de ton échelon.')}
          <div id="res-base" class="res"></div>
        </section>
        ${carteMesPrimes()}
        <section class="carte" style="display:flex;flex-direction:column;gap:.75rem">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem"><h2>Ce que mes saisies doivent rapporter</h2></div>
          <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:1.125rem;font-stretch:85%">${esc(M.MOIS[m - 1].replace(/^./, (c) => c.toUpperCase()))} ${y}</b><div class="fleches"><a href="#/salaire/${voisin(-1)}" aria-label="Mois précédent">${ic('gauche')}</a><a href="#/salaire/${voisin(1)}" aria-label="Mois suivant">${ic('droite')}</a></div></div>
          <div id="res-mois" class="res"></div>
          ${note('À comparer avec ta fiche de paie. Ces éléments sont souvent versés avec un ou deux mois de décalage.')}
        </section>
        ${note(`Valeur du point d'indice : ${String(R.valeurPointMensuel).replace('.', ',')} € par mois.${badgeProvisoire(S.cfg, 'baremes.point')} SMIC : ${eur(R.smicMensuel)} brut par mois à temps plein.${badgeProvisoire(S.cfg, 'baremes.smic')} ${AVERT} Les primes ne comptent que si tu les coches ci-dessus.`)}
      </div>`,
    apres(el) {
      const e = M.elementsPaie(`${cle}-01`, M.iso(y, m, M.joursDansMois(y, m)), S.etat, S.cfg);
      const maj = () => {
        const im = num(el, 'im'), q = num(el, 'q') || 100;
        const imEff = Math.max(im, im >= 300 ? R.indiceMinimum : 0);
        const plein = imEff * R.valeurPointMensuel, brut = plein * partPayee(q), th = tauxHoraire(plein);
        const diff = R.smicMensuel ? Math.max(0, R.smicMensuel * partPayee(q) - brut) : 0;
        el.querySelector('#res-base').innerHTML = im >= 300
          ? ligne('Traitement brut mensuel', eur(brut), true) + (q < 100 ? ligne('À temps plein', eur(plein)) : '') + ligne('Taux horaire brut', eur(th))
            + (im < R.indiceMinimum ? note(`Ton indice est sous le minimum de traitement (indice ${R.indiceMinimum}) : c'est lui qui s'applique.${badgeProvisoire(S.cfg, 'baremes.indiceMin')}`) : '')
            + (diff > 0.005 ? ligne(`Indemnité différentielle (SMIC)${badgeProvisoire(S.cfg, 'baremes.smic')}`, '≈ ' + eur(diff)) + note('Quand le traitement est inférieur au SMIC, une indemnité différentielle complète la différence. Elle disparaît quand le point d\'indice ou l\'indice remonte.') : '')
            + ligne('Net approximatif (hors primes)', '≈ ' + eur((brut + diff) * 0.79, 0))
          : note('Renseigne ton indice pour voir ton traitement.');
        const n = e.nuit / 60 * th * R.majorationNuitPct / 100, d = e.djf / 480 * R.indemniteDimancheFerie8h, hs = e.dep / 60 * th * R.coefHeuresSup1;
        el.querySelector('#res-mois').innerHTML =
          ligne(`Heures de nuit · ${M.formatDuree(e.nuit)}`, im >= 300 ? eur(n) : '—') +
          ligne(`Dimanches et fériés · ${M.formatDuree(e.djf)}`, eur(d)) +
          ligne(`Dépassements · ${M.formatDuree(e.dep)}`, im >= 300 ? eur(hs) : '—') +
          ligne('Total attendu en plus du traitement', im >= 300 ? eur(n + d + hs) : eur(d), true) +
          `<p class="petit" style="margin:.25rem 0 0">Dépassements comptés comme s'ils étaient payés (et non récupérés), au coefficient ${String(R.coefHeuresSup1).replace('.', ',')}.${badgeProvisoire(S.cfg, 'regles.coefHeuresSup1')}</p>`;
      };
      const baseCourante = () => { const im = num(el, 'im'), q = num(el, 'q') || 100; const imEff = Math.max(im, im >= 300 ? R.indiceMinimum : 0); const plein = imEff * R.valeurPointMensuel; return { brut: plein * partPayee(q), plein, q: q / 100, im }; };
      let majPrimes = () => {};
      majPrimes = brancherPrimes(el, baseCourante, (t, b) => {
        const z = el.querySelector('#res-total'); if (!z) return;
        const diff = R.smicMensuel ? Math.max(0, R.smicMensuel * b.q - b.brut) : 0;
        z.innerHTML = b.im >= 300 && t.total ? ligne('Traitement brut', eur(b.brut + diff)) + ligne('Primes', eur(t.total)) + ligne('Total brut mensuel estimé', eur(b.brut + diff + t.total), true) + ligne('Net approximatif', '≈ ' + eur((b.brut + diff + t.total) * 0.79, 0)) + note('Estimation grossière, hors nuits, dimanches et heures supplémentaires. Les cotisations varient selon les primes.') : '';
      });
      const garder = () => { const im = num(el, 'im'); S.etat.profil = { ...profil(), indiceMajore: im >= 300 ? im : undefined, quotite: num(el, 'q') || 100 }; sauver(); };
      el.querySelector('#im').oninput = () => { maj(); majPrimes(); }; el.querySelector('#q').onchange = () => { maj(); majPrimes(); garder(); };
      el.querySelector('#im').onchange = garder;
      const gr = el.querySelector('#grade'), ec = el.querySelector('#ech');
      if (gr) {
        gr.onchange = () => { const g = S.cfg.grilles[Number(gr.value)]; ec.disabled = !g; ec.innerHTML = g ? '<option value="">Choisir…</option>' + g.echelons.map((x, i) => `<option value="${x.indice}">Échelon ${i + 1} · indice ${x.indice}${x.duree ? ' · ' + esc(x.duree) : ''}</option>`).join('') : '<option value="">—</option>'; };
        ec.onchange = () => { if (ec.value) { el.querySelector('#im').value = ec.value; maj(); majPrimes(); garder(); } };
      }
      maj(); majPrimes();
    }
  };
}

// ---------- Calculateurs ----------
const champBrut = () => { const pr = profil(); const v = pr.indiceMajore ? Math.round(pr.indiceMajore * S.cfg.regles.valeurPointMensuel * partPayee(Number(pr.quotite || 100)) * 100) / 100 : ''; return `<label class="champ"><span>Traitement brut mensuel (€)</span><input type="number" inputmode="decimal" id="brut" min="0" step="0.01" value="${v}" placeholder="Ex. : 2067,57"></label>`; };
const champNombre = (id, lib, val, extra = '') => `<label class="champ"><span>${lib}</span><input type="number" inputmode="decimal" id="${id}" min="0" value="${val}" ${extra}></label>`;

const CALCS = {
  maladie: {
    titre: 'Arrêt maladie',
    intro: 'En congé de maladie ordinaire, le premier jour n\'est pas payé (jour de carence). Ensuite, le traitement est versé à 90 % pendant les trois premiers mois, puis à moitié.',
    champs: () => `${champBrut()}${champNombre('primes', 'Primes mensuelles (€, facultatif)', primesAuto(), 'step="0.01" placeholder="0"')}${champNombre('jours', 'Durée de l\'arrêt (jours, week-ends compris)', 5, 'step="1"')}
      <label class="case-a-cocher"><span><b>Pas de jour de carence</b><small>Prolongation, accident de travail, affection de longue durée, grossesse…</small></span><input type="checkbox" id="sans"></label>`,
    calcul(el, R) {
      const brut = num(el, 'brut'), primes = num(el, 'primes'), jours = Math.max(0, Math.round(num(el, 'jours'))), sans = el.querySelector('#sans').checked;
      if (!brut || !jours) return note('Renseigne ton traitement et la durée de l\'arrêt.');
      const jour = brut / 30, jourP = primes / 30;
      const carence = sans ? 0 : jour + jourP;
      const reste = jours - (sans ? 0 : 1);
      const a90 = Math.min(reste, R.maladieJoursTauxPlein || 90), a50 = Math.max(0, reste - a90);
      const perte90 = a90 * (jour + jourP) * (1 - (R.maladieTauxPct || 90) / 100), perte50 = a50 * (jour + jourP) * 0.5;
      return ligne('Jour de carence', '− ' + eur(carence)) + ligne(`${a90} jour${a90 > 1 ? 's' : ''} à ${R.maladieTauxPct || 90} %`, '− ' + eur(perte90)) + (a50 ? ligne(`${a50} jours à 50 %`, '− ' + eur(perte50)) : '') + ligne('Perte totale estimée (brut)', '− ' + eur(carence + perte90 + perte50), true)
        + note('Calcul en trentièmes. L\'appli suppose que les primes suivent le traitement, ce qui est le cas le plus fréquent. Si la maladie vient du travail, déclare un accident de service ou une maladie professionnelle : le traitement est alors maintenu en entier.');
    }
  },
  greve: {
    titre: 'Retenue pour grève',
    intro: 'À l\'hôpital, la retenue est proportionnelle à la durée de la grève : un trentième du mois pour une journée, moins pour une demi-journée ou quelques heures.',
    champs: () => `${champBrut()}${champNombre('primes', 'Primes mensuelles (€, facultatif)', primesAuto(), 'step="0.01" placeholder="0"')}
      <label class="champ"><span>Durée de la grève</span><select id="duree"><option value="h1">1 heure</option><option value="h2">2 heures</option><option value="demi">Une demi-journée</option><option value="jour" selected>Une journée</option></select></label>${champNombre('fois', 'Nombre de fois', 1, 'step="1" min="1"')}`,
    calcul(el) {
      const base = num(el, 'brut') + num(el, 'primes'); if (!base) return note('Renseigne ton traitement.');
      const d = el.querySelector('#duree').value, n = Math.max(1, Math.round(num(el, 'fois')));
      const part = d === 'jour' ? 1 / 30 : d === 'demi' ? 1 / 60 : (d === 'h2' ? 2 : 1) / 151.67;
      return ligne('Retenue pour une fois', '− ' + eur(base * part)) + (n > 1 ? ligne(`Pour ${n} fois`, '− ' + eur(base * part * n), true) : '') + note('Quand le mouvement est fort, le paiement des jours de grève fait souvent partie de ce qui se négocie à la sortie.');
    }
  },
  partiel: {
    titre: 'Temps partiel',
    intro: 'À 80 % et à 90 %, le traitement est un peu supérieur au temps travaillé. Aux autres quotités, il suit exactement la quotité.',
    champs: () => { const pr = profil(); const plein = pr.indiceMajore ? Math.round(pr.indiceMajore * S.cfg.regles.valeurPointMensuel * 100) / 100 : ''; return `<label class="champ"><span>Traitement brut à temps plein (€)</span><input type="number" inputmode="decimal" id="brut" min="0" step="0.01" value="${plein}" placeholder="Ex. : 2067,57"></label>`; },
    calcul(el) {
      const brut = num(el, 'brut'); if (!brut) return note('Renseigne ton traitement à temps plein.');
      return [90, 80, 70, 60, 50].map((q) => ligne(`À ${q} % · payé ${(partPayee(q) * 100).toFixed(1).replace('.', ',')} %`, eur(brut * partPayee(q)))).join('') + note('Les primes suivent en général la même proportion. Le temps partiel réduit aussi les droits à RTT et, sauf surcotisation, la durée d\'assurance pour la retraite.');
    }
  },
  heuressup: {
    titre: 'Heures supplémentaires',
    intro: 'Une heure supplémentaire payée vaut ton taux horaire, majoré. La nuit, elle compte double ; le dimanche et les jours fériés, elle est majorée des deux tiers.',
    champs: () => { const pr = profil(); const plein = pr.indiceMajore ? Math.round(pr.indiceMajore * S.cfg.regles.valeurPointMensuel * 100) / 100 : ''; return `<label class="champ"><span>Traitement brut à temps plein (€)</span><input type="number" inputmode="decimal" id="brut" min="0" step="0.01" value="${plein}" placeholder="Ex. : 2067,57"></label>${champNombre('heures', 'Heures supplémentaires dans le mois', 5, 'step="0.25"')}
      <label class="champ"><span>Moment</span><select id="quand"><option value="jour">En journée</option><option value="nuit">La nuit</option><option value="djf">Un dimanche ou un jour férié</option></select></label>`; },
    calcul(el, R) {
      const brut = num(el, 'brut'), h = num(el, 'heures'); if (!brut || !h) return note('Renseigne ton traitement et le nombre d\'heures.');
      const th = tauxHoraire(brut), seuil = R.seuilHeuresSup || 14;
      const h1 = Math.min(h, seuil), h2 = Math.max(0, h - seuil);
      const base = h1 * th * R.coefHeuresSup1 + h2 * th * R.coefHeuresSup2;
      const q = el.querySelector('#quand').value; const total = q === 'nuit' ? base * 2 : q === 'djf' ? base * 5 / 3 : base;
      return ligne('Taux horaire', eur(th)) + ligne(`${String(h1).replace('.', ',')} h × ${String(R.coefHeuresSup1).replace('.', ',')}`, eur(h1 * th * R.coefHeuresSup1)) + (h2 ? ligne(`${String(h2).replace('.', ',')} h × ${String(R.coefHeuresSup2).replace('.', ',')}`, eur(h2 * th * R.coefHeuresSup2)) : '') + (q !== 'jour' ? ligne(q === 'nuit' ? 'Majoration de nuit (× 2)' : 'Majoration dimanche ou férié (× 5/3)', eur(total - base)) : '') + ligne('Montant brut estimé', eur(total), true)
        + note(`Coefficients à confirmer selon ton grade et les mesures en vigueur.${badgeProvisoire(S.cfg, 'regles.coefHeuresSup1')} Les heures peuvent aussi être récupérées plutôt que payées.`);
    }
  },
  dimanche: {
    titre: 'Nuit, dimanche, férié',
    intro: 'Les heures de nuit sont majorées d\'un quart du taux horaire. Le dimanche et les jours fériés, une indemnité forfaitaire s\'ajoute, au prorata des heures faites.',
    champs: () => { const pr = profil(); const plein = pr.indiceMajore ? Math.round(pr.indiceMajore * S.cfg.regles.valeurPointMensuel * 100) / 100 : ''; return `<label class="champ"><span>Traitement brut à temps plein (€)</span><input type="number" inputmode="decimal" id="brut" min="0" step="0.01" value="${plein}" placeholder="Ex. : 2067,57"></label>${champNombre('hn', 'Heures de nuit (21 h – 6 h)', 9, 'step="0.25"')}${champNombre('hd', 'Heures un dimanche ou un férié', 8, 'step="0.25"')}`; },
    calcul(el, R) {
      const brut = num(el, 'brut'), hn = num(el, 'hn'), hd = num(el, 'hd');
      const th = tauxHoraire(brut), n = hn * th * R.majorationNuitPct / 100, d = hd / 8 * R.indemniteDimancheFerie8h;
      return (brut ? ligne(`Majoration de nuit · ${R.majorationNuitPct} % de ${eur(th)}`, eur(n)) : note('Renseigne ton traitement pour la majoration de nuit.')) + ligne(`Indemnité dimanche et férié · ${R.indemniteDimancheFerie8h} € pour 8 h`, eur(d)) + ligne('Total brut', eur((brut ? n : 0) + d), true);
    }
  }
};

export function vueCalc(p) {
  const c = CALCS[p[1]]; if (!c) return vueOutils();
  return {
    html: `${enteteRetour(c.titre, '#/outils')}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">${esc(c.intro)}</p>
        <section class="carte" style="display:flex;flex-direction:column;gap:.75rem">${c.champs()}</section>
        <section class="carte res" id="res" aria-live="polite"></section>
        ${note(AVERT)}
      </div>`,
    apres(el) {
      const maj = () => { el.querySelector('#res').innerHTML = c.calcul(el, S.cfg.regles); };
      el.querySelectorAll('input,select').forEach((i) => { i.oninput = maj; i.onchange = maj; });
      maj();
    }
  };
}

// ---------- Contacter le syndicat ----------
export function vueContact() {
  const c = S.cfg.contacts || {}, r = S.cfg.reseaux || {};
  const tel = (c.telephone || '').replace(/[^\d+]/g, '');
  const reseaux = Object.keys(NOMS).filter((k) => r[k]).map((k) => `<a class="reseau" href="${esc(r[k])}" target="_blank" rel="noopener" aria-label="${NOMS[k]}">${iconeReseau(k, 22)}<span>${NOMS[k]}</span></a>`).join('');
  const rien = !tel && !c.mailGeneral && !c.local && !c.permanences && !c.adresse && !reseaux;
  return {
    html: `${enteteRetour('Nous contacter', S.vue.retourContact || '#/syndicat')}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">Une question sur ton planning, tes droits, ta paie ? Un problème dans ton service ? ${esc(S.cfg.syndicat)} te répond, que tu sois syndiqué·e ou non.</p>
        ${rien ? '<div class="carte ambre"><b>Coordonnées bientôt disponibles</b><p class="petit" style="margin:.25rem 0 0">Le numéro de la permanence et l\'adresse mail seront ajoutés ici très prochainement.</p></div>' : ''}
        ${tel ? `<a class="btn principal plein grand" href="tel:${esc(tel)}">${ic('telephone')}<span>Appeler la permanence<small>${esc(c.telephone)}</small></span></a>` : ''}
        ${c.mailGeneral ? `<a class="btn plein grand" href="${esc(mailto(c.mailGeneral, 'Question', ''))}">${ic('mail')}<span>Écrire un mail<small>${esc(c.mailGeneral)}</small></span></a>` : ''}
        ${c.local || c.permanences || c.adresse ? `<ul class="liste">
          ${c.permanences ? `<li><div class="ligne"><span style="display:flex;gap:.75rem">${ic('horloge')}<span>Permanences<span class="sous">${esc(c.permanences)}</span></span></span></div></li>` : ''}
          ${c.local ? `<li><div class="ligne"><span style="display:flex;gap:.75rem">${ic('lieu')}<span>Le local<span class="sous">${esc(c.local)}</span></span></span></div></li>` : ''}
          ${c.adresse ? `<li><div class="ligne"><span style="display:flex;gap:.75rem">${ic('mail')}<span>Adresse<span class="sous">${esc(c.adresse)}</span></span></span></div></li>` : ''}</ul>` : ''}
        ${r.site ? `<a class="btn plein" href="${esc(r.site)}" target="_blank" rel="noopener">${ic('web')}Site internet</a>` : ''}
        ${reseaux ? `<p class="etiquette">Nous suivre</p><div class="reseaux">${reseaux}</div>` : ''}
        <ul class="liste">
          <li><a class="lien" href="#/signalement/violence"><span>Un problème grave à signaler ?<span class="sous">Violence, discrimination, exposition : en toute confidentialité</span></span>${chevron()}</a></li>
        </ul>
      </div>`
  };
}
