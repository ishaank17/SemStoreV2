if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log("here");

    if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                subscribeForPush();
            } else {
                console.warn('Push notifications permission denied');
            }
        });
    } else {
        subscribeForPush();
    }
}
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

function subscribeForPush() {
    const vapidPublicKey = 'BHehFUGEHDZdnusscRlrBCKomV2GsjRaLGa3-ZJjUBtUVv4RDFLGex_T9V33QGi5Vfv1O6WHnsgJ-u9cclk0wD4'; // ← this is hardcoded or injected
    navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        }).then(subscription => {
            // Send to backend to store the subscription
            fetch("/Subscribe", {
                method: "POST",
                body: JSON.stringify(subscription),
                headers: {
                    "Content-Type": "application/json"
                }
            });
        });
    });
}