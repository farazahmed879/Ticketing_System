/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/9/19 9:44 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { each, without, uniq } from 'lodash'

import Log from '../../logger'
import axios from 'axios'
import {
  fetchTickets,
  deleteTicket,
  ticketEvent,
  unloadTickets,
  ticketUpdated,
  fetchTicketStatus
} from 'actions/tickets'
import { fetchSearchResults } from 'actions/search'
import { showModal } from 'actions/common'

import PageTitle from 'components/PageTitle'
import Table from 'components/Table'
import TableHeader from 'components/Table/TableHeader'
import TableRow from 'components/Table/TableRow'
import TitlePagination from 'components/TitlePagination'
import PageContent from 'components/PageContent'
import TableCell from 'components/Table/TableCell'
import PageTitleButton from 'components/PageTitleButton'
import DropdownTrigger from 'components/Dropdown/DropdownTrigger'
import Dropdown from 'components/Dropdown'
import DropdownItem from 'components/Dropdown/DropdownItem'
import DropdownSeparator from 'components/Dropdown/DropdownSeperator'

import helpers from 'lib/helpers'
import anime from 'animejs'
import moment from 'moment-timezone'
import SearchResults from 'components/SearchResults'

const TicketsContainer = props => {
  const {
    socket,
    view,
    page,
    prevPage,
    nextPage,
    prevEnabled,
    nextEnabled,
    tickets,
    totalCount,
    loading,
    fetchTickets,
    deleteTicket,
    ticketEvent,
    unloadTickets,
    ticketUpdated,
    showModal,
    fetchSearchResults,
    common,
    filter,
    ticketStatuses,
    fetchTicketStatus
  } = props

  const [searchTerm, setSearchTerm] = React.useState('')
  const selectedTickets = React.useRef([])
  const ticketsTable = React.useRef(null)
  const selectAllCheckbox = React.useRef(null)
  const timeline = React.useRef(null)

  const onTicketCreated = React.useCallback(
    ticket => {
      if (page === '0') ticketEvent({ type: 'created', data: ticket })
    },
    [page, ticketEvent]
  )

  const onTicketUpdated = React.useCallback(
    data => {
      ticketUpdated(data)
    },
    [ticketUpdated]
  )

  const onTicketDeleted = React.useCallback(
    id => {
      ticketEvent({ type: 'deleted', data: id })
    },
    [ticketEvent]
  )

  React.useEffect(() => {
    socket.on('$trudesk:client:ticket:created', onTicketCreated)
    socket.on('$trudesk:client:ticket:updated', onTicketUpdated)
    socket.on('$trudesk:client:ticket:deleted', onTicketDeleted)

    fetchTickets({ limit: 50, page: page, type: view, filter: filter })
    fetchTicketStatus()

    return () => {
      socket.off('$trudesk:client:ticket:created', onTicketCreated)
      socket.off('$trudesk:client:ticket:updated', onTicketUpdated)
      socket.off('$trudesk:client:ticket:deleted', onTicketDeleted)
      unloadTickets()
    }
  }, [socket, onTicketCreated, onTicketUpdated, onTicketDeleted, fetchTickets, page, view, filter, fetchTicketStatus, unloadTickets])

  React.useEffect(() => {
    if (timeline.current) {
      timeline.current.pause()
      timeline.current.seek(0)
    }

    anime.remove('tr.overdue td')

    timeline.current = anime.timeline({
      direction: 'alternate',
      duration: 800,
      autoPlay: false,
      easing: 'steps(1)',
      loop: true,
      backgroundColor: 'blue'
    })

    timeline.current.add({
      targets: 'tr.overdue td',
      backgroundColor: '#b71c1c',
      color: '#ffffff'
    })

    timeline.current.play()

    return () => {
      anime.remove('tr.overdue td')
      timeline.current = null
    }
  }, [tickets, loading])

  const onTicketCheckChanged = (e, id) => {
    if (e.target.checked) selectedTickets.current.push(id)
    else selectedTickets.current = without(selectedTickets.current, id)

    selectedTickets.current = uniq(selectedTickets.current)
  }

  const _clearChecked = () => {
    selectedTickets.current = []
    if (ticketsTable.current) {
      const checkboxes = ticketsTable.current.querySelectorAll('td > input[type="checkbox"]')
      checkboxes.forEach(item => {
        item.checked = false
      })
    }
    if (selectAllCheckbox.current) selectAllCheckbox.current.checked = false
  }

  const onSetStatus = status => {
    const batch = selectedTickets.current.map(id => {
      return { id, status: status.get('_id') }
    })

    axios
      .put(`/api/v2/tickets/batch`, { batch })
      .then(res => {
        if (res.data.success) {
          helpers.UI.showSnackbar({ text: `Ticket status set to ${status.get('name')}` })
          _clearChecked()
        } else {
          helpers.UI.showSnackbar('An unknown error occurred.', true)
          Log.error(res.data.error)
        }
      })
      .catch(error => {
        Log.error(error)
        helpers.UI.showSnackbar('An Error occurred. Please check console.', true)
      })
  }

  const onDeleteClicked = () => {
    each(selectedTickets.current, id => {
      deleteTicket({ id })
    })

    _clearChecked()
  }

  const onSearchTermChanged = e => {
    const term = e.target.value
    setSearchTerm(term)
    if (term.length > 3) {
      SearchResults.toggleAnimation(true, true)
      fetchSearchResults({ term })
    } else {
      SearchResults.toggleAnimation(true, false)
    }
  }

  const _onSearchFocus = e => {
    if (searchTerm.length > 3) SearchResults.toggleAnimation(true, true)
  }

  const _selectAll = () => {
    selectedTickets.current = []
    if (ticketsTable.current) {
      const checkboxes = ticketsTable.current.querySelectorAll('td > input[type="checkbox"]')
      checkboxes.forEach(item => {
        selectedTickets.current.push(item.dataset.ticket)
        item.checked = true
      })
    }

    selectedTickets.current = uniq(selectedTickets.current)
  }

  const onSelectAll = e => {
    if (e.target.checked) _selectAll()
    else _clearChecked()
  }

  const loadingItems = []
  for (let i = 0; i < 51; i++) {
    const cells = []
    for (let k = 0; k < 10; k++) {
      cells.push(
        <TableCell key={k} className={'vam'}>
          <div className={'loadingTextAnimation'} />
        </TableCell>
      )
    }

    loadingItems.push(<TableRow key={Math.random()}>{cells}</TableRow>)
  }

  const selectAllCheckboxComponent = (
    <div style={{ marginLeft: 17 }}>
      <input
        type='checkbox'
        id={'select_all'}
        style={{ display: 'none' }}
        className='svgcheckinput'
        onChange={e => onSelectAll(e)}
        ref={selectAllCheckbox}
      />
      <label htmlFor={'select_all'} className='svgcheck'>
        <svg width='16px' height='16px' viewBox='0 0 18 18'>
          <path d='M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z' />
          <polyline points='1 9 7 14 15 4' />
        </svg>
      </label>
    </div>
  )

  return (
    <div>
      <PageTitle
        title={'Tickets'}
        shadow={false}
        rightComponent={
          <div>
            <div className={'uk-float-right'}>
              <TitlePagination
                limit={50}
                total={totalCount}
                type={view}
                prevEnabled={prevEnabled}
                nextEnabled={nextEnabled}
                currentPage={page}
                prevPage={prevPage}
                nextPage={nextPage}
                filter={filter}
              />
              <PageTitleButton
                fontAwesomeIcon={'fa-refresh'}
                onButtonClick={e => {
                  e.preventDefault()
                  unloadTickets().then(() => fetchTickets({ type: view, page: page }))
                }}
              />
              <PageTitleButton
                fontAwesomeIcon={'fa-filter'}
                onButtonClick={e => {
                  e.preventDefault()
                  showModal('FILTER_TICKET')
                }}
              />
              <DropdownTrigger pos={'bottom-right'} offset={5} extraClass={'uk-float-left'}>
                <PageTitleButton fontAwesomeIcon={'fa-tasks'} />
                <Dropdown small={true} width={120}>
                  <DropdownItem text={'Create'} onClick={() => showModal('CREATE_TICKET')} />
                  <DropdownSeparator />
                  {ticketStatuses.map(s => (
                    <DropdownItem
                      key={s.get('_id')}
                      text={'Set ' + s.get('name')}
                      onClick={() => onSetStatus(s)}
                    />
                  ))}
                  {helpers.canUser('tickets:delete', true) && <DropdownSeparator />}
                  {helpers.canUser('tickets:delete', true) && (
                    <DropdownItem text={'Delete'} extraClass={'text-danger'} onClick={() => onDeleteClicked()} />
                  )}
                </Dropdown>
              </DropdownTrigger>
              <div className={'uk-float-right'}>
                <div
                  id={'ticket-search-box'}
                  className='search-box uk-float-left nb'
                  style={{ marginTop: 8, paddingLeft: 0 }}
                >
                  <input
                    type='text'
                    id='tickets_Search'
                    placeholder={'Search'}
                    className={'ticket-top-search'}
                    value={searchTerm}
                    onChange={e => onSearchTermChanged(e)}
                    onFocus={e => _onSearchFocus(e)}
                  />
                </div>
              </div>
            </div>
            <SearchResults target={'#ticket-search-box'} />
          </div>
        }
      />
      <PageContent padding={0} paddingBottom={0} extraClass={'uk-position-relative'}>
        <Table
          tableRef={ticketsTable}
          style={{ margin: 0 }}
          extraClass={'pDataTable'}
          stickyHeader={true}
          striped={true}
          headers={[
            <TableHeader key={0} width={45} height={50} component={selectAllCheckboxComponent} />,
            <TableHeader key={1} width={60} text={'Status'} />,
            <TableHeader key={2} width={65} text={'#'} />,
            <TableHeader key={3} width={'23%'} text={'Subject'} />,
            <TableHeader key={4} width={110} text={'Created'} />,
            <TableHeader key={5} width={125} text={'Requester'} />,
            <TableHeader key={6} width={175} text={'Customer'} />,
            <TableHeader key={7} text={'Assignee'} />,
            <TableHeader key={8} width={110} text={'Due Date'} />,
            <TableHeader key={9} text={'Updated'} />
          ]}
        >
          {!loading && tickets.size < 1 && (
            <TableRow clickable={false}>
              <TableCell colSpan={10}>
                <h5 style={{ margin: 10 }}>No Tickets Found</h5>
              </TableCell>
            </TableRow>
          )}
          {loading && loadingItems}
          {!loading &&
            tickets.map(ticket => {
              const status = ticketStatuses.find(s => s.get('_id') === ticket.get('status').get('_id'))

              const assignee = () => {
                const a = ticket.get('assignee')
                return !a ? '--' : a.get('fullname')
              }

              const updated = ticket.get('updated')
                ? helpers.formatDate(ticket.get('updated'), helpers.getShortDateFormat()) +
                  ', ' +
                  helpers.formatDate(ticket.get('updated'), helpers.getTimeFormat())
                : '--'

              const dueDate = ticket.get('dueDate')
                ? helpers.formatDate(ticket.get('dueDate'), helpers.getShortDateFormat())
                : '--'

              const isOverdue = () => {
                if (!common.viewdata.get('showOverdue') || [2, 3].indexOf(ticket.get('status')) !== -1)
                  return false
                const overdueIn = ticket.getIn(['priority', 'overdueIn'])
                const now = moment()
                let updatedUnix = ticket.get('updated')
                if (updatedUnix) updatedUnix = moment(updatedUnix)
                else updatedUnix = moment(ticket.get('date'))

                const timeout = updatedUnix.clone().add(overdueIn, 'm')
                return now.isAfter(timeout)
              }

              return (
                <TableRow
                  key={ticket.get('_id')}
                  className={`ticket-${status == null ? 'unknonwn' : status.get('name')} ${
                    isOverdue() ? 'overdue' : ''
                  }`}
                  clickable={true}
                  onClick={e => {
                    const td = e.target.closest('td')
                    const input = td.getElementsByTagName('input')
                    if (input.length > 0) return false
                    History.pushState(null, `Ticket-${ticket.get('uid')}`, `/tickets/${ticket.get('uid')}`)
                  }}
                >
                  <TableCell
                    className={'ticket-priority nbb vam'}
                    style={{ borderColor: ticket.getIn(['priority', 'htmlColor']), padding: '18px 15px' }}
                  >
                    <input
                      type='checkbox'
                      id={`c_${ticket.get('_id')}`}
                      data-ticket={ticket.get('_id')}
                      style={{ display: 'none' }}
                      onChange={e => onTicketCheckChanged(e, ticket.get('_id'))}
                      className='svgcheckinput'
                    />
                    <label htmlFor={`c_${ticket.get('_id')}`} className='svgcheck'>
                      <svg width='16px' height='16px' viewBox='0 0 18 18'>
                        <path d='M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z' />
                        <polyline points='1 9 7 14 15 4' />
                      </svg>
                    </label>
                  </TableCell>
                  <TableCell className={`ticket-status vam nbb uk-text-center`}>
                    <span
                      className={'uk-display-inline-block'}
                      style={{ backgroundColor: status == null ? '#000' : status.get('htmlColor') }}
                    >
                      {status == null ? 'U' : status.get('name')[0].toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className={'vam nbb'}>{ticket.get('uid')}</TableCell>
                  <TableCell className={'vam nbb'}>{ticket.get('subject')}</TableCell>
                  <TableCell className={'vam nbb'}>
                    {helpers.formatDate(ticket.get('date'), helpers.getShortDateFormat())}
                  </TableCell>
                  <TableCell className={'vam nbb'}>{ticket.getIn(['owner', 'fullname'])}</TableCell>
                  <TableCell className={'vam nbb'}>{ticket.getIn(['group', 'name'])}</TableCell>
                  <TableCell className={'vam nbb'}>{assignee()}</TableCell>
                  <TableCell className={'vam nbb'}>{dueDate}</TableCell>
                  <TableCell className={'vam nbb'}>{updated}</TableCell>
                </TableRow>
              )
            })}
        </Table>
      </PageContent>
    </div>
  )
}

TicketsContainer.propTypes = {
  socket: PropTypes.object.isRequired,
  view: PropTypes.string.isRequired,
  page: PropTypes.string.isRequired,
  prevPage: PropTypes.number.isRequired,
  nextPage: PropTypes.number.isRequired,
  prevEnabled: PropTypes.bool.isRequired,
  nextEnabled: PropTypes.bool.isRequired,
  tickets: PropTypes.object.isRequired,
  totalCount: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  fetchTickets: PropTypes.func.isRequired,
  deleteTicket: PropTypes.func.isRequired,
  ticketEvent: PropTypes.func.isRequired,
  unloadTickets: PropTypes.func.isRequired,
  ticketUpdated: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  fetchSearchResults: PropTypes.func.isRequired,
  common: PropTypes.object.isRequired,
  filter: PropTypes.object.isRequired,
  ticketStatuses: PropTypes.object.isRequired,
  fetchTicketStatus: PropTypes.func.isRequired
}

TicketsContainer.defaultProps = {
  view: 'active',
  page: 0,
  prevEnabled: true,
  nextEnabled: true
}

const mapStateToProps = state => ({
  tickets: state.ticketsState.tickets,
  totalCount: state.ticketsState.totalCount,
  prevPage: state.ticketsState.prevPage,
  nextPage: state.ticketsState.nextPage,
  loading: state.ticketsState.loading,
  common: state.common,
  socket: state.shared.socket,
  ticketStatuses: state.ticketsState.ticketStatuses,
  fetchTicketStatus: PropTypes.func.isRequired
})

export default connect(mapStateToProps, {
  fetchTickets,
  deleteTicket,
  ticketEvent,
  unloadTickets,
  ticketUpdated,
  fetchSearchResults,
  showModal,
  fetchTicketStatus
})(TicketsContainer)
