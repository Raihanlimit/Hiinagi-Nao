import fs from 'fs';

const cache = {};

function ensure(path, fallback = {}) {
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, JSON.stringify(fallback, null, 3));
    }
}

export function loadDB(path, fallback = {}) {
    if (cache[path]) {
        return cache[path];
    }

    ensure(path, fallback);

    try {
        const data = JSON.parse(fs.readFileSync(path, 'utf8'));
        cache[path] = data;
        return data;
    } catch {
        cache[path] = fallback;
        return fallback;
    }
}

export function saveDB(path, data) {
    cache[path] = data;
    fs.writeFileSync(path, JSON.stringify(data, null, 3));
}

export function clearDB(path) {
    delete cache[path];
}

export function reloadDB(path, fallback = {}) {
    delete cache[path];
    return loadDB(path, fallback);
}