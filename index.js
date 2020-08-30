import uWS from 'uWebSockets.js'
import { StringDecoder } from 'string_decoder'

import { getUser, createUser, addCall, checkCode } from './modules/mysql.js'

import { makeCall } from './modules/PhoneVerification.js'

const port = 9001
const stringDecoder = new StringDecoder('utf8')
const connected_clients = new Map() // Workaround until PubSub is available

// Send sms
var accountSid = 'AC64664f594eceb830a09387f980e2a520' // Your Account SID from www.twilio.com/console
var authToken = '84c349977668be6ed4ec04a6ec4bdf66' // Your Auth Token from www.twilio.com/console

import twilio from 'twilio'
var client = new twilio(accountSid, authToken)
// Send sms

uWS
  ./*SSL*/ App()
  .ws('/*', {
    idleTimeout: 30,
    maxBackpressure: 1024,
    maxPayloadLength: 512,
    compression: uWS.DEDICATED_COMPRESSOR_3KB,

    open: (ws, req) => {
      console.log('New connection:')
      // console.log('User-Agent: ' + req.getHeader('user-agent'))
      ws.client = {
        uuid: create_UUID(),
        nickname: '',
      }
      console.log('UUID: ' + ws.client.uuid)
      connected_clients.set(ws.client.uuid, ws)
      // ws.subscribe() not implemented yet.
      //ws.subscribe('#');
    },
    message: (ws, message) => {
      // Convert message from ArrayBuffer to String asuming it is UTF8
      message = stringDecoder.write(new DataView(message))
      if (message === '') {
        // PING
        ws.send('') // PONG
      } else {
        handleMessage(ws, message)
      }
    },
    drain: (ws) => {
      console.log('WebSocket backpressure: ' + ws.getBufferedAmount())
    },
    close: (ws, code, message) => {
      console.log('WebSocket closed, uuid: ' + ws.client.uuid)
      connected_clients.delete(ws.client.uuid)
      publish(ws, 'info', 'user left', {
        nickname: ws.client.nickname,
        participants: connected_clients.size,
      })
    },
  })
  .get('/*', (res, req) => {
    getUser(2, (response) => {
      console.log(response)
      res
        .writeHeader('Content-Type', 'application/json')
        .end(JSON.stringify(response))
    })
    res.onAborted(() => {
      onAbortedOrFinishedResponse(res, readStream)
    })
  })
  .post('/login', (res, req) => {
    getUser(2, (response) => {
      console.log(response)

      res
        .writeHeader('Content-Type', 'application/json')
        .end(JSON.stringify({ todo: 'Nobody but me' }))
    })

    res.onAborted(() => {
      onAbortedOrFinishedResponse(res, readStream)
    })
  })
  .post('/sendCode', (res, req) => {
    let session = req.getHeader('session')

    readJson(
      res,
      (obj) => {
        const { phone } = obj

        makeCall(phone, (err, call) => {
          console.log(err, call)
          const { error, code } = call

          if (error) {
            res.end(JSON.stringify({ status: false, error }))
          } else if (code) {
            addCall({ phone, code, session }, () => {
              res.end(JSON.stringify({ status: true }))
            })
          } else if (err) {
            res.end(JSON.stringify({ status: false, error: 'unknown' }))
          }
        })

        // client.verify
        //   .services('VA12d70175f74c38d99328ccee3352a887')
        //   .verifications.create({
        //     to: obj.phone,
        //     channel: 'sms',
        //     locale: 'ru',
        //   })
        //   .then((verification) => {
        //     console.log(verification)
        //     res.end(JSON.stringify({ status: verification.status }))
        //   })
        //   .catch((error) => {
        //     console.error(error)

        //     res.end(JSON.stringify({ status: error.status }))
        //   })
      },
      () => {
        /* Request was prematurely aborted or invalid or missing, stop reading */
        console.log('Invalid JSON or no data at all!')
      }
    )
  })

  .post('/checkCode', (res, req) => {
    let session = req.getHeader('session')

    readJson(
      res,
      (obj) => {
        const { phone, code } = obj

        checkCode({ phone, code, session }, (err, valid) => {
          if (err) console.log(err)
          res.end(JSON.stringify({ valid: valid }))
        })

        // client.verify
        //   .services('VA12d70175f74c38d99328ccee3352a887')
        //   .verificationChecks.create({ to: obj.phone, code: obj.code })
        //   .then((verification_check) => {
        //     console.log(verification_check)
        //     res.end(JSON.stringify({ valid: verification_check.valid }))
        //   })
      },
      () => {
        /* Request was prematurely aborted or invalid or missing, stop reading */
        console.log('Invalid JSON or no data at all!')
      }
    )
  })

  .post('/register', (res, req) => {
    const userData = {
      lastName: 'Vladislav',
      familyName: 'Donets',
      birthDate: '15.02.1993',
      sex: '1',
      orientation: 'hetero',
      location: 'Moscow',
      phone: '+79998009995',
      email: '123',
    }

    createUser(userData, (response) => {
      console.log(response)

      res
        .writeHeader('Content-Type', 'application/json')
        .end(JSON.stringify(response))
    })

    res.onAborted(() => {
      onAbortedOrFinishedResponse(res, readStream)
    })
  })
  .listen(port, (token) => {
    if (token) {
      console.log('Listening to port ' + port)
    } else {
      console.log('Failed to listen to port ' + port)
    }
  })

/* Either onAborted or simply finished request */
function onAbortedOrFinishedResponse(res, readStream) {
  if (res.id == -1) {
    console.log(
      'ERROR! onAbortedOrFinishedResponse called twice for the same res!'
    )
  } else {
    console.log('Stream was closed, openStreams: ' + --openStreams)
    console.timeEnd(res.id)
    readStream.destroy()
  }

  /* Mark this response already accounted for */
  res.id = -1
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

function handleMessage(ws, message) {
  console.log('<- ' + ws.client.uuid + ': ' + message)
  var indexOfComma = message.indexOf(',')
  var command = message,
    payload
  if (indexOfComma >= 0) {
    command = message.slice(0, indexOfComma)
    payload = JSON.parse(message.slice(indexOfComma + 1))
  }
  switch (command) {
    case 'login':
      ws.client.nickname = payload.nickname
      send(ws, 'welcome', {
        uuid: ws.client.uuid,
      })
      publish(ws, 'info', 'user joined', {
        nickname: ws.client.nickname,
        participants: connected_clients.size,
      })
      break
    case 'new message':
      publish(ws, 'room', 'new message', {
        nickname: ws.client.nickname,
        uuid: ws.client.uuid,
        text: payload.text,
      })
      break
  }
}

function send(ws, command, payload) {
  ws.send(command + ',' + JSON.stringify(payload))
}

function publish(ws, topic, command, payload) {
  // ws.publish() not implemented yet. Using Map.forEach untill PubSub is available
  //ws.publish(topic, command + ',' + JSON.stringify(payload));
  connected_clients.forEach((client_ws) => {
    client_ws.send(command + ',' + JSON.stringify(payload))
  })
}

// UUID generator from: https://gist.github.com/LeverOne/1308368
function create_UUID(a, b) {
  for (
    b = a = '';
    a++ < 36;
    b +=
      (a * 51) & 52
        ? (a ^ 15 ? 8 ^ (Math.random() * (a ^ 20 ? 16 : 4)) : 4).toString(16)
        : '-'
  );
  return b
}

/* Helper function for reading a posted JSON body */
function readJson(res, cb, err) {
  let buffer
  /* Register data cb */
  res.onData((ab, isLast) => {
    let chunk = Buffer.from(ab)
    if (isLast) {
      let json
      if (buffer) {
        try {
          json = JSON.parse(Buffer.concat([buffer, chunk]))
        } catch (e) {
          /* res.close calls onAborted */
          res.close()
          return
        }
        cb(json)
      } else {
        try {
          json = JSON.parse(chunk)
        } catch (e) {
          /* res.close calls onAborted */
          res.close()
          return
        }
        cb(json)
      }
    } else {
      if (buffer) {
        buffer = Buffer.concat([buffer, chunk])
      } else {
        buffer = Buffer.concat([chunk])
      }
    }
  })

  /* Register error cb */
  res.onAborted(err)
}
