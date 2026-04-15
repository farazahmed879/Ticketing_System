/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/24/19 5:32 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { makeObservable, observable } from 'mobx'

import Avatar from 'components/Avatar/Avatar'
import ReactHtmlParser from 'react-html-parser'

import { TICKETS_ISSUE_SET, TICKETS_UI_ATTACHMENTS_UPDATE } from 'serverSocket/socketEventConsts'

import helpers from 'lib/helpers'
import axios from 'axios'
import Log from '../../logger'

const setupImages = parent => {
  const imagesEl = parent.issueBody.querySelectorAll('img:not(.hasLinked)')
  imagesEl.forEach(i => helpers.setupImageLink(i))
}

const setupLinks = parent => {
  const linksEl = parent.issueBody.querySelectorAll('a')
  linksEl.forEach(i => helpers.setupLinkWarning(i))
}

const IssuePartial = props => {
  const {
    ticketId,
    status: propStatus,
    owner: propOwner,
    subject: propSubject,
    issue: propIssue,
    date,
    dateFormat,
    attachments: propAttachments,
    editorWindow,
    socket
  } = props

  const [status, setStatus] = React.useState(propStatus)
  const [owner, setOwner] = React.useState(propOwner)
  const [subject, setSubject] = React.useState(propSubject)
  const [issue, setIssue] = React.useState(propIssue)
  const [attachments, setAttachments] = React.useState(propAttachments || [])

  const issueBodyRef = React.useRef(null)
  const attachmentInputRef = React.useRef(null)

  const onUpdateTicketAttachments = React.useCallback(
    data => {
      if (ticketId === data.ticket._id) {
        setAttachments(data.ticket.attachments)
      }
    },
    [ticketId]
  )

  React.useEffect(() => {
    if (issueBodyRef.current) {
      const imagesEl = issueBodyRef.current.querySelectorAll('img:not(.hasLinked)')
      imagesEl.forEach(i => helpers.setupImageLink(i))
      const linksEl = issueBodyRef.current.querySelectorAll('a')
      linksEl.forEach(i => helpers.setupLinkWarning(i))
    }
  }, [issue])

  React.useEffect(() => {
    socket.on(TICKETS_UI_ATTACHMENTS_UPDATE, onUpdateTicketAttachments)
    return () => {
      socket.off(TICKETS_UI_ATTACHMENTS_UPDATE, onUpdateTicketAttachments)
    }
  }, [socket, onUpdateTicketAttachments])

  React.useEffect(() => {
    setStatus(propStatus)
    setOwner(propOwner)
    setSubject(propSubject)
    setIssue(propIssue)
    setAttachments(propAttachments || [])
  }, [propStatus, propOwner, propSubject, propIssue, propAttachments])

  const onAttachmentInputChange = e => {
    const formData = new FormData()
    const attachmentFile = e.target.files[0]
    formData.append('ticketId', ticketId)
    formData.append('attachment', attachmentFile)
    const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    axios
      .post(`/tickets/uploadattachment`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'CSRF-TOKEN': token
        }
      })
      .then(() => {
        socket.emit(TICKETS_UI_ATTACHMENTS_UPDATE, { _id: ticketId })
        helpers.UI.showSnackbar('Attachment Successfully Uploaded')
      })
      .catch(error => {
        Log.error(error)
        if (error.response) Log.error(error.response)
        helpers.UI.showSnackbar(error, true)
      })
  }

  const removeAttachment = (e, attachmentId) => {
    axios
      .delete(`/api/v1/tickets/${ticketId}/attachments/remove/${attachmentId}`)
      .then(() => {
        socket.emit(TICKETS_UI_ATTACHMENTS_UPDATE, { _id: ticketId })
        helpers.UI.showSnackbar('Attachment Removed')
      })
      .catch(error => {
        Log.error(error)
        if (error.response) Log.error(error.response)
        helpers.UI.showSnackbar(error, true)
      })
  }

  return (
    <div className='initial-issue uk-clearfix'>
      <Avatar image={owner.image} userId={owner._id} />
      {/* Issue */}
      <div className='issue-text'>
        <h3 className='subject-text'>{subject}</h3>
        <a href={`mailto:${owner.email}`}>
          {owner.fullname} &lt;{owner.email}&gt;
        </a>
        <br />
        <time dateTime={helpers.formatDate(date, 'YYYY-MM-DD HH:mm')}>
          {helpers.formatDate(date, dateFormat)}
        </time>
        <br />
        {/* Attachments */}
        <ul className='attachments'>
          {attachments &&
            attachments.map(attachment => (
              <li key={attachment._id}>
                <a href={attachment.path} className='no-ajaxy' rel='noopener noreferrer' target='_blank'>
                  {attachment.name}
                </a>
                {status.get('isResolved') === false && (
                  <a role='button' className={'remove-attachment'} onClick={e => removeAttachment(e, attachment._id)}>
                    <i className='fa fa-remove' />
                  </a>
                )}
              </li>
            ))}
        </ul>
        <div className='issue-body' ref={issueBodyRef}>
          {ReactHtmlParser(issue)}
        </div>
      </div>
      {/* Permissions on Fragment for edit */}
      {status.get('isResolved') === false && helpers.hasPermOverRole(props.owner.role, null, 'tickets:update', true) && (
        <Fragment>
          <div
            className={'edit-issue'}
            onClick={() => {
              if (editorWindow)
                editorWindow.openEditorWindow({
                  subject: subject,
                  text: issue,
                  onPrimaryClick: data => {
                    socket.emit(TICKETS_ISSUE_SET, {
                      _id: ticketId,
                      value: data.text,
                      subject: data.subjectText
                    })
                  }
                })
            }}
          >
            <i className='material-icons'>&#xE254;</i>
          </div>
          <form className='form nomargin' encType='multipart/form-data'>
            <div className='add-attachment' onClick={() => attachmentInputRef.current.click()}>
              <i className='material-icons'>&#xE226;</i>
            </div>

            <input
              ref={attachmentInputRef}
              className='hide'
              type='file'
              onChange={e => onAttachmentInputChange(e)}
            />
          </form>
        </Fragment>
      )}
    </div>
  )
}

IssuePartial.propTypes = {
  ticketId: PropTypes.string.isRequired,
  status: PropTypes.object.isRequired,
  owner: PropTypes.object.isRequired,
  subject: PropTypes.string.isRequired,
  issue: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  dateFormat: PropTypes.string.isRequired,
  attachments: PropTypes.array,
  editorWindow: PropTypes.object,
  socket: PropTypes.object.isRequired
}

export default IssuePartial
