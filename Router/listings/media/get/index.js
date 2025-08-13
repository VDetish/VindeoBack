// Router/listings/media/get/index.js
import Session from "../../../../Session/index.js";
import { sendJson } from "../../../../utils/index.js";
import { connection } from "../../../../modules/mysql.js";

export default async function (res, req) {
  let sessionPromise = Session(res, req); // повесили onAborted
  let sess = null;

  Promise.all([sessionPromise])
    .then(async ([session]) => {
      sess = session;
      if (res.aborted) return;

      const listingId = Number(req.getParameter(0) || 0);
      if (!listingId) {
        return sendJson(res, {
          session: sess,
          status: 400,
          json: { ok: false, error: "bad listing id" },
        });
      }

      const [rows] = await connection.query(
        "SELECT media_type AS type, url AS path, mime_type, ord FROM Vindeo.listing_media WHERE listing_id=? ORDER BY ord",
        [listingId]
      );

      return sendJson(res, {
        session: sess,
        json: { ok: true, items: rows },
      });
    })
    .catch((e) => {
      console.error("media error", e);
      if (res.aborted) return;
      sendJson(res, {
        session: sess,
        status: 500,
        json: { ok: false, error: "media error" },
      });
    });
}