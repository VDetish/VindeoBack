import Session from '../../../../Session/index.js'
import { readJson, sendJson } from '../../../../utils/index.js'
import { deletePhoto } from '../../../../modules/mysql.js'

export default async function (res, req) {
  let json = readJson(res)
  let session = Session(res, req)
  let tempSession = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session
      return deletePhoto(json, session)
    })
    .then((photos) => {
      sendJson(res, { session: tempSession, json: { photos } })
    })
}
