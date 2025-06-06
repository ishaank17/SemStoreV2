
const CACHE_NAME = 'sem-store-v8';
const urlsToCache = [
    '/manifest.json',
    '/startSW.js',
    '/src/Style.css',
    '/images/tick.png',
    '/icons/favicon.ico',
    '/icons/web-app-manifest-192x192.png',
    '/icons/web-app-manifest-512x512.png',
    '/icons/iitgn-logo.png.144x144.png',
    // '/contents/Amplifiers- Sedra and Smith Reference.pdf',
    '/images/iitgn-logo.png',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap',
    '/Offline.html',
    'https://cdn.jsdelivr.net/npm/idb@8/+esm',
    '/Downloads',
    '/js/db.js',
    'https://fonts.gstatic.com/s/poppins/v23/pxiEyp8kv8JHgFVrJJfecg.woff2',
    'https://fonts.gstatic.com/s/poppins/v23/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2'
];


self.addEventListener('install', (event) => {
    // console.log("Caching");
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async cache => {
                await cache.addAll(urlsToCache)
                console.log('Cached all ');
            })
            .catch(err => {
                console.error('Failed to cache during install:', err);
            })
    );
});

self.addEventListener('activate', (event) => {
    // console.log("Activated");
   event.waitUntil(

       caches.keys().then(keys => {
            return Promise.all(keys
                    .filter(key => key !== CACHE_NAME && key !== 'offline-files')
                    .map(key => caches.delete(key)))
       })
   )
});

self.addEventListener('fetch', (event) => {
    // console.log("Fetching");
    event.respondWith(
        caches.match(event.request).then(response =>  {
            return response || fetch(event.request);
        }).catch((e) => {
            // if (event.request.url.indexOf('.ejs')>-1) {
            console.log('Fetch failed this one so offline loaded :', event.request);
            console.log(event.request.url.indexOf('.ejs') , e)
                return caches.match("/Offline.html");
            // }
        })
    );
});
