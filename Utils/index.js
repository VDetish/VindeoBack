export function rJson(res, cb, err) {
  let buffer

  res.onData((ab, isLast) => {
    try {
      let chunk = Buffer.from(ab)

      if (isLast) {
        if (buffer) {
          cb(JSON.parse(Buffer.concat([buffer, chunk]).toString()))
        } else {
          cb(JSON.parse(chunk.toString()))
        }
      } else {
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk])
        } else {
          buffer = Buffer.concat([chunk])
        }
      }
    } catch (e) {
      cb({})
    }
  })

  res.onAborted(err)
}

export async function readJson(res) {
  return new Promise(function (resolve, reject) {
    rJson(res, resolve, reject)
  })
}

export function sendJson(res, { session, json }) {
  res
    .writeHeader('Content-Type', 'application/json')
    .writeHeader('session', session)
    .end(JSON.stringify(json))
}
