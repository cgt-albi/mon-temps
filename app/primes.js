// Mon Temps — primes de l'agent : il coche celles qu'il touche, l'estimation de salaire s'ajuste.
import { S, sauver } from './etat.js';
import { esc, badgeProvisoire } from './commun.js';

const eur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number.isFinite(v) ? v : 0);
const profil = () => S.etat.profil || (S.etat.profil = {});
const choix = () => (profil().primes = profil().primes || {});
const perso = () => (profil().primesPerso = profil().primesPerso || []);
const nombre = (v) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };

// Montant mensuel brut d'une prime. base = { brut, plein, q } avec q en fraction (0,8 pour 80 %).
export function montantPrime(p, base) {
  const c = choix()[p.id] || {};
  if (c.montant !== undefined && c.montant !== '' && c.montant !== null) return nombre(c.montant);
  const pt = S.cfg.regles.valeurPointMensuel;
  switch (p.mode) {
    case 'points': return Number(p.valeur) * pt * base.q;
    case 'points-saisis': return nombre(c.points) * pt * base.q;
    case 'pourcentage': return base.brut * Number(p.valeur) / 100;
    case 'montant': return Number(p.valeur) * base.q;
    default: return 0;
  }
}

// Total des primes cochées (les primes personnelles comprises).
export function totalPrimes(base) {
  const lignes = [];
  for (const p of S.cfg.primes) if ((choix()[p.id] || {}).on) lignes.push({ nom: p.nom, montant: montantPrime(p, base) });
  for (const x of perso()) if (x && nombre(x.montant)) lignes.push({ nom: x.nom || 'Autre prime', montant: nombre(x.montant) });
  return { lignes, total: lignes.reduce((s, l) => s + l.montant, 0) };
}

// Base de calcul tirée du profil (pour les calculateurs).
export function baseProfil(partPayee) {
  const pr = profil(); const im = Number(pr.indiceMajore) || 0; const R = S.cfg.regles;
  const q = Number(pr.quotite || 100); const plein = Math.max(im, im ? R.indiceMinimum : 0) * R.valeurPointMensuel;
  return { brut: plein * partPayee(q), plein, q: q / 100 };
}

const mode = (p) => ({ points: 'points', 'points-saisis': 'à saisir', pourcentage: 'pourcentage', montant: 'montant fixe', saisie: 'à saisir' })[p.mode];
function ligneHtml(p) {
  const c = choix()[p.id] || {}; const on = !!c.on;
  const saisie = p.mode === 'saisie' || p.mode === 'points-saisis';
  return `<div class="prime-ligne" data-prime="${esc(p.id)}">
    <label class="case-a-cocher"><span><b>${esc(p.nom)}${badgeProvisoire(S.cfg, 'primes.' + p.id)}</b><small>${esc(p.aide || '')}</small></span><input type="checkbox" data-on ${on ? 'checked' : ''}></label>
    ${on ? `<div class="rangee prime-champs">${p.mode === 'points-saisis' ? `<label class="champ"><span>Nombre de points</span><input type="number" inputmode="decimal" min="0" step="1" data-champ="points" value="${esc(c.points ?? '')}" placeholder="Ex. : 10"></label>` : ''}
      <label class="champ"><span>${saisie && p.mode === 'saisie' ? 'Montant mensuel brut (€)' : 'Mon montant exact (€, facultatif)'}</span><input type="number" inputmode="decimal" min="0" step="0.01" data-champ="montant" value="${esc(c.montant ?? '')}" placeholder="${saisie && p.mode === 'saisie' ? '0' : 'Automatique'}"></label>
      <p class="petit prime-val" data-val style="margin:0;align-self:end"></p></div>` : ''}
  </div>`;
}

export function carteMesPrimes() {
  if (!S.cfg.primes.length) return '';
  return `<section class="carte" id="mes-primes" style="display:flex;flex-direction:column;gap:.75rem">
    <h2>Mes primes</h2>
    <p class="texte" style="margin:0">Coche celles qui figurent sur ta fiche de paie : l'estimation s'ajuste. Si ton montant diffère, saisis-le : il remplace le calcul automatique.</p>
    <div id="primes-lignes" style="display:flex;flex-direction:column;gap:.5rem"></div>
    <div id="primes-perso" style="display:flex;flex-direction:column;gap:.5rem"></div>
    <div class="rangee"><label class="champ"><span>Autre prime (nom)</span><input id="pp-nom" placeholder="Ex. : prime de tutorat"></label><label class="champ"><span>Montant mensuel brut (€)</span><input id="pp-montant" type="number" inputmode="decimal" min="0" step="0.01"></label></div>
    <button class="btn" id="pp-ajouter" type="button">Ajouter cette prime</button>
    <div id="res-primes" class="res"></div>
    <div id="res-total" class="res"></div>
  </section>`;
}

// Branche la carte. getBase() donne la base courante ; apres() est appelé à chaque changement.
export function brancherPrimes(el, getBase, apres) {
  const zone = el.querySelector('#mes-primes'); if (!zone) return () => {};
  const lignes = zone.querySelector('#primes-lignes'), pz = zone.querySelector('#primes-perso');
  const categories = [...new Set(S.cfg.primes.map((p) => p.categorie || 'Autres'))];
  const dessiner = () => {
    lignes.innerHTML = categories.map((cat) => `<p class="etiquette" style="margin:.25rem 0 0">${esc(cat)}</p>${S.cfg.primes.filter((p) => (p.categorie || 'Autres') === cat).map(ligneHtml).join('')}`).join('');
    pz.innerHTML = perso().map((x, i) => `<div class="res-ligne"><span>${esc(x.nom || 'Autre prime')}</span><b>${eur(nombre(x.montant))} <button type="button" class="btn-icone" data-suppr="${i}" aria-label="Retirer cette prime" style="display:inline-grid;vertical-align:middle">✕</button></b></div>`).join('');
    pz.querySelectorAll('[data-suppr]').forEach((b) => b.onclick = () => { perso().splice(Number(b.dataset.suppr), 1); sauver(); dessiner(); maj(); });
    lignes.querySelectorAll('[data-prime]').forEach((r) => {
      const id = r.dataset.prime;
      r.querySelector('[data-on]').onchange = (e) => { const c = (choix()[id] = choix()[id] || {}); c.on = e.target.checked; sauver(); dessiner(); maj(); };
      r.querySelectorAll('[data-champ]').forEach((i) => i.oninput = () => { const c = (choix()[id] = choix()[id] || {}); c[i.dataset.champ] = i.value; sauver(); maj(); });
    });
  };
  const maj = () => {
    const base = getBase();
    lignes.querySelectorAll('[data-prime]').forEach((r) => { const p = S.cfg.primes.find((x) => x.id === r.dataset.prime); const v = r.querySelector('[data-val]'); if (v && p) v.textContent = `≈ ${eur(montantPrime(p, base))} / mois`; });
    const t = totalPrimes(base);
    zone.querySelector('#res-primes').innerHTML = t.lignes.length ? `<div class="res-ligne fort"><span>Primes cochées, brut mensuel</span><b>${eur(t.total)}</b></div>` : '<p class="petit" style="margin:0">Aucune prime cochée pour l\'instant.</p>';
    apres(t, base);
  };
  zone.querySelector('#pp-ajouter').onclick = () => {
    const nom = zone.querySelector('#pp-nom').value.trim(), m = nombre(zone.querySelector('#pp-montant').value);
    if (!m) return; perso().push({ nom, montant: m }); zone.querySelector('#pp-nom').value = ''; zone.querySelector('#pp-montant').value = ''; sauver(); dessiner(); maj();
  };
  dessiner();
  return maj;
}
