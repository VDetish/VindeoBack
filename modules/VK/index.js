import { getCity, addCity } from '../mysql.js'
import { query } from '../../Network/Fetch/index.js'

export async function getCities(id) {
  return new Promise(async (resolve, reject) => {
    const city = await getCity(id)

    if (city && city.name) {
      resolve(city.name)
    } else {
      query(
        'https://api.vk.com/method',
        {
          method: 'database.getCitiesById',
          body: {
            city_ids: id,
            access_token:
              'a9a7efebd99c3cad852ff6a33bfd2ed39c4e9ac76afe552ae1b5ddbb94dccff7ac7d4c590a6c0e91642ea',
            v: '5.131',
          },
        },
        (err, res) => {
          if (err) {
            resolve({ error: err })
          } else {
            addCity({ id, name: res.response[0].title })
            resolve(res.response[0].title)
          }
        }
      )
    }
  })
}
