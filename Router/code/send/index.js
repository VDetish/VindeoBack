import Session from '../../../Session/index.js'
import { readJson, sendJson } from '../../../Utils/index.js'
import { makeCall } from '../../../modules/PhoneVerification.js'
import { addCall } from '../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null
  let tempPhone = null
  let json = readJson(res)

  Promise.all([session, json])
    .then(([session, json]) => {
      const { phone } = json

      tempSession = session
      tempPhone = phone

      return makeCall(phone)
    })
    .then((call) => {
      const { error, code } = call

      if (error) {
        return { status: false, error }
      } else if (code) {
        const lastFour = parseInt(code.toString().substr(-4), 10)

        return addCall({
          phone: tempPhone,
          code: lastFour,
          session: tempSession,
        })
      } else if (err) {
        return { status: false, error: 'unknown' }
      }
    })
    .then((json) => {
      sendJson(res, { session: tempSession, json })
    })
}
