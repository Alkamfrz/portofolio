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
  var isAsset = url.origin === location.origin &&
    (url.pathname.match(/\.(woff2|css|js|png|ico|svg|webp)$/) || url.pathname === '/favicon.ico');

  if (isAsset) {
    // Cache-first for static assets
    e.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(res) {
          // Clone synchronously before async cache open
          var cloned = res.clone();
          caches.open(CACHE).then(function(cache) { cache.put(req, cloned); });
          return res;
        });
      })
    );
    return;
  }

  // Network-first for HTML pages
  e.respondWith(
    fetch(req).then(function(res) {
      // Clone synchronously before async cache open
      var cloned = res.clone();
      caches.open(CACHE).then(function(cache) { cache.put(req, cloned); });
      return res;
    }).catch(function() {
      return caches.match(req).then(function(cached) { return cached || caches.match('/'); });
    })
  );
});
