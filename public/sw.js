// public/sw.js

const CACHE_NAME = 'bdb-pwa-cache-v1';
const OFFLINE_URL = '/offline'; // Pastikan Anda memiliki halaman offline jika diperlukan, atau ganti ke '/'

// Daftar aset inti yang langsung dicache saat instalasi
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/images/logo-bdb.png'
];

// 1. INSTALL EVENT: Menyimpan aset inti ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Membuka cache dan menyimpan aset utama');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE EVENT: Membersihkan cache lama yang sudah kedaluwarsa
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH EVENT: Strategi Network First untuk halaman dinamis / API, dan Cache First untuk aset statis
self.addEventListener('fetch', (event) => {
  // Lewati request non-GET atau request ke ekstensi chrome/api eksternal tertentu jika perlu
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Jangan cache request ke Sanity Studio, API backend, atau Midtrans agar datanya selalu *real-time*
  if (
    url.pathname.startsWith('/studio') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('sanity.io') ||
    url.hostname.includes('midtrans.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Ambil dari cache jika ada, sambil memperbarui cache dari jaringan di latar belakang (Stale-While-Revalidate)
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback jika offline total dan halaman tidak ada di cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});