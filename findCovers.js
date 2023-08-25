import request from 'request'
import fs from 'fs'

import { get } from './Network/Fetch/index.js'

import { artistsNoCover, addCover } from './modules/mysql.js'

const default_path = 'Content/Covers/'

export async function putCover(artist) {
  return new Promise(async(resolve) => {
    const image = await searchCover(artist)
    if (!image) return resolve(null);
    
    const path = guidGenerator() + image.split('.').pop()
    request(image).pipe(fs.createWriteStream(default_path + path))
    await addCover({ path, artist })
    resolve('fine')
  })
}

async function searchCovers() {
  const artists = await artistsNoCover()
  if (artists.length > 0) {
    for (const { name: artist } of artists) {
      const res = await putCover(artist);
      if(!res) continue;
    }
    setTimeout(() => {
      searchCovers()
    }, 5000);
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
            resolve(image)
          } catch (error) {
            if (next) {
              resolve(null)
            } else {
              setTimeout(() => {
                searchCover(artist, true).then(resolve);
              }, 5000);
            }
          }
        }
      }
    )
  })
}

searchCovers()

function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  }
  return `${S4()}${S4()}.`
}
