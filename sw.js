// Service worker : rend l'appli utilisable hors ligne.
// Les fichiers de l'appli sont d'abord demandés au réseau (pour recevoir les mises à jour), puis au cache si pas de connexion.
const CACHE = 'levelup-v3';
const IMG_CACHE = 'levelup-img-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/store.js', './js/stats.js', './js/ui.js', './js/util.js', './js/fx.js', './js/vendor/morphdom.js',
  './js/views/today.js', './js/views/stats.js', './js/views/game.js', './js/views/goals.js', './js/views/media.js', './js/views/vision.js', './js/views/settings.js',
  './js/measures.js', './js/game/rules.js', './js/game/roster.js', './js/game/pokemon-data.js', './js/game/anime-data.js', './js/game/gacha.js', './js/game/opening.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fichiers de l'appli : réseau d'abord, cache en secours
  if (url.origin === location.origin) {
    e.respondWith(fetch(req, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy)); }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true })));
    return;
  }
  // Polices et images (cartes, couvertures) : cache d'abord, rafraîchi en arrière-plan
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || req.destination === 'image') {
    const name = req.destination === 'image' ? IMG_CACHE : CACHE;
    e.respondWith(caches.open(name).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
  // Le reste (synchro GitHub) passe directement par le réseau
});
