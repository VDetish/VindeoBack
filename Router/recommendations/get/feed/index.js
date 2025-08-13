// Router/recommendations/get/feed/index.js
import Session from "../../../../Session/index.js";
import { sendJson } from "../../../../Utils/sendJson.js";
import { getSessionUser, getUserCatMap, getFeedCandidatesWithStats } from "../../../../modules/mysql.js";

// скоринг (как раньше)
const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const sigmoid = (x)=>1/(1+Math.exp(-x));
const haversineKm=(a,b,c,d)=>{const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180;
  const u=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(u));};
const priceScore=(p,min,max)=>{ if(min==null||max==null||!p) return .5; if(min>max)[min,max]=[max,min];
  const mid=(min+max)/2,half=(max-min)/2||1,dist=Math.abs(p-mid); return clamp(1 - dist/half); };
function scoreItem(x,ctx){
  const h=(Date.now()-new Date(x.published_at).getTime())/36e5;
  const recency=Math.exp(-h/48), G=n=>(n||0)+50;
  const pop=(x.contacts||0)/G(x.impressions||0);
  const neg=(x.hides||0)/G(x.views||0);
  const quality=0.7*(x.media_quality||0)+0.3*(x.has_video?1:0);
  const distKm=haversineKm(ctx.lat,ctx.lon,x.lat,x.lon);
  const dist=clamp(1 - distKm/ctx.km);
  const cat=sigmoid(ctx.catMap.get(x.category_id)??0);
  const p=priceScore(x.price_cents, ctx.min, ctx.max);
  const seller=x.seller_score??.5;
  let base=0.30*recency+0.18*cat+0.14*quality+0.14*pop+0.10*dist+0.07*p+0.07*seller-0.10*neg;
  if (Math.random()<.15) base+=Math.random()*.05;
  return {...x, score: base, dist_km: Number(distKm.toFixed(2))};
}
function diversify(items,{maxSameCatInRow=2,sellerWindow=5}={}) {
  const out=[], sellers=[]; let lastCat=null, streak=0;
  for (const it of items) {
    const sellerTooRecent = sellers.slice(-sellerWindow).includes(it.seller_id);
    const sameCat = it.category_id === lastCat;
    if (sellerTooRecent || (sameCat && streak >= maxSameCatInRow)) continue;
    out.push(it);
    if (sameCat) streak++; else { lastCat = it.category_id; streak = 1; }
    sellers.push(it.seller_id); if (sellers.length > sellerWindow) sellers.shift();
  }
  for (const it of items) { if (out.length>=50) break; if (!out.find(x=>x.id===it.id)) out.push(it); }
  return out;
}

export default async function (res, req) {
  // обязательно: onAborted
  res.onAborted(() => { res.aborted = true; });

  // 1) СНИМАЕМ ВСЁ С req ДО любых await
  const lat  = parseFloat(req.getQuery("lat")  || "47.01");
  const lon  = parseFloat(req.getQuery("lon")  || "28.84");
  const km   = parseFloat(req.getQuery("km")   || "15");
  const days = parseInt(  req.getQuery("days") || "14", 10);
  const minQ = req.getQuery("min");
  const maxQ = req.getQuery("max");
  const min  = minQ ? parseInt(minQ, 10) : null;
  const max  = maxQ ? parseInt(maxQ, 10) : null;

  try {
    // 2) теперь можно делать await
    const session = await Session(res, req);
    if (res.aborted) return;

    const { user } = await getSessionUser(session);
    if (!user) {
      return sendJson(res, { session, status: 401, json: { ok:false, error:'no user' } });
    }

    const [rows, catRows] = await Promise.all([
      getFeedCandidatesWithStats({ lat, lon, km, days, limit: 600 }),
      getUserCatMap(user)
    ]);

    const catMap = new Map(catRows.map(r => [r.category_id, r.w]));
    const ctx = { lat, lon, km, min, max, catMap };
    const items = diversify(
      rows.map(r => scoreItem(r, ctx)).sort((a,b)=>b.score-a.score)
    ).slice(0,50);

    return sendJson(res, { session, json: { ok: true, items } });
  } catch (e) {
    console.error("feed error:", e);
    if (!res.aborted) sendJson(res, { session: null, status: 500, json: { ok:false, error:'feed error' } });
  }
}