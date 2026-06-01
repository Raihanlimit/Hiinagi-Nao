import { loadDB, saveDB } from '../database/core.js';

const path = './database/data/context.json';

export function getContext(chatId) {
    const db = loadDB(path, {});
    return db[chatId] || {};
}

export function setContext(chatId, value) {
    const db = loadDB(path, {});
    db[chatId] = {
        ...db[chatId],
        ...value,
    };
    saveDB(path, db);
}

export function clearContext(chatId) {
    const db = loadDB(path, {});
    delete db[chatId];
    saveDB(path, db);
}