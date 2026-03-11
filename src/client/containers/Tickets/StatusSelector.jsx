/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/24/19 6:33 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'
import { connect } from 'react-redux'

import { TICKETS_STATUS_SET, TICKETS_UI_STATUS_UPDATE } from 'serverSocket/socketEventConsts'
import { fetchTicketStatus } from 'actions/tickets'



const StatusSelector = props => {
  const { ticketId, status: propStatus, onStatusChange, hasPerm, socket, fetchTicketStatus, ticketStatuses } = props
  const [status, setStatus] = React.useState(propStatus)

  const selectorButton = React.useRef(null)
  const dropMenu = React.useRef(null)

  const forceClose = React.useCallback(() => {
    if (dropMenu.current) {
      dropMenu.current.classList.remove('shown')
      dropMenu.current.classList.add('hide')
    }
  }, [])

  const onDocumentClick = React.useCallback(
    e => {
      if (
        selectorButton.current &&
        !selectorButton.current.contains(e.target) &&
        dropMenu.current &&
        dropMenu.current.classList.contains('shown')
      ) {
        forceClose()
      }
    },
    [forceClose]
  )

  const onUpdateTicketStatus = React.useCallback(
    data => {
      if (ticketId === data.tid) {
        setStatus(data.status)
        if (onStatusChange) onStatusChange(data.status)
      }
    },
    [ticketId, onStatusChange]
  )

  React.useEffect(() => {
    document.addEventListener('click', onDocumentClick)
    socket.on(TICKETS_UI_STATUS_UPDATE, onUpdateTicketStatus)
    fetchTicketStatus()

    return () => {
      document.removeEventListener('click', onDocumentClick)
      socket.off(TICKETS_UI_STATUS_UPDATE, onUpdateTicketStatus)
    }
  }, [socket, fetchTicketStatus, onDocumentClick, onUpdateTicketStatus])

  React.useEffect(() => {
    setStatus(propStatus)
  }, [propStatus])

  const toggleDropMenu = e => {
    e.stopPropagation()
    if (!hasPerm) return
    const hasHide = dropMenu.current.classList.contains('hide')
    const hasShown = dropMenu.current.classList.contains('shown')
    hasHide ? dropMenu.current.classList.remove('hide') : dropMenu.current.classList.add('hide')
    hasShown ? dropMenu.current.classList.remove('shown') : dropMenu.current.classList.add('shown')
  }

  const changeStatus = statusId => {
    if (!hasPerm) return

    socket.emit(TICKETS_STATUS_SET, { _id: ticketId, value: statusId })
    forceClose()
  }

  const currentStatus = ticketStatuses ? ticketStatuses.find(s => s.get('_id') === status) : null

  return (
    <div className='floating-ticket-status'>
      <div
        title='Change Status'
        className={clsx(`ticket-status`, hasPerm && `cursor-pointer`)}
        style={{ color: 'white', background: currentStatus != null ? currentStatus.get('htmlColor') : '#000000' }}
        onClick={e => toggleDropMenu(e)}
        ref={selectorButton}
      >
        <span>{currentStatus != null ? currentStatus.get('name') : 'Unknown'}</span>
      </div>

      {hasPerm && (
        <span className='drop-icon material-icons' style={{ left: 'auto', right: 22, bottom: -18 }}>
          keyboard_arrow_down
        </span>
      )}

      <div
        id={'statusSelect'}
        ref={dropMenu}
        className='hide'
        style={{ height: 25 * ticketStatuses.size + 25 }}
      >
        <ul>
          {ticketStatuses.map(
            s =>
              s && (
                <li
                  key={s.get('_id')}
                  className='ticket-status'
                  onClick={() => changeStatus(s.get('_id'))}
                  style={{ color: 'white', background: s.get('htmlColor') }}
                >
                  <span>{s.get('name')}</span>
                </li>
              )
          )}
        </ul>
      </div>
    </div>
  )
}

StatusSelector.propTypes = {
  ticketId: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func,
  hasPerm: PropTypes.bool.isRequired,
  socket: PropTypes.object.isRequired,
  fetchTicketStatus: PropTypes.func.isRequired,
  ticketStatuses: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  ticketStatuses: state.ticketsState.ticketStatuses
})

StatusSelector.defaultProps = {
  hasPerm: false
}

export default connect(mapStateToProps, {
  fetchTicketStatus
})(StatusSelector)
