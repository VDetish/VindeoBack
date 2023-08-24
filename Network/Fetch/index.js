import request from 'request'

export function query(resource, { method, body }, callback) {
  const post_data = new URLSearchParams(body).toString()
  const url = `${resource}/${method}?${post_data}`

  request.get({ url, followAllRedirects: true }, (err, res) => {
    if (err) {
      callback(err, {})
    } else {
      const json = res.body.toString()
      const response = JSON.parse(json)

      callback(response.error_code, { ...response, ...{ error: null } })
    }
  })
}

export function get(url, callback) {
  request.get({ url }, (err, res) => {
    if (err) {
      callback(err, {})
    } else {
      const html = res.body.toString()

      callback(null, html)
    }
  })
}
