define("modules/socket.io/logs.io", [
  "jquery",
  "underscore",
  "moment",
  "modules/helpers",
  "history",
], function ($, _, moment, helpers) {
  var logsIO = {};

  cleanPreTags();

  logsIO.getLogData = function (socket) {
    socket.removeAllListeners("logs:data");
    socket.on("logs:data", function (data) {
      var $sLogs = $("#serverlogs");
      if ($sLogs.length > 0) {
        $sLogs.append(data);
        $sLogs.append("\n<br />");
        $sLogs.scrollTop(99999999999999 * 999999999999999);
        helpers.scrollToBottom($sLogs);
      }
    });
  };

  function cleanPreTags() {
    [].forEach.call(document.querySelectorAll("pre"), function ($pre) {
      var lines = $($pre).html().split("\n");
      var matches;
      for (var i = 0; i < lines.length; i++) {
        var indentation =
          (matches = /^\s+/.exec(lines[i])) !== null ? matches[0] : null;
        if (indentation) {
          // lines = lines.map(function(line) {
          //     return line.replace(indentation, '');
          // });
          lines[i].replace(/^\s+/, "");
        }
      }

      return $($pre).html(lines.join("\n").trim());
    });
  }

  return logsIO;
});
