import Session from '../../../Session/index.js'
import { readJson, sendJson } from '../../../Utils/index.js'
import { checkCode } from '../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null
  let json = readJson(res)

  Promise.all([session, json])
    .then(([session, json]) => {
      const { phone, code } = json

      tempSession = session

      return checkCode({ phone, code, session })
    })
    .then((data) => {
      const { valid, isNewUser } = data
      sendJson(res, { session: tempSession, json: { valid, isNewUser } })
    })
}
