const CACHE_NAME = 'agenda-app-v1';
const urlsToCache = [
    './',
    './index.html',
    './output.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.4.9/purify.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});