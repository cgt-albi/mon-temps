// Mon Temps — planning : vues année, mois, semaine et jour.
import * as M from './moteur.js';
import { S, codes } from './etat.js';
import { esc, ic } from './commun.js';
import { barreHaut } from './entete.js';
import { bandeaux, lignePaie } from './extras.js';

export const moisVoisin = (y, m, k) => { const d = new Date(Date.UTC(y, m - 1 + k, 1)); return `${d.getUTCFullYear()}-${M.pad(d.getUTCMonth() + 1)}`; };
export function moisDepuis(p) {
  const s = /^\d{4}-\d{2}$/.test(p || '') ? p : M.aujourdhui().slice(0, 7);
  return s.split('-').map(Number);
}
const Maj = (s) => s.replace(/^./, (c) => c.toUpperCase());
const estTravail = (j) => j && j.info && (j.info.type === 'travail' || j.info.type === 'nuit');
const classeCase = (j) => !j ? 'vide' : estTravail(j) ? `k k-${j.info.teinte}` : j.info ? `t-${j.info.type}` : 'k k-ocre';

export function grilleMois(y, m, options = {}) {
  const today = M.aujourdhui(); const C = codes();
  const premier = M.iso(y, m, 1); const nb = M.joursDansMois(y, m); const dec = M.jourSemaine(premier);
  const semaines = Math.ceil((dec + nb) / 7);
  const alertes = new Set(S.etat.reglages.controles ? M.controles(premier, M.iso(y, m, nb), S.etat, S.cfg).map((a) => a.date) : []);
  let cases = '';
  for (let i = 0; i < semaines * 7; i++) {
    const d = M.ajouterJours(premier, i - dec);
    const n = Number(d.slice(8));
    if (d.slice(0, 7) !== premier.slice(0, 7)) { cases += `<span class="case hors" aria-hidden="true"><span class="n">${n}</span></span>`; continue; }
    const j = M.journee(d, S.etat, C);
    const cls = ['case', classeCase(j)];
    if (j && j.source === 'prevu' && d > today) cls.push('prevu');
    if (M.nomFerie(d)) cls.push('ferie');
    if (d === today) cls.push('auj');
    if (options.selection && options.selection.has(d)) cls.push('choisie');
    const lib = `${M.longue(d)}${j ? ', ' + j.code + (j.source === 'prevu' && d > today ? ' prévu' : '') : ', non saisi'}${M.nomFerie(d) ? ', férié' : ''}${alertes.has(d) ? ', alerte' : ''}`;
    const attrs = options.selection ? `role="button" tabindex="0" data-date="${d}" aria-pressed="${options.selection.has(d)}"` : `href="#/jour/${d}"`;
    const tag = options.selection ? 'span' : 'a';
    cases += `<${tag} class="${cls.join(' ')}" ${attrs} data-tour="jour-${d}" aria-label="${esc(lib)}"><span class="n">${n}</span><span class="c">${j ? esc(j.code) : ''}</span>${j && j.depassementMin > 0 ? '<span class="plus" aria-hidden="true">+</span>' : ''}${alertes.has(d) ? '<span class="pastille"></span>' : ''}</${tag}>`;
  }
  return `<div class="cal" data-tour="grille"><div class="cal-jours" aria-hidden="true">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<div>${x}</div>`).join('')}</div><div class="cal-grille">${cases}</div></div>`;
}

function onglets(vue, ref) {
  const lundi = M.ajouterJours(ref, -M.jourSemaine(ref));
  const l = (v, lib, h) => `<a href="${h}" ${vue === v ? 'aria-current="page"' : ''}>${lib}</a>`;
  return `<nav class="vues" aria-label="Affichage du planning">${l('annee', 'Année', `#/planning/annee/${ref.slice(0, 4)}`)}${l('mois', 'Mois', `#/planning/${ref.slice(0, 7)}`)}${l('semaine', 'Semaine', `#/planning/semaine/${lundi}`)}${l('jour', 'Jour', `#/planning/jour/${ref}`)}</nav>`;
}
const fleches = (prec, suiv, quoi) => `<div class="fleches"><a href="${prec}" aria-label="${quoi} précédent${quoi === 'Mois' || quoi === 'Jour' ? '' : 'e'}">${ic('gauche')}</a><a href="${suiv}" aria-label="${quoi} suivant${quoi === 'Mois' || quoi === 'Jour' ? '' : 'e'}">${ic('droite')}</a></div>`;
const refDans = (debut, fin) => { const t = M.aujourdhui(); return t >= debut && t <= fin ? t : debut; };
const pastille = (j) => `<span class="pilule ${classeCase(j)}">${esc(j.code)}</span>`;
const horaire = (j) => j.info && j.info.debut ? `${j.info.debut} – ${j.info.fin}${j.info.debut2 ? ` · ${j.info.debut2} – ${j.info.fin2}` : ''}` : (j.info ? j.info.libelle : '');

export function vuePlanning(p) {
  if (p[1] === 'annee') return vueAnnee(p);
  if (p[1] === 'semaine') return vueSemaine(p);
  if (p[1] === 'jour') return vueJourDetail(p);
  return vueMois(p);
}

// ---------- Mois ----------
function vueMois(p) {
  const [y, m] = moisDepuis(p[1]);
  const today = M.aujourdhui(); const C = codes();
  const debut = M.iso(y, m, 1), fin = M.iso(y, m, M.joursDansMois(y, m));
  const borne = fin < today ? fin : today;
  const pd = (S.etat.departs || {})[y];
  const premiere = pd ? pd.date : Object.keys(S.etat.jours).sort()[0];
  const departMois = premiere && premiere > debut ? premiere : debut;
  const bilan = premiere && departMois <= borne ? M.bilanPeriode(departMois, borne, S.etat, S.cfg) : null;
  let saisis = 0; for (let n = M.jourNum(debut); n <= M.jourNum(fin); n++) if (S.etat.jours[M.depuisNum(n)]) saisis++;
  const nbAlertes = S.etat.reglages.controles ? M.controles(debut, fin, S.etat, S.cfg).length : 0;
  const jAuj = today.slice(0, 7) === debut.slice(0, 7) ? M.journee(today, S.etat, C) : null;
  let carteJour = '';
  if (today.slice(0, 7) === debut.slice(0, 7)) {
    const f = M.nomFerie(today);
    carteJour = `<section class="carte" aria-label="Aujourd'hui" style="margin:0 1rem;display:flex;flex-direction:column;gap:.5rem">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><p class="etiquette">${esc(M.JOURS[M.jourSemaine(today)].slice(0, 3))}. ${esc(M.courte(today))}${f ? ' · ' + esc(f) : ''}</p><a href="#/jour/${today}" style="font-size:.8125rem;font-weight:700;text-decoration:none;padding:.375rem 0">${jAuj ? 'Modifier' : 'Saisir'}</a></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:.75rem"><div style="display:flex;align-items:center;gap:.75rem;min-width:0">${jAuj ? pastille(jAuj) : ''}<span style="font-size:.9375rem;color:var(--encre2)">${jAuj ? esc(horaire(jAuj)) : 'Rien de saisi pour aujourd\'hui'}</span></div>${jAuj && jAuj.effMin ? `<b>${M.formatDuree(jAuj.effMin)}</b>` : ''}</div>
      ${jAuj && f && jAuj.effMin ? '<p class="petit" style="margin:0">Compte dans tes dimanches et fériés.</p>' : ''}
    </section>`;
  }
  return {
    nav: 'planning',
    html: `${barreHaut()}${bandeaux()}
      <div class="ligne-titre"><h1>${esc(Maj(M.MOIS[m - 1]))} <span class="pale">${y}</span></h1>${fleches(`#/planning/${moisVoisin(y, m, -1)}`, `#/planning/${moisVoisin(y, m, 1)}`, 'Mois')}</div>
      ${onglets('mois', refDans(debut, fin))}
      <div class="bandeau-stats">
        <div><span>Solde du mois</span><b class="${bilan && bilan.solde < 0 ? 'neg' : 'pos'}">${bilan ? M.formatDuree(bilan.solde, true) : '—'}</b></div>
        <div><span>Saisis</span><b>${saisis}<span style="font-size:1.125rem;font-weight:500;color:var(--pale)"> / ${M.joursDansMois(y, m)} j</span></b></div>
        <div><a href="#/compteurs/${y}" style="text-decoration:none;color:inherit;display:block"><span>Alertes</span><b class="${nbAlertes ? 'neg' : ''}">${nbAlertes}</b></a></div>
      </div>
      ${grilleMois(y, m)}
      <div style="padding:0 1rem;margin-top:-.25rem"><div class="legende"><span><i class="plein"></i>Fait</span><span><i class="tirets"></i>Prévu</span><span><u>11</u>Férié</span><span><b style="color:var(--rouge-texte)">+</b>Dépassement</span><span><i style="width:6px;height:6px;border-radius:50%;background:var(--rouge);border:0"></i>Alerte</span></div></div>
      ${carteJour}
      <div style="padding:0 1rem">${lignePaie()}</div>
      <div style="padding:0 1rem"><a class="btn plein" href="#/remplir/${y}-${M.pad(m)}" data-tour="remplir">${ic('calendrier')}Remplir plusieurs jours d'un coup</a></div>`
  };
}

// ---------- Année ----------
function vueAnnee(p) {
  const today = M.aujourdhui();
  const y = /^\d{4}$/.test(p[2] || '') ? Number(p[2]) : Number(today.slice(0, 4));
  const C = codes(); const compte = new Map();
  let mois = '';
  for (let m = 1; m <= 12; m++) {
    const premier = M.iso(y, m, 1); const dec = M.jourSemaine(premier); let pts = '';
    for (let i = 0; i < dec; i++) pts += '<i class="pt vide-h"></i>';
    for (let d = 1; d <= M.joursDansMois(y, m); d++) {
      const date = M.iso(y, m, d); const j = M.journee(date, S.etat, C);
      if (j && j.info) { const e = compte.get(j.code) || { n: 0, info: j.info }; e.n++; compte.set(j.code, e); }
      pts += `<i class="pt ${j && j.info ? 'k-' + j.info.teinte : 'rien'}${date === today ? ' auj' : ''}"></i>`;
    }
    mois += `<a class="mini-mois" href="#/planning/${y}-${M.pad(m)}" aria-label="${esc(Maj(M.MOIS[m - 1]))} ${y}"><b>${esc(Maj(M.MOIS[m - 1]))}</b><span class="mini-grille">${pts}</span></a>`;
  }
  const rep = [...compte.entries()].sort((a, b) => b[1].n - a[1].n);
  return {
    nav: 'planning',
    html: `${barreHaut()}${bandeaux()}
      <div class="ligne-titre"><h1>${y}</h1>${fleches(`#/planning/annee/${y - 1}`, `#/planning/annee/${y + 1}`, 'Année')}</div>
      ${onglets('annee', refDans(`${y}-01-01`, `${y}-12-31`))}
      <div class="annee">${mois}</div>
      <div class="page">
        ${rep.length ? `<p class="etiquette">Sur l'année (prévu compris)</p><div class="repartition">${rep.map(([code, e]) => `<span><i class="pt k-${e.info.teinte}"></i><b>${esc(code)}</b> ${e.n} j</span>`).join('')}</div>` : '<p class="petit">Aucune journée saisie sur cette année. Touche un mois pour commencer.</p>'}
      </div>`
  };
}

// ---------- Semaine ----------
function vueSemaine(p) {
  const today = M.aujourdhui(); const C = codes();
  let ref = /^\d{4}-\d{2}-\d{2}$/.test(p[2] || '') ? p[2] : today;
  const lundi = M.ajouterJours(ref, -M.jourSemaine(ref)); const dimanche = M.ajouterJours(lundi, 6);
  const alertes = S.etat.reglages.controles ? M.controles(lundi, dimanche, S.etat, S.cfg) : [];
  const parJour = new Set(alertes.map((a) => a.date));
  let total = 0, dep = 0, lignes = '';
  for (let k = 0; k < 7; k++) {
    const d = M.ajouterJours(lundi, k); const j = M.journee(d, S.etat, C); const f = M.nomFerie(d);
    if (j) { total += j.effMin; dep += Math.max(0, j.depassementMin); }
    lignes += `<li><a class="lien ligne-jour${d === today ? ' auj' : ''}" href="#/planning/jour/${d}">
      <span class="jr"><b>${Number(d.slice(8))}</b><span class="${f ? 'ferie' : ''}">${esc(M.JOURS[k].slice(0, 3))}.</span></span>
      ${j ? pastille(j) : '<span class="pilule vide">—</span>'}
      <span class="h">${j ? esc(horaire(j)) : 'Non saisi'}${j && j.source === 'prevu' && d > today ? '<span class="sous">prévu</span>' : ''}${j && j.note ? `<span class="sous">${esc(j.note)}</span>` : ''}${f ? `<span class="sous">${esc(f)}</span>` : ''}</span>
      <span class="d">${j && j.effMin ? M.formatDuree(j.effMin) : ''}${j && j.depassementMin > 0 ? `<span class="sous" style="color:var(--rouge-texte)">${M.formatDuree(j.depassementMin, true)}</span>` : ''}${parJour.has(d) ? '<span class="pastille" style="position:static;display:inline-block;margin-left:.25rem"></span>' : ''}</span></a></li>`;
  }
  const max = S.cfg.regles.maxSeptJoursHeures * 60;
  return {
    nav: 'planning',
    html: `${barreHaut()}${bandeaux()}
      <div class="ligne-titre"><div><p class="etiquette">${esc(M.courte(lundi))} – ${esc(M.courte(dimanche))} ${dimanche.slice(0, 4)}</p><h1>Semaine <span class="pale">${M.numeroSemaine(lundi)}</span></h1></div>${fleches(`#/planning/semaine/${M.ajouterJours(lundi, -7)}`, `#/planning/semaine/${M.ajouterJours(lundi, 7)}`, 'Semaine')}</div>
      ${onglets('semaine', today >= lundi && today <= dimanche ? today : lundi)}
      <div class="bandeau-stats">
        <div><span>Travail</span><b>${M.formatDuree(total)}</b></div>
        <div><span>Dépassements</span><b>${dep ? M.formatDuree(dep, true) : '0h00'}</b></div>
        <div><span>Sur ${S.cfg.regles.maxSeptJoursHeures} h max.</span><div class="jauge" style="margin-top:.5rem"><i style="width:${Math.min(100, Math.round(total / max * 100))}%;background:${total > max ? 'var(--rouge)' : 'var(--encre)'}"></i></div></div>
      </div>
      <div class="page"><ul class="liste">${lignes}</ul>
      ${alertes.map((a) => `<div class="carte alerte grave" style="border-color:transparent">${ic('alerte')}<div><div class="t">${esc(a.regle)}</div><div class="m">${esc(a.message)}</div></div></div>`).join('')}</div>`
  };
}

// ---------- Jour ----------
function vueJourDetail(p) {
  const today = M.aujourdhui(); const C = codes();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(p[2] || '') ? p[2] : today;
  const j = M.journee(d, S.etat, C); const f = M.nomFerie(d);
  const e = S.etat.jours[d] || {};
  const alertes = S.etat.reglages.controles ? M.controles(d, d, S.etat, S.cfg) : [];
  const bl = M.blocs(j); const nuit = M.minutesNuit(bl, S.cfg); const djf = M.minutesDJF(bl).minutes;
  const preuves = S.etat.preuves.filter((x) => x.date === d);
  const ligne = (l, v) => `<li><div class="ligne"><span>${l}</span><b>${v}</b></div></li>`;
  return {
    nav: 'planning',
    html: `${barreHaut()}${bandeaux()}
      <div class="ligne-titre"><div><p class="etiquette">${esc(M.JOURS[M.jourSemaine(d)])}${f ? ' · ' + esc(f) : ''}${d === today ? ' · aujourd\'hui' : ''}</p><h1>${Number(d.slice(8))} ${esc(M.MOIS[Number(d.slice(5, 7)) - 1])} <span class="pale">${d.slice(0, 4)}</span></h1></div>${fleches(`#/planning/jour/${M.ajouterJours(d, -1)}`, `#/planning/jour/${M.ajouterJours(d, 1)}`, 'Jour')}</div>
      ${onglets('jour', d)}
      <div class="page">
        ${j ? `<section class="carte jour-carte ${classeCase(j)}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem"><div><p class="code-geant">${esc(j.code)}</p><p style="margin:.125rem 0 0;font-weight:600">${esc(j.info ? j.info.libelle : '')}</p></div>${j.effMin ? `<p class="code-geant" style="font-size:1.75rem">${M.formatDuree(j.effMin)}</p>` : ''}</div>
            ${j.info && j.info.debut ? `<p style="margin:.5rem 0 0;font-size:1.0625rem">${esc(horaire(j))}</p>` : ''}
            <p class="petit" style="margin:.375rem 0 0;color:inherit;opacity:.8">${j.source === 'realise' ? 'Journée faite' : d > today ? 'Journée prévue' : 'Prévu, à confirmer'}${j.change ? ` · prévu au départ : ${esc(j.prevuCode)}` : ''}</p>
          </section>
          <ul class="liste">
            ${j.depassementMin ? ligne('Dépassement d\'horaire', M.formatDuree(j.depassementMin, true)) : ''}
            ${nuit ? ligne('Heures de nuit', M.formatDuree(nuit)) : ''}
            ${djf ? ligne(f ? 'Heures un jour férié' : 'Heures un dimanche', M.formatDuree(djf)) : ''}
            ${j.info && j.info.pauseMin && j.effMin ? ligne('Pause non comptée', `${j.info.pauseMin} min`) : ''}
            ${j.note ? `<li><div class="ligne"><span>Note<span class="sous">${esc(j.note)}</span></span></div></li>` : ''}
            ${preuves.map((x) => `<li><a class="lien" href="#/preuve/${encodeURIComponent(x.id)}"><span>${x.type === 'rappel' ? 'Rappel sur repos noté' : 'Changement de planning noté'}</span>${ic('droite', 'i chevron')}</a></li>`).join('')}
          </ul>` : `<div class="liste"><p class="vide-etat">Rien de saisi pour cette journée.</p></div>`}
        ${alertes.map((a) => `<div class="carte alerte grave" style="border-color:transparent">${ic('alerte')}<div><div class="t">${esc(a.regle)}</div><div class="m">${esc(a.message)}</div></div></div>`).join('')}
        <a class="btn principal plein" href="#/jour/${d}">${j ? 'Modifier cette journée' : 'Saisir cette journée'}</a>
        ${e.prevu && e.realise && e.prevu.code ? `<p class="petit" style="margin:0">Prévu : ${esc(e.prevu.code)} · Fait : ${esc(e.realise.code)}</p>` : ''}
      </div>`
  };
}
