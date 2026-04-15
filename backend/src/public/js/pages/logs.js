

define('pages/logs', ['jquery', 'modules/socket', 'history'], function ($, socket) {
  var logsPage = {}

  logsPage.init = function (callback) {
    $(document).ready(function () {
      socket.ui.fetchServerLogs()
      var $sLogs = $('#serverlogs')
      if ($sLogs.length > 0) {
        $sLogs.scrollTop(99999999999999 * 999999999999999)
      }

      if (typeof callback === 'function') {
        return callback()
      }
    })
  }

  return logsPage
})
