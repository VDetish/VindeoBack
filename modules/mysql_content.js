import mysql from 'mysql2/promise.js'
import htmlEntl from 'html-entities'

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tool46',
  database: 'WierdConnections',
})

export async function addCover({ artist, path }) {
  const artists = await getArtist(artist)

  const query = await connection.query('INSERT INTO `artists_photos` SET ?', {
    artist: artists[0].id,
    path,
  })

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

  const query = await connection.query('SELECT * FROM `artists` WHERE ? OR ?', [
    {
      f_name: artist,
    },
    {
      f_name: artistName,
    },
  ])

  return query[0]
}

export async function getCover(artist) {
  // artist or artist formated

  const artists = await getArtist(artist)

  const query = await connection.query(
    'SELECT * FROM `artists_photos` WHERE ?',
    {
      artist: artists[0].id,
    }
  )

  return query[0]
}
