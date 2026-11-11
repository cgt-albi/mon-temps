// Tests automatiques du moteur de calcul. Lancés par GitHub Actions avant chaque publication :
// si un test échoue, le site n'est pas mis à jour (l'ancienne version reste en ligne).
import fs from 'node:fs';
import path from 'node:path';
import * as M from '../app/moteur.js';

let ok = 0, ko = 0;
const t = (nom, cond) => { if (cond) ok++; else { ko++; console.error('ÉCHEC :', nom); } };
const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const lire = (f) => JSON.parse(fs.readFileSync(path.join(racine, 'config', f), 'utf8'));
const contenu = lire('contenu.json'); const { aValider, ...regles } = lire('regles.json');
const cfg = { ...contenu, regles, aValider, codes: lire('codes.json') };
t('codes : une liste', Array.isArray(cfg.codes) && cfg.codes.length > 0);
for (const k of ['valeurJourneeHeures', 'reposQuotidienMinHeures', 'reposHebdoMinHeures', 'maxSeptJoursHeures', 'amplitudeMaxHeures']) t(`règle ${k} est un nombre`, typeof regles[k] === 'number' && regles[k] > 0);

// Réglages cohérents
const vus = new Set();
for (const c of cfg.codes) {
  t(`code ${c.code} unique`, !vus.has(c.code)); vus.add(c.code);
  t(`code ${c.code} a un type connu`, ['travail', 'nuit', 'repos', 'rtt', 'conge', 'recup', 'cet', 'assimile', 'greve'].includes(c.type));
  if (c.type === 'travail' || c.type === 'nuit') t(`code ${c.code} a des horaires`, /^\d\d:\d\d$/.test(c.debut) && /^\d\d:\d\d$/.test(c.fin));
}
t('nom présent', typeof cfg.nom === 'string' && cfg.nom.trim().length > 0);

// Dates et fériés
t('Pâques 2026', M.feries(2026)['2026-04-06'] === 'Lundi de Pâques');
t('Pentecôte 2027', M.feries(2027)['2027-05-17'] === 'Lundi de Pentecôte');
t('jour de semaine', M.jourSemaine('2026-11-11') === 2);

// Durées
t('durée de nuit', M.dureeEffectiveCode({ debut: '21:00', fin: '07:00', pauseMin: 0 }) === 600);
t('service coupé', M.dureeEffectiveCode({ debut: '07:00', fin: '11:00', debut2: '16:00', fin2: '20:00' }) === 480);
t('heures de nuit', M.minutesNuit([[M.jourNum('2026-01-05') * 1440 + 20 * 60, M.jourNum('2026-01-05') * 1440 + 31 * 60]], cfg) === 540);

// Semaine type sans infraction
const etat = { profil: { quotite: 100 }, jours: {}, preuves: [], codesPerso: [], departs: {} };
const code = cfg.codes.find((c) => c.type === 'travail').code;
for (let n = M.jourNum('2026-03-02'); n < M.jourNum('2026-03-30'); n++) {
  const d = M.depuisNum(n); etat.jours[d] = { prevu: { code: M.jourSemaine(d) >= 5 ? 'RH' : code } };
}
t('semaine type : aucune alerte', M.controles('2026-03-02', '2026-03-29', etat, cfg).length === 0);

// Repos quotidien trop court
etat.jours['2026-03-10'] = { realise: { code, depassementMin: 600 } };
t('repos < 12h détecté', M.controles('2026-03-02', '2026-03-29', etat, cfg).some((a) => a.regle === 'Repos quotidien'));

// Bilan : un congé ne compte pas dans le dû
const b = M.bilanPeriode('2026-03-02', '2026-03-06', { ...etat, jours: { '2026-03-02': { prevu: { code: 'CA' } } } }, cfg);
t('congé retiré du dû', b.theorique === 4 * cfg.regles.valeurJourneeHeures * 60);

// Point de départ en cours d'année et report automatique d'une année sur l'autre
const e2 = { profil: { quotite: 100 }, jours: { '2026-11-02': { prevu: { code } } }, preuves: [], codesPerso: [], departs: { 2026: { date: '2026-11-02', soldeMin: 600, rttPris: 10, caPris: 20 } } };
const b26 = M.bilanAnnee(2026, e2, cfg, '2026-11-02');
t('point de départ : solde repris', b26.report === 600 && b26.depart === '2026-11-02');
t('point de départ : RTT et CA repris', b26.rttPris === 10 && b26.caPris === 20);
const b27 = M.bilanAnnee(2027, e2, cfg, '2027-01-01');
t('report automatique au 1er janvier', b27.reportAuto === true && b27.report === M.bilanAnnee(2026, e2, cfg, '2026-12-31').solde);

t('semaine ISO', M.numeroSemaine('2026-11-11') === 46 && M.numeroSemaine('2027-01-01') === 53);
t('teintes distinctes', new Set([...M.tousLesCodes(cfg, etat).values()].filter((c) => c.type === 'travail').slice(0, 3).map((c) => c.teinte)).size === 3);


// Barèmes datés
const bar = lire('baremes.json');
const datesOk = (l) => Array.isArray(l) && l.length > 0 && l.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date));
t('barèmes : point d\'indice daté', datesOk(bar.pointIndice) && bar.pointIndice.every((x) => x.valeur > 4 && x.valeur < 6));
t('barèmes : SMIC daté et croissant', datesOk(bar.smic) && bar.smic.every((x, k, a) => k === 0 || x.horaire >= a[k - 1].horaire));
t('barèmes : indice minimum daté', datesOk(bar.indiceMinimum) && bar.indiceMinimum.every((x) => x.indice >= 300 && x.indice <= 500));
t('barèmes : grilles valides', (bar.grilles || []).every((g) => g.nom && Array.isArray(g.echelons) && g.echelons.every((e) => e.indice >= 300 && e.indice <= 1100)));
const el = contenu.elections; t('élections : dates cohérentes', !el || (/^\d{4}-\d{2}-\d{2}$/.test(el.dateScrutin) && (!el.ouvertureVote || el.ouvertureVote <= el.dateScrutin)));
const pr = lire('primes.json'); const idsP = new Set();
t('primes : liste', Array.isArray(pr.liste) && pr.liste.length > 0);
for (const x of pr.liste) { t(`prime ${x.id} : identifiant unique`, x.id && !idsP.has(x.id)); idsP.add(x.id); t(`prime ${x.id} : mode connu`, ['points', 'pourcentage', 'montant', 'points-saisis', 'saisie'].includes(x.mode)); t(`prime ${x.id} : valeur numérique`, typeof x.valeur === 'number' && x.valeur >= 0); }

// Textes modifiables et courriers
const tOr = lire('textes-origine.json'); const tIdx = lire('textes-index.json');
t('textes : index non vide', Array.isArray(tIdx.fichiers) && tIdx.fichiers.length > 0);
for (const f of tIdx.fichiers) { const j = lire(f); t(`${f} : clés connues et textes non vides`, Array.isArray(j.textes) && j.textes.every((e) => typeof e.texte === 'string' && e.texte.trim() && tOr[e.cle] !== undefined)); }
const cou = lire('courriers.json'); const idsC = new Set();
t('courriers : modèles', Array.isArray(cou.modeles) && cou.modeles.length > 0 && typeof cou.formule === 'string');
for (const m of cou.modeles) { t(`courrier ${m.id} : complet et unique`, m.id && m.titre && m.texte && !idsC.has(m.id)); idsC.add(m.id); }
console.log(`${ok} tests réussis, ${ko} en échec`);
if (ko) process.exit(1);
