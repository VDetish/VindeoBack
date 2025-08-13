// Router/recommendations/set/feedEvent/index.js
import Session from "../../../../../Session/index.js";
import { readJson } from "../../../Utils/readJson.js";
import { sendJson } from "../../../Utils/sendJson.js";
import { getSessionUser, recordFeedEvent } from "../../../../../modules/mysql.js";

export default async function (res, req) {
  res.onAborted(() => { res.aborted = true; });

  try {
    // можно параллельно, но req после этого не трогаем
    const [session, body] = await Promise.all([ Session(res, req), readJson(res) ]);
    if (res.aborted) return;

    const { user } = await getSessionUser(session);
    if (!user) {
      return sendJson(res, { session, status: 401, json: { ok:false, error:'no user' } });
    }

    const { listingId, ev, dwellMs } = body || {};
    if (!listingId || !ev) {
      return sendJson(res, { session, status: 400, json: { ok:false, error:'listingId & ev required' } });
    }

    await recordFeedEvent({ userId: user, listingId, ev, dwellMs });
    return sendJson(res, { session, json: { ok:true } });
  } catch (e) {
    console.error("event error:", e);
    if (!res.aborted) sendJson(res, { session: null, status: 500, json: { ok:false, error:'event error' } });
  }
}