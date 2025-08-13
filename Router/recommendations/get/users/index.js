import moment from 'moment'

import Session from '../../../../Session/index.js'
import { sendJson } from '../../../../utils/index.js'
import { getCities } from '../../../../modules/VK/index.js'
import { getUsersRecomendations } from '../../../../modules/mysql.js'

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null

  Promise.all([session])
    .then(([session]) => {
      tempSession = session

      return getUsersRecomendations(session)
    })
    .then(async (users) => {
      for (const user of users) {
        const age = moment().diff(moment(user.birth_date, 'DD.MM.YYYY'), 'years')
        user.age = age > 0 ? age : null

        if (!user.cityName && user.city > 0) {
          user.city = await getCities(user.city)
        } else {
          user.city = user.cityName
        }
      }

      sendJson(res, { session: tempSession, json: { users } })
    })
}
