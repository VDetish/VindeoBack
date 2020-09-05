import Session from '../../Session/index.js'
import { readJson, sendJson } from '../../Utils/index.js'

import { addDevice } from '../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)

  Promise.all([session, json])
    .then(([session, json]) => {
      return addDevice(session, json)
    })
    .then(([status, session]) => {
      sendJson(res, { session, json: { status } })
    })
}
