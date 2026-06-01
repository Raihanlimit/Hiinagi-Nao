export default function isOwner(msg) {
    const owners = (
        process.env.OWNER_NUMBER || ''
    )
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
        .map(v => `${v}@s.whatsapp.net`);

    return owners.includes(msg.senderAlt);
}