import { DisconnectReason } from 'baileys';
import { setGroupName } from '../system/group-cache.js';

let reconnecting = false;

export default function connection(sock) {
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'connecting') {
            console.log('[ CONNECTING ]');
        }

        if (connection === 'open') {
            reconnecting = false;
            console.log('[ CONNECTED ] Hiinagi Nao connected.');

            try {
                const groups = await sock.groupFetchAllParticipating();

                for (const id in groups) {
                    setGroupName(id, groups[id].subject);
                }

                console.log(`[ GROUP CACHE ] ${Object.keys(groups).length} loaded`);
            } catch (err) {
                console.log('[ GROUP CACHE ERROR ]', err);
            }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const reconnect = reason !== DisconnectReason.loggedOut;

            console.log('[ CONNECTION CLOSED ]', reason);

            if (!reconnect) {
                reconnecting = false;
                console.log('[ LOGGED OUT ] scan ulang required.');
                return;
            }

            if (reconnecting) {
                console.log('[ RECONNECT ] already reconnecting...');
                return;
            }

            reconnecting = true;
            console.log('[ RECONNECTING ] wait 5s...');

            setTimeout(async () => {
                try {
                    const { default: start } = await import('../system/boot.js');
                    await start();
                } catch (err) {
                    console.log('[ RECONNECT ERROR ]', err);
                } finally {
                    reconnecting = false;
                }
            }, 5000);
        }
    });
}