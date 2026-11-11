// Page d'accueil : nom et coordonnées depuis la config, installation guidée.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

import { iconeReseau, NOMS } from './app/reseaux.js';
const media = (c) => c ? String(c).replace(/^\/+/, '') : '';

(async () => {
  try {
    const cfg = await (await fetch('config/contenu.json', { cache: 'no-cache' })).json();
    document.querySelectorAll('[data-nom]').forEach((e) => { e.textContent = cfg.nom; });
    document.querySelectorAll('[data-syndicat]').forEach((e) => { e.textContent = cfg.syndicat; });
    document.title = `${cfg.nom} — ${cfg.slogan || ''}`.replace(/ — $/, '');
    if (cfg.couleur) document.documentElement.style.setProperty('--rouge', cfg.couleur);
    if (cfg.logo) document.querySelectorAll('[data-logo]').forEach((i) => { const img = document.createElement('img'); img.src = media(cfg.logo); img.alt = ''; img.className = 'logo'; i.replaceWith(img); });
    const c = cfg.contacts || {};
    const bits = [c.mailGeneral && `<a href="mailto:${esc(c.mailGeneral)}">${esc(c.mailGeneral)}</a>`, c.telephone && esc(c.telephone), c.adresse && esc(c.adresse), c.local && esc(c.local)].filter(Boolean);
    $('#contact-pied').innerHTML = bits.join(' · ');
    const r = cfg.reseaux || {};
    $('#reseaux-pied').innerHTML = Object.keys(NOMS).filter((k) => r[k]).map((k) => `<a href="${esc(r[k])}" target="_blank" rel="noopener" aria-label="${NOMS[k]}" title="${NOMS[k]}">${iconeReseau(k, 20)}</a>`).join('');
    const actus = (cfg.actualites || []).filter((a) => a && a.titre).map((a, i) => ({ ...a, i })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 3);
    if (actus.length) {
      $('#actus-accueil').hidden = false;
      $('#liste-actus').innerHTML = actus.map((a) => `<a class="actu-accueil" href="app/#/actu/${a.i}">${a.image ? `<img src="${esc(media(a.image))}" alt="" loading="lazy">` : ''}<span class="date">${a.date ? esc(new Date(a.date + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })) : ''}</span><b>${esc(a.titre)}</b>${a.texte ? `<span>${esc(String(a.texte).slice(0, 140))}${String(a.texte).length > 140 ? '…' : ''}</span>` : ''}</a>`).join('');
    }
  } catch (e) { /* hors ligne : on garde le texte par défaut */ }
})();

// Lien vers le code source (déduit de l'adresse GitHub Pages)
const m = location.hostname.match(/^([^.]+)\.github\.io$/);
if (m) { const depot = location.pathname.split('/').filter(Boolean)[0]; $('#lien-source').href = `https://github.com/${m[1]}/${depot || ''}`; }

// Mini planning de l'illustration
(() => {
  const g = $('#mini-grille'); if (!g) return;
  const codes = ['', '', '', '', '', '', 'RH', 'M41', 'M41', 'M52', 'J38', 'RTT', 'RH', 'RH', 'M41', 'M52', 'M41', 'J38', 'M41', 'RH', 'RH', 'J38', 'M41', 'M41', 'M52', 'M41', 'RH', 'RH', 'CA', 'CA', 'CA', 'CA', 'CA', 'RH', 'RH'];
  g.innerHTML = codes.map((c, i) => {
    const cls = !c ? 'hors' : c === 'RH' ? 'rh' : c === 'CA' ? 'ca' : c === 'RTT' ? 'rtt' : '';
    return `<span class="${cls}${i === 17 ? ' auj' : ''}${i > 17 && c && c !== 'RH' ? ' prevu' : ''}">${c}</span>`;
  }).join('');
})();

// Onglets d'installation
const onglets = [...document.querySelectorAll('[role="tab"]')];
function choisir(id) {
  onglets.forEach((o) => { const on = o.id === id; o.setAttribute('aria-selected', String(on)); o.tabIndex = on ? 0 : -1; document.getElementById(o.getAttribute('aria-controls')).hidden = !on; });
}
onglets.forEach((o, i) => {
  o.onclick = () => choisir(o.id);
  o.onkeydown = (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = onglets[(i + (e.key === 'ArrowRight' ? 1 : onglets.length - 1)) % onglets.length]; choisir(n.id); n.focus(); } };
});
const ua = navigator.userAgent;
if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) choisir('o-iphone');
else if (!/Android/i.test(ua) && !/Mobi/i.test(ua)) choisir('o-pc');

// Installation directe quand le navigateur le permet (Chrome, Edge, Samsung Internet)
let invite = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); invite = e; $('#installer-direct').hidden = false; });
$('#installer-direct').onclick = async () => { if (!invite) return; invite.prompt(); await invite.userChoice; invite = null; $('#installer-direct').hidden = true; };

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
