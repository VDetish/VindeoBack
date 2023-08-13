import { Provider, Notification } from 'apn'
import path from 'path'
import { fileURLToPath } from 'url'

import { getChatTitle, chatPushTokens } from '../mysql.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const apnProduction = process.env.NODE_ENV === 'production' ? true : false

const apnOptions = {
  token: {
    key: path.join(__dirname, '../..', 'certs', 'AuthKey_788WW3A73J.p8'),
    keyId: '788WW3A73J',
    teamId: 'T5C6JZM4H5',
  },
  production: 'production',
}

var apnProvider = new Provider(apnOptions)

export async function sendChatPush({ body, userName, user, chat }) {
  const chatTitle = await getChatTitle(chat)

  let notification = new Notification({
    alert: {
      title: chatTitle,
      body: userName + ': ' + body,
    },
    topic: 'org.toolmi',
    payload: {
      custom: 'value',
    },
    // pushType: 'background',
    pushType: 'alert',
  })

  // notification.badge = 666

  const deviceTokens = await chatPushTokens({ chat, user })

  return new Promise((resolve, reject) => {
    apnProvider.send(notification, deviceTokens).then(({ sent, failed }) => {
      if (failed.length > 0) {
        console.log('failed', failed)
        reject(failed)
      }

      if (sent) {
        console.log('sent', sent)
        resolve(sent)
      }
    })
  })
}
