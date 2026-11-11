// Rappel de l'horaire du lendemain : composé et affiché par le téléphone lui-même.
// Aucun serveur : le service worker lit le planning dans la base locale de l'appli,
// dessine une petite carte aux couleurs de l'appli et affiche la notification.
// Chargé par sw.js (importScripts) ; utilisable aussi depuis une page pour l'aperçu.
/* global self */
(function (G) {
  'use strict';
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const PALETTE = ['ocre', 'sarcelle', 'brique', 'prune', 'olive'];
  const TEINTE_TYPE = { nuit: 'indigo', repos: 'gris', rtt: 'azur', recup: 'turquoise', conge: 'vert', cet: 'vert', assimile: 'ambre', greve: 'rouge' };
  const TEINTES = {
    ocre: ['#F6ECD2', '#6B4A00'], sarcelle: ['#D6EEEA', '#0E4F47'], brique: ['#F7E1D6', '#7A2E12'], prune: ['#EBDDF0', '#55256B'],
    olive: ['#E7EBCF', '#4A5210'], indigo: ['#2A2F5B', '#EEF0FF'], gris: ['#ECEAE6', '#3B3631'], azur: ['#D9E7F7', '#1D4E89'],
    turquoise: ['#D3EEF0', '#0F5257'], vert: ['#DCEFE2', '#1F5E36'], ambre: ['#F8E7C4', '#6E4A00'], rouge: ['#FBE0E0', '#9E0A12']
  };
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const duree = (min) => `${Math.floor(min / 60)}h${pad(min % 60)}`;

  // ---------- Lecture des données locales ----------
  function lireEtat() {
    return new Promise((ok) => {
      try {
        const r = indexedDB.open('mon-temps', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('etat');
        r.onerror = () => ok(null);
        r.onsuccess = () => {
          try {
            const t = r.result.transaction('etat').objectStore('etat').get('principal');
            t.onsuccess = () => ok(t.result || null); t.onerror = () => ok(null);
          } catch (e) { ok(null); }
        };
      } catch (e) { ok(null); }
    });
  }
  async function lireJson(chemin, defaut) {
    try { const r = (await caches.match(chemin, { ignoreSearch: true })) || (await fetch(chemin)); return r && r.ok ? await r.json() : defaut; } catch (e) { return defaut; }
  }

  // Codes de l'établissement + codes personnels de l'agent, avec leur teinte (même logique que l'appli).
  function tousLesCodes(codes, perso) {
    const brut = new Map();
    for (const c of codes || []) if (c && c.code) brut.set(String(c.code).trim(), c);
    for (const c of perso || []) if (c && c.code) brut.set(c.code, c);
    const map = new Map(); let k = 0;
    for (const c of brut.values()) map.set(c.code, { ...c, teinte: c.couleur || (c.type === 'travail' ? PALETTE[k++ % PALETTE.length] : (TEINTE_TYPE[c.type] || 'gris')) });
    return map;
  }

  // Ce qui est prévu un jour donné : le réalisé s'il existe, sinon le prévu.
  function codeDuJour(etat, date) {
    const e = etat && etat.jours && etat.jours[date];
    if (!e) return null;
    return (e.realise && e.realise.code) || (e.prevu && e.prevu.code) || null;
  }

  // ---------- Contenu de la notification ----------
  function contenu(date, info, code, quand) {
    const d = new Date(date + 'T12:00');
    const jour = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
    const travail = info && (info.type === 'travail' || info.type === 'nuit') && info.debut && info.fin;
    const libelle = (info && info.libelle) || code;
    let horaire = '', detail = '';
    if (travail) {
      horaire = `${info.debut} – ${info.fin}${info.debut2 && info.fin2 ? ` · ${info.debut2} – ${info.fin2}` : ''}`;
      let s = hm(info.debut), f = hm(info.fin); if (f <= s) f += 1440;
      let t = f - s;
      if (info.debut2 && info.fin2) { let s2 = hm(info.debut2), f2 = hm(info.fin2); if (f2 <= s2) f2 += 1440; t += f2 - s2; }
      t -= Number(info.pauseMin) || 0;
      detail = `${duree(Math.max(0, t))} de travail${info.pauseMin ? ` · pause ${info.pauseMin} min` : ''}`;
    }
    const titre = travail ? `${quand} · ${code} · ${horaire}` : `${quand} · ${libelle}`;
    const corps = travail ? `${libelle} · ${jour}\n${detail}` : `${jour}${libelle !== code ? ` · code ${code}` : ''}`;
    return { jour, travail: !!travail, libelle, horaire, detail, titre, corps };
  }

  // ---------- Carte illustrée (grande image de la notification) ----------
  async function chargerPolice(base) {
    try {
      if (!G.fonts || G.__policeMT) return;
      const f = new FontFace('Archivo', `url(${base}fonts/archivo.woff2)`, { weight: '100 900', stretch: '62% 125%' });
      await f.load(); G.fonts.add(f); G.__policeMT = true;
    } catch (e) { /* police système */ }
  }
  async function image(chemin) {
    try { const r = (await caches.match(chemin, { ignoreSearch: true })) || (await fetch(chemin)); return r && r.ok ? await createImageBitmap(await r.blob()) : null; } catch (e) { return null; }
  }
  function arrondi(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  async function dessinerCarte(o) {
    if (typeof OffscreenCanvas === 'undefined') return null;
    const W = 1024, H = 512;
    const cv = new OffscreenCanvas(W, H); const x = cv.getContext('2d');
    const P = 'Archivo, "Helvetica Neue", Arial, sans-serif';
    const rouge = o.couleur || '#E30613';
    const [fond, texte] = TEINTES[o.teinte] || TEINTES.gris;
    // fond
    x.fillStyle = '#F7F5F2'; x.fillRect(0, 0, W, H);
    // bandeau rouge
    x.fillStyle = rouge; x.fillRect(0, 0, W, 112);
    if (o.logo) { x.fillStyle = '#fff'; arrondi(x, 40, 22, 68, 68, 14); x.fill(); const r = Math.min(56 / o.logo.width, 56 / o.logo.height); x.drawImage(o.logo, 74 - o.logo.width * r / 2, 56 - o.logo.height * r / 2, o.logo.width * r, o.logo.height * r); }
    x.fillStyle = '#fff'; x.textBaseline = 'middle';
    x.font = `800 30px ${P}`; x.fillText(o.quand.toUpperCase(), o.logo ? 130 : 40, 44);
    x.font = `500 26px ${P}`; x.globalAlpha = 0.9; x.fillText(o.jour.replace(/^./, (c) => c.toUpperCase()), o.logo ? 130 : 40, 80); x.globalAlpha = 1;
    x.font = `700 22px ${P}`; x.textAlign = 'right'; x.globalAlpha = 0.85; x.fillText(o.nom.toUpperCase(), W - 40, 56); x.globalAlpha = 1; x.textAlign = 'left';
    // pastille du code (chiffres condensés, comme sur le site)
    try { x.fontStretch = 'condensed'; } catch (e) { /* ancien navigateur */ }
    x.font = `850 ${o.code.length > 4 ? 84 : 108}px ${P}`;
    const lc = Math.max(200, x.measureText(o.code).width + 72);
    x.fillStyle = fond; arrondi(x, 40, 160, lc, 196, 28); x.fill();
    x.fillStyle = texte; x.textAlign = 'center'; x.fillText(o.code, 40 + lc / 2, 262); x.textAlign = 'left';
    // horaires
    const gx = 40 + lc + 44;
    x.fillStyle = '#16130F';
    if (o.travail) {
      x.font = `800 64px ${P}`; x.fillText(o.horaire.split(' · ')[0], gx, 210);
      x.font = `600 32px ${P}`; x.fillStyle = '#3B3631'; x.fillText(o.libelle, gx, 272);
      x.font = `500 28px ${P}`; x.fillStyle = '#5F5A53'; x.fillText(o.detail + (o.horaire.includes(' · ') ? ` · reprise ${o.horaire.split(' · ')[1]}` : ''), gx, 318);
    } else {
      x.font = `800 60px ${P}`; x.fillText(o.libelle, gx, 236);
      x.font = `500 28px ${P}`; x.fillStyle = '#5F5A53'; x.fillText('Pas de travail prévu', gx, 296);
    }
    try { x.fontStretch = 'normal'; } catch (e) { /* rien */ }
    // pied
    x.fillStyle = '#E2DDD5'; x.fillRect(40, 404, W - 80, 2);
    x.fillStyle = '#5F5A53'; x.font = `600 24px ${P}`; x.fillText('Touche pour ouvrir ta journée', 40, 452);
    x.fillStyle = rouge; x.fillRect(W - 40 - 28, 438, 28, 28);
    const blob = await cv.convertToBlob({ type: 'image/png' });
    return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(blob); });
  }

  // ---------- Rappel ----------
  // essai = true : montre tout de suite un exemple (le prochain jour saisi), même si l'option est coupée.
  async function rappel(essai, base = './') {
    const etat = await lireEtat();
    if (!etat) return { ok: false, raison: 'vide' };
    const opt = (etat.reglages && etat.reglages.rappel) || {};
    if (!essai && !opt.actif) return { ok: false, raison: 'coupe' };
    const maintenant = new Date();
    const apresMidi = maintenant.getHours() >= 12;
    let date = null, quand = '';
    if (essai) {
      for (let i = 1; i <= 21 && !date; i++) { const d = new Date(maintenant); d.setDate(d.getDate() + i); if (codeDuJour(etat, iso(d))) { date = iso(d); quand = i === 1 ? 'Demain' : 'Bientôt'; } }
      if (!date) return { ok: false, raison: 'rien' };
    } else {
      // L'après-midi et le soir : demain. Le matin (si le téléphone n'a pas pu le faire la veille) : aujourd'hui.
      const d = new Date(maintenant); if (apresMidi) d.setDate(d.getDate() + 1);
      date = iso(d); quand = apresMidi ? 'Demain' : "Aujourd'hui";
      if (!codeDuJour(etat, date)) return { ok: false, raison: 'rien' };
      const deja = await caches.open('mon-temps-rappel').then((c) => c.match('dernier')).then((r) => (r ? r.text() : '')).catch(() => '');
      if (deja === date) return { ok: false, raison: 'deja' };
    }
    const code = codeDuJour(etat, date);
    const [codes, contenuCfg, man] = await Promise.all([lireJson(base + 'config/codes.json', []), lireJson(base + 'config/contenu.json', {}), lireJson(base + 'manifest.webmanifest', {})]);
    const info = tousLesCodes(codes, etat.codesPerso).get(code) || null;
    const travail = info && (info.type === 'travail' || info.type === 'nuit');
    if (!essai && opt.seulementTravail && !travail) return { ok: false, raison: 'repos' };
    const c = contenu(date, info, code, quand);
    const nom = man.name || contenuCfg.nom || 'Mon Temps';
    let img = null;
    try {
      await chargerPolice(base);
      const logo = contenuCfg.logo ? await image(base + String(contenuCfg.logo).replace(/^\/+/, '')) : null;
      img = await dessinerCarte({ ...c, code, quand, nom, logo, teinte: info ? info.teinte : 'gris', couleur: man.theme_color });
    } catch (e) { img = null; }
    const options = {
      body: c.corps, icon: base + 'icons/icon-192.png', badge: base + 'icons/badge-96.png', tag: 'rappel-' + date, renotify: true,
      lang: 'fr', timestamp: Date.now(), silent: !essai && maintenant.getHours() < 7, data: { url: base + 'app/#/jour/' + date },
      actions: [{ action: 'ouvrir', title: 'Voir ma journée' }]
    };
    if (img) options.image = img;
    await G.registration.showNotification(c.titre, options);
    if (!essai) await caches.open('mon-temps-rappel').then((x) => x.put('dernier', new Response(date))).catch(() => {});
    return { ok: true, date };
  }

  G.MonTempsRappel = { rappel, dessinerCarte, contenu, tousLesCodes, chargerPolice };
})(self);
