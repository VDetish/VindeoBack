import mysql from 'mysql2/promise.js'
import htmlEntl from 'html-entities'

// const connection = await mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: 'tool46',
//   // database: 'toolmi',
// })

const connection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'tool46',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function createSession(fields) {
  const query = await connection.query(
    'INSERT INTO `toolmi`.`sessions` SET ?',
    fields
  )

  return !!query[1]
}

export async function getSession(value) {
  const query = await connection.query(
    'SELECT * FROM `toolmi`.`sessions` WHERE ?',
    {
      value,
    }
  )

  return query[0].length > 0
}

export async function addDevice(session, json) {
  const fields = {
    device: json.device,
    platform: json.platform,
    platform_version: json.platformVersion,
    app_version: json.appVersion,
    session,
  }

  const fieldsUpdate = {
    platform_version: json.platformVersion,
    app_version: json.appVersion,
  }

  try {
    const query = await connection.query(
      'INSERT INTO `toolmi`.`devices` SET ? ON DUPLICATE KEY UPDATE ?',
      [fields, fieldsUpdate]
    )

    return [!!query[1], session]
  } catch (e) {
    return [true, session]
  }
}

export async function addCall(fields) {
  const fieldsUpdate = { ...fields, fails: 0, validated: 0 }

  const query = await connection.query(
    'INSERT INTO `toolmi`.`calls` SET ? ON DUPLICATE KEY UPDATE ?',
    [fields, fieldsUpdate]
  )

  return { status: !query[1] }
}

export async function checkCode({ phone, session, code }) {
  const [res, err] = await connection.query(
    'UPDATE `toolmi`.calls SET validated = ? WHERE ? AND ? AND ? AND ? AND fails < 3',
    [1, { phone }, { code }, { session }, { validated: false }]
  )

  if (err) {
    return { valid: false, isNewUser: false }
  } else if (res.changedRows === 1) {
    const user = await getUserByPhone(phone)

    // Либо вход, либо регистрация
    if (!user) {
      const user = await createUser(phone)
      await updateSession(session, user.id)

      return { valid: true, isNewUser: true, user: null }
    } else {
      await updateSession(session, user.id)

      return { valid: true, isNewUser: false, user }
    }
  } else {
    await connection.query(
      'UPDATE `toolmi`.calls SET fails = fails + 1 WHERE ? AND ? AND ?',
      [{ phone }, { session }, { validated: false }]
    )

    return { valid: false, isNewUser: false }
  }
}

export async function createUser(phone) {
  const [{ insertId }, err] = await connection.query(
    'INSERT INTO `toolmi`.`users` SET ?',
    {
      phone,
    }
  )

  const user = await getUser(insertId)

  return user
}

export async function getUser(id) {
  const [res, err] = await connection.query(
    'SELECT * FROM `toolmi`.`users` WHERE ?',
    {
      id,
    }
  )

  return res[0]
}

export async function getUserFromSession(session) {
  const { user } = await getSessionUser(session)

  if (user) {
    const userData = await getUser(user)

    await updateSession(session, userData.id)

    return userData
  } else {
    return null
  }
}

export async function getUserByPhone(phone) {
  const [res, err] = await connection.query(
    'SELECT * FROM `toolmi`.`users` WHERE ?',
    {
      phone,
    }
  )

  return res[0]
}

export async function updateSession(value, user) {
  const [, err] = await connection.query(
    'UPDATE toolmi.sessions SET user = ? WHERE ?',
    [user, { value }]
  )

  const setUserToken = mysql.format(
    'UPDATE toolmi.user_tokens SET user = ? WHERE ?',
    [user, { session: value }]
  )

  await connection.query(setUserToken)

  if (err) {
    console.log(err)
  }

  return !err
}

export async function removeUser(session) {
  const userData = await getSessionUser(session)

  await connection.query(
    mysql.format('DELETE FROM `toolmi`.users WHERE ?', [{ id: userData.user }])
  )
  await connection.query('UPDATE `toolmi`.sessions SET user = 0 WHERE ?', [
    { value: session },
  ])

  return true
}

export async function getSessionUser(session) {
  const query = await connection.query(
    'SELECT * FROM `toolmi`.`sessions` WHERE ?',
    {
      value: session,
    }
  )

  return query[0][0]
}

export async function setUserInfo({ name, family_name, sex }, session) {
  const userData = await getSessionUser(session)

  await connection.query(
    'UPDATE `toolmi`.users SET name = ?, family_name = ?, sex = ? WHERE ?',
    [name, family_name, sex, { id: userData.user }]
  )

  return true
}

export async function setUserEmail({ email }, session) {
  const userData = await getSessionUser(session)

  await connection.query('UPDATE `toolmi`.users SET email = ? WHERE ?', [
    email,
    { id: userData.user },
  ])

  return true
}

export async function setUserOrientation({ orientation }, session) {
  const userData = await getSessionUser(session)

  await connection.query('UPDATE `toolmi`.users SET orientation = ? WHERE ?', [
    orientation,
    { id: userData.user },
  ])

  return true
}

export async function setAge({ birth_date }, session) {
  const userData = await getSessionUser(session)

  await connection.query('UPDATE `toolmi`.users SET birth_date = ? WHERE ?', [
    birth_date,
    { id: userData.user },
  ])

  return true
}

export async function addPhoto(fields, session) {
  const userData = await getSessionUser(session)
  fields.user = userData.user
  const query = await connection.query(
    'INSERT INTO `toolmi`.`photos` SET ?',
    fields
  )

  return query
}

export async function getPhotos(session) {
  const { user } = await getSessionUser(session)

  const query = await connection.query(
    'SELECT * FROM `toolmi`.`photos` WHERE ?',
    {
      user,
    }
  )

  return query[0]
}

export async function deletePhoto({ sort }, session) {
  const { user } = await getSessionUser(session)

  const query = await connection.query(
    'DELETE FROM `toolmi`.photos WHERE ? AND ?',
    [{ user }, { sort }]
  )

  return !!query[1]
}

export async function getArtists(session) {
  const { user } = await getSessionUser(session)

  const query = await connection.query(
    `SELECT rate, name, path FROM toolmi.users_artists AS art
      LEFT JOIN WierdConnections.artists_photos AS ph ON ph.artist = art.artist
      LEFT JOIN WierdConnections.artists AS a1 ON art.artist = a1.id
      WHERE ? ORDER BY rate DESC`,
    {
      user,
    }
  )

  return query[0]
}

export async function addInterest(fields, session) {
  const userData = await getSessionUser(session)

  fields.user = userData.user

  try {
    const query = await connection.query(
      'INSERT INTO `toolmi`.`users_interests` SET ?',
      fields
    )

    return !query[1]
  } catch (e) {
    return false
  }
}

export async function addCover({ artist, path }) {
  const artists = await getArtist(artist)

  const query = await connection.query(
    'INSERT INTO WierdConnections.`artists_photos` SET ?',
    {
      artist: artists[0].id,
      path,
    }
  )

  return query
}

export async function getArtist(artist) {
  const artistName = formatName(artist)

  const query = await connection.query(
    'SELECT * FROM WierdConnections.`artists` WHERE ? OR ?',
    [
      {
        f_name: artist,
      },
      {
        f_name: artistName,
      },
    ]
  )

  return query[0]
}

export async function getCover(artist) {
  const artists = await getArtist(artist)

  const query = await connection.query(
    'SELECT * FROM WierdConnections.`artists_photos` WHERE ?',
    {
      artist: artists[0].id,
    }
  )

  return query[0]
}

export async function getCovers(list) {
  const artists = list.map(({ id }) => id)

  const query = await connection.query(
    'SELECT * FROM WierdConnections.artists_photos WHERE artist IN (?)',
    [artists]
  )

  return query[0]
}

export async function addArtistRecomend(fields, session) {
  const userData = await getSessionUser(session)
  fields.user = userData.user

  const artists = await getArtist(fields.artist)

  fields.artist = artists[0].id

  const query = await connection.query(
    'INSERT INTO `toolmi`.`users_artists_recommend` SET ? ON DUPLICATE KEY UPDATE rate = rate + 1',
    fields
  )

  return { status: !query[1] }
}

export async function addArtist(fields, session) {
  const userData = await getSessionUser(session)
  fields.user = userData.user

  const query = await connection.query(
    'INSERT INTO `toolmi`.`users_artists` SET ?',
    fields
  )

  try {
    await connection.query(
      mysql.format(
        'DELETE FROM `toolmi`.users_artists_recommend WHERE ? AND ?',
        [{ user: userData.user }, { artist: fields.artist }]
      )
    )
  } catch (e) {
    console.log(e)
  }

  return { status: !query[1] }
}

async function selectArtists(artists) {
  const query = await connection.query(
    'SELECT id, name, f_name FROM WierdConnections.artists WHERE f_name IN (?)',
    [artists]
  )

  return query[0]
}

export async function addArtists(artists, session) {
  artists = artists.filter((item) => item.artist !== undefined)

  const userData = await getSessionUser(session)
  const artistsWithID = await selectArtists(
    artists.map(({ artist }) => formatName(artist))
  )

  const a3 = artists.map((t1) => ({
    ...t1,
    ...artistsWithID.find(
      (t2) => t2.f_name === formatName(t1.artist.toUpperCase())
    ),
  }))

  const a4 = a3
    .filter(({ id }) => !!id)
    .map(({ id, count }) => [userData.user, id, count])

  const query = await connection.query(
    `INSERT INTO toolmi.users_artists (user, artist, rate) VALUES ?
    ON DUPLICATE KEY UPDATE rate=VALUES(rate)`,
    [a4]
  )

  return { status: !query[1], data: a3 }
}

export async function getArtistsRecommend(session) {
  const { user } = await getSessionUser(session)

  const query = await connection.query(
    'SELECT art.id, name, path FROM toolmi.users_artists_recommend AS art_rec JOIN WierdConnections.artists AS art ON art_rec.artist = art.id JOIN WierdConnections.artists_photos AS ph ON ph.artist = art_rec.artist WHERE ? ORDER BY art_rec.rate DESC',
    { 'art_rec.user': user }
  )

  return query[0]
}

export async function getUsersRecomendations(session) {
  const { user } = await getSessionUser(session)

  const query = await connection.query(
    'SELECT * FROM `toolmi`.`cw_recommend_users` AS usr JOIN `WierdConnections`.`users__` AS us ON us.vID = usr.userTo WHERE ? AND ? AND ? LIMIT 10',
    [{ 'usr.user': user ? user : 1 }, { isLiked: 0 }, { 'usr.sex': 1 }]
  )

  return query[0]
}

// Из VK
export async function getUserPhotos(user, session) {
  // const { user } = await getSessionUser(session)

  const query = await connection.query(
    'SELECT * FROM `WierdConnections`.`users_photo` WHERE ?',
    [{ user }]
  )

  return query[0]
}

//
// Мессенджер
//

export async function getUserChats(session) {
  const { user } = await getSessionUser(session)

  const [chatList] = await connection.query(
    `SELECT c.id, c.name, c.type, c.user, c.color FROM toolmi.chat_users AS cu JOIN toolmi.chats AS c ON cu.chat = c.id WHERE ? AND ?`,
    [{ 'cu.user': user }, { 'c.type': 2 }]
  )

  const users = await userToUserChat(user)

  return [...users, ...chatList]
}

export async function userToUserChat(user) {
  const [chatList] = await connection.query(
    `SELECT c.id, CONCAT(u.name, ' ', u.family_name) AS name, c.type, cuu.user, c.color FROM toolmi.chat_users AS cu
    JOIN toolmi.chats AS c ON cu.chat = c.id
    JOIN toolmi.chat_users AS cuu ON cuu.chat = cu.chat
    JOIN toolmi.users AS u ON cuu.user = u.id
    WHERE ? AND ? AND cuu.user != cu.user`,
    [{ 'cu.user': user }, { 'c.type': 1 }]
  )

  return chatList
}

export async function getContactList(session) {
  const { user } = await getSessionUser(session)

  const [contactList] = await connection.query(
    `SELECT cuu.user, CONCAT(u.name, ' ', u.family_name) AS name, MAX(p.path) AS path, u.last_seen FROM toolmi.chat_users AS cu
      JOIN toolmi.chat_users AS cuu ON cuu.chat = cu.chat
      JOIN toolmi.users AS u ON cuu.user = u.id
      LEFT JOIN toolmi.photos AS p ON p.user = u.id AND p.sort = 1
      WHERE ? AND cuu.user != cu.user GROUP BY user`,
    [{ 'cu.user': user }, { 'c.type': 1 }]
  )

  return contactList
}

export async function getMessage(id) {
  const query = await connection.query(
    'SELECT * FROM toolmi.chat_messages WHERE ?',
    { id }
  )

  return query[0]
}

// Получаем последние 100 непрочитанных сообщений
export async function getChatMessages(chat, session) {
  const { user } = await getSessionUser(session)
  const [res] = await userChatAccess({ user, chat })

  if (res.access === 0 || res.access === 1 || res.access === 2) {
    const query_format = mysql.format(
      `SELECT * FROM toolmi.chat_messages WHERE ? AND id > ? ORDER BY time DESC LIMIT 100`,
      [{ chat }, res.last_message]
    )

    const [res_] = await connection.query(query_format)

    return res_
  }
}

// 0 — читать, писать
// 1 — читать
// 2 — админ
export async function userChatAccess({ user, chat }) {
  const query_format = mysql.format(
    `SELECT access, last_message FROM toolmi.chat_users WHERE ? AND ?`,
    [{ user }, { chat }]
  )

  const [res] = await connection.query(query_format)

  return res
}

export async function addMessage({ chat, hash, text }, session) {
  const { user } = await getSessionUser(session)
  const msg = { chat, hash, text, user }

  const [res] = await connection.query(
    `INSERT INTO toolmi.chat_messages SET ?`,
    msg
  )

  const message = await getMessage(res.insertId)

  return message[0]
}

export async function addPushToken(token, session) {
  const { user } = await getSessionUser(session)

  try {
    const [res, err] = await connection.query(
      `INSERT INTO toolmi.user_tokens SET ?`,
      {
        user,
        token,
        session,
      }
    )

    return !!err
  } catch (e) {
    return false
  }
}

// Проверять ещё на offline
export async function chatPushTokens({ chat, user }) {
  const [res] = await connection.query(
    `SELECT ut.token FROM toolmi.chat_users AS ch JOIN toolmi.user_tokens AS ut ON ch.user = ut.user WHERE ? AND ch.user != ?`,
    [{ chat }, user]
  )

  return res.map((e) => e.token)
}

export async function getChatTitle(id) {
  const [res] = await connection.query(
    `SELECT name FROM toolmi.chats WHERE ?`,
    [{ id }]
  )

  return res[0].name
}

//
// Мессенджер
//

function formatName(artist) {
  let artistName = htmlEntl
    .decode(artist)
    .replace(/[^\p{L}\p{N}\p{Z}]/gu, '')
    .replace(/ +/g, ' ')
    .trim()

  artistName =
    artistName.length >= 55 ? artistName.substring(0, 55) : artistName

  return artistName
}
