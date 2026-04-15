

define('pages/plugins', ['jquery', 'modules/helpers', 'tether', 'history'], function ($, helpers, Tether) {
  var pluginsPage = {}

  pluginsPage.init = function (callback) {
    $(document).ready(function () {
      var $searchPluginList = $('#search_plugin_list')
      $searchPluginList.off('keyup')
      $searchPluginList.on('keyup', function () {
        var value = this.value.toLowerCase()
        $('table#plugin_list_table')
          .find('tbody')
          .find('tr')
          .each(function () {
            var id = $(this)
              .find('td')
              .text()
              .toLowerCase()
            $(this).toggle(id.indexOf(value) !== -1)
          })
      })

      if ($('.plugin-tether').length > 0) {
        // eslint-disable-next-line
        new Tether({
          element: '.plugin-tether',
          target: '.tether-plugins',
          attachment: 'top left',
          targetAttachment: 'top right',
          offset: '0 -20px'
        })
      }

      if (typeof callback === 'function') {
        return callback()
      }
    })
  }

  return pluginsPage
})
