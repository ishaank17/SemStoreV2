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

// document.addEventListener("DOMContentLoaded", () => {
//     const installBtn = document.getElementsByClassName("download");
//     console.log('pre buttons', installBtn);
//     if (installBtn) {
//
//         console.log('install button', installBtn);
//         Array.from(installBtn).forEach(btn => {
//             btn.addEventListener('click', async () => {
//                 if (!deferredPrompt) {
//                     console.log('No install prompt available');
//                     return;
//                 }
//                 deferredPrompt.prompt();
//                 const choice = await deferredPrompt.userChoice;
//                 console.log('User choice:', choice.outcome);
//                 deferredPrompt = null;
//                 // Optionally hide the install button after install
//                 // btn.style.display = 'none';
//             });
//         });
//     }
//
//     // console.log('DOM fully loaded and parsed');
// });

async function  dwload()  {
    if (!deferredPrompt) {
        console.log('No install prompt available');
        return;
    }
    // alert("cclicke");
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log('User choice:', choice.outcome);
    deferredPrompt = null;
}
navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
});





