import {dbPromise} from '/js/db.js';


export async function followCode(code) {
    const db = await dbPromise;
    await db.add('followData', {
        code:code
    });
    console.log("You Followed ",code);
}

export async function findFollow(code) {
    const db = await dbPromise;
    const result= await db.getFromIndex('followData','code',code);
    if(result) return true;
    else return false;
}
export async function unfollowCode(code) {
    const db = await dbPromise;
    const index = db.transaction('followData').store.index('code');
    const match = await index.getKey(code); // get the primary key (id) for given code

    if (match !== undefined) {
        await db.delete('followData', match);
        console.log("You Unfollowed", code);
    } else {
        console.warn("No matching follow entry for", code);
    }
}