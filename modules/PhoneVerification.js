import { query } from '../Network/Fetch/index.js'

export function makeCall(phone, callback) {
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
    callback
  )
}
