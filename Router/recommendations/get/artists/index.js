import Session from '../../../../Session/index.js'
import { sendJson } from '../../../../utils/index.js'
import { getArtistsRecommend } from '../../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null

  Promise.all([session])
    .then(([session]) => {
      tempSession = session

      return getArtistsRecommend(session)
    })
    .then((artists) => {
      sendJson(res, { session: tempSession, json: { artists } })
    })
}
