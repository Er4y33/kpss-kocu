/* Servis çalışanı.
   Uygulama dosyalarını telefona kaydeder; ilk açılıştan sonra internet
   gerekmez. Yeni sürüm yayınlandığında SURUM numarasını artırmak yeterli. */

const SURUM = 'kpss-v1';
const DOSYALAR = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/kartlar.js',
  './js/leitner.js',
  './js/depo.js',
  './js/app.js',
  './ikon/ikon-192.png',
  './ikon/ikon-512.png',
  './ikon/ikon-maskeli.png',
];

self.addEventListener('install', (olay) => {
  olay.waitUntil(
    caches.open(SURUM).then((onbellek) => onbellek.addAll(DOSYALAR))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (olay) => {
  olay.waitUntil(
    caches.keys()
      .then((adlar) => Promise.all(adlar.filter((a) => a !== SURUM).map((a) => caches.delete(a))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (olay) => {
  if (olay.request.method !== 'GET') return;

  olay.respondWith(
    caches.match(olay.request).then((onbellekten) => {
      if (onbellekten) {
        /* Arka planda güncelle, ama kullanıcıyı bekletme */
        fetch(olay.request).then((yanit) => {
          if (yanit && yanit.status === 200) {
            caches.open(SURUM).then((o) => o.put(olay.request, yanit.clone()));
          }
        }).catch(() => {});
        return onbellekten;
      }
      return fetch(olay.request).catch(() => caches.match('./index.html'));
    })
  );
});
