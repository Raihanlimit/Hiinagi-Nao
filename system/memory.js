import { loadDB, saveDB } from '../database/core.js';

const path = './database/data/memory.json';
const LIMIT = 30;

export function getMemory(chatId) {
    const db = loadDB(path, {});

    if (!db[chatId]) {
        db[chatId] = { messages: [] };
        saveDB(path, db);
    }

    return db[chatId];
}

export function saveMemory(chatId, role, content) {
    if (!content?.trim()) {
      return;
    }
    
    const db = loadDB(path, {});

    if (!db[chatId]) {
        db[chatId] = { messages: [] };
    }

    db[chatId].messages.push({
        role,
        content,
        time: Date.now(),
    });

    db[chatId].messages = db[chatId].messages.slice(-LIMIT);
    saveDB(path, db);
}

export function clearMemory(chatId) {
    const db = loadDB(path, {});
    delete db[chatId];
    saveDB(path, db);
}