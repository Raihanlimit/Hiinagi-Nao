function getJSTDate() {
    return new Date(
        new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Tokyo',
        })
    );
}

export function getCurrentDate() {
    const now = getJSTDate();

    return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
    };
}

export function isOwnerBirthday() {
    const { month, day } = getCurrentDate();

    return month === 5 && day === 11;
}

export function isNaoBirthday() {
    const { month, day } = getCurrentDate();

    return month === 7 && day === 7;
}

export function getTodayEvent() {
    const { month, day } = getCurrentDate();

    // Owner birthday
    if (month === 5 && day === 11) {
        return 'owner_birthday';
    }

    // Nao birthday
    if (month === 7 && day === 7) {
        return 'nao_birthday';
    }

    // New year
    if (month === 1 && day === 1) {
        return 'new_year';
    }

    // Valentine
    if (month === 2 && day === 14) {
        return 'valentine';
    }

    // Halloween
    if (month === 10 && day === 31) {
        return 'halloween';
    }

    // Christmas
    if (month === 12 && day === 25) {
        return 'christmas';
    }

    return null;
}