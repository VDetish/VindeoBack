import request from 'request'
import querystring from 'querystring'

export function query(resource, { method, body }, callback) {
  const post_data = querystring.stringify(body)
  const url = `${resource}/${method}?${post_data}`

  request.get({ url }, (err, res) => {
    if (err) {
      callback(err, {})
    } else {
      const json = res.body.toString()
      const response = JSON.parse(json)

      callback(response.error_code, { ...response, ...{ error: null } })
    }
  })
}
