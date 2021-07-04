import mysql from 'mysql2/promise.js'
import htmlEntl from 'html-entities'

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tool46',
  // database: 'toolmi',
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
    return false
  } else if (res.changedRows === 1) {
    const user = await getUserByPhone(phone)
    await updateSession(session, user.id)

    return user
  } else {
    await connection.query(
      'UPDATE `toolmi`.calls SET fails = fails + 1 WHERE ? AND ? AND ?',
      [{ phone }, { session }, { validated: false }]
    )

    return false
  }
}

export async function createUser(session, phone) {
  const userData = await getSessionUser(session)

  if (userData.user > 0) {
    const user = await getUser(userData.user)
    await updateSession(session, user.id)

    return user
  } else {
    const [res, err] = await connection.query(
      'INSERT INTO `toolmi`.`users` SET ?',
      {
        phone,
      }
    )

    const user = await getUser(res.insertId)
    await updateSession(session, user.id)

    return user
  }
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
  await connection.query('UPDATE `toolmi`.sessions SET user = ? WHERE ?', [
    user,
    { value },
  ])
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

  // Get what user like ordered by rate
  const query = await connection.query(
    'SELECT * FROM `toolmi`.`users_artists` WHERE ? ORDER BY rate DESC',
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
  let artistName = htmlEntl
    .decode(artist)
    .replace(/[^\p{L}\p{N}\p{Z}]/gu, '')
    .replace(/ +/g, ' ')
    .trim()

  artistName =
    artistName.length >= 55 ? artistName.substring(0, 55) : artistName

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
  // artist or artist formated

  const artists = await getArtist(artist)

  const query = await connection.query(
    'SELECT * FROM WierdConnections.`artists_photos` WHERE ?',
    {
      artist: artists[0].id,
    }
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

export async function getArtistsRecommend(session) {
  const { user } = await getSessionUser(session)

  const query = await connection.query(
    'SELECT art.id, name, path FROM toolmi.users_artists_recommend AS art_rec JOIN WierdConnections.artists AS art ON art_rec.artist = art.id JOIN WierdConnections.artists_photos AS ph ON ph.artist = art_rec.artist WHERE ? ORDER BY art_rec.rate DESC',
    { 'art_rec.user': user }
  )

  return query[0]
}
