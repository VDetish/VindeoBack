import { query } from '../../../Network/Fetch/index.js'
import { sendJson } from '../../../utils/index.js'

export default async function (res, req) {
  res.onAborted(() => {
    res.aborted = true
  })

  // Check tags from db
  // Get tags (genres) from last.fm
  // Save to db
  // Return to user
  const {
    toptags: { tag },
  } = await getTags()

  tag.sort((a, b) => b.reach - a.reach)

  const newTag = tag.map((obj) => ({ name: obj.name, count: 1 }))

  sendJson(res, { json: { tag: newTag } })
}

// Cache data!
export async function getTags() {
  return new Promise((resolve, reject) => {
    query(
      'https://ws.audioscrobbler.com',
      {
        method: '/2.0',
        body: {
          method: 'tag.getTopTags',
          api_key: '75b2164fbf069b64a9bf8318925686b2',
          format: 'json',
        },
      },
      (err, res) => {
        if (err) {
          resolve({ error: err })
        } else {
          resolve(res)
        }
      }
    )
  })
}
