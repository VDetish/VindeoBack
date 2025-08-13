import Session from "../../../../Session/index.js";
import { createChat } from "../../../../modules/mysql.js";
import { readJson, sendJson } from "../../../../utils/index.js";

export default async function (res, req) {
  let session = Session(res, req);
  let json = readJson(res);

  let tempSession = null;

  Promise.all([session, json])
    .then(([session, json]) => {
      tempSession = session;
      const { users, title } = json;

      return createChat({ users, title }, session);
    })
    .then((status) => {
      sendJson(res, { session: tempSession, json: { status } });
    });
}
