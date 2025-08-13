// Router/recommendations/set/feedEvent/index.js
import Session from "../../../../Session/index.js";
import { readJson, sendJson } from "../../../../utils/index.js";
import { getSessionUser, recordFeedEvent } from "../../../../modules/mysql.js";

export default async function (res, req) {
  let sessionPromise = Session(res, req);    // вешаем onAborted
  let bodyPromise = readJson(res);           // твой парсер тела
  let sess = null;

  Promise.all([sessionPromise, bodyPromise])
    .then(async ([session, json]) => {
      sess = session;
      if (res.aborted) return;

      const { user } = await getSessionUser(session);
      if (!user) {
        return sendJson(res, {
          session: sess,
          status: 401,
          json: { ok: false, error: "no user" },
        });
      }

      const { listingId, ev, dwellMs } = json || {};
      if (!listingId || !ev) {
        return sendJson(res, {
          session: sess,
          status: 400,
          json: { ok: false, error: "listingId & ev required" },
        });
      }

      await recordFeedEvent({ userId: user, listingId, ev, dwellMs });
      return sendJson(res, { session: sess, json: { ok: true } });
    })
    .catch((err) => {
      console.error("event error", err);
      if (res.aborted) return;
      sendJson(res, {
        session: sess,
        status: 500,
        json: { ok: false, error: "event error" },
      });
    });
}