const CACHE = 'portfolio-v1';
const ASSETS = [
  '/',
  '/fonts/inter-400.woff2',
  '/fonts/inter-700.woff2',
  '/fonts/fonts.css',
  '/favicon.svg',
  '/favicon.ico',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  var url = new URL(req.url);

  // Static assets: cache-first
  if (url.origin === location.origin && (url.pathname.match(/\.(woff2|css|js|png|ico|svg|webp)$/) || url.pathname === '/favicon.ico')) {
    e.respondWith(
      caches.match(req).then(function(cached) { return cached || fetch(req).then(function(res) { var c = caches.open(CACHE); c.then(function(cache) { cache.put(req, res.clone()); }); return res; }); })
    );
    return;
  }

  // HTML pages: network-first
  e.respondWith(
    fetch(req).then(function(res) { var c = caches.open(CACHE); c.then(function(cache) { cache.put(req, res.clone()); }); return res; }).catch(function() { return caches.match(req).then(function(cached) { return cached || caches.match('/'); }); })
  );
});
