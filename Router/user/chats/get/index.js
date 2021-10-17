import Session from '../../../../Session/index.js'
import { sendJson } from '../../../../Utils/index.js'
// import { getPhotos } from '../../../../modules/mysql.js'

const chatList = [
  {id:1, name:'Игровой', type:'chat'},
  {id:2, name:'Музыкальный', type:'chat'},
  {id:3, name:'TOOL', type:'chat'},
  {id:4, name:'USER', type:'user'}
];

export default async function (res, req) {
  let session = Session(res, req)
  let tempSession = null

  Promise.all([session])
    .then(([session, json]) => {
      tempSession = session

      return []
    })
    .then(() => {
      sendJson(res, { session: tempSession, json: { chatList } })
    })
}
