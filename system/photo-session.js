export function getPhotoPeriod() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 16) return 'afternoon';
    if (hour >= 16 && hour < 19) return 'evening';
    return 'night';
}

export function canReusePhoto(photoCtx = {}) {
    if (!photoCtx?.lastPhotoPeriod) return false;
    return photoCtx.lastPhotoPeriod === getPhotoPeriod();
}

export default {
    getPhotoPeriod,
    canReusePhoto
};