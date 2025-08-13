// src/services/feed/scoring.js
const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const sigmoid = (x)=>1/(1+Math.exp(-x));
const haversineKm=(la1,lo1,la2,lo2)=>{
  const R=6371,dLa=(la2-la1)*Math.PI/180,dLo=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dLa/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
};
const priceScore=(p,min,max)=>{
  if(min==null||max==null||!p) return .5;
  if(min>max) [min,max]=[max,min];
  const mid=(min+max)/2,half=(max-min)/2||1,dist=Math.abs(p-mid);
  return clamp(1 - dist/half);
};

export function scoreItem(x, ctx) {
  const hours=(Date.now()-new Date(x.published_at).getTime())/36e5;
  const recency=Math.exp(-hours/48);
  const G=n=>(n||0)+50;
  const pop=(x.contacts||0)/G(x.impressions||0);
  const neg=(x.hides||0)/G(x.views||0);
  const quality=0.7*(x.media_quality||0)+0.3*(x.has_video?1:0);
  const distKm=haversineKm(ctx.lat,ctx.lon,x.lat,x.lon);
  const dist=clamp(1 - distKm/ctx.km);
  const cat=sigmoid(ctx.catMap.get(x.category_id) ?? 0);
  const p=priceScore(x.price_cents, ctx.min, ctx.max);
  const seller=x.seller_score ?? .5;

  let base = 0.30*recency + 0.18*cat + 0.14*quality + 0.14*pop +
             0.10*dist    + 0.07*p   + 0.07*seller - 0.10*neg;
  if (Math.random() < .15) base += Math.random()*.05; // exploration
  return { ...x, score: base, dist_km: Number(distKm.toFixed(2)) };
}

export function diversify(items, { maxSameCatInRow=2, sellerWindow=5 } = {}) {
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