import Session from '../../../../Session/index.js'
import { sortPhotos } from '../../../../modules/mysql.js'
import { readJson, sendJson } from '../../../../utils/index.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session
      return sortPhotos(json, session)
    })
    .then((status) => {
      sendJson(res, { session: tempSession, json: { status } })
    })
}
