// src/controllers/feed.controller.js
import { getFeed, recordEvent } from "../services/feed/service.js";
import { getSessionUser } from "../repos/users.repo.js";

/** GET /feed */
export async function getFeedController({ session, query }) {
  const { user } = await getSessionUser(session);
  if (!user) return { status: 401, json: { ok: false, error: "no user" } };

  const lat  = parseFloat(query.lat  ?? "47.01");
  const lon  = parseFloat(query.lon  ?? "28.84");
  const km   = parseFloat(query.km   ?? "15");
  const days = parseInt  (query.days ?? "14", 10);
  const min  = query.min != null ? parseInt(query.min, 10) : null;
  const max  = query.max != null ? parseInt(query.max, 10) : null;

  const items = await getFeed({ userId: user, lat, lon, km, days, min, max });
  return { json: { ok: true, items } };
}

/** POST /feed/event */
export async function postFeedEventController({ session, body }) {
  const { user } = await getSessionUser(session);
  if (!user) return { status: 401, json: { ok: false, error: "no user" } };

  const { listingId, ev, dwellMs } = body || {};
  if (!listingId || !ev) {
    return { status: 400, json: { ok: false, error: "listingId & ev required" } };
  }
  console.log('postFeedEventController', { userId: user, listingId, ev, dwellMs });
  
  await recordEvent({ userId: user, listingId, ev, dwellMs });
  return { json: { ok: true } };
}