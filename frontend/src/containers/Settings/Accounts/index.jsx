/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Author:     Chris Brame
 *  Updated:    5/17/22 2:20 PM
 *  Copyright (c) 2014-2022. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { updateSetting, updateMultipleSettings } from 'actions/settings'
import UIKit from 'uikit'

const AccountsSettingsContainer = props => {
  const { active, updateSetting, settings } = props
  const [passwordComplexityEnabled, setPasswordComplexityEnabled] = React.useState(false)
  const [allowUserRegistrationEnabled, setAllowUserRegistrationEnabled] = React.useState(false)

  const getSetting = React.useCallback(
    stateName => {
      return settings.getIn(['settings', stateName, 'value']) ? settings.getIn(['settings', stateName, 'value']) : ''
    },
    [settings]
  )

  React.useEffect(() => {
    const pc = getSetting('accountsPasswordComplexity')
    const ar = getSetting('allowUserRegistration')
    if (passwordComplexityEnabled !== pc) setPasswordComplexityEnabled(pc)
    if (allowUserRegistrationEnabled !== ar) setAllowUserRegistrationEnabled(ar)
  }, [settings, getSetting])

  const onUpdateSetting = (stateName, name, value) => {
    updateSetting({ stateName, name, value })
  }

  return (
    <div className={active ? 'active' : 'hide'}>
      <SettingItem
        title='Allow User Registration'
        subtitle='Allow users to create accounts on the login screen.'
        component={
          <EnableSwitch
            stateName='allowUserRegistration'
            label='Enable'
            checked={allowUserRegistrationEnabled}
            onChange={e => {
              onUpdateSetting('allowUserRegistration', 'allowUserRegistration:enable', e.target.checked)
            }}
          />
        }
      />
      <SettingItem
        title={'Password Complexity'}
        subtitle={'Require users passwords to meet minimum password complexity'}
        tooltip={'Minimum 8 characters with uppercase and numeric.'}
        component={
          <EnableSwitch
            stateName={'accountsPasswordComplexity'}
            label={'Enable'}
            checked={passwordComplexityEnabled}
            onChange={e => {
              onUpdateSetting('accountsPasswordComplexity', 'accountsPasswordComplexity:enable', e.target.checked)
            }}
          />
        }
      />
    </div>
  )
}

AccountsSettingsContainer.propTypes = {
  active: PropTypes.bool.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default connect(mapStateToProps, { updateSetting, updateMultipleSettings })(AccountsSettingsContainer)
