// sw.js — cache để app cài được vào màn hình chính và mở lại khi mất mạng.
// Chiến lược network-first: luôn ưu tiên lấy bản mới nhất từ mạng khi có kết nối,
// chỉ dùng bản cache khi mất mạng — tránh việc lỡ cache một bản cũ rồi kẹt mãi ở đó.
const CACHE = 'thu-tay-v56';
const ASSETS = [
  '/',
  './',
  './index.html',
  './manifest.json',
  './js/app.js',
  './js/render.js',
  './js/tiny-jinja.js',
  './js/templates-data.js',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  '../templates/template_am_ap.html',
  '../templates/template_nong_nan.html',
  '../templates/template_to_tinh.html',
  '../templates/template_nho_nhung.html',
  '../templates/template_xin_loi.html',
  '../templates/template_binh_yen.html',
  '../templates/template_gian_doi.html',
  '../templates/template_ngot_ngao.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/');
          return undefined;
        })
      )
  );
});
