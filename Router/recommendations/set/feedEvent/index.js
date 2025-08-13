import Session from '../../../../Session/index.js'
import { readJson, sendJson } from "../../../../Utils/index.js";
import { getSessionUser, recordFeedEvent } from "../../../../modules/mysql.js";

export default async function (res, req) {
  let sessionPromise = Session(res, req);
  let bodyPromise = readJson(res);
  let tempSession = null;

  Promise.all([sessionPromise, bodyPromise])
    .then(async ([session, json]) => {
      tempSession = session;
      const { user } = await getSessionUser(session);
      if (!user) {
        sendJson(res, { session: tempSession, json: { ok: false, error: "no user" }, status: 401 });
        return;
      }

      const { listingId, ev, dwellMs } = json || {};
      if (!listingId || !ev) {
        sendJson(res, { session: tempSession, json: { ok: false, error: "listingId & ev required" }, status: 400 });
        return;
      }

      await recordFeedEvent({ userId: user, listingId, ev, dwellMs });
      sendJson(res, { session: tempSession, json: { ok: true } });
    })
    .catch(err => {
      console.error(err);
      sendJson(res, { session: tempSession, json: { ok: false, error: "event error" }, status: 500 });
    });
}