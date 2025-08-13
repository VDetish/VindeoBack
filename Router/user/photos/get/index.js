import Session from '../../../../Session/index.js'
import { readJson, sendJson } from '../../../../utils/index.js'
import { getUserPhotos } from '../../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session

      return getUserPhotos(json.user, session)
    })
    .then((photos) => {
      sendJson(res, { session: tempSession, json: { photos } })
    })
}
