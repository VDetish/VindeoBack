// src/services/feed/service.js
import { fetchCandidatesWithStats, fetchUserCatRows, writeEvent } from "../../repos/feed.repo.js";
import { scoreItem, diversify } from "./scoring.js";

export async function getFeed({ userId, lat, lon, km, days, min, max }) {
  const [rows, catRows] = await Promise.all([
    fetchCandidatesWithStats({ lat, lon, km, days, limit: 600 }),
    fetchUserCatRows(userId)
  ]);
  const catMap = new Map(catRows.map(r => [r.category_id, r.w]));
  const ctx = { lat, lon, km, min, max, catMap };
  const scored = rows.map(r => scoreItem(r, ctx)).sort((a,b)=>b.score-a.score);
  return diversify(scored).slice(0, 50);
}

export async function recordEvent({ userId, listingId, ev, dwellMs }) {
  console.log('recordEvent', userId, listingId, ev, dwellMs);
  
  // твой dbRecordFeedEvent уже делает: вставку в feed_events + bump stats + affinity EMA
  await writeEvent({ userId, listingId, ev, dwellMs });
  return true;
}