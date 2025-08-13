// Utils/sendJson.js
export function sendJson(res, { session, status = 200, json = {}, headers = {} }) {
  if (res.aborted) return;
  res.cork(() => {
    res.writeStatus(String(status));
    res.writeHeader("Content-Type", "application/json; charset=utf-8");
    if (session) res.writeHeader("session", String(session));
    for (const [k, v] of Object.entries(headers)) {
      res.writeHeader(k, String(v));
    }
    res.end(JSON.stringify(json));
  });
}