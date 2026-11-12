// Import d'un « Emploi du temps individuel » exporté d'Octime en PDF.
// Tout se passe sur le téléphone : le PDF est lu par pdf.js (hébergé avec l'appli), puis découpé
// ligne par ligne selon une règle fixe (pas d'IA). Seuls les dates, les codes et les horaires sont gardés :
// le nom, le matricule et le service figurant sur le relevé ne sont jamais enregistrés.
import * as M from './moteur.js';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const PLAGE = /(\d{1,2})h(\d{2})\s*-\s*(\d{1,2})h(\d{2})(?:\s*\(\s*-\s*(\d{1,2})h(\d{2})\s*\))?/;

// ---------- 1. Texte du PDF → lignes (pdf.js) ----------
export async function lignesDuPdf(fichier) {
  const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()), isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
  const lignes = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    // regrouper les morceaux de texte par hauteur (même ligne), puis de gauche à droite
    const rangs = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5];
      let r = rangs.find((k) => Math.abs(k.y - y) < 3);
      if (!r) { r = { y, morceaux: [] }; rangs.push(r); }
      r.morceaux.push({ x, s: it.str });
    }
    rangs.sort((a, b) => b.y - a.y);
    for (const r of rangs) lignes.push(r.morceaux.sort((a, b) => a.x - b.x).map((m) => m.s.trim()).join(' ').replace(/\s+/g, ' ').trim());
    page.cleanup();
  }
  await doc.destroy();
  return lignes;
}

// ---------- 2. Lignes → journées (règle fixe, testée) ----------
// Renvoie { estOctime, jours: { 'AAAA-MM-JJ': { code, plages: [[début, fin, pause], …] } }, mois: [...] }
export function analyserLignes(lignes) {
  const jours = {}; const moisVus = [];
  let an = null, mois = null, dernier = null, estOctime = false;
  for (const brute of lignes) {
    const l = String(brute).replace(/\s+/g, ' ').trim();
    if (!l) continue;
    if (/EMPLOI DU TEMPS INDIVIDUEL/i.test(l)) estOctime = true;
    const m = /DU MOIS DE\s+(\S+)\s+(\d{4})/i.exec(l);
    if (m) {
      const i = MOIS.findIndex((x) => sansAccent(x) === sansAccent(m[1]));
      if (i >= 0) { mois = i + 1; an = Number(m[2]); moisVus.push(`${an}-${M.pad(mois)}`); }
      dernier = null; continue;
    }
    if (!an) continue;
    const j = /^([LMJVSD])\s+(\d{1,2})\s+([A-Za-z0-9*][\w*-]*)\s*(.*)$/.exec(l);
    if (j) {
      const date = `${an}-${M.pad(mois)}-${M.pad(Number(j[2]))}`;
      const p = PLAGE.exec(j[4]);
      jours[date] = { code: j[3].replace(/^\*/, ''), plages: p ? [plage(p)] : [] };
      dernier = date; continue;
    }
    // 2e partie d'une journée coupée : « M52 13h30-17h00 … »
    const c = /^([A-Za-z0-9][\w-]*)\s+(\d{1,2}h\d{2}\s*-\s*\d{1,2}h\d{2}.*)$/.exec(l);
    if (c && dernier && c[1] === jours[dernier].code) { const p = PLAGE.exec(c[2]); if (p) jours[dernier].plages.push(plage(p)); }
  }
  return { estOctime, jours, mois: [...new Set(moisVus)] };
}
function plage(p) {
  const hm = (h, m) => `${M.pad(Number(h))}:${m}`;
  return [hm(p[1], p[2]), hm(p[3], p[4]), p[5] ? Number(p[5]) * 60 + Number(p[6]) : 0];
}
const enMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
export function minutesPlages(plages) {
  let t = 0;
  for (const [a, b, pause] of plages) { let f = enMin(b); const d = enMin(a); if (f <= d) f += 1440; t += f - d - pause; }
  return t;
}

// ---------- 3. Journées → planning de l'appli ----------
// Les jours du relevé remplacent ceux déjà notés aux mêmes dates. Les jours passés dont les heures
// diffèrent de l'horaire habituel du code sont notés avec l'écart (en plus ou en moins).
export function preparerImport(analyse, etat, cfg, aujourdhui = M.aujourdhui()) {
  const tous = M.tousLesCodes(cfg, etat);
  const parMaj = new Map([...tous.keys()].map((k) => [k.toUpperCase(), k]));
  const nouveauxCodes = []; const ignores = new Set();
  const jours = {}; let ecarts = 0, remplaces = 0;
  for (const [date, x] of Object.entries(analyse.jours).sort()) {
    let code = parMaj.get(x.code.toUpperCase());
    if (!code && x.plages.length) {
      // code inconnu mais avec des horaires : on crée un code perso à partir du relevé
      const [p1, p2] = x.plages;
      const perso = { code: x.code, libelle: `${x.code} (relevé Octime)`, type: enMin(p1[1]) <= enMin(p1[0]) ? 'nuit' : 'travail', debut: p1[0], fin: p1[1] };
      if (p2) { perso.debut2 = p2[0]; perso.fin2 = p2[1]; }
      if (x.plages.some((p) => p[2])) perso.pauseMin = Math.max(...x.plages.map((p) => p[2]));
      nouveauxCodes.push(perso); tous.set(perso.code, perso); parMaj.set(perso.code.toUpperCase(), perso.code); code = perso.code;
    }
    if (!code) { ignores.add(x.code); continue; }
    const e = { prevu: { code } };
    const info = tous.get(code);
    if (date <= aujourdhui && x.plages.length && M.estTravail(info)) {
      const diff = minutesPlages(x.plages) - M.dureeEffectiveCode(info);
      if (diff) {
        e.realise = { code, depassementMin: diff, note: `Relevé Octime : ${x.plages.map(([a, b, p]) => `${a.replace(':', 'h')}-${b.replace(':', 'h')}${p ? ` (pause ${p} min)` : ''}`).join(' et ')}` };
        ecarts++;
      }
    }
    if (etat.jours && etat.jours[date]) remplaces++;
    jours[date] = e;
  }
  const dates = Object.keys(jours).sort();
  return { jours, nouveauxCodes, ignores: [...ignores], ecarts, remplaces, debut: dates[0], fin: dates[dates.length - 1], nombre: dates.length };
}

export function appliquerImport(etat, prep) {
  etat.jours = { ...(etat.jours || {}), ...prep.jours };
  const deja = new Set((etat.codesPerso || []).map((c) => c.code));
  etat.codesPerso = [...(etat.codesPerso || []), ...prep.nouveauxCodes.filter((c) => !deja.has(c.code))];
  return etat;
}
