import Session from '../../../../../Session/index.js'
import { readJson, sendJson } from '../../../../../utils/index.js'
import { setUsersReaction } from '../../../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null
  let json = readJson(res)

  Promise.all([session, json])
    .then(([session, json]) => {
      const { reaction, id } = json

      tempSession = session

      return setUsersReaction({ reaction, id }, session)
    })
    .then((data) => {
      sendJson(res, { session: tempSession, json: { good: data } })
    })
}
