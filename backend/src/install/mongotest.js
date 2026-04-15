

const database = require('../database')

global.env = process.env.NODE_ENV || 'production'
;(function () {
  const CONNECTION_URI = process.env.MONGOTESTURI
  if (!CONNECTION_URI) return process.send({ error: { message: 'Invalid connection uri' } })
  const options = {
    connectTimeoutMS: 5000
  }
  database.init(
    function (e, db) {
      if (e) {
        return process.send({ error: e })
        // return process.kill(0)
      }

      if (!db) {
        return process.send({ error: { message: 'Unable to open database' } })
        // return process.kill(0)
      }

      return process.send({ success: true })
    },
    CONNECTION_URI,
    options
  )
})()
