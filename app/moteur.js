// Mon Temps — moteur de calcul (aucune dépendance, aucune donnée envoyée).
// Toutes les règles propres à l'établissement viennent de config/etablissement.json.

export const JOUR_MIN = 1440;

// ---------- Dates ----------
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const jourNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
export const depuisNum = (n) => { const t = new Date(n * 864e5); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
export const ajouterJours = (s, k) => depuisNum(jourNum(s) + k);
export const jourSemaine = (s) => (new Date(jourNum(s) * 864e5).getUTCDay() + 6) % 7; // 0 = lundi … 6 = dimanche
export const joursDansMois = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const hm = (s) => { if (!s) return null; const [h, m] = s.split(':').map(Number); return h * 60 + m; };

export function aujourdhui() { const t = new Date(); return iso(t.getFullYear(), t.getMonth() + 1, t.getDate()); }

export function formatDuree(min, signe = false) {
  if (!Number.isFinite(min)) min = 0;
  const neg = min < 0; const a = Math.round(Math.abs(min));
  const txt = `${Math.floor(a / 60)}h${pad(a % 60)}`;
  if (signe) return (neg ? '−' : '+') + txt;
  return (neg ? '−' : '') + txt;
}

// ---------- Jours fériés (France métropolitaine) ----------
function paques(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(y, mois, jour);
}
const cacheFeries = new Map();
export function feries(y) {
  if (cacheFeries.has(y)) return cacheFeries.get(y);
  const p = paques(y);
  const liste = {
    [iso(y, 1, 1)]: "Jour de l'an", [ajouterJours(p, 1)]: 'Lundi de Pâques', [iso(y, 5, 1)]: 'Fête du travail',
    [iso(y, 5, 8)]: 'Victoire 1945', [ajouterJours(p, 39)]: 'Ascension', [ajouterJours(p, 50)]: 'Lundi de Pentecôte',
    [iso(y, 7, 14)]: 'Fête nationale', [iso(y, 8, 15)]: 'Assomption', [iso(y, 11, 1)]: 'Toussaint',
    [iso(y, 11, 11)]: 'Armistice', [iso(y, 12, 25)]: 'Noël'
  };
  cacheFeries.set(y, liste);
  return liste;
}
export const nomFerie = (s) => feries(Number(s.slice(0, 4)))[s] || null;
export const estPentecote = (s) => nomFerie(s) === 'Lundi de Pentecôte';

// ---------- Codes ----------
export const PALETTE = ['ocre', 'sarcelle', 'brique', 'prune', 'olive'];
const TEINTE_TYPE = { nuit: 'indigo', repos: 'gris', rtt: 'azur', recup: 'turquoise', conge: 'vert', cet: 'vert', assimile: 'ambre', greve: 'rouge' };
export function tousLesCodes(cfg, etat) {
  const perso = (etat && etat.codesPerso) || [];
  const brut = new Map();
  for (const c of cfg.codes) brut.set(c.code, c);
  for (const c of perso) brut.set(c.code, c);
  // Une teinte par code : celle choisie, sinon une couleur différente pour chaque horaire de travail.
  const map = new Map(); let k = 0;
  for (const c of brut.values()) {
    const auto = c.type === 'travail' ? PALETTE[k++ % PALETTE.length] : (TEINTE_TYPE[c.type] || 'gris');
    map.set(c.code, { ...c, teinte: c.couleur || auto });
  }
  return map;
}

// Segments horaires d'un code, en minutes depuis minuit du jour (fin > début, la nuit déborde au-delà de 1440).
export function segments(info) {
  if (!info || !info.debut || !info.fin) return [];
  const out = [];
  const ajoute = (a, b) => { let s = hm(a), e = hm(b); if (s == null || e == null) return; if (e <= s) e += JOUR_MIN; out.push([s, e]); };
  ajoute(info.debut, info.fin);
  if (info.debut2 && info.fin2) {
    ajoute(info.debut2, info.fin2);
    if (out[1][0] < out[0][1]) { out[1][0] += JOUR_MIN; out[1][1] += JOUR_MIN; }
  }
  return out;
}
export function dureeEffectiveCode(info) {
  const seg = segments(info);
  const brut = seg.reduce((t, [a, b]) => t + (b - a), 0);
  return Math.max(0, brut - (Number(info && info.pauseMin) || 0));
}
export const estTravail = (info) => !!info && (info.type === 'travail' || info.type === 'nuit');

// ---------- Journée effective ----------
// Une journée = ce que l'agent a saisi comme réalisé ; à défaut, ce qui était prévu.
export function journee(date, etat, codes) {
  const e = (etat.jours && etat.jours[date]) || null;
  if (!e) return null;
  const r = e.realise && e.realise.code ? e.realise : null;
  const p = e.prevu && e.prevu.code ? e.prevu : null;
  const src = r || p;
  if (!src) return null;
  const info = codes.get(src.code) || null;
  const depassement = Number(src.depassementMin) || 0;
  const eff = estTravail(info) ? dureeEffectiveCode(info) + depassement : 0;
  return {
    date, code: src.code, info, source: r ? 'realise' : 'prevu', depassementMin: depassement,
    effMin: eff, note: src.note || '', rappel: !!src.rappel,
    prevuCode: p ? p.code : null, realiseCode: r ? r.code : null,
    change: !!(r && p && r.code !== p.code)
  };
}

// Blocs de travail en minutes absolues (pour les contrôles et les heures de nuit / dimanche).
export function blocs(j) {
  if (!j || !estTravail(j.info)) return [];
  const base = jourNum(j.date) * JOUR_MIN;
  const seg = segments(j.info).map(([a, b]) => [base + a, base + b]);
  if (seg.length && j.depassementMin > 0) seg[seg.length - 1][1] += j.depassementMin;
  return seg;
}

function minutesDans(seg, debutJour, finJour) {
  return Math.max(0, Math.min(seg[1], finJour) - Math.max(seg[0], debutJour));
}

// Minutes de nuit (par défaut 21h–6h) d'un ensemble de segments.
export function minutesNuit(segs, cfg) {
  const nd = hm(cfg.regles.nuitDebut || '21:00'), nf = hm(cfg.regles.nuitFin || '06:00');
  let t = 0;
  for (const s of segs) {
    const j0 = Math.floor(s[0] / JOUR_MIN) - 1, j1 = Math.floor(s[1] / JOUR_MIN);
    for (let j = j0; j <= j1; j++) {
      const a = j * JOUR_MIN + nd, b = (j + 1) * JOUR_MIN + nf;
      t += minutesDans(s, a, b);
    }
  }
  return t;
}

// Minutes tombant un dimanche ou un jour férié.
export function minutesDJF(segs) {
  let t = 0; const jours = new Set();
  for (const s of segs) {
    for (let j = Math.floor(s[0] / JOUR_MIN); j <= Math.floor((s[1] - 1) / JOUR_MIN); j++) {
      const d = depuisNum(j);
      if (jourSemaine(d) === 6 || nomFerie(d)) {
        const m = minutesDans(s, j * JOUR_MIN, (j + 1) * JOUR_MIN);
        if (m > 0) { t += m; jours.add(d); }
      }
    }
  }
  return { minutes: t, jours };
}

// ---------- Théorique et crédit d'une journée ----------
function quotite(etat, cfg) {
  const q = Number(etat.profil && etat.profil.quotite);
  return (Number.isFinite(q) && q > 0 ? q : cfg.regles.quotiteParDefaut || 100) / 100;
}
export function estJourOuvreTheorique(date, cfg) {
  const js = jourSemaine(date);
  if (js >= 5) return false;
  if (nomFerie(date)) return estPentecote(date) && cfg.regles.lundiPentecoteTravaille !== false;
  return true;
}
export function theoriqueJour(date, j, etat, cfg) {
  if (!estJourOuvreTheorique(date, cfg)) return 0;
  if (j && j.info && (j.info.type === 'conge' || j.info.type === 'cet')) return 0;
  return Math.round(cfg.regles.valeurJourneeHeures * 60 * quotite(etat, cfg));
}
export function creditJour(date, j, etat, cfg, codes) {
  if (!j || !j.info) return 0;
  const t = j.info.type;
  if (t === 'travail' || t === 'nuit') return j.effMin;
  if (t === 'assimile' || t === 'greve') {
    const prevu = j.prevuCode ? codes.get(j.prevuCode) : null;
    if (estTravail(prevu)) return dureeEffectiveCode(prevu);
    return estJourOuvreTheorique(date, cfg) ? Math.round(cfg.regles.valeurJourneeHeures * 60 * quotite(etat, cfg)) : 0;
  }
  return 0;
}

// ---------- Bilans ----------
export function bilanPeriode(debut, fin, etat, cfg) {
  const codes = tousLesCodes(cfg, etat);
  let theo = 0, credit = 0, saisis = 0, total = 0, depass = 0, nuit = 0;
  const manquants = [];
  for (let n = jourNum(debut); n <= jourNum(fin); n++) {
    const d = depuisNum(n); total++;
    const j = journee(d, etat, codes);
    theo += theoriqueJour(d, j, etat, cfg);
    if (j) {
      saisis++; credit += creditJour(d, j, etat, cfg, codes); depass += j.depassementMin > 0 ? j.depassementMin : 0;
      nuit += minutesNuit(blocs(j), cfg);
    } else if (estJourOuvreTheorique(d, cfg)) manquants.push(d);
  }
  return { theorique: theo, realise: credit, solde: credit - theo, saisis, total, depassements: depass, nuit, manquants };
}

export const aDesSaisies = (etat, annee) => Object.keys(etat.jours || {}).some((d) => d.startsWith(annee + '-'));

export function bilanAnnee(annee, etat, cfg, jusqua = aujourdhui(), profondeur = 0) {
  const codes = tousLesCodes(cfg, etat);
  const debut = iso(annee, 1, 1);
  const finAnnee = iso(annee, 12, 31);
  const fin = jusqua < finAnnee ? jusqua : finAnnee;
  // Point de départ : saisi par l'agent (installation en cours d'année, relevé officiel),
  // sinon le premier jour saisi. Les jours d'avant ne comptent pas dans le solde.
  const pd = (etat.departs || {})[annee] || null;
  const premiere = Object.keys(etat.jours || {}).filter((d) => d >= debut).sort()[0] || fin;
  let depart = pd && pd.date >= debut && pd.date <= finAnnee ? pd.date : (premiere > debut ? premiere : debut);
  const mois = [];
  for (let m = 1; m <= 12; m++) {
    const a = iso(annee, m, 1), b = iso(annee, m, joursDansMois(annee, m));
    if (a > fin || b < depart) { mois.push(null); continue; }
    mois.push(bilanPeriode(a > depart ? a : depart, b < fin ? b : fin, etat, cfg));
  }
  const cumul = mois.filter(Boolean).reduce((s, x) => ({
    theorique: s.theorique + x.theorique, realise: s.realise + x.realise, depassements: s.depassements + x.depassements,
    nuit: s.nuit + x.nuit, saisis: s.saisis + x.saisis, total: s.total + x.total, manquants: s.manquants.concat(x.manquants)
  }), { theorique: 0, realise: 0, depassements: 0, nuit: 0, saisis: 0, total: 0, manquants: [] });
  // Solde de départ : celui saisi par l'agent, sinon le solde calculé de l'année précédente.
  let report = 0, reportAuto = false;
  if (pd && Number.isFinite(Number(pd.soldeMin))) report = Number(pd.soldeMin);
  else if (aDesSaisies(etat, annee - 1) && profondeur < 3) { report = bilanAnnee(annee - 1, etat, cfg, iso(annee - 1, 12, 31), profondeur + 1).solde; reportAuto = true; }

  // Compteurs sur l'année entière (prévus compris) pour les congés.
  let rtt = 0, ca = 0, recup = 0, caHorsSaison = 0, rh = 0, ge = 0, nuits = 0, cetPris = 0, feriesTravailles = 0, dimanchesTravailles = 0;
  const caJours = [];
  const djf = { minutes: 0, jours: new Set() };
  const ps = cfg.regles.periodeEstivale || { debut: '05-01', fin: '10-31' };
  // Avec un point de départ, les jours d'avant sont comptés par les chiffres du relevé.
  const debutCompte = pd ? depart : debut;
  for (let n = jourNum(debutCompte); n <= jourNum(finAnnee); n++) {
    const d = depuisNum(n); const j = journee(d, etat, codes);
    if (!j || !j.info) continue;
    if (j.info.type === 'rtt') rtt++;
    if (j.info.type === 'recup') recup++;
    if (j.info.type === 'cet') cetPris++;
    if (d <= fin && (j.info.compte === 'rh' || j.code === 'RH')) rh++;
    if (j.info.compte === 'ge' || j.code === 'GE') ge++;
    if (j.code === 'CA' || (j.info.type === 'conge' && j.info.compteCA)) {
      ca++; caJours.push(d);
      const md = d.slice(5);
      if (md < ps.debut || md > ps.fin) caHorsSaison++;
    }
    if (d <= fin) {
      const bl = blocs(j); const r = minutesDJF(bl); djf.minutes += r.minutes;
      r.jours.forEach((x) => { if (!djf.jours.has(x)) { djf.jours.add(x); if (nomFerie(x)) feriesTravailles++; else dimanchesTravailles++; } });
      if (minutesNuit(bl, cfg) >= 60) nuits++;
    }
  }
  const v = (k) => (pd && Number(pd[k])) || 0;
  rtt += v('rttPris'); ca += v('caPris'); caHorsSaison += v('caHorsSaison');
  const djfJoursAvant = v('djfJours'), djfMinAvant = v('djfMin');
  // Jours supplémentaires : hors saison (3 à 5 CA → 1 j, 6 et plus → 2 j) et fractionnement (3 périodes de 5 jours ouvrés).
  const bonusHS = caHorsSaison >= 6 ? 2 : caHorsSaison >= 3 ? 1 : 0;
  const periodes = periodesConges(caJours, etat, codes);
  const bonusFrac = periodes.filter((p) => p >= 5).length >= 3 ? 1 : 0;
  const q = quotite(etat, cfg);
  return {
    annee, jusqua: fin, depart: depart <= fin ? depart : null, pointDepart: pd, mois, report, reportAuto,
    solde: cumul.realise - cumul.theorique + report,
    theorique: cumul.theorique, realise: cumul.realise, depassements: cumul.depassements, nuit: cumul.nuit,
    saisis: cumul.saisis, total: cumul.total, manquants: cumul.manquants,
    rhPris: rh, rhRepere: Math.round((cfg.regles.rhParAn || 104)), gePris: ge, geDroit: (cfg.regles.gardeEnfantJours || 6) * (etat.profil && etat.profil.geDouble ? 2 : 1) * q,
    nuits, cetPris, feriesTravailles, dimanchesTravailles, recupMin: recup * Math.round(cfg.regles.valeurJourneeHeures * 60 * q),
    rttPris: rtt, rttDroit: Math.round((cfg.regles.rttParAn || 0) * q), recupPris: recup,
    caPris: ca, caDroit: Math.round((cfg.regles.caParAn || 25) * q), caHorsSaison, bonusHS, bonusFrac,
    djfMinutes: djf.minutes + djfMinAvant, djfJours: djf.jours.size + djfJoursAvant
  };
}

// Longueur (en jours ouvrés) de chaque période continue de congés.
function periodesConges(jours, etat, codes) {
  const set = new Set(jours); const vus = new Set(); const out = [];
  for (const d of jours.sort()) {
    if (vus.has(d)) continue;
    let n = 0, c = d;
    // une période continue de CA, en traversant week-ends et repos
    while (true) {
      if (set.has(c)) { vus.add(c); if (jourSemaine(c) < 5 && !nomFerie(c)) n++; }
      else {
        const j = journee(c, etat, codes);
        const pont = (jourSemaine(c) >= 5 || nomFerie(c) || (j && j.info && (j.info.type === 'repos')));
        if (!pont) break;
      }
      c = ajouterJours(c, 1);
      if (jourNum(c) - jourNum(d) > 60) break;
    }
    out.push(n);
  }
  return out;
}

// ---------- Contrôles légaux (décret n° 2002-9, art. 6 et 7) ----------
export function controles(debut, fin, etat, cfg) {
  const codes = tousLesCodes(cfg, etat);
  const R = cfg.regles; const today = aujourdhui();
  const alertes = [];
  const ajoute = (date, regle, article, message) => alertes.push({ date, regle, article, message: message.replace(/\.\.$/, '.').replace(/\.\. /g, '. '), futur: date > today });

  // Journées sur une fenêtre élargie pour les règles glissantes.
  const d0 = ajouterJours(debut, -14), d1 = ajouterJours(fin, 14);
  const js = {}; const tous = [];
  for (let n = jourNum(d0); n <= jourNum(d1); n++) {
    const d = depuisNum(n); const j = journee(d, etat, codes); js[d] = j;
    const b = blocs(j);
    if (b.length) tous.push({ date: d, debut: b[0][0], fin: b[b.length - 1][1], eff: j.effMin, segs: b });
  }
  const dansPeriode = (d) => d >= debut && d <= fin;

  // Amplitude et service coupé (art. 7)
  for (const t of tous) {
    if (!dansPeriode(t.date)) continue;
    const ampl = (t.fin - t.debut) / 60;
    if (t.segs.length > 1) {
      if (ampl > R.amplitudeServiceCoupeHeures) ajoute(t.date, 'Amplitude du service coupé', 'art. 7', `Amplitude de ${formatDuree(ampl * 60)} pour une journée en deux vacations (maximum ${formatDuree(R.amplitudeServiceCoupeHeures * 60)}).`);
      for (const s of t.segs) if ((s[1] - s[0]) / 60 < R.vacationMinHeures) ajoute(t.date, 'Vacation trop courte', 'art. 7', `Une vacation de ${formatDuree(s[1] - s[0])} (minimum ${R.vacationMinHeures}h par vacation).`);
    } else if (ampl > R.amplitudeMaxHeures) {
      ajoute(t.date, 'Amplitude de la journée', 'art. 7', `Amplitude de ${formatDuree(ampl * 60)} (maximum ${R.amplitudeMaxHeures}h).`);
    }
  }

  // Repos quotidien (art. 6)
  tous.sort((a, b) => a.debut - b.debut);
  for (let i = 1; i < tous.length; i++) {
    const gap = tous[i].debut - tous[i - 1].fin;
    if (gap >= 0 && gap < R.reposQuotidienMinHeures * 60 && (dansPeriode(tous[i].date))) {
      ajoute(tous[i].date, 'Repos quotidien', 'art. 6', `${formatDuree(gap)} de repos seulement après la journée du ${courte(tous[i - 1].date)} (minimum ${R.reposQuotidienMinHeures}h consécutives).`);
    }
  }

  // 48h sur 7 jours glissants (art. 6)
  let derniere = null;
  for (let n = jourNum(debut) - 6; n <= jourNum(fin); n++) {
    const a = depuisNum(n), b = depuisNum(n + 6);
    let s = 0; for (let k = 0; k < 7; k++) { const j = js[depuisNum(n + k)]; if (j) s += j.effMin; }
    if (s > R.maxSeptJoursHeures * 60 && dansPeriode(b) && (!derniere || n - derniere >= 7)) {
      ajoute(b, '48 heures sur 7 jours', 'art. 6', `${formatDuree(s)} de travail du ${courte(a)} au ${courte(b)} (maximum ${R.maxSeptJoursHeures}h sur 7 jours, heures sup comprises).`);
      derniere = n;
    }
  }

  // Repos hebdomadaire de 36h consécutives (art. 6) — semaines du lundi au dimanche entièrement saisies.
  const trous = [];
  for (let i = 1; i < tous.length; i++) trous.push([tous[i - 1].fin, tous[i].debut]);
  for (let n = jourNum(debut) - jourSemaine(debut); n <= jourNum(fin); n += 7) {
    const lundi = depuisNum(n), dimanche = depuisNum(n + 6);
    let complete = true; for (let k = 0; k < 7; k++) if (!js[depuisNum(n + k)]) complete = false;
    if (!complete || !dansPeriode(dimanche) && !dansPeriode(lundi)) continue;
    const a = n * JOUR_MIN, b = (n + 7) * JOUR_MIN;
    const travailSemaine = tous.filter((t) => t.fin > a && t.debut < b);
    if (!travailSemaine.length) continue;
    const ok = trous.some(([x, y]) => y - x >= R.reposHebdoMinHeures * 60 && ((x >= a && x < b) || (y > a && y <= b)));
    if (!ok) ajoute(dimanche, 'Repos hebdomadaire', 'art. 6', `Pas de repos de ${R.reposHebdoMinHeures}h consécutives dans la semaine du ${courte(lundi)} au ${courte(dimanche)}.`);
  }

  // Repos de la quinzaine : 4 jours, dont 2 consécutifs, dont un dimanche (art. 6)
  const ref = jourNum('2024-01-01'); // un lundi
  let n0 = jourNum(debut); n0 -= ((n0 - ref) % 14 + 14) % 14;
  for (let n = n0; n <= jourNum(fin); n += 14) {
    const jours = []; let complete = true, exclue = false;
    for (let k = 0; k < 14; k++) {
      const d = depuisNum(n + k); const j = js[d] !== undefined ? js[d] : journee(d, etat, codes);
      if (!j) { complete = false; break; }
      if (j.info && ['conge', 'cet', 'assimile', 'greve', 'rtt', 'recup'].includes(j.info.type)) exclue = true;
      const touche = tous.some((t) => t.fin > (n + k) * JOUR_MIN && t.debut < (n + k + 1) * JOUR_MIN);
      jours.push({ d, repos: !touche });
    }
    if (!complete || exclue) continue;
    const dernier = depuisNum(n + 13);
    if (!dansPeriode(dernier)) continue;
    const repos = jours.filter((x) => x.repos);
    let consecutifs = false;
    for (let k = 1; k < 14; k++) if (jours[k].repos && jours[k - 1].repos) consecutifs = true;
    const dimanche = repos.some((x) => jourSemaine(x.d) === 6);
    const probs = [];
    if (repos.length < R.reposQuinzaineMinJours) probs.push(`${repos.length} jour(s) de repos au lieu de ${R.reposQuinzaineMinJours}`);
    if (!consecutifs) probs.push('aucun repos de 2 jours consécutifs');
    if (!dimanche) probs.push('aucun dimanche de repos');
    if (probs.length) ajoute(dernier, 'Repos de la quinzaine', 'art. 6', `Quinzaine du ${courte(depuisNum(n))} au ${courte(dernier)} : ${probs.join(', ')}.`);
  }

  return alertes.sort((a, b) => a.date.localeCompare(b.date));
}

export const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export function courte(d) { const [, m, j] = d.split('-').map(Number); return `${j} ${MOIS_COURTS[m - 1]}`; }
export function longue(d) { const [y, m, j] = d.split('-').map(Number); return `${JOURS[jourSemaine(d)]} ${j} ${MOIS[m - 1]} ${y}`; }

// ---------- Compte épargne-temps ----------
export function soldeCet(etat, cfg) {
  const codes = tousLesCodes(cfg, etat);
  const epargne = ((etat.cet && etat.cet.mouvements) || []).reduce((t, m) => t + (Number(m.jours) || 0), 0);
  let pris = 0;
  for (const d of Object.keys(etat.jours || {})) { const j = journee(d, etat, codes); if (j && j.info && j.info.type === 'cet') pris++; }
  return { epargne, pris, solde: epargne - pris };
}

// Détail d'une période pour la paie : heures de nuit, dimanches et fériés, dépassements.
export function elementsPaie(debut, fin, etat, cfg) {
  const codes = tousLesCodes(cfg, etat); let nuit = 0, djf = 0, dep = 0, travail = 0;
  for (let n = jourNum(debut); n <= jourNum(fin); n++) {
    const j = journee(depuisNum(n), etat, codes); if (!j) continue;
    const bl = blocs(j); nuit += minutesNuit(bl, cfg); djf += minutesDJF(bl).minutes; dep += Math.max(0, j.depassementMin); travail += j.effMin;
  }
  return { nuit, djf, dep, travail };
}
export function numeroSemaine(d) {
  const n = jourNum(d); const jeudi = n - jourSemaine(d) + 3; const an = Number(depuisNum(jeudi).slice(0, 4));
  return 1 + Math.floor((jeudi - jourNum(iso(an, 1, 4)) + jourSemaine(iso(an, 1, 4))) / 7);
}
