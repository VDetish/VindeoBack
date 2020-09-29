import Session from '../../../Session/index.js'
import { readJson, sendJson } from '../../../Utils/index.js'
import { setAge } from '../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session

      const day = json.birthDate.slice(0, 2)
      const month = json.birthDate.slice(2, 4)
      const year = json.birthDate.slice(4, 8)

      const birth_date = year + '-' + month + '-' + day

      return setAge({ birth_date }, session)
    })
    .then((updated) => {
      sendJson(res, { session: tempSession, json: { updated } })
    })
}
