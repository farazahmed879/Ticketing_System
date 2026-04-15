

var winston = require('winston')
var request = require('request')

module.exports.pushNotification = function (tpsUsername, tpsApiKey, notification) {
  var body = {
    title: notification.title,
    content: notification.content,
    data: {
      hostname: notification.hostname,
      users: notification.data.users
    }
  }

  if (notification.data.ticketId) {
    body.data.ticketId = notification.data.ticketId
  }

  if (notification.data.ticketUid) {
    body.data.ticketUid = notification.data.ticketUid
  }

  request(
    {
      url: 'http://push.trudesk.io/api/pushNotification',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accesstoken: tpsApiKey
      },
      body: JSON.stringify(body)
    },
    function (err, response) {
      if (err) {
        winston.debug(err)
      } else {
        if (response.statusCode === 401) {
          winston.warn('[trudesk:TPS:pushNotification] Error - Invalid API Key and or Username.')
        }
      }
    }
  )
}

module.exports.init = function () {
  // emitter.on('ticket:created', onTicketCreate);
  // emitter.on('notification:count:update', onNotificationCountUpdate);
}

// function onTicketCreate(ticketObj) {
//
// }
//
// function onNotificationCountUpdate(user) {
//
// }
