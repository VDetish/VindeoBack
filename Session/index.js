import crypto from 'crypto'

import { getSession, createSession } from '../modules/mysql.js'

export default async function (res, req) {
  res.onAborted(() => {
    res.aborted = true
  })

  let session = req.getHeader('session')
  const ip = remoteAddressToString(res.getRemoteAddress())

  let isError = false

  if (session === 'undefined' || session === 'null') {
    session = crypto.randomBytes(16).toString('hex')

    isError = await createSession({ value: session, ip })
  } else {
    const isValid = await getSession(session)

    if (!isValid) {
      isError = await createSession({ value: session, ip })
    }
  }

  return new Promise((resolve, reject) => {
    if (isError) {
      reject("can't create session")
    } else {
      resolve(session)
    }
  })
}

function remoteAddressToString(address) {
  if (address.byteLength == 4) {
    //IPv4
    return new Uint8Array(address).join('.')
  } else if (address.byteLength == 16) {
    //IPv6
    let arr = Array.from(new Uint16Array(address))
    if (
      arr[0] == 0 &&
      arr[1] == 0 &&
      arr[2] == 0 &&
      arr[3] == 0 &&
      arr[4] == 0 &&
      arr[5] == 0xffff
    )
      //IPv4 mapped to IPv6
      return new Uint8Array(address.slice(12)).join('.')
    else
      return Array.from(new Uint16Array(address))
        .map((v) => v.toString(16))
        .join(':')
        .replace(/((^|:)(0(:|$))+)/, '::')
  }
}
