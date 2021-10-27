import Session from '../../../../../Session/index.js'
import { sendJson } from '../../../../../Utils/index.js'
import { getChatMessages } from '../../../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null
  let id = req.getParameter(0)
  console.log(id)

  Promise.all([session])
    .then(([session]) => {
      tempSession = session
      return getChatMessages(id, session)
    })
    .then((messages) => {
      sendJson(res, { session: tempSession, json: { messages } })
    })
}
