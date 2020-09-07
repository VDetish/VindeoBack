import mysql from 'mysql2/promise.js'

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tool46',
  database: 'toolmi',
})

export async function createSession(fields) {
  const query = await connection.query('INSERT INTO `sessions` SET ?', fields)

  return !!query[1]
}

export async function getSession(value) {
  const query = await connection.query('SELECT * FROM `sessions` WHERE ?', {
    value,
  })

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
      'INSERT INTO `devices` SET ? ON DUPLICATE KEY UPDATE ?',
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
    'INSERT INTO `calls` SET ? ON DUPLICATE KEY UPDATE ?',
    [fields, fieldsUpdate]
  )

  return { status: !query[1] }
}

export async function checkCode({ phone, session, code }) {
  const [
    res,
    err,
  ] = await connection.query(
    'UPDATE calls SET validated = ? WHERE ? AND ? AND ? AND ? AND fails < 3',
    [1, { phone }, { code }, { session }, { validated: false }]
  )

  if (err) {
    return false
  } else if (res.changedRows === 1) {
    return true
  } else {
    await connection.query(
      'UPDATE calls SET fails = fails + 1 WHERE ? AND ? AND ?',
      [{ phone }, { session }, { validated: false }]
    )

    return false
  }
}

// // Add user
// exports.addUser = (id, callback) => {
//   connection.query(
//     'INSERT INTO `users` SET ?',
//     {
//       firstName: 'test',
//       lastName: 'test',
//       vID: 666,
//       canWrite: true,
//       canGetAudio: false,
//     },
//     callback
//   )
// }

// // Add media
// exports.addMedia = (media, callback) => {
//   connection.query(
//     'insert ignore into instagram_media (mediaID, userName, likeCount, commentCount, caption, webLink, image, lat, lng, city, place, address, takenAt, added) values ?',
//     [media],
//     callback
//   )
// }

// // Add to queue
// exports.addToQueue = (queue, callback) => {
//   connection.query(
//     'insert ignore into instagram_queue (type, value, added) values ?',
//     [queue],
//     callback
//   )
// }

// // Get queue
// exports.getQueue = (callback) => {
//   connection.query(
//     'select type, value from instagram_queue WHERE ? order by id LIMIT 1',
//     { isCompleted: 0 },
//     callback
//   )
// }

// // Update queue
// exports.updateQueue = (value, callback) => {
//   connection.query(
//     'update instagram_queue SET isCompleted = ?, completedAt = ? WHERE value = ?',
//     [1, new Date(), value],
//     callback
//   )
// }

// Get user
export function getUser(id, callback) {
  try {
    connection.query('SELECT * FROM `users` WHERE ?', { id }, callback)
  } catch (e) {
    callback(e)
  }
}

// Create user
export function createUser(
  { lastName, familyName, birthDate, sex, orientation, location, phone, email },
  callback
) {
  try {
    connection.query(
      'INSERT INTO `users` SET ?',
      {
        lastName,
        familyName,
        birthDate,
        sex,
        orientation,
        location,
        phone,
        email,
      },
      callback
    )
  } catch (e) {
    callback(e)
  }
}

// // Update connection
// exports.userIsGet = (id, callback) => {
//   connection.query(
//     'UPDATE connections SET isGet = ? WHERE value = ?',
//     [1, id],
//     callback
//   )
// }

// // Get connection
// exports.getConnection = (callback) => {
//   connection.query(
//     'SELECT value FROM connections WHERE ? LIMIT 1',
//     { isGet: 0 },
//     callback
//   )
// }

// exports.test = (data, callback) => {
//   connection.query(
//     'insert ignore into users (vID, firstName, lastName, photo, sex, canWrite, canGetAudio, lastSeen, bdate, city, country, followers) values ?',
//     [data],
//     callback
//   )
// }

// exports.addConnections = (data, callback) => {
//   connection.query(
//     'insert ignore into connections (type, value, userID) values ?',
//     [data],
//     callback
//   )
// }
