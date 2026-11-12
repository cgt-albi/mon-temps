// « Mon année en un coup d'œil » : quatre chiffres, un graphique, trois phrases. Imprimable.
import * as M from './moteur.js';
import { S, codes } from './etat.js';
import { esc, ic, enteteRetour } from './commun.js';

// Chiffres de l'année (fonction pure, testée)
export function chiffresAnnee(annee, etat, cfg, today = M.aujourdhui()) {
  const fin = String(annee) === today.slice(0, 4) ? today : `${annee}-12-31`;
  const b = M.bilanAnnee(annee, etat, cfg, fin);
  const C = M.tousLesCodes(cfg, etat);
  const dansAnnee = (d) => d && d.startsWith(String(annee)) && d <= fin;
  let rappelsAjouts = 0;
  for (const [d, e] of Object.entries(etat.jours || {})) {
    if (!dansAnnee(d) || !e.ajouts || !e.ajouts.length) continue;
    const j = M.journee(d, etat, C); if (j && !M.estTravail(j.info)) rappelsAjouts++;
  }
  const preuves = (etat.preuves || []).filter((p) => dansAnnee(p.date));
  const rappels = preuves.filter((p) => p.type === 'rappel').length + rappelsAjouts;
  const changements = preuves.filter((p) => p.type === 'changement').length;
  const parMois = b.mois.map((x) => (x ? x.depassements : 0));
  const alertes = M.controles(`${annee}-01-01`, fin, etat, cfg).filter((a) => !a.futur).length;
  return { annee, fin, enPlus: b.depassements, djf: b.djfJours, nuits: b.nuits, rappels, changements, alertes, parMois, solde: b.solde, saisis: b.saisis };
}

const MOIS_L = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function vueBilan(p) {
  const y = /^\d{4}$/.test(p[1] || '') ? Number(p[1]) : Number(M.aujourdhui().slice(0, 4));
  const c = chiffresAnnee(y, S.etat, S.cfg);
  const max = Math.max(60, ...c.parMois);
  const iMax = c.parMois.indexOf(Math.max(...c.parMois));
  const h = (m) => M.formatDuree(m);
  const tuile = (v, l) => `<div class="carte" style="padding:.75rem;display:flex;flex-direction:column;gap:2px"><b style="font-size:1.5rem;line-height:1.1">${v}</b><span class="petit" style="margin:0">${l}</span></div>`;
  const pl = (n, s, p2) => `${n} ${n > 1 ? (p2 || s + 's') : s}`;
  const phrases = [];
  if (c.parMois[iMax] > 0) phrases.push(`Ton mois le plus chargé : <b>${MOIS_L[iMax]}</b>, avec ${h(c.parMois[iMax])} en plus.`);
  if (c.rappels || c.changements) phrases.push(`${c.rappels ? `${pl(c.rappels, 'rappel')} sur un repos` : ''}${c.rappels && c.changements ? ' et ' : ''}${c.changements ? `${pl(c.changements, 'changement')} de dernière minute` : ''}, gardés en preuve.`);
  if (c.alertes) phrases.push(`${pl(c.alertes, 'règle de repos ou de durée', 'règles de repos ou de durée')} non respectée${c.alertes > 1 ? 's' : ''} : détail dans Compteurs.`);
  const barres = c.parMois.map((m, i) => `<button type="button" class="bilan-barre" data-mois="${i}" aria-label="${MOIS_L[i]} : ${m ? h(m) + ' en plus' : 'rien en plus'}" title="${MOIS_L[i]} : ${h(m)}">
      <span class="val">${i === iMax && m ? h(m) : ''}</span><span class="col">${m ? `<i style="height:${Math.max(4, Math.round(m / max * 100))}%"></i>` : ''}</span><span class="m">${'JFMAMJJASOND'[i]}</span></button>`).join('');
  return {
    html: `${enteteRetour(`Mon année ${y}`, `#/compteurs/${y}`)}
      <div class="page" style="margin-top:.75rem">
        <p class="petit" style="margin:0">${String(y) === M.aujourdhui().slice(0, 4) ? `Du 1er janvier au ${esc(M.courte(c.fin))}` : `Année ${y}`} · d'après ce que tu as noté.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
          ${tuile(h(c.enPlus), 'en plus de tes horaires')}${tuile(c.djf, 'dimanches et fériés travaillés')}
          ${tuile(c.nuits, `nuit${c.nuits > 1 ? 's' : ''} travaillée${c.nuits > 1 ? 's' : ''}`)}${tuile(c.rappels + c.changements, 'rappels et changements de planning')}
        </div>
        <section class="carte" aria-label="Heures en plus, mois par mois">
          <h2 style="margin:0 0 .5rem">Heures en plus, mois par mois</h2>
          <div class="bilan-graph">${barres}</div>
          <p class="petit" id="bilan-mois" aria-live="polite" style="margin:.5rem 0 0;min-height:1.2em">Touche un mois pour voir le détail.</p>
          <details style="margin-top:.25rem"><summary class="petit" style="cursor:pointer">Voir en tableau</summary>
            <table class="mois-table" style="margin-top:.5rem"><thead><tr><th>Mois</th><th>En plus</th></tr></thead><tbody>${c.parMois.map((m, i) => `<tr><td>${MOIS_L[i]}</td><td>${h(m)}</td></tr>`).join('')}</tbody></table></details>
        </section>
        ${phrases.length ? `<section class="carte"><h2 style="margin:0 0 .375rem">Ce qui ressort</h2>${phrases.map((x) => `<p class="texte" style="margin:.25rem 0">${x}</p>`).join('')}</section>` : ''}
        <div class="rangee pas-imprimer"><button class="btn" id="imprimer">${ic('imprimer')}Imprimer</button><a class="btn" href="#/dossier">${ic('preuves')}Dossier</a></div>
      </div>`,
    apres(el) {
      const out = el.querySelector('#bilan-mois');
      el.querySelectorAll('[data-mois]').forEach((b) => {
        const montrer = () => { const i = Number(b.dataset.mois); out.textContent = `${MOIS_L[i].replace(/^./, (x) => x.toUpperCase())} : ${c.parMois[i] ? h(c.parMois[i]) + ' en plus de tes horaires' : 'rien en plus'}`; el.querySelectorAll('[data-mois]').forEach((x) => x.classList.toggle('actif', x === b)); };
        b.onclick = montrer; b.onmouseenter = montrer; b.onfocus = montrer;
      });
      el.querySelector('#imprimer').onclick = () => window.print();
    }
  };
}
