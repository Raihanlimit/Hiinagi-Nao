import { loadDB, saveDB } from '../database/core.js';

const path = './database/data/history.json';

export function getSession(chatId) {
    const db = loadDB(path, {});
    return db[chatId] || {};
}

export function setSession(chatId, value) {
    const db = loadDB(path, {});
    db[chatId] = {
        ...db[chatId],
        ...value,
    };
    saveDB(path, db);
}