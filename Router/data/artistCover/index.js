import request from 'request'
import fs from 'fs'
import querystring from 'querystring'

import { get } from '../../../Network/Fetch/index.js'
import { sendJson } from '../../../Utils/index.js'

import { getCover, getCovers, addCover } from '../../../modules/mysql.js'

const default_path = 'Content/Covers/'

export default async function (res, req) {
  res.onAborted(() => {
    res.aborted = true
  })

  let artist = req.getParameter(0)
  let cover = null
  let db_path = await getCover(artist)

  if (db_path.length > 0) {
    cover = db_path[0].path
  } else {
    const url = await searchCover(artist)
    const path = guidGenerator() + url.split('.').pop()

    request(url).pipe(fs.createWriteStream(default_path + path))

    cover = path

    await addCover({ path, artist })
  }

  sendJson(res, { json: { cover } })
}

export async function putCover(artist) {
  let db_path = await getCover(artist)

  if (db_path.length === 0) {
    const url = await searchCover(artist)
    const path = guidGenerator() + url.split('.').pop()

    request(url).pipe(fs.createWriteStream(default_path + path))

    await addCover({ path, artist })
  }
}

async function emptyCovers(artists) {
  let covers = await getCovers(artists)

  const a1 = artists.map((t1) => ({
    ...t1,
    ...covers.find((t2) => t2.artist === t1.id),
  }))

  return a1.filter(({ path }) => !path)
}

export async function saveCovers(artists) {
  const putIn = await emptyCovers(artists)

  if (putIn.length > 0) {
    for (const { f_name: artist, images } of putIn) {
      const url = images[0].url

      const path = guidGenerator() + 'jpg'
      request(url).pipe(fs.createWriteStream(default_path + path))
      await addCover({ path, artist })
    }
  }
}

export async function searchCovers(artists) {
  const putIn = await emptyCovers(artists)

  if (putIn.length > 0) {
    for (const { name: artist } of putIn) {
      await putCover(artist)
    }
  }
}

// Cache data!
async function searchCover(artist, next) {
  return new Promise((resolve) => {
    get(
      new URL('https://www.last.fm/music/' + artist.replaceAll(" ", "+")).toString(),
      (err, res) => {
        if (err) {
          resolve({ error: err })
        } else {
          try {
            const image = res.split('<meta property="og:image"')[1].split('"')[1]
            setTimeout(() => {
              console.log(image);
              resolve(image)
            }, 300);
          } catch (error) {
            console.log('error, wait', artist);
            console.log(error);
            console.log(res);
            console.log(new URL('https://www.last.fm/music/' + artist.replaceAll(" ", "+")).toString());
            if (next) {
              return resolve({ error })
            }
            setTimeout(() => {
              searchCover(artist, true)
            }, 5000);
          }
        }
      }
    )
  })
}

function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  }
  return `${S4()}${S4()}.`
}
