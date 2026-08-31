// Service Worker cho app Quản Lý Trọ
// Chiến lược: Network-first cho trang chính (luôn ưu tiên bản mới nhất khi
// có mạng), fallback về cache khi mất mạng — đủ để mở lại app offline.
// Vì app là 1 file HTML (chứa toàn bộ JS/CSS inline) nên "app shell" ở đây
// chỉ gồm index.html + manifest + icon.

const CACHE_NAME = 'tro-manager-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;

  // Chỉ can thiệp các request GET cùng gốc (không đụng vào API Google
  // Apps Script / Google Drive — luôn để chúng đi thẳng ra mạng).
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then(function(res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, resClone); });
        return res;
      })
      .catch(function() {
        return caches.match(req).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
