import Session from '../../../../Session/index.js'
import { addArtists } from '../../../../modules/mysql.js'
import { readJson, sendJson } from '../../../../Utils/index.js'
import {
  saveCovers,
  searchCovers,
} from '../../../../Router/data/artistCover/index.js'

export default async function (res, req) {
  let session = Session(res, req)
  let json = readJson(res)
  let tempSession = null
  let from = null

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session
      from = json.from

      return addArtists(json.artists, session)
    })
    .then(({ status, data }) => {
      if (from === 'spotify') {
        return status, saveCovers(data)
      } else if (from === 'vk') {
        return status, searchCovers(data)
      }
    })
    .then((status) => {
      if (status) {
        sendJson(res, { session: tempSession, json: { added: true } })
      } else {
        sendJson(res, { session: tempSession, json: { added: false } })
      }
    })
}
