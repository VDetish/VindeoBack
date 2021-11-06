import { StringDecoder } from 'string_decoder'
import {
  getSessionUser,
  getUser,
  getUserChats,
  addMessage,
  getChatMessages,
} from '../mysql.js'

import { sendChatPush } from '../APN/index.js'

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

const colorArr = [
  '#61e2be',
  '#00c9ff',
  '#ffaeba',
  '#e4e63a',
  '#cf8bf3',
  '#a2dc6a',
  '#fb6e94',
  '#43aeef',
  '#73ed86',
  '#b3a0e8',
]

function getRandomAvatarColor() {
  const random = Math.floor(Math.random() * colorArr.length)

  return colorArr[random]
}

export async function open(ws) {
  console.log('WebSocket open, session: ' + ws.session)

  ws.client = {
    session: ws.session,
    id: ws.userData.id,
    name: ws.userData.name + ' ' + ws.userData.family_name,
  }

  const chatList = await getUserChats(ws.session)

  chatList.forEach((chat) => {
    chat.color = `${colorArr[chat.color[0]]},${colorArr[chat.color[1]]}`
  })

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

  for (const { id } of chatList) {
    const unreadMessages = await getChatMessages(id, ws.session)

    if (unreadMessages.length > 0) {
      ws.send(
        JSON.stringify({
          type: 'background',
          action: 'chatUnreadMessages',
          data: unreadMessages,
        })
      )
    }
  }
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

async function sendAll(ws, app, { text, chat, hash }) {
  const { id, user, time } = await addMessage({ chat, hash, text }, ws.session)

  const message = JSON.stringify({
    action: 'message',
    type: 'foreground',
    message: { id, chat, hash, text, user, time },
  })

  app.publish(`chat/${chat}`, message)

  await sendChatPush({
    title: user,
    userName: ws.client.name,
    user,
    body: text,
    chat,
  })
}
