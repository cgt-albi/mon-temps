// Mon Temps — point d'entrée, navigation et écrans principaux.
import * as M from './moteur.js';
import * as St from './stockage.js';
import { S, codes, sauver, aller, joursDepuisSauvegarde, appliquerAffichage } from './etat.js';
import { esc, ic, chevron, toast, navBas, enteteRetour, badgeProvisoire, emettre, mailto, chargerConfig } from './commun.js';
import { barreHaut, panneauAffichage, brancherAffichage } from './entete.js';
import * as V from './vues2.js';
import * as Visite from './visite.js';
import * as T from './transfert.js';
import { vuePlanning, grilleMois, moisVoisin, moisDepuis } from './planning.js';
import { vueCompteurs, vueCet } from './compteurs.js';
import * as O from './outils.js';
import * as K from './courriers.js';
import * as X from './extras.js';
import { vueVerification } from './verification.js';
import { compterInstallations } from './statistiques.js';

const racine = document.getElementById('appli');

// ---------- Démarrage ----------
async function demarrer() {
  try {
    S.cfg = await chargerConfig('../');
  } catch (e) {
    racine.innerHTML = '<div class="page" style="padding-top:3rem"><h1>Hors ligne</h1><p class="texte">Ouvre l\'appli une première fois avec une connexion internet.</p></div>';
    return;
  }
  document.documentElement.style.setProperty('--rouge', S.cfg.couleur || '#E30613');
  document.querySelectorAll('[data-nom]').forEach((e) => { e.textContent = S.cfg.nom; });
  document.title = S.cfg.nom;
  S.etat = (await St.charger()) || St.etatVide();
  appliquerAffichage();
  St.protegerStockage();
  S.rendre = rendre;
  window.addEventListener('hashchange', () => rendre(true));
  if (!S.etat.profil && !/^#\/(bienvenue|recevoir|sauvegarde|confidentialite|report|verification|elections)/.test(location.hash)) location.hash = '#/bienvenue';
  else rendre(true);
  compterInstallations(S);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('../sw.js').catch(() => {});
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => S.etat && appliquerAffichage());

// ---------- Navigation ----------
const ROUTES = {
  planning: vuePlanning, remplir: vueRemplir, jour: vueJour, compteurs: vueCompteurs, preuves: vuePreuves, preuve: vuePreuve,
  syndicat: V.vueSyndicat, actu: V.vueActu, transfert: T.vueTransfert, recevoir: T.vueRecevoir, greve: V.vueGreve, desiderata: V.vueDesiderata, courriers: K.vueCourriers, signalement: K.vueSignalement, droits: V.vueDroits,
  outils: O.vueOutils, salaire: O.vueSalaire, calc: O.vueCalc, contact: O.vueContact, cet: vueCet,
  reglages: V.vueReglages, code: V.vueCode, report: V.vueReport, sauvegarde: V.vueSauvegarde, releve: V.vueReleve,
  bienvenue: V.vueBienvenue, confidentialite: V.vueConfidentialite,
  elections: X.vueElections, cycle: X.vueCycle, simuler: X.vueSimuler, dossier: X.vueDossier, verification: vueVerification
};

let derniereRoute = '';
const nonLues = () => (S.cfg.actualites || []).filter((a) => a && a.date && a.date > (S.etat.reglages.actusVues || '')).length;
function rendre(nouvelle = false) {
  const parts = (location.hash.replace(/^#\/?/, '') || 'planning').split('/').map(decodeURIComponent);
  const f = ROUTES[parts[0]] || vuePlanning;
  const v = f(parts) || {};
  const bandeau = S.demo ? `<div class="essai" role="status"><span>Mode essai · rien n'est enregistré</span><button type="button" id="quitter-essai">Quitter</button></div>` : '';
  const route0 = parts.join('/');
  racine.className = (v.nav ? '' : 'sans-nav') + (nouvelle && route0 !== derniereRoute ? ' entree' : '');
  if (nouvelle && route0 !== derniereRoute) { S.vue.info = null; S.vue.affichage = false; }
  racine.innerHTML = bandeau + (v.html || '') + (v.nav ? navBas(v.nav, nonLues()) + panneauAffichage() : '');
  brancherAffichage(racine);
  const q = document.getElementById('quitter-essai');
  if (q) q.onclick = () => Visite.quitterEssai();
  if (v.apres) v.apres(racine);
  const route = parts.join('/');
  if (nouvelle && route !== derniereRoute) window.scrollTo(0, 0);
  derniereRoute = route;
  const h = racine.querySelector('h1'); if (nouvelle && h) { h.setAttribute('tabindex', '-1'); }
  Visite.apresRendu(parts);
}

// ---------- Remplir plusieurs jours ----------
function vueRemplir(p) {
  const [y, m] = moisDepuis(p[1]);
  const cle = `${y}-${M.pad(m)}`;
  if (!S.vue.remplir || S.vue.remplir.mois !== cle) S.vue.remplir = { mois: cle, code: null, sel: new Set() };
  const R = S.vue.remplir; const C = [...codes().values()];
  const puces = C.map((c) => `<button type="button" class="${c.debut ? 'code k k-' + c.teinte : 'puce t-' + c.type}" data-code="${esc(c.code)}" aria-pressed="${R.code === c.code}">${c.debut ? `<b>${esc(c.code)}</b><span>${esc(c.debut)}–${esc(c.fin)}</span>` : esc(c.code)}</button>`);
  const travail = C.filter((c) => c.debut).length;
  return {
    html: `${enteteRetour('Remplir', `#/planning/${cle}`)}
      <div class="page"><p class="texte">Recopie ton planning du mois en deux gestes : choisis un code, puis touche tous les jours concernés. Recommence avec le code suivant.</p>
      <div class="codes-travail">${puces.slice(0, travail).join('')}</div><div class="codes-autres">${puces.slice(travail).join('')}</div></div>
      <div class="ligne-titre" style="padding-top:.5rem"><h2 style="font-size:1.25rem;font-stretch:80%">${esc(M.MOIS[m - 1].replace(/^./, (c) => c.toUpperCase()))} ${y}</h2><div class="fleches"><a href="#/remplir/${moisVoisin(y, m, -1)}" aria-label="Mois précédent">${ic('gauche')}</a><a href="#/remplir/${moisVoisin(y, m, 1)}" aria-label="Mois suivant">${ic('droite')}</a></div></div>
      <div style="margin-top:.5rem">${grilleMois(y, m, { selection: R.sel })}</div>
      <div class="page" style="margin-top:.875rem"><button class="btn principal plein" id="appliquer" ${R.code && R.sel.size ? '' : 'disabled'}>${R.code ? `Mettre ${esc(R.code)} sur ${R.sel.size} jour${R.sel.size > 1 ? 's' : ''}` : 'Choisis d\'abord un code'}</button>
      <p class="petit">Les jours remplis ici sont enregistrés comme « prévus ». Tu corriges ensuite seulement les journées qui ont changé.</p>
      <a class="btn plein" href="#/cycle">${ic('parts')}Dérouler un cycle de travail</a></div>`,
    apres(el) {
      el.querySelectorAll('[data-code]').forEach((b) => b.onclick = () => { R.code = b.dataset.code; S.rendre(); });
      const bascule = (c) => { const d = c.dataset.date; R.sel.has(d) ? R.sel.delete(d) : R.sel.add(d); S.rendre(); };
      el.querySelectorAll('[data-date]').forEach((c) => { c.onclick = () => bascule(c); c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bascule(c); } }; });
      el.querySelector('#appliquer').onclick = () => {
        for (const d of R.sel) { const e = S.etat.jours[d] || (S.etat.jours[d] = {}); e.prevu = { code: R.code }; }
        toast(`${R.code} posé sur ${R.sel.size} jour${R.sel.size > 1 ? 's' : ''}`);
        R.sel = new Set(); sauver(); emettre('remplir'); S.rendre();
      };
    }
  };
}

// ---------- Saisie d'une journée ----------
function chargerJour(date, mode) {
  const e = S.etat.jours[date] || {};
  const src = e[mode] || {};
  const preuveR = S.etat.preuves.find((x) => x.type === 'rappel' && x.date === date);
  const preuveC = S.etat.preuves.find((x) => x.type === 'changement' && x.date === date);
  const codeParDefaut = src.code || (mode === 'realise' && e.prevu ? e.prevu.code : null);
  return { date, mode, code: codeParDefaut || null, depassement: Number(src.depassementMin) || 0, note: src.note || '', rappel: !!preuveR, appelLe: preuveR ? preuveR.appelLe : '', change: !!preuveC, prevenuLe: preuveC ? preuveC.prevenuLe : '' };
}

function vueJour(p) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(p[1] || '') ? p[1] : M.aujourdhui();
  const today = M.aujourdhui();
  if (!S.vue.jour || S.vue.jour.date !== date) S.vue.jour = chargerJour(date, date <= today ? 'realise' : 'prevu');
  const J = S.vue.jour; const C = codes();
  const e = S.etat.jours[date] || {};
  const prevuCode = e.prevu && e.prevu.code;
  const info = J.code ? C.get(J.code) : null;
  const travail = [...C.values()].filter((c) => c.debut);
  const autres = [...C.values()].filter((c) => !c.debut);
  const fin = info && info.fin ? M.hm(info.fin) + J.depassement : null;
  const sortie = fin != null ? `${M.pad(Math.floor(fin / 60) % 24)}:${M.pad(fin % 60)}` : '';
  const montrerChange = J.mode === 'realise' && prevuCode && J.code && J.code !== prevuCode;
  const f = M.nomFerie(date);
  return {
    html: `<header class="retour" style="justify-content:space-between;padding-right:1rem"><div style="padding-left:.5rem"><p class="etiquette">${esc(M.JOURS[M.jourSemaine(date)])}${f ? ' · ' + esc(f) : ''}</p><h1 style="font-size:1.875rem;margin-top:2px">${Number(date.slice(8))} ${esc(M.MOIS[Number(date.slice(5, 7)) - 1])}</h1></div>
        <a class="btn-icone" href="#/planning/${date.slice(0, 7)}" aria-label="Fermer sans enregistrer" style="background:var(--filet2)">${ic('fermer')}</a></header>
      <div class="page" style="margin-top:.875rem">
        <div class="segment" role="group" aria-label="Type de saisie" data-tour="mode">
          <button type="button" data-mode="realise" aria-pressed="${J.mode === 'realise'}">Ce que j'ai fait</button>
          <button type="button" data-mode="prevu" aria-pressed="${J.mode === 'prevu'}">Ce qui était prévu</button></div>
        ${J.mode === 'realise' && prevuCode ? `<p class="petit" style="margin:-.25rem 0 0">Prévu : <b>${esc(prevuCode)}</b>. Ne change rien si la journée s'est passée comme prévu.</p>` : ''}
        <div style="display:flex;flex-direction:column;gap:.5rem" data-tour="codes"><p class="etiquette">Horaire</p>
          <div class="codes-travail">${travail.map((c) => `<button type="button" class="code k k-${c.teinte}" data-code="${esc(c.code)}" aria-pressed="${J.code === c.code}"><b>${esc(c.code)}</b><span>${esc(c.debut)}–${esc(c.fin)}</span></button>`).join('')}</div>
          <div class="codes-autres">${autres.map((c) => `<button type="button" class="puce t-${esc(c.type)}" data-code="${esc(c.code)}" aria-pressed="${J.code === c.code}" title="${esc(c.libelle)}">${esc(c.code)}</button>`).join('')}</div>
          ${info ? `<p class="petit" style="margin:0">${esc(info.libelle)}${info.debut ? ` · ${M.formatDuree(M.dureeEffectiveCode(info))} comptées${info.pauseMin ? ` (pause de ${info.pauseMin} min déduite)` : ''}${badgeProvisoire(S.cfg, 'codes.pause')}` : ''}</p>` : ''}
        </div>
        ${J.mode === 'realise' && info && info.debut ? `<div style="display:flex;flex-direction:column;gap:.5rem" data-tour="depassement"><p class="etiquette">Dépassement d'horaire</p>
          <div class="compteur"><button type="button" data-dep="-5" aria-label="Retirer 5 minutes">−</button><div class="v" aria-live="polite"><b>${J.depassement ? M.formatDuree(J.depassement, true) : '0h00'}</b><span class="petit">sortie à ${sortie}</span></div><button type="button" data-dep="5" aria-label="Ajouter 5 minutes">+</button></div>
          <p class="petit" style="margin:0">Même un quart d'heure, ça se note : c'est ce cumul qui prouve le manque d'effectifs.</p></div>` : ''}
        ${J.mode === 'realise' && info && info.debut ? `<label class="case-a-cocher" data-tour="rappel"><span><b>Rappelé·e sur un repos</b><small>Ajoute la journée à « Mes preuves »</small></span><input type="checkbox" id="rappel" ${J.rappel ? 'checked' : ''}></label>
          ${J.rappel ? `<label class="champ"><span>Appelé·e le</span><input type="datetime-local" id="appelLe" value="${esc(J.appelLe)}"></label>` : ''}` : ''}
        ${montrerChange ? `<label class="case-a-cocher"><span><b>Changement de dernière minute</b><small>Prévu ${esc(prevuCode)}, fait ${esc(J.code)} : garde une trace</small></span><input type="checkbox" id="change" ${J.change ? 'checked' : ''}></label>
          ${J.change ? `<label class="champ"><span>Prévenu·e le</span><input type="datetime-local" id="prevenuLe" value="${esc(J.prevenuLe)}"></label>` : ''}` : ''}
        <label class="champ"><span>Note</span><input type="text" id="note" value="${esc(J.note)}" placeholder="Ex. : remplacement d'une collègue absente" maxlength="200"></label>
        <button class="btn principal plein" id="enregistrer" data-tour="enregistrer">Enregistrer la journée</button>
        ${e.prevu || e.realise ? `<button class="btn plein danger" id="effacer">Effacer « ${J.mode === 'realise' ? 'ce que j\'ai fait' : 'prévu'} »</button>` : ''}
      </div>`,
    apres(el) {
      const lireChamps = () => {
        const n = el.querySelector('#note'); if (n) J.note = n.value;
        const a = el.querySelector('#appelLe'); if (a) J.appelLe = a.value;
        const pl = el.querySelector('#prevenuLe'); if (pl) J.prevenuLe = pl.value;
      };
      el.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { lireChamps(); S.vue.jour = chargerJour(date, b.dataset.mode); S.rendre(); });
      el.querySelectorAll('[data-code]').forEach((b) => b.onclick = () => { lireChamps(); J.code = J.code === b.dataset.code ? null : b.dataset.code; const i = C.get(J.code); if (!i || !i.debut) J.depassement = 0; S.rendre(); emettre('code'); });
      el.querySelectorAll('[data-dep]').forEach((b) => b.onclick = () => { lireChamps(); J.depassement = Math.max(-240, Math.min(720, J.depassement + Number(b.dataset.dep))); S.rendre(); emettre('depassement'); });
      const r = el.querySelector('#rappel'); if (r) r.onchange = () => { lireChamps(); J.rappel = r.checked; if (J.rappel && !J.appelLe) J.appelLe = maintenantLocal(); S.rendre(); };
      const c = el.querySelector('#change'); if (c) c.onchange = () => { lireChamps(); J.change = c.checked; if (J.change && !J.prevenuLe) J.prevenuLe = maintenantLocal(); S.rendre(); };
      el.querySelector('#enregistrer').onclick = () => {
        lireChamps();
        const ent = S.etat.jours[date] || (S.etat.jours[date] = {});
        if (J.code) {
          const o = { code: J.code };
          if (J.mode === 'realise' && J.depassement) o.depassementMin = J.depassement;
          if (J.note.trim()) o.note = J.note.trim();
          ent[J.mode] = o;
        } else delete ent[J.mode];
        if (!ent.prevu && !ent.realise) delete S.etat.jours[date];
        if (J.mode === 'realise') {
          majPreuve('rappel', date, J.rappel && J.code ? { code: J.code, appelLe: J.appelLe, note: J.note.trim() } : null);
          majPreuve('changement', date, J.change && montrerChange ? { ancien: prevuCode, nouveau: J.code, prevenuLe: J.prevenuLe } : null);
        }
        sauver(); toast('Journée enregistrée'); S.vue.jour = null; emettre('enregistre');
        aller('#/planning/' + date.slice(0, 7));
      };
      const ef = el.querySelector('#effacer');
      if (ef) ef.onclick = () => {
        const ent = S.etat.jours[date]; if (!ent) return;
        delete ent[J.mode]; if (!ent.prevu && !ent.realise) delete S.etat.jours[date];
        if (J.mode === 'realise') { majPreuve('rappel', date, null); majPreuve('changement', date, null); }
        sauver(); toast('Saisie effacée'); S.vue.jour = null; aller('#/planning/' + date.slice(0, 7));
      };
    }
  };
}
function maintenantLocal() { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 16); }
function majPreuve(type, date, donnees) {
  const i = S.etat.preuves.findIndex((x) => x.type === type && x.date === date);
  if (!donnees) { if (i >= 0) S.etat.preuves.splice(i, 1); return; }
  const ancien = i >= 0 ? S.etat.preuves[i] : { id: `${type}-${date}`, type, date, compense: false, creeLe: new Date().toISOString() };
  const n = { ...ancien, ...donnees };
  if (i >= 0) S.etat.preuves[i] = n; else S.etat.preuves.push(n);
}

// ---------- Mes preuves ----------
function vuePreuves(p) {
  const onglet = ['rappels', 'changements', 'depassements'].includes(p[1]) ? p[1] : 'rappels';
  const C = codes();
  const rappels = S.etat.preuves.filter((x) => x.type === 'rappel').sort((a, b) => b.date.localeCompare(a.date));
  const changes = S.etat.preuves.filter((x) => x.type === 'changement').sort((a, b) => b.date.localeCompare(a.date));
  const deps = Object.keys(S.etat.jours).sort().reverse().map((d) => M.journee(d, S.etat, C)).filter((j) => j && j.depassementMin > 0);
  const delai = (date, quand, code) => {
    if (!quand) return '';
    const info = C.get(code); const debut = info && info.debut ? M.hm(info.debut) : 0;
    const prise = new Date(`${date}T${M.pad(Math.floor(debut / 60))}:${M.pad(debut % 60)}`);
    const h = Math.round((prise - new Date(quand)) / 36e5);
    const q = new Date(quand);
    return `Prévenu·e le ${q.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${q.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${h >= 0 ? ` · ${h} h avant` : ''}`;
  };
  const badgeDelai = (r) => {
    const seuil = Number(S.cfg.regles.delaiPrevenanceHeures); if (!seuil || !r.prevenuLe) return '';
    const info = C.get(r.nouveau); const debut = info && info.debut ? M.hm(info.debut) : 0;
    const h = (new Date(`${r.date}T${M.pad(Math.floor(debut / 60))}:${M.pad(debut % 60)}`) - new Date(r.prevenuLe)) / 36e5;
    return `<span><span class="badge ${h >= seuil ? 'vert' : 'rouge'}">${h >= seuil ? 'Délai respecté' : `Moins de ${seuil} h`}</span>${badgeProvisoire(S.cfg, 'regles.delaiPrevenanceHeures')}</span>`;
  };
  const bloc = (d) => `<div class="date-bloc"><b>${Number(d.slice(8))}</b><span>${esc(M.MOIS_COURTS[Number(d.slice(5, 7)) - 1].replace('.', ''))}</span></div>`;
  let items = '';
  if (onglet === 'rappels') items = rappels.map((r) => `<li><a class="lien" href="#/preuve/${encodeURIComponent(r.id)}" style="align-items:flex-start">${bloc(r.date)}<span style="flex:1;display:flex;flex-direction:column;gap:3px"><span style="display:flex;justify-content:space-between;gap:.5rem"><b>Rappelé·e sur un repos</b><b>${esc(r.code || '')}</b></span><span style="font-size:.8125rem;color:var(--encre2)">${esc(delai(r.date, r.appelLe, r.code)) || 'Heure de l\'appel non notée'}</span><span><span class="badge ${r.compense ? 'vert' : 'rouge'}">${r.compense ? 'Compensé' : 'Non compensé'}</span></span></span></a></li>`).join('');
  if (onglet === 'changements') items = changes.map((r) => `<li><a class="lien" href="#/preuve/${encodeURIComponent(r.id)}" style="align-items:flex-start">${bloc(r.date)}<span style="flex:1;display:flex;flex-direction:column;gap:3px"><span style="display:flex;justify-content:space-between;gap:.5rem"><b>Planning changé</b><b>${esc(r.ancien)} → ${esc(r.nouveau)}</b></span><span style="font-size:.8125rem;color:var(--encre2)">${esc(delai(r.date, r.prevenuLe, r.nouveau)) || 'Date de prévenance non notée'}</span>${badgeDelai(r)}</span></a></li>`).join('');
  if (onglet === 'depassements') items = deps.map((j) => `<li><a class="lien" href="#/jour/${j.date}" style="align-items:flex-start">${bloc(j.date)}<span style="flex:1;display:flex;flex-direction:column;gap:3px"><span style="display:flex;justify-content:space-between;gap:.5rem"><b>${esc(j.code)}</b><b>${M.formatDuree(j.depassementMin, true)}</b></span>${j.note ? `<span style="font-size:.8125rem;color:var(--encre2)">${esc(j.note)}</span>` : ''}</span></a></li>`).join('');
  const vides = { rappels: 'Aucun rappel noté. Quand on te rappelle sur un repos, coche la case dans la saisie de la journée.', changements: 'Aucun changement noté. Il apparaît quand ce que tu as fait diffère de ce qui était prévu.', depassements: 'Aucun dépassement noté pour l\'instant.' };
  const resume = () => {
    const l = [`Mes preuves — ${S.cfg.nom}`, ''];
    if (rappels.length) { l.push(`RAPPELS SUR REPOS (${rappels.length})`); rappels.forEach((r) => l.push(`- ${M.longue(r.date)} : ${r.code}. ${delai(r.date, r.appelLe, r.code)}. ${r.compense ? 'Compensé.' : 'Non compensé.'}`)); l.push(''); }
    if (changes.length) { l.push(`CHANGEMENTS DE PLANNING (${changes.length})`); changes.forEach((r) => l.push(`- ${M.longue(r.date)} : ${r.ancien} → ${r.nouveau}. ${delai(r.date, r.prevenuLe, r.nouveau)}.`)); l.push(''); }
    if (deps.length) { l.push(`DÉPASSEMENTS (${deps.length}, total ${M.formatDuree(deps.reduce((s, j) => s + j.depassementMin, 0))})`); deps.forEach((j) => l.push(`- ${M.longue(j.date)} : ${j.code} ${M.formatDuree(j.depassementMin, true)}${j.note ? ' — ' + j.note : ''}`)); }
    return l.join('\n');
  };
  return {
    nav: 'preuves',
    html: `${barreHaut()}<div class="ligne-titre"><h1>Mes preuves</h1></div>
      <div class="page" style="margin-top:.5rem">
        <p class="texte">Rappels sur repos, changements de dernière minute, dépassements : tout est daté et reste sur ton téléphone, prêt à montrer au syndicat.</p>
        <div class="onglets" role="tablist" aria-label="Type de preuve" data-tour="onglets-preuves">
          <a href="#/preuves/rappels" ${onglet === 'rappels' ? 'aria-current="page"' : ''}>Rappels · ${rappels.length}</a>
          <a href="#/preuves/changements" ${onglet === 'changements' ? 'aria-current="page"' : ''}>Changements · ${changes.length}</a>
          <a href="#/preuves/depassements" ${onglet === 'depassements' ? 'aria-current="page"' : ''}>Dépassements · ${deps.length}</a></div>
        ${items ? `<ol class="liste">${items}</ol>` : `<div class="liste"><p class="vide-etat">${vides[onglet]}</p></div>`}
        <div class="rangee"><a class="btn principal" href="#/jour/${M.aujourdhui()}">${ic('plus')}Noter une journée</a>
          <a class="btn" id="envoyer" href="${esc(mailto(S.cfg.contacts.mailGeneral, 'Mes preuves — temps de travail', resume()))}">${ic('mail')}Envoyer</a></div>
        <p class="petit" style="display:flex;gap:.5rem;margin:0">${ic('cadenas')}<span>Rien ne quitte ton téléphone tant que tu n'envoies pas toi-même.</span></p>
      </div>`
  };
}

function vuePreuve(p) {
  const id = p[1]; const r = S.etat.preuves.find((x) => x.id === id);
  if (!r) return vuePreuves(['preuves']);
  return {
    html: `${enteteRetour(r.type === 'rappel' ? 'Rappel sur repos' : 'Changement', '#/preuves/' + (r.type === 'rappel' ? 'rappels' : 'changements'))}
      <div class="page" style="margin-top:.75rem">
        <div class="carte"><p class="etiquette">${esc(M.longue(r.date))}</p><p style="margin:.25rem 0 0;font-size:1.125rem;font-weight:700">${r.type === 'rappel' ? esc(r.code) : `${esc(r.ancien)} → ${esc(r.nouveau)}`}</p></div>
        <label class="champ"><span>${r.type === 'rappel' ? 'Appelé·e le' : 'Prévenu·e le'}</span><input type="datetime-local" id="quand" value="${esc(r.type === 'rappel' ? r.appelLe || '' : r.prevenuLe || '')}"></label>
        ${r.type === 'rappel' ? `<label class="case-a-cocher"><span><b>Compensé</b><small>Récupération ou paiement obtenu</small></span><input type="checkbox" id="comp" ${r.compense ? 'checked' : ''}></label>` : ''}
        <label class="champ"><span>Note</span><textarea id="note" maxlength="500">${esc(r.note || '')}</textarea></label>
        <button class="btn principal plein" id="ok">Enregistrer</button>
        <button class="btn plein danger" id="suppr">Supprimer cette preuve</button>
      </div>`,
    apres(el) {
      el.querySelector('#ok').onclick = () => {
        const q = el.querySelector('#quand').value; if (r.type === 'rappel') r.appelLe = q; else r.prevenuLe = q;
        const c = el.querySelector('#comp'); if (c) r.compense = c.checked;
        r.note = el.querySelector('#note').value.trim();
        sauver(); toast('Enregistré'); aller('#/preuves/' + (r.type === 'rappel' ? 'rappels' : 'changements'));
      };
      el.querySelector('#suppr').onclick = () => {
        if (!confirm('Supprimer cette preuve ?')) return;
        S.etat.preuves = S.etat.preuves.filter((x) => x.id !== id); sauver(); toast('Preuve supprimée'); aller('#/preuves');
      };
    }
  };
}

demarrer();
