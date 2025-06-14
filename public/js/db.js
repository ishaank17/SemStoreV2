import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

export const dbPromise = openDB('test-db', 10, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('fileData')) {
            const store = db.createObjectStore('fileData', { keyPath: 'id',autoIncrement:true });
            store.createIndex('oid', 'oid', { unique: true });
        }
        if (!db.objectStoreNames.contains('followData')) {
            const store = db.createObjectStore('followData', {
                keyPath: 'id',
                autoIncrement: true,
            });
            store.createIndex('code', 'code');
        }
        if (!db.objectStoreNames.contains('notifications')) {
            const store = db.createObjectStore('notifications', {
                keyPath: 'id',
                autoIncrement: true,
            });
            store.createIndex('id', 'id');
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
export async function getAll() {
    const db = await dbPromise;
    const result = await db.getAll('fileData');
    return result;

}