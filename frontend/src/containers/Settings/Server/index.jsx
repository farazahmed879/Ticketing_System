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
 *  Updated:    9/18/21 11:41 AM
 *  Copyright (c) 2014-2021. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { updateSetting, updateMultipleSettings } from 'actions/settings'
import UIKit from 'uikit'

const ServerSettingsController = props => {
  const { active, updateSetting, settings } = props
  const [maintenanceModeEnabled, setMaintenanceModeEnabled] = React.useState(false)
  const [restarting, setRestarting] = React.useState(false)

  const getSetting = React.useCallback(
    stateName => {
      return settings.getIn(['settings', stateName, 'value']) ? settings.getIn(['settings', stateName, 'value']) : ''
    },
    [settings]
  )

  React.useEffect(() => {
    const mm = getSetting('maintenanceMode')
    if (maintenanceModeEnabled !== mm) {
      setMaintenanceModeEnabled(mm)
    }
  }, [settings, getSetting])

  const restartServer = () => {
    setRestarting(true)
    const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    axios
      .post(
        '/api/v1/admin/restart',
        {},
        {
          headers: {
            'CSRF-TOKEN': token
          }
        }
      )
      .catch(error => {
        helpers.hideLoader()
        Log.error(error.responseText)
        Log.error('Unable to restart server. Server must run under PM2 and Account must have admin rights.')
        helpers.UI.showSnackbar('Unable to restart server. Are you an Administrator?', true)
      })
      .then(() => {
        setRestarting(false)
      })
  }

  const onMaintenanceModeChange = e => {
    const val = e.target.checked

    if (val === true) {
      UIKit.modal.confirm(
        `<h2>Are you sure?</h2>
        <p style="font-size: 15px;">
            <span class="uk-text-danger" style="font-size: 15px;">This will force logout every user and prevent non-administrators from logging in.</span> 
        </p>
        `,
        () => {
          updateSetting({
            name: 'maintenanceMode:enable',
            value: val,
            stateName: 'maintenanceMode',
            noSnackbar: true
          }).then(() => {
            setMaintenanceModeEnabled(val)
          })
        },
        {
          labels: { Ok: 'Yes', Cancel: 'No' },
          confirmButtonClass: 'md-btn-danger'
        }
      )
    } else {
      updateSetting({ name: 'maintenanceMode:enable', value: val, stateName: 'maintenanceMode', noSnackbar: true }).then(
        () => {
          setMaintenanceModeEnabled(val)
        }
      )
    }
  }

  return (
    <div className={active ? 'active' : 'hide'}>
      <SettingItem
        title={'Restart Server'}
        subtitle={'Restart the Jami Partners Instance. '}
        component={
          <Button
            text={'Restart'}
            flat={false}
            waves={true}
            style={'danger'}
            extraClass={'right mt-8 mr-5'}
            onClick={restartServer}
            disabled={restarting}
          />
        }
      />
      <SettingItem
        title={'Maintenance Mode'}
        subtitle={'Only Administrators are allowed to login.'}
        component={
          <EnableSwitch
            stateName={'maintenanceMode'}
            label={'Enable'}
            checked={maintenanceModeEnabled}
            onChange={onMaintenanceModeChange}
          />
        }
      />
    </div>
  )
}

ServerSettingsController.propTypes = {
  active: PropTypes.bool.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default connect(mapStateToProps, { updateSetting, updateMultipleSettings })(ServerSettingsController)
