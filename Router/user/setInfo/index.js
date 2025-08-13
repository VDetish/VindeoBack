import Session from '../../../Session/index.js'
import { readJson, sendJson } from '../../../utils/index.js'
import { setUserInfo } from '../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session

      return setUserInfo(
        {
          name: json.name,
          family_name: json.familyName,
          sex: json.sex,
        },
        session
      )
    })
    .then((updated) => {
      sendJson(res, { session: tempSession, json: { updated } })
    })
}
