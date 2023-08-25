import Session from '../../../../Session/index.js'
import { addArtist } from '../../../../modules/mysql.js'
import { readJson, sendJson } from '../../../../Utils/index.js'

import similarArtists from '../../../data/similarArtists/index.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null
  let artist = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session

      artist = json.name

      return addArtist({artist: json.artist}, session)
    })
    .then((added) => {
      if (added) {
        return similarArtists(artist, tempSession)
      } else {
        return false
      }
    })
    .then((artists) => {
      if (artists) {
        sendJson(res, { session: tempSession, json: { artists, added: true } })
      } else {
        sendJson(res, { session: tempSession, json: { added: false } })
      }
    })
}
