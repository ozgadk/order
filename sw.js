/* Snuggest Sipariş — service worker.
   Kendi dosyalarımız: önce internet (her zaman en yeni sürüm), internet yoksa son kayıtlı kopya.
   Firebase SDK + Google Fonts (sürümlü, değişmez): önce kayıtlı kopya. Firestore verisine dokunulmaz. */
const CACHE = 'snug-v1';
const SHELL = ['/index.html', '/app/manifest.webmanifest', '/app/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const STATIC = u => (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (STATIC(u)) {
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: r.mode === 'navigate' }).then(hit => hit || (r.mode === 'navigate' && (u.pathname === '/' || u.pathname === '/index.html') ? caches.match('/index.html') : Response.error()))));
});
