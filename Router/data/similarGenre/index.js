import { query } from '../../../Network/Fetch/index.js'
import { sendJson } from '../../../Utils/index.js'

import { checkCode, createUser } from '../../../modules/mysql.js'

export default async function (res, req) {
  res.onAborted(() => {
    res.aborted = true
  })

  let genre = req.getParameter(0)

  const tags = []

  // Check tags from db
  // Get tags (genres) from last.fm
  // Save to db
  // Return to user
  const {
    topartists: { artist },
  } = await getTags(genre)

  const artists = artist.splice(0, 10)

  for (const e of artists) {
    const {
      toptags: { tag },
    } = await getArtistTags(e.name)

    const t_tags = tag.splice(0, 5)

    t_tags.forEach((e_) => {
      const temp = tags.find((tag_t) => distance(tag_t.name, e_.name) > 0.8)

      if (!temp) {
        if (
          distance(e.name, e_.name) < 0.9 &&
          // distance('seen live', e_.name) < 0.9 &&
          distance(genre, e_.name) < 0.9
        ) {
          tags.push({
            name: e_.name,
            count: 1,
          })
        }
      } else {
        temp.count += 1
      }
    })
  }

  tags.sort((a, b) => b.count - a.count)

  sendJson(res, { json: { tags: tags.splice(0, 5) } })
}

async function getTags(genre) {
  return new Promise((resolve, reject) => {
    query(
      'https://ws.audioscrobbler.com',
      {
        method: '/2.0',
        body: {
          method: 'tag.getTopArtists',
          tag: genre,
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

async function getArtistTags(artist) {
  return new Promise((resolve, reject) => {
    query(
      'https://ws.audioscrobbler.com',
      {
        method: '/2.0',
        body: {
          method: 'artist.gettoptags',
          artist,
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

function extend(a, b) {
  for (var property in b) {
    if (b.hasOwnProperty(property)) {
      a[property] = b[property]
    }
  }

  return a
}

function distance(s1, s2, options) {
  var m = 0
  var defaults = { caseSensitive: false }
  var settings = extend(defaults, options)
  var i
  var j

  // Exit early if either are empty.
  if (s1.length === 0 || s2.length === 0) {
    return 0
  }

  // Convert to upper if case-sensitive is false.
  if (!settings.caseSensitive) {
    s1 = s1.toUpperCase()
    s2 = s2.toUpperCase()
  }

  // Exit early if they're an exact match.
  if (s1 === s2) {
    return 1
  }

  var range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
  var s1Matches = new Array(s1.length)
  var s2Matches = new Array(s2.length)

  for (i = 0; i < s1.length; i++) {
    var low = i >= range ? i - range : 0
    var high = i + range <= s2.length - 1 ? i + range : s2.length - 1

    for (j = low; j <= high; j++) {
      if (s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j]) {
        ++m
        s1Matches[i] = s2Matches[j] = true
        break
      }
    }
  }

  // Exit early if no matches were found.
  if (m === 0) {
    return 0
  }

  // Count the transpositions.
  var k = 0
  var numTrans = 0

  for (i = 0; i < s1.length; i++) {
    if (s1Matches[i] === true) {
      for (j = k; j < s2.length; j++) {
        if (s2Matches[j] === true) {
          k = j + 1
          break
        }
      }

      if (s1[i] !== s2[j]) {
        ++numTrans
      }
    }
  }

  var weight = (m / s1.length + m / s2.length + (m - numTrans / 2) / m) / 3
  var l = 0
  var p = 0.1

  if (weight > 0.7) {
    while (s1[l] === s2[l] && l < 4) {
      ++l
    }

    weight = weight + l * p * (1 - weight)
  }

  return weight
}
