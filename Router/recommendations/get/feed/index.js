import Session from "../../../../Session/index.js";
import { sendJson } from "../../../../Utils/index.js";
import { getSessionUser, getUserCatMap, getFeedCandidatesWithStats } from "../../../../modules/mysql.js";

// математика скоринга (локально в роуте)
const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b, x));
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
};
function priceInRangeScore(price, min, max) {
  if (min == null || max == null || !price) return 0.5;
  if (min > max) [min, max] = [max, min];
  const mid = (min + max) / 2;
  const half = (max - min) / 2 || 1;
  const dist = Math.abs(price - mid);
  return clamp(1 - dist / half);
}

function scoreItem(x, ctx) {
  const hours = (Date.now() - new Date(x.published_at).getTime()) / 36e5;
  const recency   = Math.exp(-hours / 48);
  const G         = (n)=> (n||0) + 50; // сглаживание
  const pop       = (x.contacts||0) / G(x.impressions||0);
  const neg       = (x.hides||0)     / G(x.views||0);
  const quality   = 0.7*(x.media_quality||0) + 0.3*(x.has_video?1:0);
  const distKm    = haversineKm(ctx.lat, ctx.lon, x.lat, x.lon);
  const distScore = clamp(1 - (distKm / ctx.km));
  const w         = ctx.catMap.get(x.category_id) ?? 0;
  const catAff    = sigmoid(w);
  const priceSc   = priceInRangeScore(x.price_cents, ctx.min, ctx.max);
  const seller    = x.seller_score ?? 0.5;

  let base = 0.30*recency + 0.18*catAff + 0.14*quality + 0.14*pop +
             0.10*distScore + 0.07*priceSc + 0.07*seller - 0.10*neg;

  if (Math.random() < 0.15) base += Math.random() * 0.05; // exploration
  return { ...x, score: base, dist_km: Number(distKm.toFixed(2)) };
}

function diversify(items, { maxSameCatInRow=2, sellerWindow=5 }) {
  const out = [];
  const recentSellers = [];
  let lastCat = null, streak = 0;
  for (const it of items) {
    const sellerTooRecent = recentSellers.slice(-sellerWindow).includes(it.seller_id);
    const sameCat = it.category_id === lastCat;
    if (sellerTooRecent || (sameCat && streak >= maxSameCatInRow)) continue;
    out.push(it);
    if (sameCat) streak++; else { lastCat = it.category_id; streak = 1; }
    recentSellers.push(it.seller_id);
    if (recentSellers.length > sellerWindow) recentSellers.shift();
  }
  // добьём до 50 чем есть, если мало
  for (const it of items) { if (out.length >= 50) break; if (!out.find(x=>x.id===it.id)) out.push(it); }
  return out;
}

export default async function (res, req) {
  let sessionPromise = Session(res, req);
  let tempSession = null;

  Promise.all([sessionPromise])
    .then(async ([session]) => {
      tempSession = session;
      const { user } = await getSessionUser(session);
      if (!user) {
        sendJson(res, { session: tempSession, json: { ok: false, error: "no user" }, status: 401 });
        return;
      }

      const lat   = parseFloat(req.getQuery("lat")  || "47.01");
      const lon   = parseFloat(req.getQuery("lon")  || "28.84");
      const km    = parseFloat(req.getQuery("km")   || "15");
      const days  = parseInt(req.getQuery("days")   || "14", 10);
      const min   = req.getQuery("min") ? parseInt(req.getQuery("min"), 10) : null;
      const max   = req.getQuery("max") ? parseInt(req.getQuery("max"), 10) : null;

      const [rows, catMapRaw] = await Promise.all([
        getFeedCandidatesWithStats({ lat, lon, km, days, limit: 600 }),
        getUserCatMap(user)
      ]);
      const catMap = new Map(catMapRaw.map(r => [r.category_id, r.w]));

      // скорим → сортируем → диверсифицируем → режем до 50
      const ctx = { lat, lon, km, min, max, catMap };
      const scored = rows.map(r => scoreItem(r, ctx)).sort((a,b)=>b.score-a.score);
      const top50  = diversify(scored, { maxSameCatInRow: 2, sellerWindow: 5 }).slice(0, 50);

      sendJson(res, { session: tempSession, json: { ok: true, items: top50 } });
    })
    .catch(err => {
      console.error(err);
      sendJson(res, { session: tempSession, json: { ok: false, error: "feed error" }, status: 500 });
    });
}