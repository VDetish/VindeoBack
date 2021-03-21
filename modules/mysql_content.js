import mysql from 'mysql2/promise.js'

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tool46',
  database: 'WierdConnections',
})

export async function addCover({ artist, path }) {
  const artists = await connection.query('SELECT * FROM `artists` WHERE ?', {
    f_name: artist,
  })

  const query = await connection.query('INSERT INTO `artists_photos` SET ?', {
    artist: artists[0][0].id,
    path,
  })

  return query
}

export async function getCover(artist) {
  const artists = await connection.query('SELECT * FROM `artists` WHERE ?', {
    f_name: artist,
  })

  const query = await connection.query(
    'SELECT * FROM `artists_photos` WHERE ?',
    {
      artist: artists[0][0].id,
    }
  )

  return query[0]
}
