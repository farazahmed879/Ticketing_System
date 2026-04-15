

const _ = require('lodash')
const permissions = require('../permissions')

const reportsController = {}

reportsController.content = {}

reportsController.overview = function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'reports:view')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Overview'
  content.nav = 'reports'
  content.subnav = 'reports-overview'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.groups = {}

  content.data.reports = {}

  return res.render('subviews/reports/overview', content)
}

reportsController.generate = function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'reports:create')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Generate Report'
  content.nav = 'reports'
  content.subnav = 'reports-generate'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata

  const prioritySchema = require('../models/ticketpriority')
  prioritySchema.getPriorities(function (err, priorities) {
    if (err) {
      return res.render('error', {
        layout: false,
        error: err,
        message: err.message
      })
    }

    content.data.priorities = priorities

    return res.render('subviews/reports/generate', content)
  })
}

reportsController.breakdownGroup = function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'reports:view')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Group Breakdown'
  content.nav = 'reports'
  content.subnav = 'reports-breakdown-group'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.groups = {}

  content.data.reports = {}

  return res.render('subviews/reports/breakdown_Group', content)
}

reportsController.breakdownUser = function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'reports:view')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'User Breakdown'
  content.nav = 'reports'
  content.subnav = 'reports-breakdown-user'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.groups = {}

  content.data.reports = {}

  return res.render('subviews/reports/breakdown_User', content)
}

// function handleError(res, err) {
//     if (err) {
//         return res.render('error', {layout: false, error: err, message: err.message});
//     }
// }

module.exports = reportsController
