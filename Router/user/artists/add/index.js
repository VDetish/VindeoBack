import Session from '../../../../Session/index.js'
import { addArtists } from '../../../../modules/mysql.js'
import { readJson, sendJson } from '../../../../Utils/index.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session

      return addArtists(json.artists, session)
    })
    .then((q) => {
      if (q) {
        sendJson(res, { session: tempSession, json: { added: true } })
      } else {
        sendJson(res, { session: tempSession, json: { added: false } })
      }
    })
}
