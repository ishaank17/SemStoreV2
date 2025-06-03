if('serviceWorker' in navigator) {
    // console.log("HERE");
    navigator.serviceWorker.register('/sw.js')
        .then((reg)=>{console.log('ServiceWorker Registered',reg)})
        .catch(e=>{console.log('ServiceWorker Not Registered :',e)});
}else{
    console.log("NOT THERE");
}
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('beforeinstallprompt event fired');
});

document.getElementById("download").addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log('User choice:', choice.outcome);
        deferredPrompt = null;
    }
}, { once: true });