
const CACHE_NAME = 'sem-store-v22';
const urlsToCache = [
    '/manifest.json',
    '/startSW.js',
    '/src/Style.css',
    '/images/tick.png',
    '/icons/favicon.ico',
    '/icons/web-app-manifest-192x192.png',
    '/icons/web-app-manifest-512x512.png',
    '/icons/iitgn-logo.png.144x144.png',
    '/images/iitgn-logo.png',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap',
    '/Offline.html',
    'https://cdn.jsdelivr.net/npm/idb@8/+esm',
    '/OfflineDownloads.html',
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
            }).then(()=>self.skipWaiting())
            .catch(err => {
                console.error('Failed to cache during install:', err);
            })
    );

});

self.addEventListener('activate', (event) => {
    // console.log("Activated");
   event.waitUntil(

           caches.keys().then(keys => {
               return Promise.all(
                   keys
                       .filter(key => key !== CACHE_NAME && key !== 'offline-files')
                       .map(key => caches.delete(key))
               );
           }).then(()=>self.clients.claim())
   )
});

// self.addEventListener('fetch', (event) => {
//
//     const url = new URL(event.request.url);
//     console.log(url,url.pathname,url.searchParams.has('code') );
//     if (url.pathname === '/Login' && url.searchParams.has('code')) {
//         console.log("Bypassing Service Worker for OAuth callback:", url.href);
//         return; // Don't intercept, let the browser handle it
//     }
//     event.respondWith(
//         caches.match(event.request).then(response =>  {
//             return response || fetch(event.request);
//         }).catch((e) => {
//             // if (!(url.pathname === '/Login' && url.searchParams.has('code'))) {
//             console.log('Fetch failed this one so offline loaded :', event.request);
//             console.log(event.request.url.indexOf('.ejs') , e)
//                 return caches.match("/Offline.html");
//             // }
//
//         })
//     );
//
//
//
// });

self.addEventListener('fetch', event => {
     const url = new URL(event.request.url);
     // console.log("heere1" ,caches.match(event.request), fetch(event.request) );
    //
    // // ✅ Skip Service Worker handling for OAuth callback
    if ((url.pathname === '/Login' && url.searchParams.has('code'))) {
        console.log("Bypassing Service Worker for OAuth callback:", url.href);
        return; // ❗ Very important: prevents SW from interfering with OAuth
    }
    //
    event.respondWith(

        caches.match(event.request).then(cachedResponse => {

            return cachedResponse || fetch(event.request).catch((err) => {
                console.warn('Fetch failed:', event.request.url, err);
                console.log("heere2" ,event.request.mode, caches.match('/Offline.html') );
                // ✅ Serve Offline.html only for navigations (HTML pages)
                if (event.request.mode === 'navigate') {
                    return caches.match('/Offline.html');
                }

                return new Response('Network error', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            });
        })
    );
});

// if ('serviceWorker' in navigator && 'PushManager' in window) {
//     console.log("here")
//     if (Notification.permission !== 'granted') {
//         Notification.requestPermission().then(permission => {
//             if (permission === 'granted') {
//                 subscribeForPush();
//             } else {
//                 console.warn('Push notifications permission denied');
//             }
//         });
//     } else {
//         subscribeForPush();
//     }
// }

// function subscribeForPush() {
//     navigator.serviceWorker.ready.then(reg => {
//         reg.pushManager.getSubscription().then(sub => {
//             if (!sub) {
//                 reg.pushManager.subscribe({
//                     userVisibleOnly: true
//                     // No applicationServerKey needed if your server doesn't enforce VAPID
//                 }).then(newSub => {
//                     console.log('🔔 Registration created:', newSub.toJSON());
//
//                     // Send subscription to server via POST
//                     fetch('/noti', {
//                         method: 'POST',
//                         headers: {
//                             'Content-Type': 'application/json'
//                         },
//                         body: JSON.stringify(newSub.toJSON())
//                     });
//                 }).catch(err => {
//                     console.error('Push subscription error:', err);
//                 });
//             } else {
//                 console.log('🔔 Already subscribed:', sub.toJSON());
//             }
//         });
//     });
// }

self.addEventListener('push', (event) => {
    let data = { title: "Default title", body: "Default message" };

    if (event.data) {
        try {
            data = event.data.json();  // parse JSON payload
        } catch {
            data.title = event.data.text();  // fallback for plain text
        }
    }

    const options = {
        body: data.body,
        // You can add icon, badge etc. here too
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});