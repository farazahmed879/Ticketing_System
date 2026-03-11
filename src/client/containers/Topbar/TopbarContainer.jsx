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
 *  Updated:    2/10/19 12:41 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { size } from 'lodash'

import { fetchViewData, showModal, hideModal, showNotice, clearNotice } from 'actions/common'

import Avatar from 'components/Avatar/Avatar'
import PDropdownTrigger from 'components/PDropdown/PDropdownTrigger'
import OffCanvasTrigger from 'components/OffCanvas/OffCanvasTrigger'
import NoticeBanner from 'components/NoticeBanner'
import NotificationsDropdownPartial from './notificationsDropdown'

import ProfileDropdownPartial from 'containers/Topbar/profileDropdown'
import ConversationsDropdownPartial from 'containers/Topbar/conversationsDropdown'
import OnlineUserListPartial from 'containers/Topbar/onlineUserList'

import helpers from 'lib/helpers'
import Cookies from 'jscookie'
import { NOTIFICATIONS_UPDATE, USERS_UPDATE, NOTICE_UI_SHOW, NOTICE_UI_CLEAR } from 'serverSocket/socketEventConsts'

const TopbarContainer = props => {
  const {
    loadingViewData,
    viewdata,
    sessionUser,
    socket,
    fetchViewData,
    showModal,
    hideModal,
    showNotice,
    clearNotice,
    notice
  } = props

  const conversationsDropdownPartialRef = React.useRef()
  const notificationsDropdownPartialRef = React.useRef()
  const profileDropdownPartialRef = React.useRef()

  const [notificationCount, setNotificationCount] = React.useState(0)
  // eslint-disable-next-line no-unused-vars
  const [activeUserCount, setActiveUserCount] = React.useState(0)
  // eslint-disable-next-line no-unused-vars
  const [showInfoBanner, setShowInfoBanner] = React.useState(true)

  const onSocketUpdateNotifications = React.useCallback(data => {
    setNotificationCount(data.count)
  }, [])

  const onSocketUpdateUsers = React.useCallback(
    data => {
      if (sessionUser) delete data[sessionUser.username]
      const count = size(data)
      setActiveUserCount(count)
    },
    [sessionUser]
  )

  const showNoticeInternal = React.useCallback(
    (noticeData, cookieName) => {
      showNotice(noticeData)

      if (cookieName) {
        const showNoticeWindow = Cookies.get(cookieName) !== 'false'
        if (showNoticeWindow)
          showModal('NOTICE_ALERT', {
            modalTag: 'NOTICE_ALERT',
            notice: noticeData,
            noticeCookieName: cookieName,
            shortDateFormat: viewdata.get('shortDateFormat'),
            timeFormat: viewdata.get('timeFormat')
          })
      }
    },
    [showNotice, showModal, viewdata]
  )

  const onSocketShowNotice = React.useCallback(
    data => {
      showNotice(data)
      const cookieName = data.name + '_' + helpers.formatDate(data.activeDate, 'MMMDDYYYY_HHmmss')
      showNoticeInternal(data, cookieName)

      helpers.resizeAll()
    },
    [showNotice, showNoticeInternal]
  )

  const onSocketClearNotice = React.useCallback(() => {
    clearNotice()
    hideModal('NOTICE_ALERT')

    helpers.resizeAll()
  }, [clearNotice, hideModal])

  React.useEffect(() => {
    if (!socket || !sessionUser) return

    fetchViewData().then(() => {
      if (viewdata.get('notice')) showNoticeInternal(viewdata.get('notice').toJS(), viewdata.get('noticeCookieName'))
    })

    socket.on(NOTIFICATIONS_UPDATE, onSocketUpdateNotifications)
    socket.on(USERS_UPDATE, onSocketUpdateUsers)
    socket.on(NOTICE_UI_SHOW, onSocketShowNotice)
    socket.on(NOTICE_UI_CLEAR, onSocketClearNotice)

    socket.emit(NOTIFICATIONS_UPDATE)
    socket.emit(USERS_UPDATE)

    return () => {
      socket.off(NOTIFICATIONS_UPDATE, onSocketUpdateNotifications)
      socket.off(USERS_UPDATE, onSocketUpdateUsers)
      socket.off(NOTICE_UI_SHOW, onSocketShowNotice)
      socket.off(NOTICE_UI_CLEAR, onSocketClearNotice)
    }
  }, [sessionUser])

  const onConversationsClicked = e => {
    e.preventDefault()
  }

  if (loadingViewData || !sessionUser) return <div />

  return (
    <div>
      {notice && <NoticeBanner notice={notice} />}
      <div className={'uk-grid top-nav'}>
        <div className='uk-width-1-1'>
          <div className='top-bar' data-topbar>
            <div className='title-area uk-float-left'>
              <div className='logo'>
                <img src={viewdata.get('logoImage')} alt='Logo' className={'site-logo'} />
              </div>
            </div>
            <section className='top-bar-section uk-clearfix'>
              <div className='top-menu uk-float-right'>
                <ul className='uk-subnav uk-margin-bottom-remove'>
                  {sessionUser && helpers.canUser('tickets:create') && (
                    <li className='top-bar-icon nopadding'>
                      <button title={'Create Ticket'} className={'anchor'} onClick={() => showModal('CREATE_TICKET')}>
                        <i className='material-icons'>&#xE145;</i>
                      </button>
                    </li>
                  )}
                  {sessionUser && helpers.canUser('tickets:create') && (
                    <li className='top-bar-icon nopadding nohover'>
                      <i className='material-icons separator'>remove</i>
                    </li>
                  )}
                  <li className='top-bar-icon'>
                    <PDropdownTrigger target={conversationsDropdownPartialRef}>
                      <a title={'Conversations'} className='no-ajaxy uk-vertical-align' onClick={onConversationsClicked}>
                        <i className='material-icons'>question_answer</i>
                      </a>
                    </PDropdownTrigger>
                  </li>
                  <li className='top-bar-icon'>
                    <PDropdownTrigger target={notificationsDropdownPartialRef}>
                      <a title={'Notifications'} className={'no-ajaxy uk-vertical-align'}>
                        <i className='material-icons'>notifications</i>
                        <span className={'alert uk-border-circle label ' + (notificationCount < 1 ? 'hide' : '')}>
                          {notificationCount}
                        </span>
                      </a>
                    </PDropdownTrigger>
                  </li>
                  <li className='top-bar-icon nopadding nohover'>
                    <i className='material-icons separator'>remove</i>
                  </li>

                  <li className='profile-area profile-name'>
                    <span style={{ fontSize: 16 }}>{sessionUser.fullname}</span>
                    <div className='uk-position-relative uk-display-inline-block'>
                      <PDropdownTrigger target={profileDropdownPartialRef}>
                        <a
                          href='#'
                          title={sessionUser.fullname}
                          className={'profile-pic no-ajaxy uk-vertical-align-middle'}
                        >
                          <Avatar
                            image={sessionUser.image}
                            showOnlineBubble={true}
                            userId={sessionUser._id}
                            size={35}
                            overrideBubbleSize={15}
                          />
                        </a>
                      </PDropdownTrigger>
                    </div>
                  </li>
                </ul>
                <NotificationsDropdownPartial
                  forwardedRef={notificationsDropdownPartialRef}
                  shortDateFormat={viewdata.get('shortDateFormat')}
                  timezone={viewdata.get('timezone')}
                  onViewAllNotificationsClick={() => showModal('VIEW_ALL_NOTIFICATIONS')}
                />
                <ConversationsDropdownPartial
                  forwardedRef={conversationsDropdownPartialRef}
                  shortDateFormat={viewdata.get('shortDateFormat')}
                  timezone={viewdata.get('timezone')}
                  socket={socket}
                />
                <ProfileDropdownPartial forwardedRef={profileDropdownPartialRef} />
              </div>
            </section>
          </div>
        </div>

        <OnlineUserListPartial
          timezone={viewdata.get('timezone')}
          users={viewdata.get('users').toArray()}
          sessionUser={sessionUser}
          socket={socket}
        />
      </div>
    </div>
  )
}

TopbarContainer.propTypes = {
  socket: PropTypes.object.isRequired,
  sessionUser: PropTypes.object,
  fetchViewData: PropTypes.func.isRequired,
  loadingViewData: PropTypes.bool.isRequired,
  viewdata: PropTypes.object.isRequired,
  showModal: PropTypes.func.isRequired,
  hideModal: PropTypes.func.isRequired,
  showNotice: PropTypes.func.isRequired,
  clearNotice: PropTypes.func.isRequired,
  notice: PropTypes.object
}

const mapStateToProps = state => ({
  socket: state.shared.socket,
  sessionUser: state.shared.sessionUser,
  notice: state.shared.notice,
  loadingViewData: state.common.loadingViewData,
  viewdata: state.common.viewdata
})

export default connect(mapStateToProps, { fetchViewData, showModal, hideModal, showNotice, clearNotice })(
  TopbarContainer
)
