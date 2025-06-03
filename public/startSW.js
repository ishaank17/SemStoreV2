if('serviceWorker' in navigator) {
    // console.log("HERE");
    navigator.serviceWorker.register('/sw.js')
        .then((reg)=>{console.log('ServiceWorker Registered',reg)})
        .catch(e=>{console.log('ServiceWorker Not Registered :',e)});
}else{
    console.log("NOT THERE");
}