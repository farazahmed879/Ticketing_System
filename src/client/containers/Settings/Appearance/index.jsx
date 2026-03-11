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
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { updateSetting, updateMultipleSettings, updateColorScheme } from 'actions/settings'
import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import UploadButtonWithX from 'components/Settings/UploadButtonWithX'
import SettingSubItem from 'components/Settings/SettingSubItem'
import SingleSelect from 'components/SingleSelect'
import ColorSelector from 'components/ColorSelector'
import Zone from 'components/ZoneBox/zone'
import ZoneBox from 'components/ZoneBox'

const colorMap = {
  light: {
    headerBG: '#42464d',
    headerPrimary: '#f6f7f8',
    primary: '#606771',
    secondary: '#f7f8fa',
    tertiary: '#e74c3c',
    quaternary: '#e6e7e8'
  },
  dark: {
    headerBG: '#242a31',
    headerPrimary: '#f6f7f8',
    primary: '#f6f7f8',
    secondary: '#2f3640',
    tertiary: '#e74c3c',
    quaternary: '#454f5d'
  },
  bluejean: {
    headerBG: '#112d4e',
    headerPrimary: '#f9f7f7',
    primary: '#112d4e',
    secondary: '#f9f7f7',
    tertiary: '#3f72af',
    quaternary: '#dbe2ef'
  },
  midnight: {
    headerBG: '#2c2e3e',
    headerPrimary: '#f6f6f6',
    primary: '#444a54',
    secondary: '#c8c8c8',
    tertiary: '#ee2b47',
    quaternary: '#2c2e3e'
  },
  moonlight: {
    headerBG: '#2e3238',
    headerPrimary: '#eeeeee',
    primary: '#444a54',
    secondary: '#c8c8c8',
    tertiary: '#7971ea',
    quaternary: '#444a54'
  },
  purplerain: {
    headerBG: '#393041',
    headerPrimary: '#f6f6f6',
    primary: '#393041',
    secondary: '#d2cbd8',
    tertiary: '#f67280',
    quaternary: '#52455f'
  },
  sandstone: {
    headerBG: '#625757',
    headerPrimary: '#f9f9f9',
    primary: '#625757',
    secondary: '#dfdfdf',
    tertiary: '#ef5a5a',
    quaternary: '#6f6363'
  },
  winterfire: {
    headerBG: '#404969',
    headerPrimary: '#ebf0f6',
    primary: '#404969',
    secondary: '#ebf0f6',
    tertiary: '#ff7f50',
    quaternary: '#4a5479'
  }
}

const AppearanceSettings = props => {
  const { active, settings, updateSetting, updateColorScheme } = props
  const [selectedColorScheme, setSelectedColorScheme] = React.useState('light')

  const headerBGColorSelect = React.useRef(null)
  const headerPrimaryColorSelect = React.useRef(null)
  const primaryColorSelect = React.useRef(null)
  const secondaryColorSelect = React.useRef(null)
  const tertiaryColorSelect = React.useRef(null)
  const quaternaryColorSelect = React.useRef(null)

  const getSettingsValue = name => {
    return settings.getIn(['settings', name, 'value']) ? settings.getIn(['settings', name, 'value']) : ''
  }

  const calcColorScheme = React.useCallback(() => {
    let colorScheme = 'light'
    if (getSettingsValue('colorSecondary') === '#2f3640') colorScheme = 'dark'
    else if (getSettingsValue('colorHeaderBG') === '#112d4e') colorScheme = 'bluejean'
    else if (getSettingsValue('colorTertiary') === '#ee2b47') colorScheme = 'midnight'
    else if (getSettingsValue('colorHeaderBG') === '#2e3238') colorScheme = 'moonlight'
    else if (getSettingsValue('colorTertiary') === '#f67280') colorScheme = 'purplerain'
    else if (getSettingsValue('colorHeaderBG') === '#625757') colorScheme = 'sandstone'
    else if (getSettingsValue('colorHeaderBG') === '#404969') colorScheme = 'winterfire'

    return colorScheme
  }, [settings])

  React.useEffect(() => {
    const colorScheme = calcColorScheme()
    if (selectedColorScheme !== colorScheme) setSelectedColorScheme(colorScheme)
  }, [settings, calcColorScheme])

  const onBuiltInColorSelectChange = e => {
    if (!e.target || !e.target.value) return
    const scheme = colorMap[e.target.value]
    if (headerBGColorSelect.current)
      headerBGColorSelect.current.setState({ selectedColor: scheme.headerBG }, headerBGColorSelect.current.updateColorButton)
    if (headerPrimaryColorSelect.current)
      headerPrimaryColorSelect.current.setState(
        { selectedColor: scheme.headerPrimary },
        headerPrimaryColorSelect.current.updateColorButton
      )
    if (primaryColorSelect.current)
      primaryColorSelect.current.setState({ selectedColor: scheme.primary }, primaryColorSelect.current.updateColorButton)
    if (secondaryColorSelect.current)
      secondaryColorSelect.current.setState(
        { selectedColor: scheme.secondary },
        secondaryColorSelect.current.updateColorButton
      )
    if (tertiaryColorSelect.current)
      tertiaryColorSelect.current.setState({ selectedColor: scheme.tertiary }, tertiaryColorSelect.current.updateColorButton)
    if (quaternaryColorSelect.current)
      quaternaryColorSelect.current.setState(
        { selectedColor: scheme.quaternary },
        quaternaryColorSelect.current.updateColorButton
      )
  }

  const saveColorScheme = () => {
    const colors = [
      { name: 'color:headerbg', value: headerBGColorSelect.current.state.selectedColor },
      { name: 'color:headerprimary', value: headerPrimaryColorSelect.current.state.selectedColor },
      { name: 'color:primary', value: primaryColorSelect.current.state.selectedColor },
      { name: 'color:secondary', value: secondaryColorSelect.current.state.selectedColor },
      { name: 'color:tertiary', value: tertiaryColorSelect.current.state.selectedColor },
      { name: 'color:quaternary', value: quaternaryColorSelect.current.state.selectedColor }
    ]

    updateColorScheme(colors)
  }

  const onUpdateSetting = (name, value, stateName) => {
    updateSetting({ name, value, stateName })
  }

  return (
    <div className={active ? 'active' : 'hide'}>
      <SettingItem
        title='Site Logo'
        subtitle={
          <div>
            Upload site logo to display in top navigation. <i>Note: Resize to max width of 140px</i>
          </div>
        }
        component={
          <UploadButtonWithX
            buttonText={'Upload Logo'}
            uploadAction={'/settings/general/uploadlogo'}
            extAllowed={'*.(jpg|jpeg|gif|png)'}
            showX={getSettingsValue('hasCustomLogo')}
            onXClick={() => {
              onUpdateSetting('gen:customlogo', false, 'hasCustomLogo')
              setTimeout(() => {
                window.location.reload()
              }, 1000)
            }}
          />
        }
      />

      <SettingItem
        title='Page Logo'
        subtitle={
          <div>
            Upload logo to display within page views. <i>Note: Used on login page (min-width: 400px)</i>
          </div>
        }
        component={
          <UploadButtonWithX
            buttonText={'Upload Logo'}
            uploadAction={'/settings/general/uploadpagelogo'}
            extAllowed={'*.(jpg|jpeg|gif|png)'}
            showX={getSettingsValue('hasCustomPageLogo')}
            onXClick={() => {
              onUpdateSetting('gen:custompagelogo', false, 'hasCustomPageLogo')
            }}
          />
        }
      />

      <SettingItem
        title='Favicon'
        subtitle={'Upload a custom favicon'}
        component={
          <UploadButtonWithX
            buttonText={'Upload Favicon'}
            uploadAction={'/settings/general/uploadfavicon'}
            extAllowed={'*.(jpg|jpeg|gif|png|ico)'}
            showX={getSettingsValue('hasCustomFavicon')}
            onXClick={() => {
              onUpdateSetting('gen:customfavicon', false, 'hasCustomFavicon')
              setTimeout(() => {
                window.location.reload()
              }, 1000)
            }}
          />
        }
      />
      <SettingItem
        title='Color Scheme'
        subtitle='Select the colors for your color scheme.'
        component={
          <Button
            text={'Save'}
            flat={true}
            style={'success'}
            extraClass={'uk-float-right mt-10'}
            onClick={() => {
              saveColorScheme()
            }}
          />
        }
      >
        <Zone>
          <ZoneBox>
            <SettingSubItem
              title='Built-in Color Scheme'
              subtitle='Select a predefined color scheme'
              component={
                <SingleSelect
                  width='60%'
                  showTextbox={false}
                  items={[
                    { text: 'Light (Default)', value: 'light' },
                    { text: 'Dark', value: 'dark' },
                    { text: 'Blue Jean', value: 'bluejean' },
                    { text: 'Midnight', value: 'midnight' },
                    { text: 'Moonlight', value: 'moonlight' },
                    { text: 'Purple Rain', value: 'purplerain' },
                    { text: 'Sandstone', value: 'sandstone' },
                    { text: "Winter's Fire", value: 'winterfire' }
                  ]}
                  defaultValue={selectedColorScheme}
                  onSelectChange={e => {
                    onBuiltInColorSelectChange(e)
                  }}
                />
              }
            />
          </ZoneBox>
          <ZoneBox>
            <SettingSubItem
              title='Header Background'
              subtitle='Background color of the header'
              component={
                <ColorSelector
                  ref={headerBGColorSelect}
                  defaultColor={getSettingsValue('colorHeaderBG')}
                  parentClass={'uk-width-2-3 uk-float-right'}
                />
              }
            />
          </ZoneBox>
          <ZoneBox>
            <SettingSubItem
              title='Header Primary'
              subtitle='Text and icon color within the header'
              component={
                <ColorSelector
                  ref={headerPrimaryColorSelect}
                  defaultColor={getSettingsValue('colorHeaderPrimary')}
                  parentClass={'uk-width-2-3 uk-float-right'}
                />
              }
            />
          </ZoneBox>
          <ZoneBox>
            <SettingSubItem
              title='Primary'
              subtitle='Most text and icons'
              component={
                <ColorSelector
                  ref={primaryColorSelect}
                  defaultColor={getSettingsValue('colorPrimary')}
                  parentClass={'uk-width-2-3 uk-float-right'}
                />
              }
            />
          </ZoneBox>
          <ZoneBox>
            <SettingSubItem
              title='Secondary'
              subtitle='The main background color'
              component={
                <ColorSelector
                  ref={secondaryColorSelect}
                  defaultColor={getSettingsValue('colorSecondary')}
                  parentClass={'uk-width-2-3 uk-float-right'}
                />
              }
            />
          </ZoneBox>
          <ZoneBox>
            <SettingSubItem
              title='Tertiary'
              subtitle='Accent color, used for links, some buttons, and notifications'
              component={
                <ColorSelector
                  ref={tertiaryColorSelect}
                  defaultColor={getSettingsValue('colorTertiary')}
                  parentClass={'uk-width-2-3 uk-float-right'}
                />
              }
            />
          </ZoneBox>
          <ZoneBox>
            <SettingSubItem
              title='Quaternary'
              subtitle='Sidebar background color'
              component={
                <ColorSelector
                  ref={quaternaryColorSelect}
                  defaultColor={getSettingsValue('colorQuaternary')}
                  parentClass={'uk-width-2-3 uk-float-right'}
                />
              }
            />
          </ZoneBox>
        </Zone>
      </SettingItem>
    </div>
  )
}

AppearanceSettings.propTypes = {
  active: PropTypes.bool,
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  updateColorScheme: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default connect(mapStateToProps, { updateSetting, updateMultipleSettings, updateColorScheme })(
  AppearanceSettings
)
