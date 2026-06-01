const groups = new Map();

export function getGroupName(id = '') {
    return groups.get(id);
}

export function setGroupName(id = '', name = '') {
    if (!id || !name) return;
    groups.set(id, name);
}

export function hasGroup(id = '') {
    return groups.has(id);
}

export function clearGroups() {
    groups.clear();
}

export function getAllGroups() {
    return Object.fromEntries(groups);
}