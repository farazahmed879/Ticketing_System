

const pluginHelpers = {}

pluginHelpers.checkPermissions = function (userRole, permissions) {
  if (userRole === undefined || permissions === undefined) return false

  const permissionArray = permissions.split(' ')
  let result = false
  for (let i = 0; i < permissionArray.length; i++) {
    if (userRole.toString().toLowerCase() === permissionArray[i].toString().toLowerCase()) result = true
  }

  return result
}

module.exports = pluginHelpers
