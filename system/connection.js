import {
   DisconnectReason
} from 'baileys'

export default function connection(sock) {

   sock.ev.on(
      'connection.update',
      async(update) => {

         const {
            connection,
            lastDisconnect
         } = update

         if(connection === 'open') {

            console.log(
               'Nao connected.'
            )
         }

         if(connection === 'close') {

            const reason =
               lastDisconnect?.error
                  ?.output?.statusCode

            const reconnect =
               reason !==
               DisconnectReason.loggedOut

            console.log(
               'Connection closed:',
               reason
            )

            if(reconnect) {

               console.log(
                  'Reconnecting...'
               )

               import('./system/boot.js')
                  .then(({ default: start }) => {
                     start()
                  })
            }
         }
      }
   )
}