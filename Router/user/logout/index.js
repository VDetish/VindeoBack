import Session from '../../../Session/index.js'
import { sendJson } from '../../../Utils/index.js'
import { updateSession } from '../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null

  Promise.all([session])
    .then(([session]) => {
      tempSession = session

      return updateSession(session, 0)
    })
    .then((logout) => {
      sendJson(res, { session: tempSession, json: { logout } })
    })
}
