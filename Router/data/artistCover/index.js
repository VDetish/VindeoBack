import request from 'request'
import fs from 'fs'

import { get } from '../../../Network/Fetch/index.js'
import { sendJson } from '../../../Utils/index.js'

import { getCover, getCovers, addCover } from '../../../modules/mysql.js'
import { log } from 'console'

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

export async function saveCovers(artists) {
  let covers = await getCovers(artists)

  const a1 = artists.map((t1) => ({
    ...t1,
    ...covers.find((t2) => t2.artist === t1.id),
  }))

  const putIn = a1.filter(({ path }) => !path)

  if (putIn.length > 0) {
    for (const { name: artist, images } of artists) {
      const url = images[0].url

      const path = guidGenerator() + '.jpg'
      request(url).pipe(fs.createWriteStream(default_path + path))
      await addCover({ path, artist })
    }
  }
}

// Cache data!
async function searchCover(artist) {
  return new Promise((resolve) => {
    get('https://www.last.fm/music/' + artist, (err, res) => {
      if (err) {
        resolve({ error: err })
      } else {
        const image = res.split('<meta property="og:image"')[1].split('"')[1]

        resolve(image)
      }
    })
  })
}

function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  }
  return `${S4()}${S4()}.`
}
