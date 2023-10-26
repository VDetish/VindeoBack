import { StringDecoder } from "string_decoder";
import {
  getSessionUser,
  getUser,
  getUserChats,
  addMessage,
  getChatMessages,
  getContactList,
} from "../mysql.js";

import { sendChatPush } from "../APN/index.js";

const stringDecoder = new StringDecoder("utf8");

export async function upgrade(res, req, context) {
  const upgradeAborted = { aborted: false };
  const secWebSocketKey = req.getHeader("sec-websocket-key");
  const session = req.getHeader("sec-websocket-protocol");
  const secWebSocketExtensions = req.getHeader("sec-websocket-extensions");

  res.onAborted(() => {
    upgradeAborted.aborted = true;
  });

  if (upgradeAborted.aborted) {
    return;
  }

  const { value, user } = await getSessionUser(session);
  const userData = await getUser(user);

  res.upgrade(
    { userData: { ...userData }, session: value },
    secWebSocketKey,
    session,
    secWebSocketExtensions,
    context
  );
}

const colorArr = [
  "#61e2be",
  "#00c9ff",
  "#ffaeba",
  "#e4e63a",
  "#cf8bf3",
  "#a2dc6a",
  "#fb6e94",
  "#43aeef",
  "#73ed86",
  "#b3a0e8",
];

function getRandomAvatarColor() {
  const random = Math.floor(Math.random() * colorArr.length);

  return colorArr[random];
}

async function sendContacts(ws) {
  try {
    const contactList = await getContactList(ws.session);

    ws.send(
      JSON.stringify({
        type: "foreground",
        action: "contactList",
        data: contactList,
      })
    );
  } catch (error) {
    console.log("interval is", ws.updateContacts);
    clearInterval(ws.updateContacts);
    ws.updateContacts = null;
    console.log(error);
  }
}

async function sendChats(ws) {
  const chatList = await getUserChats(ws.session);

  chatList.forEach((chat) => {
    chat.color = `${colorArr[chat.color[0]]},${colorArr[chat.color[1]]}`;
  });

  // Проверить не подписывается ли несколько раз
  chatList.forEach(({ id }) => {
    ws.subscribe(`chat/${id}`);
    ws.publish(
      `chat/${id}`,
      JSON.stringify({
        id,
        type: "foreground",
        action: "userStatus",
        status: "online",
      })
    );
  });

  ws.send(
    JSON.stringify({ type: "foreground", action: "chatList", data: chatList })
  );

  for (const { id } of chatList) {
    setTimeout(async () => {
      const unreadMessages = await getChatMessages(id, ws.session);
      if (unreadMessages.length > 0) {
        try {
          ws.send(
            JSON.stringify({
              type: "background",
              action: "chatUnreadMessages",
              data: unreadMessages,
            })
          );
        } catch (error) {
          console.log("Send Unread Messages", error);
        }
      }
    }, 3000);
  }
}

export async function open(ws) {
  ws.client = {
    session: ws.session,
    id: ws.userData.id,
    name: ws.userData.name + " " + ws.userData.family_name,
  };

  sendContacts(ws);
  ws.updateContacts = setInterval(() => {
    sendContacts(ws);
  }, 5000);

  sendChats(ws);
}

export async function close(ws, app) {
  clearInterval(ws.updateContacts);
  ws.updateContacts = null;

  const chatList = await getUserChats(ws.client.session);

  chatList.forEach(({ id }) => {
    console.log("Вышел из чата", `chat/${id}`, ws.client.name);

    app.publish(
      `chat/${id}`,
      JSON.stringify({
        id,
        name: ws.client.name,
        type: "background",
        status: "offline",
      })
    );
  });
  // Получить все чаты где пользователь — отправить offline
  // Получить диалоги с пользователем — отправить offline
}

export function message(ws, app, message) {
  message = stringDecoder.write(new DataView(message));
  const data = JSON.parse(message);

  // Проверять, может ли пользователь писать в чат
  // ws.client.session / ws.session
  switch (data.action) {
    case "message":
      sendAll(ws, app, data);
      break;
    case "newChat":
      sendChats(ws);
      break;
  }
}

async function sendAll(ws, app, { text, chat, hash }) {
  console.log("sendAll");
  const { id, user, time } = await addMessage({ chat, hash, text }, ws.session);

  const message = JSON.stringify({
    action: "message",
    type: "foreground",
    message: { id, chat, hash, text, user, time },
  });

  app.publish(`chat/${chat}`, message);

  try {
    await sendChatPush({
      title: user,
      userName: ws.client.name,
      user,
      body: text,
      chat,
    });
  } catch (error) {
    console.log("some push error", error);
  }
}
