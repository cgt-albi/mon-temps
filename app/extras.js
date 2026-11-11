// Mon Temps — élections, rappel du soir, cycles de travail, simulateur, dossier pour le syndicat.
import * as M from './moteur.js';
import { S, codes, sauver, aller } from './etat.js';
import { esc, ic, chevron, enteteRetour, mailto, badgeProvisoire, toast, emettre } from './commun.js';

const jourNum = (d) => M.jourNum(d);
const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const lien = (h, t, s) => `<li><a class="lien" href="${h}"><span>${t}<span class="sous">${s}</span></span>${chevron()}</a></li>`;

// ---------- Date de la prochaine paie ----------
// Règle par défaut : dernier jour ouvré du mois, moins N jours ; si ce jour tombe un week-end ou un férié, on recule.
const ouvre = (d) => M.jourSemaine(d) < 5 && !M.nomFerie(d);
function datePaie(mois, p) {
  const ex = (p.exceptions || []).find((x) => x && x.mois === mois && x.date); if (ex) return ex.date;
  const [y, m] = mois.split('-').map(Number); let d = M.iso(y, m, M.joursDansMois(y, m));
  while (!ouvre(d)) d = M.ajouterJours(d, -1);
  d = M.ajouterJours(d, -(Number(p.decalageJours) >= 0 ? Number(p.decalageJours) : 2));
  while (!ouvre(d)) d = M.ajouterJours(d, -1);
  return d;
}
export function prochainePaie() {
  const p = S.cfg.paie; if (!p || p.actif === false) return null;
  const t = M.aujourdhui(); const [y, m] = t.split('-').map(Number);
  for (let k = 0; k < 3; k++) { const dt = new Date(Date.UTC(y, m - 1 + k, 1)); const mois = `${dt.getUTCFullYear()}-${M.pad(dt.getUTCMonth() + 1)}`; const d = datePaie(mois, p); if (d >= t) return { date: d, jours: jourNum(d) - jourNum(t), note: p.note || '' }; }
  return null;
}
export function textePaie() {
  const x = prochainePaie(); if (!x) return '';
  return `Prochaine paie : ${M.longue(x.date).replace(/ \d{4}$/, '')}${x.jours === 0 ? ' (aujourd\'hui)' : x.jours === 1 ? ' (demain)' : ` (dans ${x.jours} jours)`}`;
}
export const lignePaie = () => { const t = textePaie(); return t ? `<p class="petit ligne-paie">${ic('euro')}<span>${esc(t)}${badgeProvisoire(S.cfg, 'paie')}</span></p>` : ''; };

// ---------- Élections ----------
const elec = () => { const e = S.cfg.elections; return e && e.actif !== false && e.dateScrutin ? e : null; };
export function joursAvantScrutin(e = elec()) { return e ? jourNum(e.dateScrutin) - jourNum(M.aujourdhui()) : null; }
function elecVisible() {
  const e = elec(); if (!e) return false;
  const j = joursAvantScrutin(e);
  const fin = e.afficherJusquau || M.ajouterJours(e.dateScrutin, 1);
  return j <= (Number(e.afficherDepuisJours) || 60) && M.aujourdhui() <= fin;
}
const decompte = (e) => {
  const j = joursAvantScrutin(e), ouv = e.ouvertureVote ? jourNum(e.ouvertureVote) - jourNum(M.aujourdhui()) : null;
  if (j < 0) return { grand: 'Terminé', petit: 'Les résultats sont publiés après le scrutin.' };
  if (j === 0) return { grand: 'Aujourd\'hui', petit: 'Dernier jour pour voter.' };
  const grand = j === 1 ? 'Demain' : `J−${j}`;
  return { grand, petit: ouv != null && ouv > 0 ? `Le vote ouvre dans ${pl(ouv, 'jour')}.` : (ouv != null && ouv <= 0 ? 'Le vote est ouvert.' : `Scrutin dans ${pl(j, 'jour')}.`) };
};

export function vueElections() {
  const e = S.cfg.elections;
  if (!e || !e.dateScrutin) return { html: `${enteteRetour('Élections', '#/syndicat')}<div class="page"><p class="vide-etat">Rien à afficher pour l'instant.</p></div>` };
  const d = decompte(e); const aVote = !!S.etat.reglages.aVote;
  const etapes = (e.etapes || []).filter((x) => x && x.titre);
  const questions = (e.questions || []).filter((x) => x && x.question);
  return {
    html: `${enteteRetour(esc(e.titre || 'Élections professionnelles'), '#/syndicat')}
      <div class="page" style="margin-top:.75rem">
        <section class="carte sombre decompte"><p class="etiquette" style="color:var(--carte-sombre-texte)">${esc(M.longue(e.dateScrutin))}</p>
          <p class="gros-chiffre">${esc(d.grand)}</p><p class="petit" style="color:var(--carte-sombre-texte);margin:0">${esc(d.petit)}</p></section>
        ${e.texteIntro ? `<p class="texte" style="white-space:pre-line">${esc(e.texteIntro)}${badgeProvisoire(S.cfg, 'elections')}</p>` : ''}
        ${e.modalites ? `<section class="carte"><h2>Comment ça se passe au ${esc(S.cfg.etablissement)}</h2><p class="texte" style="margin-top:.375rem;white-space:pre-line">${esc(e.modalites)}${badgeProvisoire(S.cfg, 'elections')}</p></section>` : ''}
        <label class="case-a-cocher"><span><b>J'ai voté</b><small>Seulement pour toi : ça reste sur ton téléphone</small></span><input type="checkbox" id="vote" ${aVote ? 'checked' : ''}></label>
        ${etapes.length ? `<p class="etiquette">Mode d'emploi</p><ol class="liste etapes">${etapes.map((x, i) => `<li><div class="ligne" style="align-items:flex-start"><b class="num-etape">${i + 1}</b><span style="flex:1"><b>${esc(x.titre)}</b>${x.texte ? `<span class="sous">${esc(x.texte)}</span>` : ''}</span></div></li>`).join('')}</ol>` : ''}
        ${e.appel ? `<section class="carte"><h2>${esc(S.cfg.syndicat || 'Le syndicat')}</h2><p class="texte" style="margin-top:.375rem;white-space:pre-line">${esc(e.appel)}</p></section>` : ''}
        ${questions.length ? `<p class="etiquette">Questions fréquentes</p>${questions.map((x) => `<details class="carte"><summary style="font-weight:700;cursor:pointer;min-height:1.75rem;display:flex;align-items:center">${esc(x.question)}</summary><p class="texte" style="margin-top:.5rem;white-space:pre-line">${esc(x.reponse || '')}</p></details>`).join('')}` : ''}
        ${e.lienOfficiel ? `<a class="btn plein" href="${esc(e.lienOfficiel)}" target="_blank" rel="noopener">${ic('web')}Site officiel</a>` : ''}
      </div>`,
    apres(el) { el.querySelector('#vote').onchange = (ev) => { S.etat.reglages.aVote = ev.target.checked; sauver(); }; }
  };
}

// ---------- Bandeaux du planning : élections, journées à confirmer ----------
export function bandeaux() {
  let h = '';
  const today = M.aujourdhui();
  // journées passées (7 derniers jours) prévues mais pas confirmées, travail seulement
  const C = codes(); const aConfirmer = [];
  for (let k = 1; k <= 7; k++) {
    const d = M.ajouterJours(today, -k); const e = S.etat.jours[d];
    if (e && e.prevu && !e.realise) { const info = C.get(e.prevu.code); if (info && (info.type === 'travail' || info.type === 'nuit')) aConfirmer.push(d); }
  }
  const soir = new Date().getHours() >= 17; const e0 = S.etat.jours[today];
  const auj = soir && e0 && e0.prevu && !e0.realise && (C.get(e0.prevu.code) || {}).debut;
  if (aConfirmer.length || auj) {
    const cible = auj ? today : aConfirmer[0];
    const n = aConfirmer.length + (auj ? 1 : 0);
    h += `<a class="bandeau" href="#/jour/${cible}"><span class="bandeau-i">${ic('horloge')}</span><span style="flex:1"><b>${auj && !aConfirmer.length ? 'Ta journée s\'est passée comme prévu ?' : `${pl(n, 'journée')} à confirmer`}</b><span class="sous">${auj && !aConfirmer.length ? 'Confirme-la en deux gestes.' : 'Une seule touche si rien n\'a changé.'}</span></span>${chevron()}</a>`;
  }
  const e = elec();
  if (elecVisible() && !S.etat.reglages.aVote) {
    const d = decompte(e);
    h += `<a class="bandeau rouge" href="#/elections"><span class="bandeau-i">${ic('coche')}</span><span style="flex:1"><b>${esc(e.titre || 'Élections professionnelles')} · ${esc(d.grand)}</b><span class="sous">${esc(d.petit)}</span></span>${chevron()}</a>`;
  }
  return h ? `<div class="bandeaux page" style="margin-top:.5rem">${h}</div>` : '';
}
export const carteElections = () => {
  const e = elec(); if (!e || !elecVisible()) return '';
  const d = decompte(e);
  return `<a class="carte sombre decompte-mini" href="#/elections"><span><span class="etiquette" style="color:var(--carte-sombre-texte)">${esc(e.titre || 'Élections professionnelles')}</span><b style="display:block;font-size:1.25rem;font-stretch:85%">${esc(d.grand)} · ${esc(M.courte(e.dateScrutin))}</b><span class="petit" style="color:var(--carte-sombre-texte)">${esc(d.petit)}</span></span>${chevron()}</a>`;
};

// ---------- Cycles de travail ----------
const cycles = () => (S.etat.reglages.cycles = S.etat.reglages.cycles || []);
export function vueCycle() {
  const C = codes(); const Y = (S.vue.cycle = S.vue.cycle || { seq: [], nom: '', debut: M.ajouterJours(M.aujourdhui(), 1), fin: M.ajouterJours(M.aujourdhui(), 56), choisi: null });
  const travail = [...C.values()].filter((c) => c.debut), autres = [...C.values()].filter((c) => !c.debut);
  const sauves = cycles();
  const seq = Y.choisi != null && sauves[Y.choisi] ? sauves[Y.choisi].seq : Y.seq;
  const jours = Math.max(0, jourNum(Y.fin) - jourNum(Y.debut) + 1);
  const puce = (c, i) => { const info = C.get(c); const cls = info && info.debut ? `k k-${info.teinte}` : `t-${info ? info.type : 'repos'}`; return `<span class="pilule ${cls}">${esc(c)}</span>`; };
  return {
    html: `${enteteRetour('Cycles de travail', '#/remplir')}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">Ton roulement se répète ? Compose-le une fois (par exemple deux matins, deux soirs, trois repos), puis déroule-le sur plusieurs semaines d'un seul geste.</p>
        ${sauves.length ? `<p class="etiquette">Mes cycles</p><ul class="liste">${sauves.map((c, i) => `<li><button class="lien" data-choisir="${i}" style="${Y.choisi === i ? 'background:var(--filet2)' : ''}"><span style="flex:1;text-align:left"><b>${esc(c.nom)}</b><span class="sous">${pl(c.seq.length, 'jour')} · ${esc(c.seq.slice(0, 8).join(' '))}${c.seq.length > 8 ? '…' : ''}</span></span>${Y.choisi === i ? ic('coche') : chevron()}</button></li>`).join('')}</ul>` : ''}
        <p class="etiquette">${Y.choisi != null ? 'Cycle choisi' : 'Composer un cycle'}</p>
        <div class="carte" style="display:flex;flex-direction:column;gap:.625rem">
          <div class="pilules">${seq.length ? seq.map(puce).join('') : '<span class="petit">Touche les codes ci-dessous, dans l\'ordre des jours.</span>'}</div>
          ${Y.choisi == null ? `<div class="codes-travail">${travail.map((c) => `<button type="button" class="code k k-${c.teinte}" data-ajout="${esc(c.code)}"><b>${esc(c.code)}</b><span>${esc(c.debut)}–${esc(c.fin)}</span></button>`).join('')}</div>
          <div class="codes-autres">${autres.map((c) => `<button type="button" class="puce t-${esc(c.type)}" data-ajout="${esc(c.code)}" title="${esc(c.libelle)}">${esc(c.code)}</button>`).join('')}</div>
          <div class="rangee"><button class="btn" id="annuler" ${seq.length ? '' : 'disabled'}>Retirer le dernier</button><button class="btn" id="vider" ${seq.length ? '' : 'disabled'}>Tout effacer</button></div>
          <div class="rangee"><label class="champ"><span>Nom du cycle</span><input id="nomc" value="${esc(Y.nom)}" placeholder="Ex. : Mon roulement"></label><button class="btn" id="garder" ${seq.length ? '' : 'disabled'}>Enregistrer</button></div>` : `<div class="rangee"><button class="btn" id="autre">Composer un autre cycle</button><button class="btn danger" id="suppr">Supprimer</button></div>`}
        </div>
        <p class="etiquette">Dérouler sur</p>
        <div class="rangee"><label class="champ"><span>Du</span><input type="date" id="d1" value="${Y.debut}"></label><label class="champ"><span>Au</span><input type="date" id="d2" value="${Y.fin}"></label></div>
        <button class="btn principal plein" id="appliquer" ${seq.length && jours ? '' : 'disabled'}>Poser sur ${pl(jours, 'jour')}</button>
        <p class="petit">Les jours déjà confirmés (« ce que j'ai fait ») ne sont jamais modifiés. Les jours seulement prévus sont remplacés après confirmation.</p>
      </div>`,
    apres(el) {
      const re = () => S.rendre();
      el.querySelectorAll('[data-ajout]').forEach((b) => b.onclick = () => { Y.seq.push(b.dataset.ajout); re(); });
      const q = (id) => el.querySelector('#' + id);
      if (q('annuler')) q('annuler').onclick = () => { Y.seq.pop(); re(); };
      if (q('vider')) q('vider').onclick = () => { Y.seq = []; re(); };
      if (q('nomc')) q('nomc').oninput = (e) => { Y.nom = e.target.value; };
      if (q('garder')) q('garder').onclick = () => { cycles().push({ nom: (Y.nom || '').trim() || `Cycle ${cycles().length + 1}`, seq: [...Y.seq] }); Y.seq = []; Y.nom = ''; Y.choisi = cycles().length - 1; sauver(); toast('Cycle enregistré'); re(); };
      el.querySelectorAll('[data-choisir]').forEach((b) => b.onclick = () => { const i = Number(b.dataset.choisir); Y.choisi = Y.choisi === i ? null : i; re(); });
      if (q('autre')) q('autre').onclick = () => { Y.choisi = null; re(); };
      if (q('suppr')) q('suppr').onclick = () => { if (!confirm('Supprimer ce cycle ?')) return; cycles().splice(Y.choisi, 1); Y.choisi = null; sauver(); re(); };
      q('d1').onchange = (e) => { Y.debut = e.target.value || Y.debut; re(); }; q('d2').onchange = (e) => { Y.fin = e.target.value || Y.fin; re(); };
      q('appliquer').onclick = () => {
        let remplaces = 0, poses = 0;
        const jrs = []; for (let n = jourNum(Y.debut), i = 0; n <= jourNum(Y.fin); n++, i++) jrs.push([M.depuisNum(n), seq[i % seq.length]]);
        for (const [d, c] of jrs) { const e = S.etat.jours[d]; if (e && e.realise) continue; if (e && e.prevu && e.prevu.code !== c) remplaces++; }
        if (remplaces && !confirm(`${pl(remplaces, 'jour')} déjà prévu${remplaces > 1 ? 's' : ''} sera${remplaces > 1 ? 'ont' : ''} remplacé${remplaces > 1 ? 's' : ''}. Continuer ?`)) return;
        for (const [d, c] of jrs) { const e = S.etat.jours[d] || (S.etat.jours[d] = {}); if (e.realise) { if (!e.prevu) delete S.etat.jours[d]; continue; } e.prevu = { code: c }; poses++; }
        sauver(); emettre('remplir'); toast(`${pl(poses, 'jour')} posé${poses > 1 ? 's' : ''}`); aller('#/planning/' + Y.debut.slice(0, 7));
      };
    }
  };
}

// ---------- Simulateur « et si je pose… » ----------
export function vueSimuler() {
  const C = codes(); const t = M.aujourdhui();
  const S2 = (S.vue.simu = S.vue.simu || { code: 'CA', d1: M.ajouterJours(t, 30), d2: M.ajouterJours(t, 36) });
  const choix = [...C.values()].filter((c) => ['conge', 'rtt', 'cet', 'recup'].includes(c.type));
  if (!choix.find((c) => c.code === S2.code) && choix[0]) S2.code = choix[0].code;
  let res = '';
  if (S2.d1 && S2.d2 && S2.d2 >= S2.d1 && jourNum(S2.d2) - jourNum(S2.d1) < 120) {
    const copie = JSON.parse(JSON.stringify(S.etat)); const poses = [];
    for (let n = jourNum(S2.d1); n <= jourNum(S2.d2); n++) {
      const d = M.depuisNum(n); const ex = S.etat.jours[d]; const exInfo = ex && (ex.realise || ex.prevu) ? C.get((ex.realise || ex.prevu).code) : null;
      if (M.nomFerie(d) || (exInfo && exInfo.type === 'repos')) continue; // on ne pose pas sur un repos ni un férié
      if (ex && ex.realise) continue;
      const e = copie.jours[d] || (copie.jours[d] = {}); e.prevu = { code: S2.code }; poses.push(d);
    }
    const annees = [...new Set([S2.d1.slice(0, 4), S2.d2.slice(0, 4)])].map(Number);
    const bloc = (a) => {
      const av = M.bilanAnnee(a, S.etat, S.cfg, `${a}-12-31`), ap = M.bilanAnnee(a, copie, S.cfg, `${a}-12-31`);
      const ca = (b) => b.caDroit + b.bonusHS + b.bonusFrac - b.caPris, rtt = (b) => b.rttDroit - b.rttPris;
      const l = (nom, x, y, unite = '') => `<div class="res-ligne"><span>${nom}</span><b>${x}${unite} → <span style="color:${y < x ? 'var(--rouge-texte)' : 'inherit'}">${y}${unite}</span></b></div>`;
      return `<section class="carte" style="display:flex;flex-direction:column;gap:.5rem"><h2>Sur ${a}</h2><div class="res">${l('Congés annuels restants', ca(av), ca(ap), ' j')}${l('RTT restants', rtt(av), rtt(ap), ' j')}</div></section>`;
    };
    const al = M.controles(S2.d1, S2.d2, copie, S.cfg).filter((a) => a.date >= S2.d1 && a.date <= S2.d2);
    res = poses.length ? `<p class="etiquette">Ce que ça change</p><div class="carte" style="display:flex;flex-direction:column;gap:.25rem"><b>${pl(poses.length, 'jour')} posé${poses.length > 1 ? 's' : ''} : ${esc(S2.code)}</b><span class="petit">Week-ends, repos et fériés ne sont pas comptés.</span></div>${annees.map(bloc).join('')}
      ${al.length ? `<div class="carte" style="border-color:var(--ambre)"><b>${pl(al.length, 'alerte')} au décret 2002-9 sur ces dates</b><span class="petit" style="display:block">${esc(al[0].message)}</span></div>` : ''}` : '<p class="vide-etat">Aucun jour posable sur cette période (repos ou fériés).</p>';
  }
  return {
    html: `${enteteRetour('Et si je pose…', '#/outils')}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">Essaie des dates avant de les demander : tu vois l'effet sur tes congés et tes RTT. Rien n'est enregistré dans ton planning.</p>
        <label class="champ"><span>Je pose</span><select id="code">${choix.map((c) => `<option value="${esc(c.code)}" ${c.code === S2.code ? 'selected' : ''}>${esc(c.code)} · ${esc(c.libelle)}</option>`).join('')}</select></label>
        <div class="rangee"><label class="champ"><span>Du</span><input type="date" id="d1" value="${S2.d1}"></label><label class="champ"><span>Au</span><input type="date" id="d2" value="${S2.d2}"></label></div>
        ${res}
        ${res && !res.includes('vide-etat') ? `<button class="btn principal plein" id="poser">Poser pour de vrai</button>` : ''}
      </div>`,
    apres(el) {
      const q = (id) => el.querySelector('#' + id);
      q('code').onchange = (e) => { S2.code = e.target.value; S.rendre(); };
      q('d1').onchange = (e) => { S2.d1 = e.target.value; if (S2.d2 < S2.d1) S2.d2 = S2.d1; S.rendre(); };
      q('d2').onchange = (e) => { S2.d2 = e.target.value; S.rendre(); };
      if (q('poser')) q('poser').onclick = () => {
        let n = 0; for (let k = jourNum(S2.d1); k <= jourNum(S2.d2); k++) {
          const d = M.depuisNum(k); const ex = S.etat.jours[d]; const exInfo = ex && (ex.realise || ex.prevu) ? C.get((ex.realise || ex.prevu).code) : null;
          if (M.nomFerie(d) || (exInfo && exInfo.type === 'repos') || (ex && ex.realise)) continue;
          (S.etat.jours[d] || (S.etat.jours[d] = {})).prevu = { code: S2.code }; n++;
        }
        sauver(); emettre('remplir'); toast(`${pl(n, 'jour')} posé${n > 1 ? 's' : ''}`); aller('#/planning/' + S2.d1.slice(0, 7));
      };
    }
  };
}

// ---------- Dossier pour le syndicat ----------
export function vueDossier(p) {
  const t = M.aujourdhui();
  const annuel = /^\d{4}$/.test(p[1] || '');
  const mois = /^\d{4}-\d{2}$/.test(p[1] || '') ? p[1] : t.slice(0, 7);
  const debut = annuel ? `${p[1]}-01-01` : `${mois}-01`;
  const fin = annuel ? `${p[1]}-12-31` : M.iso(...mois.split('-').map(Number), M.joursDansMois(...mois.split('-').map(Number)));
  const borne = fin < t ? fin : t; const C = codes(); const pr = S.etat.profil || {};
  const bil = M.bilanPeriode(debut, borne, S.etat, S.cfg);
  const alertes = M.controles(debut, borne, S.etat, S.cfg).filter((a) => a.date >= debut && a.date <= borne);
  const pv = S.etat.preuves.filter((x) => x.date >= debut && x.date <= borne).sort((a, b) => a.date.localeCompare(b.date));
  const deps = []; for (let n = jourNum(debut); n <= jourNum(borne); n++) { const j = M.journee(M.depuisNum(n), S.etat, C); if (j && j.depassementMin > 0) deps.push(j); }
  const ligne = (l, v) => `<tr><td>${l}</td><td style="text-align:right"><b>${v}</b></td></tr>`;
  const titre = annuel ? p[1] : `${M.MOIS[Number(mois.slice(5)) - 1]} ${mois.slice(0, 4)}`;
  const voisin = (k) => { if (annuel) return String(Number(p[1]) + k); const d = new Date(Date.UTC(Number(mois.slice(0, 4)), Number(mois.slice(5)) - 1 + k, 1)); return `${d.getUTCFullYear()}-${M.pad(d.getUTCMonth() + 1)}`; };
  return {
    html: `${enteteRetour('Dossier pour le syndicat', '#/outils')}
      <div class="page pas-imprimer" style="margin-top:.75rem">
        <p class="texte">Un document unique avec ton bilan, les alertes, les rappels, les changements de planning et les dépassements de la période. Tu l'enregistres en PDF et tu l'envoies toi-même.</p>
        <div class="onglets"><a href="#/dossier/${mois}" ${!annuel ? 'aria-current="page"' : ''}>Un mois</a><a href="#/dossier/${(annuel ? p[1] : t.slice(0, 4))}" ${annuel ? 'aria-current="page"' : ''}>Une année</a></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:1.125rem;font-stretch:85%">${esc(titre.replace(/^./, (c) => c.toUpperCase()))}</b><div class="fleches"><a href="#/dossier/${voisin(-1)}" aria-label="Période précédente">${ic('gauche')}</a><a href="#/dossier/${voisin(1)}" aria-label="Période suivante">${ic('droite')}</a></div></div>
        <button class="btn principal plein" id="imprimer">${ic('imprimer')}Imprimer ou enregistrer en PDF</button>
        <p class="petit" style="margin:0">Ajoute les journées et les preuves au fil de l'eau : plus c'est précis, plus le dossier pèse.</p></div>
      <article class="releve">
        <h1 style="font-size:1.75rem">Dossier de temps de travail — ${esc(titre)}</h1>
        <p class="texte" style="margin-top:.5rem">${esc([pr.nomComplet || pr.prenom, pr.metier, pr.service].filter(Boolean).join(' · ') || 'Agent')} · ${esc(S.cfg.etablissement)} · quotité ${pr.quotite || 100} %</p>
        <table style="max-width:28rem">${ligne('Heures comptées', M.formatDuree(bil.realise))}${ligne('Heures dues', M.formatDuree(bil.theorique))}${ligne('Solde de la période', M.formatDuree(bil.realise - bil.theorique, true))}${ligne('Dépassements', M.formatDuree(bil.depassements))}${ligne('Heures de nuit', M.formatDuree(bil.nuit))}${ligne('Alertes au décret 2002-9', alertes.length)}${ligne('Rappels sur repos', pv.filter((x) => x.type === 'rappel').length)}${ligne('Changements de planning', pv.filter((x) => x.type === 'changement').length)}</table>
        ${alertes.length ? `<h2>Alertes</h2><table><tbody>${alertes.map((a) => `<tr><td style="white-space:nowrap">${esc(M.courte(a.date))}</td><td><b>${esc(a.regle)}</b> — ${esc(a.message)}</td></tr>`).join('')}</tbody></table>` : ''}
        ${pv.length ? `<h2>Rappels et changements</h2><table><tbody>${pv.map((x) => `<tr><td style="white-space:nowrap">${esc(M.courte(x.date))}</td><td>${x.type === 'rappel' ? `<b>Rappel sur repos</b> (${esc(x.code || '')}) · ${x.compense ? 'compensé' : 'non compensé'}${x.appelLe ? ` · appelé·e le ${esc(new Date(x.appelLe).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : ''}` : `<b>Changement</b> ${esc(x.ancien)} → ${esc(x.nouveau)}${x.prevenuLe ? ` · prévenu·e le ${esc(new Date(x.prevenuLe).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : ''}`}${x.note ? ` — ${esc(x.note)}` : ''}</td></tr>`).join('')}</tbody></table>` : ''}
        ${deps.length ? `<h2>Dépassements</h2><table><tbody>${deps.map((j) => `<tr><td style="white-space:nowrap">${esc(M.courte(j.date))}</td><td><b>${esc(j.code)}</b> · ${M.formatDuree(j.depassementMin, true)}${j.note ? ` — ${esc(j.note)}` : ''}</td></tr>`).join('')}</tbody></table>` : ''}
        ${!alertes.length && !pv.length && !deps.length ? '<p class="vide-etat">Rien à signaler sur cette période.</p>' : ''}
        <p class="petit" style="margin-top:1rem">Établi par l'agent à partir de ses propres saisies dans ${esc(S.cfg.nom)}, le ${esc(M.longue(t))}. Document indicatif.</p>
      </article>
      <div class="page pas-imprimer"><a class="btn plein" href="${esc(mailto((S.cfg.contacts || {}).mailGeneral, `Dossier temps de travail — ${titre}`, 'Bonjour, voici mon dossier en pièce jointe (PDF).'))}">${ic('mail')}Écrire au syndicat</a></div>`,
    apres(el) { el.querySelector('#imprimer').onclick = () => window.print(); }
  };
}
