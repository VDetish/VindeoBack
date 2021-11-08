import Session from '../../../../../Session/index.js'
import { readJson, sendJson } from '../../../../../Utils/index.js'
import { getMutualArtists } from '../../../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session
      const { id } = json

      return getMutualArtists(id, session)
    })
    .then((artists) => {
      sendJson(res, { session: tempSession, json: { artists } })
    })
}
