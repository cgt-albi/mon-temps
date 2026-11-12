// Service worker : l'appli fonctionne sans réseau une fois ouverte une première fois.
importScripts('rappel.js');
const VERSION = '__VERSION__';
const CACHE = 'mon-temps-' + VERSION;
const FICHIERS = [
  './', 'index.html', 'rappel.js', 'icons/badge-96.png', 'accueil.css', 'accueil.js', 'mentions-legales.html', 'mentions.js', 'manifest.webmanifest',
  'app/', 'app/index.html', 'app/styles.css', 'app/app.js', 'app/moteur.js', 'app/stockage.js', 'app/etat.js', 'app/commun.js', 'app/vues2.js', 'app/visite.js', 'app/entete.js', 'app/planning.js', 'app/compteurs.js', 'app/outils.js', 'app/extras.js', 'textes.js', 'app/verification.js', 'app/statistiques.js', 'app/courriers.js', 'app/transfert.js', 'app/reseaux.js', 'app/vendor/qrcode.mjs', 'app/vendor/jsQR.js',
  'config/contenu.json', 'config/regles.json', 'config/codes.json', 'config/baremes.json', 'config/primes.json', 'config/courriers.json',
  'config/textes-index.json', 'config/textes-origine.json', 'config/textes-accueil-site.json', 'config/textes-mentions.json',
  'config/textes-bienvenue-visite.json', 'config/textes-planning.json', 'config/textes-compteurs.json', 'config/textes-outils-salaire.json',
  'config/textes-syndicat.json', 'config/textes-courriers.json', 'config/textes-reglages.json',
  'fonts/archivo.woff2', 'fonts/archivo-ext.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'
];
// Logo choisi dans Pages CMS : ajouté au moment de la publication (voir scripts/construire.mjs).
const EN_PLUS = [/*__LOGO__*/];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS).then(() => Promise.all(EN_PLUS.map((f) => c.add(f).catch(() => {}))))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('mon-temps-') && k !== CACHE && k !== 'mon-temps-rappel').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const reseauDabord = req.url.includes('/config/') || req.mode === 'navigate';
  if (reseauDabord) {
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('app/index.html'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req).then((n) => { if (n.ok) { const copie = n.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); } return n; })));
});

// ---------- Rappel de l'horaire du lendemain (voir rappel.js) ----------
// Le téléphone réveille l'appli environ une fois par jour (« synchronisation périodique »,
// Android avec Chrome, appli installée) : aucun serveur n'intervient.
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'rappel-demain') e.waitUntil(self.MonTempsRappel.rappel(false).catch(() => {}));
});
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'rappel-essai') {
    e.waitUntil(self.MonTempsRappel.rappel(true).then((r) => { if (e.source) e.source.postMessage({ type: 'rappel-essai', ...r }); }).catch(() => {}));
  }
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || 'app/', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => x.url.includes('/app/'));
    if (c) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
