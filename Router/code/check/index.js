import Session from '../../../Session/index.js'
import { readJson, sendJson } from '../../../Utils/index.js'

import { checkCode, createUser } from '../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null
  let tempPhone = null
  let json = readJson(res)

  Promise.all([session, json])
    .then(([session, json]) => {
      const { phone, code } = json

      tempSession = session
      tempPhone = phone

      return checkCode({ phone, code, session })
    })
    .then((valid) => {
      if (valid) {
        return createUser(tempSession, tempPhone)
      }
    })
    .then((valid) => {
      sendJson(res, { session: tempSession, json: { valid } })
    })
}
