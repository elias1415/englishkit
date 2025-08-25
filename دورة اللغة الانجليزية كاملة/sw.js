
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open('ek3-v1').then(c=>c.addAll([
    '/', '/index.html', '/manifest.json',
    '/assets/app.js', '/assets/style.css', '/assets/data.js'
  ])));
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(caches.match(e.request).then(res=> res || fetch(e.request)));
});
