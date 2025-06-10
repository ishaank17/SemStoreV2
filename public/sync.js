import {dbPromise} from '/js/db.js';

async function syncIDBWithCache() {
    const db = await dbPromise;

    const allFiles = await db.getAll('fileData');
    const cache = await caches.open('offline-files');

    // First find which IDs need to be deleted
    const idsToDelete = [];

    for (const file of allFiles) {
        const cachedResponse = await cache.match(file.link);
        if (!cachedResponse) {
            console.warn(`SW: Cache missing for ${file.link}, marking for removal`);
            idsToDelete.push(file.id);
        }
    }

    // Now open transaction and delete them
    const tx = db.transaction('fileData', 'readwrite');
    const store = tx.objectStore('fileData');
    for (const id of idsToDelete) {
        store.delete(id);
    }

    await tx.done;
    // window.location.reload();
    console.log("SW: IDB-cache sync complete.");
}

if ('indexedDB' in window && 'caches' in window) {
    await syncIDBWithCache().catch(console.error);

}