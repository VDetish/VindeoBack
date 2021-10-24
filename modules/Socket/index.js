import { StringDecoder } from 'string_decoder'
import { randomBytes } from 'crypto'

import { getSessionUser, getUser, getUserChats } from '../mysql.js'

const stringDecoder = new StringDecoder('utf8')

export async function upgrade(res, req, context) {
  const upgradeAborted = { aborted: false }
  const secWebSocketKey = req.getHeader('sec-websocket-key')
  const session = req.getHeader('sec-websocket-protocol')
  const secWebSocketExtensions = req.getHeader('sec-websocket-extensions')

  res.onAborted(() => {
    upgradeAborted.aborted = true
  })

  if (upgradeAborted.aborted) {
    return
  }

  const { value, user } = await getSessionUser(session)
  const userData = await getUser(user)

  res.upgrade(
    { userData: { ...userData }, session: value },
    secWebSocketKey,
    session,
    secWebSocketExtensions,
    context
  )
}

export async function open(ws) {
  console.log('WebSocket open, session: ' + ws.session)

  ws.client = {
    session: ws.session,
    id: ws.userData.id,
    name: ws.userData.name + ' ' + ws.userData.family_name,
  }

  const chatList = await getUserChats(ws.session)

  chatList.forEach(({ id }) => {
    console.log('Подписываем', `chat/${id}`)
    ws.subscribe(`chat/${id}`)
    ws.publish(
      `chat/${id}`,
      JSON.stringify({
        id,
        type: 'foreground',
        action: 'userStatus',
        status: 'online',
      })
    )
  })

  ws.send(
    JSON.stringify({ type: 'foreground', action: 'chatList', data: chatList })
  )
}

export async function close(ws, app) {
  console.log('WebSocket closed, session: ' + ws.client.session)

  const chatList = await getUserChats(ws.client.session)

  chatList.forEach(({ id }) => {
    console.log('Вышел из чата', `chat/${id}`, ws.client.name)

    app.publish(
      `chat/${id}`,
      JSON.stringify({
        id,
        name: ws.client.name,
        type: 'background',
        status: 'offline',
      })
    )
  })

  // Получить все чаты где пользователь — отправить offline
  // Получить диалоги с пользователем — отправить offline
}

export function message(ws, app, message) {
  message = stringDecoder.write(new DataView(message))
  const data = JSON.parse(message)

  // Проверять, может ли пользователь писать в чат
  // ws.client.session / ws.session

  console.log('<- ' + ws.client.session + ': ' + JSON.stringify(message))

  switch (data.action) {
    case 'message':
      sendAll(ws, app, data)

      break
  }
}

function sendAll(ws, app, { text, chat, hash }) {
  const id = randomBytes(16).toString('hex')

  const message = JSON.stringify({
    action: 'message',
    type: 'foreground',
    message: {
      id,
      chat,
      hash,
      text,
      user: ws.client.id,
      time: new Date(),
    },
  })

  app.publish(`chat/${chat}`, message)
  // ws.send(message)
}
