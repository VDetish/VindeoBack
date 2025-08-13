import Session from '../../../../Session/index.js'
import { addInterest } from '../../../../modules/mysql.js'
import { readJson, sendJson } from '../../../../utils/index.js'

import similarGenres from '../../../data/similarGenre/index.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null
  let genre = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session

      genre = json.name

      return addInterest(json, session)
    })
    .then((added) => {
      if (added) {
        return similarGenres(genre, tempSession)
      } else {
        return false
      }
    })
    .then((genres) => {
      if (genres) {
        sendJson(res, { session: tempSession, json: { genres, added: true } })
      } else {
        sendJson(res, { session: tempSession, json: { added: false } })
      }
    })
}
