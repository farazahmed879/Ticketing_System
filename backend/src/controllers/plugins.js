

const pluginsController = {}

pluginsController.get = function (req, res) {
  const content = {}
  content.title = 'Plugins'
  content.nav = 'plugins'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.plugins = {}
  content.data.plugins.installed = JSON.stringify(global.plugins, null, 2)

  res.render('plugins', content)
}

module.exports = pluginsController
