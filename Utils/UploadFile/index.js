import fs from 'fs'
import path from 'path'
import Busboy from 'busboy'

export async function SaveFile(res, req) {
  return new Promise(function (resolve, reject) {
    sFile({ res, req }, resolve, reject)
  })
}

function sFile({ res, req }, cb, err) {
  let sort = 0
  let fName = ''
  const headers = {}
  req.forEach((k, v) => {
    headers[k] = v
  })

  var busboy = new Busboy({ headers: headers })

  busboy.on('file', function (fieldname, file, filename) {
    fName = guidGenerator() + filename.split('.').pop()
    var saveTo = path.join(path.resolve('temp/'), path.basename(fName))
    file.pipe(fs.createWriteStream(saveTo))
  })

  busboy.on('field', function (fieldname, val) {
    sort = val
    console.log('Field [' + fieldname + ']: value: ' + val)
  })

  busboy.on('finish', function () {
    cb({ path: fName, sort })
  })

  let data = Buffer.allocUnsafe(0)

  res.onData((chunk, isLast) => {
    data = Buffer.concat([data, Buffer.from(chunk)])

    if (isLast) {
      busboy.end(data)
    }
  })
}

function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  }
  return `${S4()}${S4()}-${S4()}.`
}
