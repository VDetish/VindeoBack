import request from 'request'
import fs from 'fs'

import Session from '../../../../../Session/index.js'
import { readJson, sendJson } from '../../../../../Utils/index.js'
import { getCover, addCover } from '../../../../../modules/mysql.js'

const default_path = 'Content/Covers/'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null
  let cover = null
  let artist = null
  let url = null

  Promise.all([session, json]).then(async ([session, json]) => {
    tempSession = session
    artist = json.artist
    url = json.url
    
    return getCover(null, artist)
  }).then((db_path) => {
    if (db_path.length > 0) {
      cover = db_path[0].path
      return cover
    } else {
      const path = guidGenerator() + url.split('.').pop()
      request(url).pipe(fs.createWriteStream(default_path + path))
      cover = path
      return addCover({ path, artistId:artist })
    }
  }).then(() => {
    sendJson(res, { session: tempSession, json: { cover } })
  })
}

function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  }
  return `${S4()}${S4()}.`
}
