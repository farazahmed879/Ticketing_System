/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/21/19 9:32 AM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { Fragment, createRef, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import sortBy from 'lodash/sortBy'
import union from 'lodash/union'

import { transferToThirdParty, fetchTicketTypes, fetchTicketStatus } from 'actions/tickets'
import { fetchGroups, unloadGroups } from 'actions/groups'
import { showModal } from 'actions/common'

import {
  TICKETS_UPDATE,
  TICKETS_UI_GROUP_UPDATE,
  TICKETS_GROUP_SET,
  TICKETS_UI_TYPE_UPDATE,
  TICKETS_TYPE_SET,
  TICKETS_UI_PRIORITY_UPDATE,
  TICKETS_PRIORITY_SET,
  TICKETS_ASSIGNEE_LOAD,
  TICKETS_ASSIGNEE_UPDATE,
  TICKETS_UI_DUEDATE_UPDATE,
  TICKETS_DUEDATE_SET,
  TICKETS_UI_TAGS_UPDATE,
  TICKETS_COMMENT_NOTE_REMOVE,
  TICKETS_COMMENT_NOTE_SET
} from 'serverSocket/socketEventConsts'

import AssigneeDropdownPartial from 'containers/Tickets/AssigneeDropdownPartial'
import Avatar from 'components/Avatar/Avatar'
import CommentNotePartial from 'containers/Tickets/CommentNotePartial'
import DatePicker from 'components/DatePicker'
import EasyMDE from 'components/EasyMDE'
import IssuePartial from 'containers/Tickets/IssuePartial'
import OffCanvasEditor from 'components/OffCanvasEditor'
import PDropdownTrigger from 'components/PDropdown/PDropdownTrigger'
import StatusSelector from 'containers/Tickets/StatusSelector'
import TruTabSection from 'components/TruTabs/TruTabSection'
import TruTabSelector from 'components/TruTabs/TruTabSelector'
import TruTabSelectors from 'components/TruTabs/TruTabSelectors'
import TruTabWrapper from 'components/TruTabs/TruTabWrapper'

import axios from 'axios'
import helpers from 'lib/helpers'
import Log from '../../logger'
import UIkit from 'uikit'
import moment from 'moment'
import SpinLoader from 'components/SpinLoader'

const fetchTicket = parent => {
  axios
    .get(`/api/v2/tickets/${parent.props.ticketUid}`)
    .then(res => {
      // setTimeout(() => {
      parent.ticket = res.data.ticket
      parent.isSubscribed =
        parent.ticket && parent.ticket.subscribers.findIndex(i => i._id === parent.props.shared.sessionUser._id) !== -1
      // }, 3000)
    })
    .catch(error => {
      if (error.response.status === 403) {
        History.pushState(null, null, '/tickets')
      }
      Log.error(error)
    })
}

const showPriorityConfirm = () => {
  UIkit.modal.confirm(
    'Selected Priority does not exist for this ticket type. Priority has reset to the default for this type.' +
      '<br><br><strong>Please select a new priority</strong>',
    () => {},
    { cancelButtonClass: 'uk-hidden' }
  )
}

const SingleTicketContainer = props => {
  const {
    ticketUid,
    shared,
    sessionUser,
    socket,
    common,
    ticketTypes,
    fetchTicketTypes,
    groupsState,
    fetchGroups,
    unloadGroups,
    showModal,
    transferToThirdParty,
    ticketStatuses,
    fetchTicketStatus
  } = props

  const [ticket, setTicket] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const assigneeDropdownPartial = useRef(null)
  const commentMDE = useRef(null)
  const noteMDE = useRef(null)
  const editorWindow = useRef(null)

  const onUpdateTicket = useCallback(
    data => {
      if (ticket && ticket._id === data._id) {
        setTicket(data)
      }
    },
    [ticket]
  )

  const onUpdateAssignee = useCallback(
    data => {
      if (ticket && ticket._id === data._id) {
        setTicket(prev => ({ ...prev, assignee: data.assignee }))
        if (data.assignee && data.assignee._id === shared.sessionUser._id) {
          setIsSubscribed(true)
        }
      }
    },
    [ticket, shared.sessionUser._id]
  )

  const onUpdateTicketType = useCallback(
    data => {
      if (ticket && ticket._id === data._id) setTicket(prev => ({ ...prev, type: data.type }))
    },
    [ticket]
  )

  const onUpdateTicketPriority = useCallback(
    data => {
      if (ticket && ticket._id === data._id) setTicket(prev => ({ ...prev, priority: data.priority }))
    },
    [ticket]
  )

  const onUpdateTicketGroup = useCallback(
    data => {
      if (ticket && ticket._id === data._id) setTicket(prev => ({ ...prev, group: data.group }))
    },
    [ticket]
  )

  const onUpdateTicketDueDate = useCallback(
    data => {
      if (ticket && ticket._id === data._id) setTicket(prev => ({ ...prev, dueDate: data.dueDate }))
    },
    [ticket]
  )

  const onUpdateTicketTags = useCallback(
    data => {
      if (ticket && ticket._id === data._id) setTicket(prev => ({ ...prev, tags: data.tags }))
    },
    [ticket]
  )

  const onSocketUpdateComments = useCallback(
    data => {
      if (ticket && ticket._id === data._id) setTicket(prev => ({ ...prev, comments: data.comments }))
    },
    [ticket]
  )

  const onUpdateTicketNotes = useCallback(
    data => {
      if (ticket && ticket._id === data._id) setTicket(prev => ({ ...prev, notes: data.notes }))
    },
    [ticket]
  )

  useEffect(() => {
    socket.on(TICKETS_UPDATE, onUpdateTicket)
    socket.on(TICKETS_ASSIGNEE_UPDATE, onUpdateAssignee)
    socket.on(TICKETS_UI_TYPE_UPDATE, onUpdateTicketType)
    socket.on(TICKETS_UI_PRIORITY_UPDATE, onUpdateTicketPriority)
    socket.on(TICKETS_UI_GROUP_UPDATE, onUpdateTicketGroup)
    socket.on(TICKETS_UI_DUEDATE_UPDATE, onUpdateTicketDueDate)
    socket.on(TICKETS_UI_TAGS_UPDATE, onUpdateTicketTags)

    axios
      .get(`/api/v2/tickets/${ticketUid}`)
      .then(res => {
        setTicket(res.data.ticket)
        setIsSubscribed(
          res.data.ticket && res.data.ticket.subscribers.findIndex(i => i._id === shared.sessionUser._id) !== -1
        )
      })
      .catch(error => {
        if (error.response && error.response.status === 403) {
          History.pushState(null, null, '/tickets')
        }
        Log.error(error)
      })

    fetchTicketTypes()
    fetchGroups()
    fetchTicketStatus()

    return () => {
      socket.off(TICKETS_UPDATE, onUpdateTicket)
      socket.off(TICKETS_ASSIGNEE_UPDATE, onUpdateAssignee)
      socket.off(TICKETS_UI_TYPE_UPDATE, onUpdateTicketType)
      socket.off(TICKETS_UI_PRIORITY_UPDATE, onUpdateTicketPriority)
      socket.off(TICKETS_UI_GROUP_UPDATE, onUpdateTicketGroup)
      socket.off(TICKETS_UI_DUEDATE_UPDATE, onUpdateTicketDueDate)
      socket.off(TICKETS_UI_TAGS_UPDATE, onUpdateTicketTags)
      unloadGroups()
    }
  }, [
    socket,
    ticketUid,
    shared.sessionUser._id,
    onUpdateTicket,
    onUpdateAssignee,
    onUpdateTicketType,
    onUpdateTicketPriority,
    onUpdateTicketGroup,
    onUpdateTicketDueDate,
    onUpdateTicketTags,
    fetchTicketTypes,
    fetchGroups,
    fetchTicketStatus,
    unloadGroups
  ])

  useEffect(() => {
    helpers.resizeFullHeight()
    helpers.setupScrollers()
  })

  const notesTagged = useMemo(() => {
    if (!ticket) return []
    return ticket.notes.map(i => ({ ...i, isNote: true }))
  }, [ticket])

  const commentsAndNotes = useMemo(() => {
    if (!ticket) return []
    if (!helpers.canUser('tickets:notes', true)) {
      return sortBy(ticket.comments, 'date')
    }

    const combined = union(ticket.comments, notesTagged)
    return sortBy(combined, 'date')
  }, [ticket, notesTagged])

  const hasCommentsOrNotes = useMemo(() => {
    if (!ticket) return false
    return ticket.comments.length > 0 || ticket.notes.length > 0
  }, [ticket])

  const onCommentNoteSubmit = useCallback(
    (e, type) => {
      e.preventDefault()
      const isNote = type === 'note'
      const editor = isNote ? noteMDE.current : commentMDE.current
      axios
        .post(`/api/v1/tickets/add${isNote ? 'note' : 'comment'}`, {
          _id: !isNote && ticket._id,
          comment: !isNote && editor.getEditorText(),
          ticketid: isNote && ticket._id,
          note: isNote && editor.getEditorText()
        })
        .then(res => {
          if (res && res.data && res.data.success) {
            setTicket(prev => ({
              ...prev,
              notes: isNote ? res.data.ticket.notes : prev.notes,
              comments: !isNote ? res.data.ticket.comments : prev.comments,
              history: res.data.ticket.history
            }))
            editor.setEditorText('')
            helpers.scrollToBottom('.page-content-right', true)
          }
        })
        .catch(error => {
          Log.error(error)
          if (error.response) Log.error(error.response)
          helpers.UI.showSnackbar(error, true)
        })
    },
    [ticket]
  )

  const onSubscriberChanged = useCallback(
    e => {
      axios
        .put(`/api/v1/tickets/${ticket._id}/subscribe`, {
          user: shared.sessionUser._id,
          subscribe: e.target.checked
        })
        .then(res => {
          if (res.data.success && res.data.ticket) {
            setTicket(prev => ({ ...prev, subscribers: res.data.ticket.subscribers }))
            const subscribed = res.data.ticket.subscribers.findIndex(i => i._id === shared.sessionUser._id) !== -1
            setIsSubscribed(subscribed)
          }
        })
        .catch(error => {
          Log.error(error.response || error)
        })
    },
    [ticket, shared.sessionUser._id]
  )

  const handleTransferToThirdParty = useCallback(() => {
    transferToThirdParty({ uid: ticket.uid })
  }, [ticket, transferToThirdParty])

  const mappedGroups = groupsState
    ? groupsState.groups.map(group => {
        return { text: group.get('name'), value: group.get('_id') }
      })
    : []

  const mappedTypes = ticketTypes
    ? ticketTypes.map(type => {
        return { text: type.get('name'), value: type.get('_id'), raw: type.toJS() }
      })
    : []

  // Perms
  const hasTicketUpdate = ticket && ticket.status.isResolved === false && helpers.canUser('tickets:update')
  const statusObj = ticket ? ticketStatuses.find(s => s.get('_id') === ticket.status._id) : null

  const hasTicketStatusUpdate = () => {
    const isAgent = sessionUser ? sessionUser.role.isAgent : false
    const isAdmin = sessionUser ? sessionUser.role.isAdmin : false
    if (isAgent || isAdmin) {
      return helpers.canUser('tickets:update')
    } else {
      if (!ticket || !sessionUser) return false
      return helpers.hasPermOverRole(ticket.owner.role, sessionUser.role, 'tickets:update', false)
    }
  }

  return (
    <div className={'uk-clearfix uk-position-relative'} style={{ width: '100%', height: '100vh' }}>
      {!ticket && <SpinLoader active={true} />}
      {ticket && (
        <Fragment>
          <div className={'page-content'}>
            <div
              className='uk-float-left page-title page-title-small noshadow nopadding relative'
              style={{ width: 360, maxWidth: 360, minWidth: 360 }}
            >
              <div className='page-title-border-right relative' style={{ padding: '0 30px' }}>
                <p>Ticket #{ticket.uid}</p>
                <StatusSelector
                  ticketId={ticket._id}
                  status={ticket.status._id}
                  socket={socket}
                  onStatusChange={status => {
                    setTicket(prev => ({ ...prev, status }))
                  }}
                  hasPerm={hasTicketStatusUpdate()}
                />
              </div>
              {/*  Left Side */}
              <div className='page-content-left full-height scrollable'>
                <div className='ticket-details-wrap uk-position-relative uk-clearfix'>
                  <div className='ticket-assignee-wrap uk-clearfix' style={{ paddingRight: 30 }}>
                    <h4>Assignee</h4>
                    <div className='ticket-assignee uk-clearfix'>
                      {hasTicketUpdate && (
                        <a
                          role='button'
                          title='Set Assignee'
                          style={{ float: 'left' }}
                          className='relative no-ajaxy'
                          onClick={() => socket.emit(TICKETS_ASSIGNEE_LOAD)}
                        >
                          <PDropdownTrigger target={assigneeDropdownPartial}>
                            <Avatar
                              image={ticket.assignee && ticket.assignee.image}
                              showOnlineBubble={ticket.assignee !== undefined}
                              userId={ticket.assignee && ticket.assignee._id}
                            />
                            <span className='drop-icon material-icons'>keyboard_arrow_down</span>
                          </PDropdownTrigger>
                        </a>
                      )}
                      {!hasTicketUpdate && (
                        <Avatar
                          image={ticket.assignee && ticket.assignee.image}
                          showOnlineBubble={ticket.assignee !== undefined}
                          userId={ticket.assignee && ticket.assignee._id}
                        />
                      )}
                      <div className='ticket-assignee-details'>
                        {!ticket.assignee && <h3>No User Assigned</h3>}
                        {ticket.assignee && (
                          <Fragment>
                            <h3>{ticket.assignee.fullname}</h3>
                            <a
                              className='comment-email-link uk-text-truncate uk-display-inline-block'
                              href={`mailto:${ticket.assignee.email}`}
                            >
                              {ticket.assignee.email}
                            </a>
                            <span className={'uk-display-block'}>{ticket.assignee.title}</span>
                          </Fragment>
                        )}
                      </div>
                    </div>

                    {hasTicketUpdate && (
                      <AssigneeDropdownPartial
                        ref={assigneeDropdownPartial}
                        ticketId={ticket._id}
                        onClearClick={() => setTicket(prev => ({ ...prev, assignee: undefined }))}
                        onAssigneeClick={({ agent }) => setTicket(prev => ({ ...prev, assignee: agent }))}
                      />
                    )}
                  </div>

                  <div className='uk-width-1-1 padding-left-right-15'>
                    <div className='tru-card ticket-details uk-clearfix'>
                      {/* Type */}
                      <div className='uk-width-1-2 uk-float-left nopadding'>
                        <div className='marginright5'>
                          <span>Type</span>
                          {hasTicketUpdate && (
                            <select
                              value={ticket.type._id}
                              onChange={e => {
                                const type = ticketTypes.find(t => t.get('_id') === e.target.value)

                                const priority = type
                                  .get('priorities')
                                  .findIndex(p => p.get('_id') === ticket.priority._id)

                                const hasPriority = priority !== -1

                                if (!hasPriority) {
                                  socket.emit(TICKETS_PRIORITY_SET, {
                                    _id: ticket._id,
                                    value: type.get('priorities').find(() => true)
                                  })

                                  showPriorityConfirm()
                                }

                                socket.emit(TICKETS_TYPE_SET, {
                                  _id: ticket._id,
                                  value: e.target.value
                                })
                              }}
                            >
                              {mappedTypes &&
                                mappedTypes.map(type => (
                                  <option key={type.value} value={type.value}>
                                    {type.text}
                                  </option>
                                ))}
                            </select>
                          )}
                          {!hasTicketUpdate && <div className='input-box'>{ticket.type.name}</div>}
                        </div>
                      </div>
                      {/* Priority */}
                      <div className='uk-width-1-2 uk-float-left nopadding'>
                        <div className='marginleft5'>
                          <span>Priority</span>
                          {hasTicketUpdate && (
                            <select
                              name='tPriority'
                              id='tPriority'
                              value={ticket.priority._id}
                              onChange={e =>
                                socket.emit(TICKETS_PRIORITY_SET, {
                                  _id: ticket._id,
                                  value: e.target.value
                                })
                              }
                            >
                              {ticket.type &&
                                ticket.type.priorities &&
                                ticket.type.priorities.map(priority => (
                                  <option key={priority._id} value={priority._id}>
                                    {priority.name}
                                  </option>
                                ))}
                            </select>
                          )}
                          {!hasTicketUpdate && <div className={'input-box'}>{ticket.priority.name}</div>}
                        </div>
                      </div>
                      {/*  Group */}
                      <div className='uk-width-1-1 nopadding uk-clearfix'>
                        <span>Group</span>
                        {hasTicketUpdate && (
                          <select
                            value={ticket.group._id}
                            onChange={e => {
                              socket.emit(TICKETS_GROUP_SET, {
                                _id: ticket._id,
                                value: e.target.value
                              })
                            }}
                          >
                            {mappedGroups &&
                              mappedGroups.map(group => (
                                <option key={group.value} value={group.value}>
                                  {group.text}
                                </option>
                              ))}
                          </select>
                        )}
                        {!hasTicketUpdate && <div className={'input-box'}>{ticket.group.name}</div>}
                      </div>
                      {/*  Due Date */}
                      <div className='uk-width-1-1 p-0'>
                        <span>Due Date</span> {hasTicketUpdate && <span>-&nbsp;</span>}
                        {hasTicketUpdate && (
                          <div className={'uk-display-inline'}>
                            <a
                              role={'button'}
                              onClick={e => {
                                e.preventDefault()
                                socket.emit(TICKETS_DUEDATE_SET, {
                                  _id: ticket._id,
                                  value: undefined
                                })
                              }}
                            >
                              Clear
                            </a>
                            <DatePicker
                              name={'ticket_due_date'}
                              format={helpers.getShortDateFormat()}
                              value={ticket.dueDate}
                              small={true}
                              onChange={e => {
                                const dueDate = moment(e.target.value, helpers.getShortDateFormat())
                                  .utc()
                                  .toISOString()

                                socket.emit(TICKETS_DUEDATE_SET, { _id: ticket._id, value: dueDate })
                              }}
                            />
                          </div>
                        )}
                        {!hasTicketUpdate && (
                          <div className='input-box'>
                            {helpers.formatDate(ticket.dueDate, common.get('shortDateFormat'))}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className='uk-width-1-1 nopadding'>
                        <span>
                          Tags
                          {hasTicketUpdate && (
                            <Fragment>
                              <span> - </span>
                              <div id='editTags' className={'uk-display-inline'}>
                                <a
                                  role={'button'}
                                  style={{ fontSize: 11 }}
                                  className='no-ajaxy'
                                  onClick={() => {
                                    showModal('ADD_TAGS_MODAL', {
                                      ticketId: ticket._id,
                                      currentTags: ticket.tags.map(tag => tag._id)
                                    })
                                  }}
                                >
                                  Edit Tags
                                </a>
                              </div>
                            </Fragment>
                          )}
                        </span>
                        <div className='tag-list uk-clearfix'>
                          {ticket.tags &&
                            ticket.tags.map(tag => (
                              <div key={tag._id} className='item'>
                                {tag.name}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {helpers.canUser('agent:*', true) && (
                    <div className='uk-width-1-1 padding-left-right-15'>
                      <div className='tru-card ticket-details pr-0 pb-0' style={{ height: 250 }}>
                        Ticket History
                        <hr style={{ padding: 0, margin: 0 }} />
                        <div className='history-items scrollable' style={{ paddingTop: 12 }}>
                          {ticket.history &&
                            ticket.history.map(item => (
                              <div key={item._id} className='history-item'>
                                <time dateTime={helpers.formatDate(item.date, common.get('longDateFormat'))} />
                                <em>
                                  Action by: <span>{item.owner.fullname}</span>
                                </em>
                                <p>{item.description}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Right Side */}
            <div className='page-message nopadding' style={{ marginLeft: 360 }}>
              <div className='page-title-right noshadow'>
                {common.get('hasThirdParty') && (
                  <div className='page-top-comments uk-float-right'>
                    <a
                      role='button'
                      className='btn md-btn-primary no-ajaxy'
                      onClick={e => {
                        e.preventDefault()
                        handleTransferToThirdParty()
                      }}
                    >
                      Transfer to ThirdParty
                    </a>
                  </div>
                )}
                <div className='page-top-comments uk-float-right'>
                  <a
                    role='button'
                    className='btn no-ajaxy'
                    onClick={e => {
                      e.preventDefault()
                      helpers.scrollToBottom('.page-content-right', true)
                    }}
                  >
                    Add Comment
                  </a>
                </div>
                <div
                  className='onoffswitch subscribeSwitch uk-float-right'
                  style={{ marginRight: 10, position: 'relative', top: 18 }}
                >
                  <input
                    id={'subscribeSwitch'}
                    type='checkbox'
                    name='subscribeSwitch'
                    className='onoffswitch-checkbox'
                    checked={isSubscribed}
                    onChange={e => onSubscriberChanged(e)}
                  />
                  <label className='onoffswitch-label' htmlFor='subscribeSwitch'>
                    <span className='onoffswitch-inner subscribeSwitch-inner' />
                    <span className='onoffswitch-switch subscribeSwitch-switch' />
                  </label>
                </div>
                <div className='pagination uk-float-right' style={{ marginRight: 5 }}>
                  <ul className='button-group'>
                    {helpers.canUser('tickets:print') && (
                      <li className='pagination'>
                        <a
                          href={`/tickets/print/${ticket.uid}`}
                          className='btn no-ajaxy'
                          style={{ borderRadius: 3, marginRight: 5 }}
                          rel='noopener noreferrer'
                          target='_blank'
                        >
                          <i className='material-icons'>&#xE8AD;</i>
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              <div className='page-content-right full-height scrollable'>
                <div className='comments-wrapper'>
                  <IssuePartial
                    ticketId={ticket._id}
                    status={statusObj}
                    owner={ticket.owner}
                    subject={ticket.subject}
                    issue={ticket.issue}
                    date={ticket.date}
                    dateFormat={`${common.get('longDateFormat')}, ${common.get('timeFormat')}`}
                    attachments={ticket.attachments}
                    editorWindow={editorWindow.current}
                    socket={socket}
                  />

                  {/* Tabs */}
                  {hasCommentsOrNotes && (
                    <TruTabWrapper>
                      <TruTabSelectors style={{ marginLeft: 110 }}>
                        <TruTabSelector
                          selectorId={0}
                          label='All'
                          active={true}
                          showBadge={true}
                          badgeText={commentsAndNotes.length}
                        />
                        <TruTabSelector
                          selectorId={1}
                          label='Comments'
                          showBadge={true}
                          badgeText={ticket ? ticket.comments && ticket.comments.length : 0}
                        />
                        {helpers.canUser('tickets:notes', true) && (
                          <TruTabSelector
                            selectorId={2}
                            label='Notes'
                            showBadge={true}
                            badgeText={ticket ? ticket.notes && ticket.notes.length : 0}
                          />
                        )}
                      </TruTabSelectors>

                      {/* Tab Sections */}
                      <TruTabSection sectionId={0} active={true}>
                        <div className='all-comments'>
                          {commentsAndNotes.map(item => (
                            <CommentNotePartial
                              key={item._id}
                              ticketStatus={statusObj}
                              ticketSubject={ticket.subject}
                              comment={item}
                              isNote={item.isNote}
                              dateFormat={`${common.get('longDateFormat')}, ${common.get('timeFormat')}`}
                              onEditClick={() => {
                                editorWindow.current.openEditorWindow({
                                  showSubject: false,
                                  text: !item.isNote ? item.comment : item.note,
                                  onPrimaryClick: data => {
                                    socket.emit(TICKETS_COMMENT_NOTE_SET, {
                                      _id: ticket._id,
                                      item: item._id,
                                      isNote: item.isNote,
                                      value: data.text
                                    })
                                  }
                                })
                              }}
                              onRemoveClick={() => {
                                socket.emit(TICKETS_COMMENT_NOTE_REMOVE, {
                                  _id: ticket._id,
                                  value: item._id,
                                  isNote: item.isNote
                                })
                              }}
                            />
                          ))}
                        </div>
                      </TruTabSection>
                      <TruTabSection sectionId={1}>
                        <div className='comments'>
                          {ticket &&
                            ticket.comments.map(comment => (
                              <CommentNotePartial
                                key={comment._id}
                                ticketStatus={statusObj}
                                ticketSubject={ticket.subject}
                                comment={comment}
                                dateFormat={`${common.get('longDateFormat')}, ${common.get('timeFormat')}`}
                                onEditClick={() => {
                                  editorWindow.current.openEditorWindow({
                                    showSubject: false,
                                    text: comment.comment,
                                    onPrimaryClick: data => {
                                      socket.emit(TICKETS_COMMENT_NOTE_SET, {
                                        _id: ticket._id,
                                        item: comment._id,
                                        isNote: comment.isNote,
                                        value: data.text
                                      })
                                    }
                                  })
                                }}
                                onRemoveClick={() => {
                                  socket.emit(TICKETS_COMMENT_NOTE_REMOVE, {
                                    _id: ticket._id,
                                    value: comment._id,
                                    isNote: comment.isNote
                                  })
                                }}
                              />
                            ))}
                        </div>
                      </TruTabSection>
                      <TruTabSection sectionId={2}>
                        <div className='notes'>
                          {ticket &&
                            ticket.notes.map(note => (
                              <CommentNotePartial
                                key={note._id}
                                ticketStatus={statusObj}
                                ticketSubject={ticket.subject}
                                comment={note}
                                isNote={true}
                                dateFormat={`${common.get('longDateFormat')}, ${common.get('timeFormat')}`}
                                onEditClick={() => {
                                  editorWindow.current.openEditorWindow({
                                    showSubject: false,
                                    text: note.note,
                                    onPrimaryClick: data => {
                                      socket.emit(TICKETS_COMMENT_NOTE_SET, {
                                        _id: ticket._id,
                                        item: note._id,
                                        isNote: note.isNote,
                                        value: data.text
                                      })
                                    }
                                  })
                                }}
                                onRemoveClick={() => {
                                  socket.emit(TICKETS_COMMENT_NOTE_REMOVE, {
                                    _id: ticket._id,
                                    value: note._id,
                                    isNote: note.isNote
                                  })
                                }}
                              />
                            ))}
                        </div>
                      </TruTabSection>
                    </TruTabWrapper>
                  )}

                  {/* Comment / Notes Form */}
                  {ticket.status.isResolved === false &&
                    (helpers.canUser('comments:create', true) || helpers.canUser('tickets:notes', true)) && (
                      <div className='uk-width-1-1 ticket-reply uk-clearfix'>
                        <Avatar image={sessionUser.image} showOnlineBubble={false} />
                        <TruTabWrapper style={{ paddingLeft: 85 }}>
                          <TruTabSelectors showTrack={false}>
                            {helpers.canUser('comments:create', true) && (
                              <TruTabSelector selectorId={0} label={'Comment'} active={true} />
                            )}
                            {helpers.canUser('tickets:notes', true) && (
                              <TruTabSelector
                                selectorId={1}
                                label={'Internal Note'}
                                active={!helpers.canUser('comments:create', true)}
                              />
                            )}
                          </TruTabSelectors>
                          <TruTabSection
                            sectionId={0}
                            style={{ paddingTop: 0 }}
                            active={helpers.canUser('comments:create', true)}
                          >
                            <form onSubmit={e => onCommentNoteSubmit(e, 'comment')}>
                              <EasyMDE
                                allowImageUpload={true}
                                inlineImageUploadUrl={'/tickets/uploadmdeimage'}
                                inlineImageUploadHeaders={{ ticketid: ticket._id }}
                                ref={commentMDE}
                              />
                              <div className='uk-width-1-1 uk-clearfix' style={{ marginTop: 50 }}>
                                <div className='uk-float-right'>
                                  <button
                                    type='submit'
                                    className='uk-button uk-button-accent'
                                    style={{ padding: '10px 15px' }}
                                  >
                                    Post Comment
                                  </button>
                                </div>
                              </div>
                            </form>
                          </TruTabSection>
                          <TruTabSection
                            sectionId={1}
                            style={{ paddingTop: 0 }}
                            active={!helpers.canUser('comments:create') && helpers.canUser('tickets:notes', true)}
                          >
                            <form onSubmit={e => onCommentNoteSubmit(e, 'note')}>
                              <EasyMDE
                                allowImageUpload={true}
                                inlineImageUploadUrl={'/tickets/uploadmdeimage'}
                                inlineImageUploadHeaders={{ ticketid: ticket._id }}
                                ref={noteMDE}
                              />
                              <div className='uk-width-1-1 uk-clearfix' style={{ marginTop: 50 }}>
                                <div className='uk-float-right'>
                                  <button
                                    type='submit'
                                    className='uk-button uk-button-accent'
                                    style={{ padding: '10px 15px' }}
                                  >
                                    Save Note
                                  </button>
                                </div>
                              </div>
                            </form>
                          </TruTabSection>
                        </TruTabWrapper>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
          <OffCanvasEditor primaryLabel={'Save Edit'} ref={editorWindow} />
        </Fragment>
      )}
    </div>
  )
}

SingleTicketContainer.propTypes = {
  ticketId: PropTypes.string.isRequired,
  ticketUid: PropTypes.string.isRequired,
  shared: PropTypes.object.isRequired,
  sessionUser: PropTypes.object,
  socket: PropTypes.object.isRequired,
  common: PropTypes.object.isRequired,
  ticketTypes: PropTypes.object.isRequired,
  fetchTicketTypes: PropTypes.func.isRequired,
  groupsState: PropTypes.object.isRequired,
  fetchGroups: PropTypes.func.isRequired,
  unloadGroups: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  transferToThirdParty: PropTypes.func,
  ticketStatuses: PropTypes.object.isRequired,
  fetchTicketStatus: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  common: state.common.viewdata,
  shared: state.shared,
  sessionUser: state.shared.sessionUser,
  socket: state.shared.socket,
  ticketTypes: state.ticketsState.types,
  ticketStatuses: state.ticketsState.ticketStatuses,
  groupsState: state.groupsState
})

export default connect(mapStateToProps, {
  fetchTicketTypes,
  fetchGroups,
  fetchTicketStatus,
  unloadGroups,
  showModal,
  transferToThirdParty
})(SingleTicketContainer)
