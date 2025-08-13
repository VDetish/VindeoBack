// src/utils/wrap.js
import Session from "../middleware/session.js";
import { sendJson } from "./sendJson.js";

function parseQueryString(qs = "") {
  const out = {};
  if (!qs) return out;
  for (const part of qs.split("&")) {
    if (!part) continue;
    const [k, v = ""] = part.split("=");
    const key = decodeURIComponent(k || "");
    const val = decodeURIComponent(v || "");
    if (key) out[key] = val;
  }
  return out;
}

export function route(options, handler) {
  console.log('route');
  
  const { needSession = true, parseJson = false } = options || {};

  return async (res, req) => {
    // ВАЖНО: повесили onAborted
    res.onAborted(() => { res.aborted = true; });

    // ---- СНИМАЕМ ИЗ req ВСЁ СИНХРОННО ----
    const method  = (req.getMethod && req.getMethod()) || "";
    const url     = (req.getUrl && req.getUrl()) || "";
    const qsRaw   = (req.getQuery && req.getQuery()) || ""; // строка вида "a=1&b=2"
    const query   = parseQueryString(qsRaw);

    // path params (берём первые 8 индексов, больше обычно не нужно)
    const params = [];
    for (let i = 0; i < 8; i++) {
      try {
        const p = req.getParameter(i);
        if (p === undefined) break;
        params.push(p);
      } catch { break; }
    }
    

    // headers
    const headers = {};
    try {
      req.forEach((k, v) => { headers[k.toLowerCase()] = v; });
    } catch {}

    // ---- ТЕПЕРЬ МОЖНО ДЕЛАТЬ await ----
    try {
      const session = needSession ? await Session(res, req) : null;
      if (res.aborted) return;

      let body = null;
      if (parseJson) {
        const { readJson } = await import("./readJson.js");
        body = await readJson(res);
        if (res.aborted) return;
      }

      // Контроллер НЕ ДОЛЖЕН трогать req — ему всё передано здесь
      const out = await handler({ res, session, query, params, headers, url, method, body, sendJson });
      if (res.aborted) return;

      // Если контроллер сам не ответил — отправим тут
      if (out) {
        const { status = 200, json = {}, headers: h = {} } = out;
        return sendJson(res, { session, status, json, headers: h });
      }
    } catch (e) {
      console.error("route error:", e);
      if (!res.aborted) sendJson(res, { session: null, status: 500, json: { ok: false, error: "server error" } });
    }
  };
}