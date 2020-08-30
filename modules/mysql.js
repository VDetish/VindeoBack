import mysql from 'mysql2'

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tool46',
  database: 'toolmi',
})

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
    console.log(e)
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

// Add Call
export function addCall({ phone, session, code }, callback) {
  try {
    connection.query(
      'INSERT INTO `calls` SET ?',
      {
        phone,
        code,
        session,
      },
      callback
    )
  } catch (e) {
    callback(e)
  }
}

// Check Code
export function checkCode({ phone, session, code }, callback) {
  try {
    // Добавить проверку даты добавления кода, чтобы не проверять старые
    const sql = connection.format(
      'UPDATE calls SET validated = ? WHERE ? AND ? AND ? AND ?',
      [1, { phone }, { code }, { session }, { validated: false }]
    )

    connection.query(sql, (err, res) => {
      if (err) {
        callback(err, false)
      } else if (res.changedRows === 1) {
        callback(null, true)
      } else {
        callback(null, false)
      }
    })
  } catch (e) {
    callback(e, false)
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
