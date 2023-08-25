import { query } from '../../../Network/Fetch/index.js'
import { addArtistRecomend } from '../../../modules/mysql.js'

export default async function (artist, session) {
  const {
    similarartists: { artist: a },
  } = await getSimillarArtist(artist)

  const artists = a.slice(0, 5)

  for (const e of artists) {
    await addArtistRecomend({ artist: e.name, rate: e.match }, session)
  }

  return artists
}

// http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=Tool&api_key=75b2164fbf069b64a9bf8318925686b2&format=json
async function getSimillarArtist(artist) {
  return new Promise((resolve, reject) => {
    query(
      'https://ws.audioscrobbler.com',
      {
        method: '/2.0',
        body: {
          method: 'artist.getsimilar',
          artist,
          api_key: '75b2164fbf069b64a9bf8318925686b2',
          format: 'json',
        },
      },
      (err, res) => {
        if (err) {
          resolve({ error: err })
        } else {
          resolve(res)
        }
      }
    )
  })
}
