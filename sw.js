const CACHE_NAME = 'financeos-v1';
const STATIC_ASSETS = [
  '/FinanceOS/',
  '/FinanceOS/index.html',
  '/FinanceOS/CSS/style.css',
  '/FinanceOS/CSS/dashboard.css',
  '/FinanceOS/CSS/responsive.css',
  '/FinanceOS/js/app.js',
  '/FinanceOS/js/storage.js',
  '/FinanceOS/js/dashboard.js',
  '/FinanceOS/js/analytics.js',
  '/FinanceOS/js/goals.js',
  '/FinanceOS/js/transaction.js',
  '/FinanceOS/js/utils.js',
  '/FinanceOS/data/categories.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {
      return Promise.resolve();
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/FinanceOS/index.html');
          }
        });
    })
  );
});
