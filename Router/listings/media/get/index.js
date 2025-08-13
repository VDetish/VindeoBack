// Router/listings/media/get/index.js
import Session from "../../../../Session/index.js";
import { sendJson } from "../../../../Utils/sendJson.js";
import { connection } from "../../../../modules/mysql.js";

export default async function (res, req) {
  res.onAborted(() => { res.aborted = true; });

  // снять параметр ДО await
  const listingId = Number(req.getParameter(0) || 0);

  try {
    const session = await Session(res, req);
    if (res.aborted) return;

    if (!listingId) {
      return sendJson(res, { session, status: 400, json: { ok:false, error:'bad listing id' } });
    }

    const [rows] = await connection.query(
      "SELECT media_type AS type, url AS path, mime_type, ord FROM Vindeo.listing_media WHERE listing_id=? ORDER BY ord",
      [listingId]
    );

    return sendJson(res, { session, json: { ok:true, items: rows } });
  } catch (e) {
    console.error("media error:", e);
    if (!res.aborted) sendJson(res, { session: null, status: 500, json: { ok:false, error:'media error' } });
  }
}