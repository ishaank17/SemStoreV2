import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

const dbPromise = openDB('test-db', 5, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('fileData')) {
            const store = db.createObjectStore('fileData', { keyPath: 'id',autoIncrement:true });
            store.createIndex('oid', 'oid', { unique: true });
        }
    }
});
export async function saveFile(file) {
    const db = await dbPromise;
    await db.add('fileData', {
        title: file.title,
        link: file.link,
        oid:file.oid
    });
    console.log("File Meta added to IndexedDB!");
}

export async function findFile(fileID) {
    const db = await dbPromise;
    const result = await db.getFromIndex('fileData', 'oid', fileID);
    if(result) return true;
    else return false;
}