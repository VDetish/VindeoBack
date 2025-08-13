import Session from '../../../../Session/index.js'
import { readJson, sendJson } from '../../../../utils/index.js'
import { saveSearchSettings } from '../../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null
  let json = readJson(res)

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session

      json.age_from = json.age.split(',')[0]
      json.age_to = json.age.split(',')[1]

      delete json.age

      return saveSearchSettings(json, session)
    })
    .then((data) => {
      sendJson(res, { session: tempSession, json: { good: data } })
    })
}
