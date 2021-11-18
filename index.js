import uWS from 'uWebSockets.js'
import fs from 'fs'

import { upgrade, open, close, message } from './modules/Socket/index.js'

import device from './Router/device/index.js'
import sendCode from './Router/code/send/index.js'
import checkCode from './Router/code/check/index.js'

import sendToken from './Router/user/sendToken/index.js' // push
import removeUser from './Router/user/remove/index.js'
import setUserInfo from './Router/user/setInfo/index.js'
import setUserEmail from './Router/user/setEmail/index.js'
import setUserAge from './Router/user/setAge/index.js'
import setUserOrientation from './Router/user/setOrientation/index.js'

import getUserData from './Router/user/get/index.js'
import logout from './Router/user/logout/index.js'

import addPhoto from './Router/user/photo/add/index.js'
import getPhotos from './Router/user/photo/get/index.js'
import getChats from './Router/user/chats/get/index.js'
import getChatMessages from './Router/user/chats/messages/get/index.js'
import removePhoto from './Router/user/photo/remove/index.js'

import getRecommendations from './Router/user/artists/get/index.js'
import getRecommendationsArtists from './Router/recommendations/get/artists/index.js'
import getRecommendationsUsers from './Router/recommendations/get/users/index.js'

import getTopGenres from './Router/data/topGenres/index.js'
import addInterest from './Router/user/interest/add/index.js'
import addArtist from './Router/user/artist/add/index.js'
import addArtists from './Router/user/artists/add/index.js'
import getArtists from './Router/user/artists/get/index.js'
import getUserPhotos from './Router/user/photos/get/index.js'
import addInstagram from './Router/user/photos/add/instagram/index.js'
import getInstagram from './Router/user/photos/get/instagram/index.js'
import getCover from './Router/data/artistCover/index.js'
import getMutualArtists from './Router/user/artist/get/mutual/index.js'

import setUserReaction from './Router/recommendations/set/user/reaction/index.js'

const port = 9001

// Send sms
var accountSid = 'AC64664f594eceb830a09387f980e2a520' // Your Account SID from www.twilio.com/console
var authToken = '84c349977668be6ed4ec04a6ec4bdf66' // Your Auth Token from www.twilio.com/console

import twilio from 'twilio'

var client = new twilio(accountSid, authToken)
// Send sms

const app = uWS
  .App()
  .ws('/*', {
    idleTimeout: 12,
    maxBackpressure: 1024,
    maxPayloadLength: 512,
    compression: uWS.DEDICATED_COMPRESSOR_3KB,
    upgrade,
    open,
    message: (ws, msg) => message(ws, app, msg),
    drain: (ws) => {
      console.log('WebSocket backpressure: ' + ws.getBufferedAmount())
    },
    close: (ws) => close(ws, app),
  })
  .get('/user', getUserData)
  .post('/user/reaction', setUserReaction)
  .post('/user/addInstagram', addInstagram)
  .post('/user/getInstagram', getInstagram)
  .get('/logout', logout)
  .post('/device', device)
  .post('/sendCode', sendCode)
  .post('/sendToken', sendToken)
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
  .post('/setUserOrientation', setUserOrientation)
  .post('/uploadPhoto', addPhoto)
  .get('/photos', getPhotos)
  .post('/user/photos', getUserPhotos)
  .post('/chat/messages/:id', getChatMessages)
  .get('/user/artists', getArtists)
  .post('/user/mutualArtists', getMutualArtists)
  .get('/recommendations', getRecommendations)
  .get('/recommendations/artists', getRecommendationsArtists)
  .get('/recommendations/users', getRecommendationsUsers)
  .get('/topGenres', getTopGenres)
  .get('/photos/get/:name', (res, req) => {
    let name = req.getParameter(0)

    let file = fs.readFileSync(`./temp/${name}`, function (err, data) {
      if (err) {
        res.end(`Error getting the file: ${err}.`)
      } else {
        res.writeHeader('Content-Type', 'image/jpeg').end(data)
      }
    })
    res.writeHeader('Content-Type', 'image/jpeg').end(file)
  })
  .get('/artist/cover/:name', getCover)
  .get('/artist/photo/:name', (res, req) => {
    let name = req.getParameter(0)

    try {
      let file = fs.readFileSync(
        `./Content/Covers/${name}`,
        function (err, data) {
          if (err) {
            res.end(`Error getting the file: ${err}.`)
          } else {
            res.writeHeader('Content-Type', 'image/jpeg').end(data)
          }
        }
      )
      res.writeHeader('Content-Type', 'image/jpeg').end(file)
    } catch (error) {
      console.log(`Error getting the file`, error)
      res.end(`Error getting the file`, error)
    }
  })
  .get('/auth/:name', (res, req) => {
    let name = req.getParameter(0)

    let file = fs.readFileSync(`./${name}.html`, function (err, data) {
      if (err) {
        res.end(`Error getting the file: ${err}.`)
      } else {
        res.writeHeader('Content-Type', 'text/html; charset=UTF-8').end(data)
      }
    })
    res.writeHeader('Content-Type', 'text/html; charset=UTF-8').end(file)
  })
  .post('/removePhoto', removePhoto)
  .post('/addInterest', addInterest)
  .post('/addArtist', addArtist)
  .post('/addArtists', addArtists)
  .get('/chats', getChats)
  .listen(port, (token) => {
    if (token) {
      console.log('Listening to port ' + port)
    } else {
      console.log('Failed to listen to port ' + port)
    }
  })
