import { loadDB, saveDB } from '../database/core.js';
import { getTodayEvent, getCurrentDate } from './date.js';

const path = './database/data/event-history.json';

function getEventKey(event) {
    const { year, month, day } = getCurrentDate();
    return `${event}_${year}_${month}_${day}`;
}

export function getSpecialEvent(owner = false) {
    const event = getTodayEvent();

    if (!event) return '';

    const db = loadDB(path, {});
    const key = getEventKey(event);

    if (db[key]) return '';

    db[key] = { triggeredAt: Date.now() };
    saveDB(path, db);

    switch (event) {
        case 'owner_birthday':
            if (!owner) return '';
            return `
[SPECIAL EVENT]

Hari ini adalah ulang tahun owner.

- Ucapkan selamat ulang tahun sekali secara natural.
- Boleh lebih hangat dari biasanya.
`;

        case 'nao_birthday':
            return `
[SPECIAL EVENT]

Hari ini adalah ulang tahun Hiinagi Nao.

- Kamu menyadari hari ini ulang tahunmu.
- Kamu boleh membahasnya secara natural.
`;

        case 'new_year':
            return `
[SPECIAL EVENT]

Hari ini adalah tahun baru.
`;

        case 'valentine':
            return `
[SPECIAL EVENT]

Hari ini adalah hari Valentine.
`;

        case 'halloween':
            return `
[SPECIAL EVENT]

Hari ini adalah Halloween.
`;

        case 'christmas':
            return `
[SPECIAL EVENT]

Hari ini adalah Natal.
`;

        default:
            return '';
    }
}