// Utils/readJson.js
export function readJson(res, { max = 1 << 20 } = {}) { // по умолчанию 1 МБ
  return new Promise((resolve, reject) => {
    let chunks = [];
    let total = 0;
    let done = false;

    res.onData((ab, isLast) => {
      if (done) return;
      const chunk = Buffer.from(ab);
      total += chunk.length;
      if (total > max) {
        done = true;
        return reject(new Error("payload too large"));
      }
      chunks.push(chunk);
      if (isLast) {
        done = true;
        try {
          const str = Buffer.concat(chunks, total).toString("utf8");
          resolve(str ? JSON.parse(str) : {});
        } catch (e) {
          reject(e);
        }
      }
    });

    res.onAborted(() => {
      if (done) return;
      done = true;
      res.aborted = true;
      reject(new Error("aborted"));
    });
  });
}