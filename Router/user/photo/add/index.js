import Session from '../../../../Session/index.js'
import { SaveFile } from '../../../../utils/UploadFile/index.js'
import { addPhoto } from '../../../../modules/mysql.js'
import { sendJson } from '../../../../utils/index.js'

export default async function (res, req) {
  let session = Session(res, req)
  let file = SaveFile(res, req)
  let tempSession = null

  Promise.all([session, file])
    .then(([session, file]) => {
      tempSession = session

      return addPhoto(file, session)
    })
    .then((status) => {
      sendJson(res, { session: tempSession, json: { status } })
    })
}
