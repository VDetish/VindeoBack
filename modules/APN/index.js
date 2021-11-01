import { Provider, Notification } from 'apn'
import path from 'path'
import { fileURLToPath } from 'url'

import { chatPushTokens } from '../mysql.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const apnProduction = process.env.NODE_ENV === 'production' ? true : false

const apnOptions = {
  token: {
    key: path.join(__dirname, '../..', 'certs', 'AuthKey_W65D93FDYL.p8'),
    keyId: 'W65D93FDYL',
    teamId: 'ZSR82G27GC',
  },
  production: apnProduction,
}

console.log(apnOptions.token.key)

var apnProvider = new Provider(apnOptions)

export async function sendChatPush({ title, body, chat }) {
  let notification = new Notification({
    alert: {
      title,
      body,
    },
    topic: 'toolmi',
    payload: {
      custom: 'value',
    },
    // pushType: 'background',
    pushType: 'alert',
  })

  console.log(notification)

  // notification.badge = 666

  const deviceTokens = await chatPushTokens({ chat })

  console.log(deviceTokens)

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
