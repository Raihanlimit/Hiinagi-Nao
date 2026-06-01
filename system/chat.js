import { loadDB, saveDB } from '../database/core.js';

const path = './database/data/chats.json';

export function getChats() {
    return loadDB(path, []);
}

export function saveChat(chat = {}) {
    const db = getChats();
    const exists = db.find((v) => v.id === chat.id);

    if (exists) {
        exists.name = chat.name;
        exists.type = chat.type;
    } else {
        db.push(chat);
    }

    saveDB(path, db);
}