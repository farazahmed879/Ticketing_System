

const _ = require('lodash')
const noticeSchema = require('../models/notice')
const permissions = require('../permissions')

const noticesController = {}

function handleError (res, err) {
  if (err) {
    return res.render('error', {
      layout: false,
      error: err,
      message: err.message
    })
  }
}

noticesController.get = function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'notices:create')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Notices'
  content.nav = 'notices'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.notices = {}

  return res.render('notices', content)
}

noticesController.create = function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'notices:create')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Notices - Create'
  content.nav = 'notices'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata

  res.render('subviews/createNotice', content)
}

noticesController.edit = function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'notices:update')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Notices - Edit'
  content.nav = 'notices'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  noticeSchema.getNotice(req.params.id, function (err, notice) {
    if (err) return handleError(res, err)
    content.data.notice = notice

    res.render('subviews/editNotice', content)
  })
}

module.exports = noticesController
