import uWS from 'uWebSockets.js'
import { StringDecoder } from 'string_decoder'

import { getUser, createUser } from './modules/mysql.js'

import device from './Router/device/index.js'
import sendCode from './Router/code/send/index.js'
import checkCode from './Router/code/check/index.js'
import removeUser from './Router/user/remove/index.js'
import setUserInfo from './Router/user/setInfo/index.js'
import setUserEmail from './Router/user/setEmail/index.js'
import setUserAge from './Router/user/setAge/index.js'

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
  .post('/device', device)
  .post('/sendCode', sendCode)
  .post('/checkCode', checkCode)
  .post('/removeUser', removeUser)
  .get('/*', (res, req) => {
    res
      .writeStatus('200 OK')
      .writeHeader('IsExample', 'Yes')
      .end('Hello there!')
  })
  .post('/setUserInfo', setUserInfo)
  .post('/setUserEmail', setUserEmail)
  .post('/setUserAge', setUserAge)
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
  .post('/uploadPhoto', (res, req) => {
    console.log('uploadPhoto')

    res
      .writeHeader('Content-Type', 'application/json')
      .end(JSON.stringify(response))

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
