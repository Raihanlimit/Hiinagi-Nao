import { loadDB, saveDB } from '../database/core.js';

const path = './database/data/mood.json';

const COOLDOWNS = {
    thanks: 10,
    pujian: 20,
    sayang: 30,
    love: 60,
    daisuki: 60,
    suki: 30,
    arigatou: 15,
    kawaii: 15,
    sugoi: 15,
    erai: 15,
    otsukare: 20,
    ohayou: 30,
    oyasumi: 30,
    hinaan: 20,
    baka: 30,
    kirai: 60,
    daikirai: 180,
    marah: 15,
    cium: 45,
};

const KEYWORDS = [
    [/makasih|terima kasih|thanks|thank you|thx/i, 3, 1, 'thanks'],
    [/cantik|imut|lucu|manis|comel|\bayang\b/i, 5, 2, 'pujian'],
    [/hebat|keren|pinter|good girl|bangga|jenius|handal|gacor|wow/i, 6, 3, 'pujian'],
    [/sayang|peluk|cuddle|miss you|rindu/i, 8, 5, 'sayang'],
    [/\blove\b|love you|luv u|i love you|loveyou/i, 10, 6, 'love'],
    [/cium|kiss/i, 6, 4, 'cium'],
    [/大好き|daisuki/i, 12, 8, 'daisuki'],
    [/好き|suki/i, 8, 5, 'suki'],
    [/ありがとう|arigatou|arigato/i, 3, 1, 'arigatou'],
    [/かわいい|kawaii|萌え|moe/i, 5, 2, 'kawaii'],
    [/すごい|sugoi|すばらしい|subarashii/i, 5, 2, 'sugoi'],
    [/えらい|erai|いい子|ii ko/i, 5, 2, 'erai'],
    [/お疲れ|otsukare|おつかれ|otsu/i, 3, 1, 'otsukare'],
    [/おはよう|ohayou|ohayo|おは/i, 2, 0, 'ohayou'],
    [/おやすみ|oyasumi|oyasu|おや/i, 2, 1, 'oyasumi'],
    [/tolol|bodoh|bego|goblok|dungu|idiot|moron|stupid|ngentod|kontol|memek/i, -10, -3, 'hinaan'],
    [/bacot|berisik|diam|diem|bisik|sokap|sok tau|ngaco/i, -5, -1, 'hinaan'],
    [/kampret|anjing|asu|bangsat|sialan|sinting|edan/i, -8, -2, 'hinaan'],
    [/大嫌い|daikirai/i, -25, -15, 'daikirai'],
    [/嫌い|kirai/i, -15, -8, 'kirai'],
    [/ばか|baka|バカ|あほ|aho|dunce/i, -6, -2, 'baka'],
    [/うるさい|urusai|うざい|uzai|jamet|norak/i, -5, -1, 'baka'],
    [/プンプン|punpun|marah|ngambek|sebel|bete|bt/i, -4, 0, 'marah'],
];

function isCooldownActive(data, key) {
    const minutes = COOLDOWNS[key];
    if (!minutes) return false;

    const last = data.cooldowns?.[key];
    if (!last) return false;

    return Date.now() - last < minutes * 60 * 1000;
}

function setCooldown(data, key) {
    if (!data.cooldowns) {
        data.cooldowns = {};
    }
    data.cooldowns[key] = Date.now();
}

function applyEffect(data, key, mood, relation) {
    if (isCooldownActive(data, key)) {
        return { mood: 0, relation: 0 };
    }

    setCooldown(data, key);
    return { mood, relation };
}

function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}

function resolveMood(value = 50) {
    if (value >= 80) return 'happy';
    if (value >= 60) return 'normal';
    if (value >= 40) return 'sleepy';
    if (value >= 20) return 'badmood';
    return 'angry';
}

function resolveRelationship(value = 50) {
    if (value >= 80) return 'very_close';
    if (value >= 60) return 'close';
    if (value >= 40) return 'friendly';
    if (value >= 20) return 'neutral';
    return 'cold';
}

function ensureUser(db, chatId) {
    if (!db[chatId]) {
        db[chatId] = {
            mood: 'normal',
            value: 50,
            relationship: 50,
            relationshipState: 'friendly',
            cooldowns: {},
            lastInteractionAt: Date.now(),
            lastRecoveryAt: Date.now(),
        };
    }

    if (!db[chatId].cooldowns) {
        db[chatId].cooldowns = {};
    }

    if (db[chatId].updatedAt) {
        if (!db[chatId].lastInteractionAt) {
            db[chatId].lastInteractionAt = db[chatId].updatedAt;
        }
        if (!db[chatId].lastRecoveryAt) {
            db[chatId].lastRecoveryAt = db[chatId].updatedAt;
        }
        delete db[chatId].updatedAt;
    }

    if (!db[chatId].lastInteractionAt) {
        db[chatId].lastInteractionAt = Date.now();
    }

    if (!db[chatId].lastRecoveryAt) {
        db[chatId].lastRecoveryAt = Date.now();
    }

    if (!db[chatId].relationshipState) {
        db[chatId].relationshipState = resolveRelationship(db[chatId].relationship || 50);
    }

    return db[chatId];
}

function recoverMood(data) {
    const now = Date.now();
    const hours = (now - data.lastRecoveryAt) / (1000 * 60 * 60);

    if (hours < 6) return false;

    const steps = Math.floor(hours / 6);

    if (data.value > 50) {
        data.value -= steps * 3;
        if (data.value < 50) data.value = 50;
    } else if (data.value < 50) {
        data.value += steps * 3;
        if (data.value > 50) data.value = 50;
    }

    if (data.relationship > 50) {
        data.relationship -= steps;
        if (data.relationship < 50) data.relationship = 50;
    } else if (data.relationship < 50) {
        data.relationship += steps;
        if (data.relationship > 50) data.relationship = 50;
    }

    data.value = clamp(data.value);
    data.relationship = clamp(data.relationship);
    data.mood = resolveMood(data.value);
    data.relationshipState = resolveRelationship(data.relationship);
    data.lastRecoveryAt = now;

    return true;
}

export function getMood(chatId) {
    const db = loadDB(path, {});
    const data = ensureUser(db, chatId);

    if (recoverMood(data)) {
        saveDB(path, db);
    }

    return data;
}

export function setMood(chatId, value = 50) {
    const db = loadDB(path, {});
    const data = ensureUser(db, chatId);

    data.value = clamp(value);
    data.mood = resolveMood(data.value);
    data.lastInteractionAt = Date.now();

    saveDB(path, db);
    return data;
}

export function changeMood(chatId, amount = 0) {
    const db = loadDB(path, {});
    const data = ensureUser(db, chatId);

    data.value = clamp(data.value + amount);
    data.mood = resolveMood(data.value);
    data.lastInteractionAt = Date.now();

    saveDB(path, db);
    return data;
}

export function changeRelationship(chatId, amount = 0) {
    const db = loadDB(path, {});
    const data = ensureUser(db, chatId);

    data.relationship = clamp((data.relationship || 50) + amount);
    data.relationshipState = resolveRelationship(data.relationship);
    data.lastInteractionAt = Date.now();

    saveDB(path, db);
    return data;
}

export function updateMood(chatId, text = '', owner = false) {
    const msg = text.toLowerCase();
    const db = loadDB(path, {});
    const data = ensureUser(db, chatId);

    let moodScore = 0;
    let relationScore = 0;
    let hasDaisuki = false;
    let hasDaikirai = false;

    for (const [regex, mood, relation, key] of KEYWORDS) {
        if (!regex.test(msg)) continue;

        if (key === 'daisuki') {
            hasDaisuki = true;
        }

        if (key === 'daikirai') {
            hasDaikirai = true;
        }

        if (key === 'suki' && hasDaisuki) {
            continue;
        }

        if (key === 'kirai' && hasDaikirai) {
            continue;
        }

        const effect = applyEffect(data, key, mood, relation);
        moodScore += effect.mood;
        relationScore += effect.relation;
    }

    moodScore = Math.max(-15, Math.min(15, moodScore));
    relationScore = Math.max(-10, Math.min(10, relationScore));

    if (owner) {
        moodScore = Math.round(moodScore * 1.5);
        relationScore = Math.round(relationScore * 1.5);
    }

    moodScore = Math.max(-20, Math.min(20, moodScore));
    relationScore = Math.max(-15, Math.min(15, relationScore));

    if (moodScore !== 0) {
        data.value = clamp(data.value + moodScore);
    }

    if (relationScore !== 0) {
        data.relationship = clamp((data.relationship || 50) + relationScore);
    }

    data.mood = resolveMood(data.value);
    data.relationshipState = resolveRelationship(data.relationship);
    data.lastInteractionAt = Date.now();

    saveDB(path, db);
    return data;
}

export function getPapChance(chatId) {
    const data = getMood(chatId);
    let chance = 0;

    chance += Math.floor(data.value / 8);
    chance += Math.floor((data.relationship || 50) / 8);

    return clamp(chance, 0, 30);
}

export function getViewOnceChance(chatId) {
    const data = getMood(chatId);
    let chance = 50;

    chance -= Math.floor(data.value / 8);
    chance -= Math.floor((data.relationship || 50) / 8);

    return clamp(chance, 15, 85);
}

export function getInitiativeChance(chatId) {
    const data = getMood(chatId);
    let chance = 0;

    chance += Math.floor(data.value / 8);
    chance += Math.floor((data.relationship || 50) / 6);

    return clamp(chance, 0, 70);
}

export function getMoodState(chatId) {
    return getMood(chatId).mood;
}

export function getRelationshipState(chatId) {
    return getMood(chatId).relationshipState;
}

export function getRelationshipValue(chatId) {
    return getMood(chatId).relationship;
}

export function isHappy(chatId) {
    return getMoodState(chatId) === 'happy';
}

export function isNormal(chatId) {
    return getMoodState(chatId) === 'normal';
}

export function isSleepy(chatId) {
    return getMoodState(chatId) === 'sleepy';
}

export function isBadMood(chatId) {
    return getMoodState(chatId) === 'badmood';
}

export function isAngry(chatId) {
    return getMoodState(chatId) === 'angry';
}

export function isVeryClose(chatId) {
    return getRelationshipState(chatId) === 'very_close';
}

export function isClose(chatId) {
    return getRelationshipState(chatId) === 'close';
}

export function isFriendly(chatId) {
    return getRelationshipState(chatId) === 'friendly';
}

export function isNeutral(chatId) {
    return getRelationshipState(chatId) === 'neutral';
}

export function isCold(chatId) {
    return getRelationshipState(chatId) === 'cold';
}