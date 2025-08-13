import Session from '../../../../../Session/index.js'
import { getInstagramPhotos } from '../../../../../modules/mysql.js'
import { readJson, sendJson } from '../../../../../utils/index.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session
      const user = json.user

      return getInstagramPhotos(user)
    })
    .then((photos) => {
      sendJson(res, { session: tempSession, json: { photos } })
    })
}
