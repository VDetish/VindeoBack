import { query } from '../Network/Fetch/index.js'

export async function makeCall(phone) {
  return new Promise((resolve, reject) => {
    query(
      'https://smsc.ru',
      {
        method: 'sys/send.php',
        body: {
          login: 'donecvlad',
          psw: 'vikhef-9xigne-wyzpaF',
          phones: phone,
          mes: 'code',
          call: 1,
          fmt: 3,
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
