// Outils partagés par les écrans.
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  calendrier: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  barres: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  preuves: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 10h6M9 14h6"/>',
  syndicat: '<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M17 9a4 4 0 010 6"/>',
  reglages: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  bouclier: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  bouclierAlerte: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/><path d="M12 8v5M12 16v.01"/>',
  gauche: '<path d="M15 6l-6 6 6 6"/>', droite: '<path d="M9 6l6 6-6 6"/>',
  fermer: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  alerte: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/>',
  coche: '<path d="M5 12l5 5 9-10"/>', telecharger: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  cadenas: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', imprimer: '<path d="M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2"/><path d="M7 14h10v6H7z"/>',
  telephone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  livre: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5M8 7h7"/>',
  partager: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  aide: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1.1-1.5 2.5M12 17v.01"/>',
  engrenage: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  outils: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  euro: '<path d="M17.5 6.5A6.5 6.5 0 007 9.5v5a6.5 6.5 0 0010.5 3M4 10.5h8M4 13.5h8"/>',
  coeur: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.5 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z"/>',
  megaphone: '<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M17 9a4 4 0 010 6"/>',
  parts: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.5 6"/>',
  soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 18v3M17.5 17.5v.01"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  actu: '<path d="M4 5h13v14H6a2 2 0 01-2-2z"/><path d="M17 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5"/>',
  lieu: '<path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/>'
};
export const ic = (nom, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[nom] || ''}</svg>`;
export const chevron = () => `<svg class="i chevron" viewBox="0 0 24 24" aria-hidden="true">${P.droite}</svg>`;

export function toast(msg, ms = 2600) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}

export function telechargerFichier(nom, contenu, type = 'application/octet-stream') {
  const blob = new Blob([contenu], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return blob;
}

export function mailto(a, sujet, corps, cc) {
  const p = [];
  if (sujet) p.push('subject=' + encodeURIComponent(sujet));
  if (cc) p.push('cc=' + encodeURIComponent(cc));
  if (corps) p.push('body=' + encodeURIComponent(corps));
  return `mailto:${encodeURIComponent(a || '').replace(/%40/g, '@').replace(/%2C/g, ',')}?${p.join('&')}`;
}

export function navBas(actif, nonLues = 0) {
  const l = (h, nom, icone, lib) => `<a href="${h}" ${actif === nom ? 'aria-current="page"' : ''} data-tour="nav-${nom}">${ic(icone)}${lib}${nom === 'syndicat' && nonLues ? `<span class="point" aria-label="${nonLues} actualité${nonLues > 1 ? 's' : ''} non lue${nonLues > 1 ? 's' : ''}"></span>` : ''}</a>`;
  return `<nav class="bas" aria-label="Navigation principale">${l('#/planning', 'planning', 'calendrier', 'Planning')}${l('#/compteurs', 'compteurs', 'barres', 'Compteurs')}${l('#/preuves', 'preuves', 'preuves', 'Preuves')}${l('#/outils', 'outils', 'outils', 'Outils')}${l('#/syndicat', 'syndicat', 'syndicat', 'Syndicat')}</nav>`;
}

export function enteteRetour(titre, retour = '#/planning', etiquette = 'Retour') {
  return `<header class="retour"><a class="btn-icone" href="${retour}" aria-label="${esc(etiquette)}">${ic('gauche')}</a><h1>${esc(titre)}</h1></header>`;
}

// Valeur de config marquée « à valider » ?
export function aValider(cfg, chemin) { return Array.isArray(cfg.aValider) && cfg.aValider.some((c) => chemin === c || chemin.startsWith(c + '.')); }
export const badgeProvisoire = (cfg, chemin) => aValider(cfg, chemin) ? '<span class="provisoire" title="Valeur provisoire, en attente du protocole local">provisoire</span>' : '';

// Charge les fichiers de réglages (modifiables depuis Pages CMS) et les rassemble.
// Barèmes datés : on retient, pour chaque série, la dernière ligne dont la date est passée.
export const valeurAu = (liste, date) => (liste || []).filter((x) => x && x.date && x.date <= date).sort((a, b) => a.date.localeCompare(b.date)).pop() || null;
export async function chargerConfig(prefixe = '../') {
  const lire = (f, dflt) => fetch(`${prefixe}config/${f}`, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(f); return r.json(); }).catch((e) => { if (dflt !== undefined) return dflt; throw e; });
  const [contenu, regles, codes, baremes, primes, courriers] = await Promise.all([lire('contenu.json'), lire('regles.json'), lire('codes.json'), lire('baremes.json', {}), lire('primes.json', { liste: [] }), lire('courriers.json', { modeles: [] })]);
  const { aValider, ...r } = regles;
  const aujourdhui = new Date().toLocaleDateString('sv-SE');
  const pt = valeurAu(baremes.pointIndice, aujourdhui), im = valeurAu(baremes.indiceMinimum, aujourdhui), sm = valeurAu(baremes.smic, aujourdhui);
  r.valeurPointMensuel = pt ? Number(pt.valeur) : 4.92278;
  r.indiceMinimum = im ? Number(im.indice) : 366;
  r.smicHoraire = sm ? Number(sm.horaire) : 0;
  r.smicMensuel = sm ? Number(sm.mensuel) || Math.round(sm.horaire * 151.67 * 100) / 100 : 0;
  const valider = [...(aValider || [])];
  for (const [cle, ligne] of [['point', pt], ['indiceMin', im], ['smic', sm]]) if (ligne && ligne.statut && ligne.statut !== 'officiel') valider.push('baremes.' + cle);
  for (const c of baremes.aValider || []) valider.push('baremes.' + c);
  const listePrimes = (primes.liste || []).filter((x) => x && x.id && x.nom);
  for (const x of listePrimes) if (x.statut && x.statut !== 'officiel') valider.push('primes.' + x.id);
  for (const c of primes.aValider || []) valider.push('primes.' + c);
  return {
    ...contenu, regles: r, aValider: valider, baremes: { ...baremes, actuels: { pt, im, sm } }, grilles: (baremes.grilles || []).filter((g) => g && g.nom), primes: listePrimes, courriers: { formule: courriers.formule, modeles: (courriers.modeles || []).filter((m) => m && m.id && m.titre && m.texte) },
    codes: (codes || []).filter((c) => c && c.code).map((c) => ({ ...c, code: String(c.code).trim() })),
    contacts: contenu.contacts || {}, reseaux: contenu.reseaux || {},
    metiers: (contenu.metiers || []).filter(Boolean), actualites: contenu.actualites || [], agenda: contenu.agenda || []
  };
}
// Chemin d'une image envoyée depuis Pages CMS (« /images/x.png » ou « images/x.png »).
export const media = (chemin, prefixe = '../') => chemin ? prefixe + String(chemin).replace(/^\/+/, '') : '';

// Marque du syndicat : le logo s'il y en a un, sinon le carré rouge.
export function marque(cfg, prefixe = '../') {
  return cfg.logo ? `<img src="${esc(media(cfg.logo, prefixe))}" alt="" class="logo">` : '<i></i>';
}

export function emettre(nom, detail) { window.dispatchEvent(new CustomEvent('mt:' + nom, { detail })); }
