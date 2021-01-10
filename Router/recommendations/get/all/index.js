import Session from '../../../../Session/index.js'
import { sendJson } from '../../../../Utils/index.js'
import { getArtists } from '../../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null

  Promise.all([session])
    .then(([session, json]) => {
      tempSession = session

      return getPhotos(session)
    })
    .then((photos) => {
      sendJson(res, { session: tempSession, json: { photos } })
    })
}
