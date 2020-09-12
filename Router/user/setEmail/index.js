import Session from '../../../Session/index.js'
import { readJson, sendJson } from '../../../Utils/index.js'
import { setUserEmail } from '../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session

      return setUserEmail(json, session)
    })
    .then((updated) => {
      sendJson(res, { session: tempSession, json: { updated } })
    })
}
