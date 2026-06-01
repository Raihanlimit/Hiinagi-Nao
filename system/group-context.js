import fs from 'fs';

const PATH = './database/data/group-context.json';

function load() {
    if (!fs.existsSync(PATH)) {
        fs.writeFileSync(PATH, JSON.stringify({}));
    }

    try {
        return JSON.parse(fs.readFileSync(PATH, 'utf8'));
    } catch {
        return {};
    }
}

function save(data) {
    fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}

export function pushGroupContext(groupId, payload) {
    const db = load();

    if (!db[groupId]) {
        db[groupId] = [];
    }

    db[groupId].push(payload);
    db[groupId] = db[groupId].slice(-15);
    save(db);
}

export function getGroupContext(groupId) {
    const db = load();
    return Array.isArray(db[groupId]) ? db[groupId] : [];
}