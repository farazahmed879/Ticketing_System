import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { setSessionUser, showModal } from 'actions/common'
import { saveEditAccount } from 'actions/accounts'

import Avatar from 'components/Avatar/Avatar'
import EnableSwitch from 'components/Settings/EnableSwitch'
import PDropdown from 'components/PDropdown'
import Spacer from 'components/Spacer'

import helpers from 'lib/helpers'

const ProfileDropdownPartial = props => {
  const { sessionUser, setSessionUser, showModal, saveEditAccount, forwardedRef } = props
  const [keyboardShortcutsChecked, setKeyboardShortcutsChecked] = React.useState(true)

  React.useEffect(() => {
    helpers.ajaxify('#profile-drop')

    if (sessionUser) setKeyboardShortcutsChecked(sessionUser.preferences.keyboardShortcuts)
  }, [])

  React.useEffect(() => {
    if (sessionUser) setKeyboardShortcutsChecked(sessionUser.preferences.keyboardShortcuts)
  }, [sessionUser])

  // eslint-disable-next-line no-unused-vars
  const onKeyboardShortcutsChanged = e => {
    const checked = e.target.checked
    saveEditAccount({
      hideSnackbar: true,
      username: sessionUser.username,
      preferences: {
        keyboardShortcuts: checked
      }
    }).then(() => {
      setSessionUser()
    })
  }

  return (
    <PDropdown
      ref={forwardedRef}
      id={'profile-drop'}
      className={'profile-drop'}
      showTitlebar={false}
      minHeight={185} // 255 with keyboard shortcuts
      minWidth={350}
      topOffset={-5}
      leftOffset={-70}
      showArrow={false}
      isListItems={false}
    >
      <div className={'pdrop-content'}>
        <div className={'user-section padding-15 uk-clearfix'}>
          <div className={'user-info'}>
            <Avatar
              image={sessionUser.image || 'defaultProfile.jpg'}
              showOnlineBubble={false}
              style={{ marginLeft: 5, marginRight: 15 }}
              size={60}
            />
            <div className={'user-info-items'}>
              <span className={'uk-text-bold'} style={{ fontSize: '16px', lineHeight: '22px' }}>
                {sessionUser.fullname}
              </span>
              <span>{sessionUser.email}</span>
              <a href='/profile'>Profile Settings</a>
            </div>
          </div>
        </div>
        <Spacer showBorder={true} borderSize={1} top={0} bottom={0} />
        <div className={'profile-drop-actions'}>
          <div className={'action-logout'}>
            <i className='material-icons'>logout</i>
            <a href='/logout'>Logout</a>
          </div>
        </div>
      </div>
      <div className={'pdrop-footer'}>
        <div className='links'>
          <a href='https://forum.trudesk.io' target={'_blank'} rel={'noreferrer'}>
            Community
          </a>
          <span>&middot;</span>
          <a
            href='#'
            className={'no-ajaxy'}
            onClick={e => {
              e.preventDefault()
              helpers.hideAllpDropDowns()
              showModal('PRIVACY_POLICY')
            }}
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </PDropdown>
  )
}

ProfileDropdownPartial.propTypes = {
  sessionUser: PropTypes.object.isRequired,
  setSessionUser: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  saveEditAccount: PropTypes.func.isRequired,
  forwardedRef: PropTypes.any
}

const mapStateToProps = state => ({
  sessionUser: state.shared.sessionUser
})

export default connect(mapStateToProps, { setSessionUser, showModal, saveEditAccount }, null, { forwardRef: true })(
  ProfileDropdownPartial
)
