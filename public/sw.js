self.addEventListener('install', (event) => {
    console.log("SW IS INSTALLED");
});

self.addEventListener('activate', (event) => {
    console.log("SW IS ACTIVATED");
})

self.addEventListener('fetch', (event) => {
    console.log("Fetch:",event);

})