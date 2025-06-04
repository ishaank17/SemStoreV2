import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

const dbPromise = openDB('test-db', 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('people')) {
            const peopleStore = db.createObjectStore('people', { keyPath: 'id',autoIncrement:true });
            // peopleStore.createIndex('email', 'email', { unique: true });
        }
    }
});

// Example: Adding a person
async function addPerson() {
    const db = await dbPromise;
    await db.add('people', {
        id: '1',
        name: 'Alice',
        email: 'alice@example.com'
    });
    console.log("Person added to IndexedDB!");
}

addPerson();