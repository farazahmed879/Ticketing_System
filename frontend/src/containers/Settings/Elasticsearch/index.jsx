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
 *  Updated:    4/14/19 2:25 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { updateSetting, updateMultipleSettings } from 'actions/settings'

import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import EnableSwitch from 'components/Settings/EnableSwitch'

import Log from '../../../logger'
import axios from 'axios'
import helpers from 'lib/helpers'
import UIKit from 'uikit'

const ElasticsearchSettingsContainer = props => {
  const { active, settings, updateSetting, updateMultipleSettings } = props

  const [esStatus, setEsStatus] = React.useState('Not Configured')
  const [esStatusClass, setEsStatusClass] = React.useState('')
  const [indexCount, setIndexCount] = React.useState(0)
  const [inSyncText, setInSyncText] = React.useState('Not Configured')
  const [inSyncClass, setInSyncClass] = React.useState('')
  const [disableRebuild, setDisableRebuild] = React.useState(false)

  const [host, setHost] = React.useState(false)
  const [port, setPort] = React.useState('')
  const [configured, setConfigured] = React.useState(false)

  const loaded = React.useRef(false)

  const getSetting = React.useCallback(
    name => {
      return settings.getIn(['settings', name, 'value']) ? settings.getIn(['settings', name, 'value']) : ''
    },
    [settings]
  )

  const getStatus = React.useCallback(() => {
    axios
      .get('/api/v2/es/status')
      .then(res => {
        const data = res.data
        if (data.status.isRebuilding) {
          setEsStatus('Rebuilding...')
          setEsStatusClass('')
        } else {
          setEsStatus(data.status.esStatus)
          if (data.status.esStatus.toLowerCase() === 'connected') setEsStatusClass('text-success')
          else if (data.status.esStatus.toLowerCase() === 'error') setEsStatusClass('text-danger')
        }

        setIndexCount(data.status.indexCount.toLocaleString())
        if (data.status.inSync) {
          setInSyncText('In Sync')
          setInSyncClass('bg-success')
        } else {
          setInSyncText('Out of Sync')
          setInSyncClass('bg-warn')
        }

        if (data.status.isRebuilding) {
          setTimeout(getStatus, 3000)
          setDisableRebuild(true)
        } else {
          setDisableRebuild(false)
        }
      })
      .catch(err => {
        setEsStatus('Error')
        setEsStatusClass('text-danger')
        setInSyncText('Unknown')
        setInSyncClass('')
        if (err.error && err.error.message) helpers.UI.showSnackbar('Error: ' + err.error.message, true)
        else helpers.UI.showSnackbar('Error: An unknown error occurred. Check Console.', true)
        Log.error(err)
      })
  }, [])

  React.useEffect(() => {
    helpers.UI.inputs()
  }, [])

  React.useEffect(() => {
    helpers.UI.reRenderInputs()
  })

  React.useEffect(() => {
    if (settings) {
      if (host === false) setHost(settings.getIn(['settings', 'elasticSearchHost', 'value']) || false)
      if (!port) setPort(settings.getIn(['settings', 'elasticSearchPort', 'value']) || '')
      if (!configured) setConfigured(settings.getIn(['settings', 'elasticSearchConfigured', 'value']) || false)
    }
  }, [settings, host, port, configured])

  React.useEffect(() => {
    if (!loaded.current && configured) {
      getStatus()
      loaded.current = true
    }
  }, [configured, getStatus])

  const onEnableChanged = e => {
    const checked = e.target.checked
    updateSetting({
      stateName: 'elasticSearchEnabled',
      name: 'es:enable',
      value: checked,
      noSnackbar: true
    }).then(() => {
      if (checked && host && port) {
        setConfigured(true)
        getStatus()
      } else {
        setConfigured(false)
        setEsStatus('Not Configured')
        setEsStatusClass('')
        setInSyncText('Not Configured')
        setInSyncClass('')
        setIndexCount(0)
      }
    })
  }

  const onInputChanged = (e, settingName) => {
    if (settingName === 'host') setHost(e.target.value)
    if (settingName === 'port') setPort(e.target.value)
  }

  const onFormSubmit = e => {
    e.preventDefault()
    const payload = [
      { name: 'es:host', value: host },
      { name: 'es:port', value: port }
    ]
    updateMultipleSettings(payload)
  }

  const rebuildIndex = () => {
    UIKit.modal.confirm(
      'Are you sure you want to rebuild the index?',
      function () {
        setEsStatus('Rebuilding...')
        setInSyncText('Out of Sync')
        setInSyncClass('bg-warn')
        setIndexCount(0)
        axios
          .get('/api/v2/es/rebuild')
          .then(() => {
            setEsStatus('Rebuilding...')
            helpers.UI.showSnackbar('Rebuilding Index...', false)
            setDisableRebuild(true)
            setTimeout(getStatus, 3000)
          })
          .catch(function (err) {
            Log.error('[trudesk:settings:es:RebuildIndex]', err)
            helpers.UI.showSnackbar('Error: An unknown error occurred. Check Console.', true)
          })
      },
      {
        labels: { Ok: 'Yes', Cancel: 'No' },
        confirmButtonClass: 'md-btn-danger'
      }
    )
  }

  return (
    <div className={active ? '' : 'hide'}>
      <SettingItem
        title={'Elasticsearch - Beta'}
        subtitle={'Enable the Elasticsearch engine'}
        component={
          <EnableSwitch
            stateName={'elasticSearchEnabled'}
            label={'Enable'}
            checked={getSetting('elasticSearchEnabled')}
            onChange={e => onEnableChanged(e)}
          />
        }
      />
      <SettingItem
        title={'Connection Status'}
        subtitle={'Current connection status to the Elasticsearch server.'}
        component={<h4 className={`right mr-15 mt-15 ${esStatusClass}`}>{esStatus}</h4>}
      />
      <SettingItem
        title={'Indexed Documents'}
        subtitle={'Current count of indexed documents.'}
        component={<h4 className={'right mr-15 mt-15'}>{indexCount}</h4>}
      />
      <SettingItem
        title={'Index Status'}
        subtitle={'Current status of the index. if the status is not green, the index may need rebuilding.'}
        extraClass={inSyncClass}
        component={<h4 className={'right mr-15 mt-15'}>{inSyncText}</h4>}
      />
      <SettingItem
        title={'Elasticsearch Server Configuration'}
        tooltip={'Changing server settings will require a rebuild of the index and server restart.'}
        subtitle={'The connection settings to the Elasticsearch server.'}
      >
        <form onSubmit={e => onFormSubmit(e)}>
          <div className='uk-margin-medium-bottom'>
            <label>Server</label>
            <input
              type='text'
              className={'md-input md-input-width-medium'}
              value={host || ''}
              disabled={!getSetting('elasticSearchEnabled')}
              onChange={e => onInputChanged(e, 'host')}
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label>Port</label>
            <input
              type='text'
              className={'md-input md-input-width-medium'}
              value={port || ''}
              disabled={!getSetting('elasticSearchEnabled')}
              onChange={e => onInputChanged(e, 'port')}
            />
          </div>
          <div className='uk-clearfix'>
            <Button
              text={'Apply'}
              type={'submit'}
              flat={true}
              waves={true}
              disabled={!getSetting('elasticSearchEnabled')}
              style={'success'}
              extraClass={'uk-float-right'}
            />
          </div>
        </form>
      </SettingItem>
      <SettingItem
        title={'Rebuild Index'}
        subtitle={'Wipe index and rebuild'}
        tooltip={
          'Rebuilding the index should only occur if the index is out of sync with the database, or has not been initialized. Rebuilding will take some time.'
        }
        component={
          <Button
            text={'Rebuild'}
            flat={false}
            waves={true}
            style={'primary'}
            extraClass={'right mt-8 mr-5'}
            disabled={disableRebuild}
            onClick={rebuildIndex}
          />
        }
      />
    </div>
  )
}

ElasticsearchSettingsContainer.propTypes = {
  active: PropTypes.bool.isRequired,
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default connect(mapStateToProps, { updateSetting, updateMultipleSettings })(ElasticsearchSettingsContainer)
