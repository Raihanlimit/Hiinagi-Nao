import { loadDB, saveDB } from '../database/core.js';

const modePath = './database/data/mode.json';
const setupPath = './database/data/setup.json';

export function getMode() {
    return loadDB(modePath, {
        current: 'public',
        custom: [],
    });
}

export function setMode(current = 'public') {
    const db = getMode();
    db.current = current;
    saveDB(modePath, db);
}

export function setCustom(chats = []) {
    const db = getMode();
    db.custom = chats;
    saveDB(modePath, db);
}

export function getSetup() {
    return loadDB(setupPath, {
        customSetup: false,
        owner: '',
    });
}

export function setSetup(value = {}) {
    const db = getSetup();
    const merged = {
        ...db,
        ...value,
    };
    saveDB(setupPath, merged);
}