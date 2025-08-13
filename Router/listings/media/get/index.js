import { connection } from "../../../../modules/mysql.js";

export default async function (res, req) {
  try {
    const listingId = Number(req.getParameter(0));
    const [rows] = await connection.query(
      "SELECT media_type AS type, url AS path, mime_type, ord FROM Vindeo.listing_media WHERE listing_id=? ORDER BY ord",
      [listingId]
    );
    res.writeHeader("Content-Type","application/json").end(JSON.stringify({ ok:true, items: rows }));
  } catch (e) {
    console.error(e);
    res.writeStatus("500 Internal Server Error").end("media error");
  }
}