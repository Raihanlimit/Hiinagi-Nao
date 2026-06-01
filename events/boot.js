import pino from 'pino'

import {
   makeWASocket,
   useMultiFileAuthState,
   fetchLatestBaileysVersion,
   DisconnectReason
} from 'baileys'

import connection from './events/connection.js'

const logger = pino({
   level: 'silent'
})

export default async function start() {

   const {
      state,
      saveCreds
   } = await useMultiFileAuthState(
      './database/session'
   )

   const { version } =
      await fetchLatestBaileysVersion()

   const sock = makeWASocket({
      version,
      auth: state,
      logger,
      browser: ['Hiinagi Nao', 'Chrome', '1.0.0']
   })

   sock.ev.on(
      'creds.update',
      saveCreds
   )

   connection(sock)

   // pairing code
   if(!sock.authState.creds.registered) {

      const phone =
         process.env.BOT_NUMBER

      setTimeout(async() => {

         const code =
            await sock.requestPairingCode(
               phone
            )

         console.log(
            '\nPairing Code:',
            code,
            '\n'
         )

      }, 3000)
   }

   return sock
}