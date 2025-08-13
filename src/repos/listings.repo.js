import { pool } from "../db/pool.js";

export async function getListingMedia(listingId) {
  const [rows] = await pool.query(
    "SELECT media_type AS type, url AS path, mime_type, ord FROM listing_media WHERE listing_id=? ORDER BY ord",
    [listingId]
  );
  return rows;
}