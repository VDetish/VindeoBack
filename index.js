const uWS = require('uWebSockets.js')

const port = 9001
const stringDecoder = new (require('string_decoder').StringDecoder)('utf8')
const connected_clients = new Map() // Workaround until PubSub is available

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
  .any('/*', (res, req) => {
    res.end('Nothing to see here!')
  })
  .listen(port, (token) => {
    if (token) {
      console.log('Listening to port ' + port)
    } else {
      console.log('Failed to listen to port ' + port)
    }
  })

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
