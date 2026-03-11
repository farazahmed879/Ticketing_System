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
 *  Updated:    2/8/19 1:36 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import {
  fetchMongoDBTools,
  fetchBackups,
  backupNow,
  fetchDeletedTickets,
  restoreDeletedTicket,
  permDeleteTicket,
  changeDeletedTicketsPage
} from 'actions/settings'
import Log from '../../../logger'

import { BACKUP_RESTORE_SHOW_OVERLAY, BACKUP_RESTORE_COMPLETE } from 'serverSocket/socketEventConsts'

import $ from 'jquery'
import UIKit from 'uikit'
import axios from 'axios'
import helpers from 'lib/helpers'

import ButtonGroup from 'components/ButtonGroup'
import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import Zone from 'components/ZoneBox/zone'
import ZoneBox from 'components/ZoneBox'

const BackupRestoreSettingsContainer = props => {
  const {
    socket,
    active,
    fetchMongoDBTools,
    fetchBackups,
    fetchDeletedTickets,
    changeDeletedTicketsPage,
    backupNow,
    restoreDeletedTicket,
    permDeleteTicket,
    settings
  } = props

  const backupUploadProgressbar = React.useRef(null)
  const backupUploadSelect = React.useRef(null)
  const backupUploadBtn = React.useRef(null)
  const deletedTicketsPagination = React.useRef(null)

  const initBackupUpload = React.useCallback(() => {
    const $progressBar = $(backupUploadProgressbar.current)
    const $uploadSelect = $(backupUploadSelect.current)
    const $uploadButton = $(backupUploadBtn.current)
    const bar = $progressBar.find('.uk-progress-bar')

    if ($progressBar.length < 1 || $uploadSelect.length < 1 || $uploadButton.length < 1) return

    const uploadSettings = {
      action: '/api/v1/backup/upload',
      allow: '*.zip',
      type: 'json',

      loadstart: () => {
        bar.css('width', '0%').text('0%')
        $progressBar.removeClass('hide')
        $uploadButton.addClass('hide')
      },
      notallowed: () => {
        helpers.UI.showSnackbar('Invalid File Type. Please upload a Zip file.', true)
      },
      error: err => {
        Log.error(err)
        helpers.UI.showSnackbar('An unknown error occurred. Check Console', true)
      },
      progress: percent => {
        percent = Math.ceil(percent)
        bar.css('width', percent + '%').text(percent + '%')
      },

      allcomplete: response => {
        Log.debug(response)
        if (!response.success) {
          helpers.UI.showSnackbar(response.error, true)
        }

        bar.css('width', '100%').text('100%')

        setTimeout(() => {
          $progressBar.addClass('hide')
          $uploadButton.removeClass('hide')
          $uploadSelect.val(null)
          fetchBackups()
          helpers.UI.playSound('success')
        }, 1500)
      }
    }

    UIKit.uploadSelect($uploadSelect, uploadSettings)
  }, [fetchBackups])

  React.useEffect(() => {
    fetchMongoDBTools()
    fetchBackups()
    fetchDeletedTickets()
  }, [fetchMongoDBTools, fetchBackups, fetchDeletedTickets])

  React.useEffect(() => {
    initBackupUpload()
  }, [initBackupUpload])

  React.useEffect(() => {
    if (!deletedTicketsPagination.current) {
      const $deletedTicketPagination = $('.deletedTicketPagination')
      if ($deletedTicketPagination.length > 0) {
        deletedTicketsPagination.current = UIKit.pagination($deletedTicketPagination, {
          items: settings.deletedTicketsCount,
          itemsOnPage: 15
        })
        $deletedTicketPagination.on('select.uk.pagination', (e, pageIndex) => {
          changeDeletedTicketsPage(pageIndex)
        })
      }
    }

    return () => {
      if (deletedTicketsPagination.current) {
        deletedTicketsPagination.current.element.off('select.uk.pagination')
        deletedTicketsPagination.current = null
      }
    }
  }, [settings.deletedTicketsCount, changeDeletedTicketsPage])

  React.useEffect(() => {
    if (deletedTicketsPagination.current) {
      deletedTicketsPagination.current.pages = Math.ceil(settings.deletedTicketsCount / 15)
        ? Math.ceil(settings.deletedTicketsCount / 15)
        : 1
      deletedTicketsPagination.current.render()
      if (deletedTicketsPagination.current.currentPage > deletedTicketsPagination.current.pages - 1)
        deletedTicketsPagination.current.selectPage(deletedTicketsPagination.current.pages - 1)
    }
  }, [settings.deletedTicketsCount])

  const onBackupNowClicked = e => {
    e.preventDefault()
    backupNow()
  }

  const oneRestoreClicked = (backup) => {
    if (!backup) return

    const filename = backup.get('filename')
    UIKit.modal.confirm(
      `<h2>Are you sure?</h2>
        <p style="font-size: 15px;">
            <span class="uk-text-danger" style="font-size: 15px;">This is a permanent action.</span> 
            This will earse the database and restore it with the selected backup file: <strong>${filename}</strong>
        </p>
        <p style="font-size: 12px;">
            Any users currently logged in will be presented with a blocking restore page. Preventing any further actions.
            Once complete all users are required to log in again.</p><br />
        <p style="font-size: 12px; font-style: italic;">
            This process may take a while depending on the size of the backup.
        </p>`,
      () => {
        socket.emit(BACKUP_RESTORE_SHOW_OVERLAY)

        axios
          .post('/api/v1/backup/restore', { file: filename })
          .then(() => {
            helpers.UI.showSnackbar('Restore Complete. Logging all users out...')
            setTimeout(() => {
              socket.emit(BACKUP_RESTORE_COMPLETE)
            }, 2000)
          })
          .catch(err => {
            Log.error(err)
            helpers.UI.showSnackbar('An error occurred. Check console.', true)
          })
      },
      {
        labels: { Ok: 'Yes', Cancel: 'No' },
        confirmButtonClass: 'md-btn-danger'
      }
    )
  }

  const onDeleteBackupClicked = (backup) => {
    UIKit.modal.confirm(
      `<h2 class="text-light">Are you sure?</h2>
        <p style="font-size: 14px;">This action is permanent and will destroy the backup file: 
            <strong>${backup.get('filename')}</strong>
        </p>`,
      () => {
        axios
          .delete(`/api/v1/backup/${backup.get('filename')}`)
          .then(res => {
            if (res.data && res.data.success) {
              fetchBackups()
              helpers.UI.showSnackbar('Backup successfully deleted')
            } else {
              helpers.UI.showSnackbar('Unable to delete backup', true)
            }
          })
          .catch(err => {
            Log.error(err)
            helpers.UI.showSnackbar(`Error: ${err.response.data.error}`, true)
          })
      },
      {
        labels: { Ok: 'Yes', Cancel: 'No' },
        confirmButtonClass: 'md-btn-danger'
      }
    )
  }

  const onRestoreTicketClicked = (ticket) => {
    if (!ticket) return
    restoreDeletedTicket({ _id: ticket.get('_id') })
  }

  const onDeleteTicketClicked = (ticket) => {
    if (!ticket) return
    permDeleteTicket({ _id: ticket.get('_id') })
  }

  return (
    <div className={active ? 'active' : 'hide'}>
      {!settings.hasMongoDBTools && (
        <SettingItem
          title={'MongoDB Tools Not Found'}
          subtitle={'Unable to locate MongoDB tools. Please make sure MongoDB tools are installed.'}
        >
          <div>
            <h4>Installing MongoDB Tools</h4>
            <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}>
              MongoDB Tools are required to perform backup and restore. See below for instructions on installing MongoDB
              Tools.
            </p>
            <h5>
              <strong>Ubuntu 18.04</strong>
            </h5>
            <pre style={{ whiteSpace: 'pre-line' }}>sudo apt install -y mongo-tools</pre>
            <br />
            <h5>
              <strong>ArchLinux</strong>
            </h5>
            <pre style={{ whiteSpace: 'pre-line' }}>yay -S mongodb-tools-bin</pre>
            <br />
            <h5>
              <strong>Fedora 29</strong>
            </h5>
            <pre>dnf install -y mongo-tools</pre>
            <br />
            <h5>
              <strong>Alpine Linux</strong>
            </h5>
            <pre>apk add mongodb-tools</pre>
          </div>
        </SettingItem>
      )}
      {settings.hasMongoDBTools && (
        <div>
          <SettingItem
            title={'Backup Now'}
            subtitle={'Backup all site data. (Database, Attachments, Assets)'}
            component={
              <div className={'uk-float-right mt-10'}>
                <div
                  className={
                    'uk-progress uk-progress-success uk-progress-striped uk-active' +
                    (!settings.backingup ? ' hide ' : '')
                  }
                  style={{ height: '31px', background: 'transparent' }}
                >
                  <div
                    className='uk-progress-bar uk-float-right'
                    style={{ width: '115px', fontSize: '11px', textTransform: 'uppercase', lineHeight: '31px' }}
                  >
                    Please Wait...
                  </div>
                </div>
                {!settings.backingup && (
                  <Button
                    text={'Backup Now'}
                    style={'success'}
                    small={true}
                    styleOverride={{ width: '115px' }}
                    onClick={e => onBackupNowClicked(e)}
                  />
                )}
              </div>
            }
          />
          <SettingItem
            title={'Backups'}
            subtitle={'Currently stored backups'}
            component={
              <div className={'uk-float-right mt-10'} style={{ width: '85px' }}>
                <div className={'uk-progress hide'} style={{ height: '31px' }} ref={backupUploadProgressbar}>
                  <div className='uk-progress-bar' style={{ width: 0, lineHeight: '31px', fontSize: '11px' }}>
                    0%
                  </div>
                </div>
                <form className='uk-form-stacked'>
                  <button
                    className={'md-btn md-btn-small md-btn-primary uk-form-file no-ajaxy'}
                    style={{ width: '85px' }}
                    ref={backupUploadBtn}
                  >
                    Upload
                    <input ref={backupUploadSelect} type={'file'} name={'backupUploadSelect'} />
                  </button>
                </form>
              </div>
            }
          >
            {settings.backups.size < 1 && (
              <Zone>
                <ZoneBox>
                  <h2 className={'uk-text-muted uk-text-center'}>No Backups</h2>
                </ZoneBox>
              </Zone>
            )}
            {settings.backups.size > 0 && (
              <table className='uk-table mt-0'>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Size</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {settings.backups.map(backup => {
                    return (
                      <tr key={backup.get('filename')}>
                        <td className={'valign-middle'} style={{ width: '60%', height: '60px' }}>
                          {backup.get('filename')}
                        </td>
                        <td className='valign-middle'>{backup.get('sizeFormat')}</td>
                        <td className='uk-text-right valign-middle'>
                          <ButtonGroup>
                            <a
                              href={`/backups/${backup.get('filename')}`}
                              className={'md-btn md-btn-small md-btn-wave no-ajaxy'}
                              download={backup.get('filename')}
                            >
                              download
                            </a>
                            <Button
                              text={'Restore'}
                              small={true}
                              waves={true}
                              onClick={() => oneRestoreClicked(backup)}
                            />
                            <Button
                              text={'Delete'}
                              small={true}
                              style={'danger'}
                              waves={true}
                              onClick={() => onDeleteBackupClicked(backup)}
                            />
                          </ButtonGroup>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </SettingItem>
        </div>
      )}
      <SettingItem title={'Deleted Tickets'} subtitle={'Tickets marked as deleted are shown below.'}>
        {settings.deletedTickets.size < 1 && (
          <Zone>
            <ZoneBox>
              <h2 className='uk-text-muted uk-text-center'>No Deleted Tickets</h2>
            </ZoneBox>
          </Zone>
        )}
        {settings.deletedTickets.size > 0 && (
          <div>
            <table className='uk-table mt-0 mb-5'>
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Subject</th>
                  <th>Group</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {settings.deletedTickets.map(ticket => {
                  return (
                    <tr key={ticket.get('_id')}>
                      <td className='valign-middle' style={{ width: '10%', height: '60px' }}>
                        {ticket.get('uid')}
                      </td>
                      <td className='valign-middle' style={{ width: '30%' }}>
                        {ticket.get('subject')}
                      </td>
                      <td className='valign-middle' style={{ width: '30%' }}>
                        {ticket.getIn(['group', 'name'])}
                      </td>
                      <td className='valign-middle' style={{ width: '30%' }}>
                        {ticket.get('date')}
                      </td>
                      <td className='uk-text-right valign-middle'>
                        <ButtonGroup>
                          <Button
                            text={'Delete'}
                            style={'danger'}
                            small={true}
                            waves={true}
                            onClick={() => onDeleteTicketClicked(ticket)}
                          />
                          <Button
                            text={'Restore'}
                            small={true}
                            waves={true}
                            onClick={() => onRestoreTicketClicked(ticket)}
                          />
                        </ButtonGroup>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className='uk-pagination deletedTicketPagination' />
          </div>
        )}
      </SettingItem>
    </div>
  )
}

BackupRestoreSettingsContainer.propTypes = {
  socket: PropTypes.object.isRequired,
  active: PropTypes.bool.isRequired,
  fetchMongoDBTools: PropTypes.func.isRequired,
  fetchBackups: PropTypes.func.isRequired,
  fetchDeletedTickets: PropTypes.func.isRequired,
  changeDeletedTicketsPage: PropTypes.func.isRequired,
  backupNow: PropTypes.func.isRequired,
  restoreDeletedTicket: PropTypes.func.isRequired,
  permDeleteTicket: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  socket: state.shared.socket,
  settings: state.settings
})

export default connect(mapStateToProps, {
  fetchBackups,
  fetchMongoDBTools,
  backupNow,
  fetchDeletedTickets,
  restoreDeletedTicket,
  permDeleteTicket,
  changeDeletedTicketsPage
})(BackupRestoreSettingsContainer)
