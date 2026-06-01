import fs from 'fs';

const path = './database/data/memory.json';

function load() {
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, '{}');
    }
    return JSON.parse(fs.readFileSync(path));
}

function save(data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 3));
}

export function getMemory(chatId) {
    const db = load();
    return db[chatId] || {};
}

export function setMemory(chatId, value) {
    const db = load();
    db[chatId] = {
        ...db[chatId],
        ...value
    };
    save(db);
}