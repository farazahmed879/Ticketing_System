define("modules/socket.io/ticketsUI", [
  "jquery",
  "underscore",
  "moment",
  "modules/helpers",
  "modules/navigation",
  "history",
], function ($) {
  var ticketsUI = {};

  ticketsUI.updateSubscribe = function (socket) {
    socket.removeAllListeners("ticket:subscriber:update");
    socket.on("ticket:subscriber:update", function (data) {
      var $subscribeSwitch = $(
        'input#subscribeSwitch[data-subscribe-userId="' + data.user + '"]',
      );
      if ($subscribeSwitch.length > 0) {
        if (data.subscribe) {
          $subscribeSwitch.prop("checked", true);
        } else {
          $subscribeSwitch.prop("checked", false);
        }
      }
    });
  };

  return ticketsUI;
});
