import Session from '../../../Session/index.js'
import { readJson, sendJson } from '../../../Utils/index.js'
import { addPushToken } from '../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null
  let json = readJson(res)

  Promise.all([session, json])
    .then(([session, json]) => {
      const { token } = json

      tempSession = session

      return addPushToken(token, tempSession)
    })
    .then((added) => {
      sendJson(res, { session: tempSession, json: { added } })
    })
}
