// Service worker : l'appli fonctionne sans réseau une fois ouverte une première fois.
const VERSION = '__VERSION__';
const CACHE = 'mon-temps-' + VERSION;
const FICHIERS = [
  './', 'index.html', 'accueil.css', 'accueil.js', 'mentions-legales.html', 'mentions.js', 'manifest.webmanifest',
  'app/', 'app/index.html', 'app/styles.css', 'app/app.js', 'app/moteur.js', 'app/stockage.js', 'app/etat.js', 'app/commun.js', 'app/vues2.js', 'app/visite.js', 'app/entete.js', 'app/planning.js', 'app/compteurs.js', 'app/outils.js', 'app/extras.js', 'textes.js', 'app/verification.js', 'app/statistiques.js', 'app/courriers.js', 'app/transfert.js', 'app/reseaux.js', 'app/vendor/qrcode.mjs',
  'config/contenu.json', 'config/regles.json', 'config/codes.json', 'fonts/archivo.woff2', 'fonts/archivo-ext.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('mon-temps-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
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
