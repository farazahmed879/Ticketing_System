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
 *  Updated:    6/25/22 6:48 PM
 *  Copyright (c) 2014-2022. Trudesk, Inc (Chris Brame) All rights reserved.
 */

// GLOBAL
export const UI_ONLINE_STATUS_UPDATE = '$trudesk:global:ui:online_status:update'
export const UI_ONLINE_STATUS_SET = '$trudesk:global:ui:online_status:set'
export const USERS_UPDATE = '$trudesk:users:update'

// ROLES
export const ROLES_FLUSH = '$trudesk:roles:flush'

// TICKETS
export const TICKETS_CREATED = '$trudesk:tickets:created'
export const TICKETS_UPDATE = '$trudesk:tickets:update'
// --- SUB TICKET EVENTS
export const TICKETS_UI_STATUS_UPDATE = '$trudesk:tickets:ui:status:update'
export const TICKETS_STATUS_SET = '$trudesk:tickets:status:set'

export const TICKETS_UI_GROUP_UPDATE = '$trudesk:tickets:ui:group:update'
export const TICKETS_GROUP_SET = '$trudesk:tickets:group:set'

export const TICKETS_UI_TYPE_UPDATE = '$trudesk:tickets:ui:type:update'
export const TICKETS_TYPE_SET = '$trudesk:tickets:type:set'

export const TICKETS_UI_PRIORITY_UPDATE = '$trudesk:tickets:ui:priority:update'
export const TICKETS_PRIORITY_SET = '$trudesk:tickets:priority:set'

export const TICKETS_UI_DUEDATE_UPDATE = '$trudesk:tickets:ui:duedate:update'
export const TICKETS_DUEDATE_SET = '$trudesk:tickets:duedate:set'

export const TICKETS_UI_TAGS_UPDATE = '$trudesk:tickets:ui:tags:update'
export const TICKETS_TAGS_SET = '$trudesk:tickets:tags:set'

export const TICKETS_ASSIGNEE_LOAD = '$trudesk:tickets:assignee:load'
export const TICKETS_ASSIGNEE_SET = '$trudesk:tickets:assignee:set'
export const TICKETS_ASSIGNEE_CLEAR = '$trudesk:tickets:assignee:clear'
export const TICKETS_ASSIGNEE_UPDATE = '$trudesk:tickets:assignee: update'

export const TICKETS_ISSUE_SET = '$trudesk:tickets:issue:set'

export const TICKETS_COMMENT_NOTE_REMOVE = '$trudesk:tickets:comment_note:remove'
export const TICKETS_COMMENT_NOTE_SET = '$trudesk:tickets:comment_note:set'

export const TICKETS_UI_ATTACHMENTS_UPDATE = '$trudesk:tickets:ui:attachments:update'

// ACCOUNTS
export const ACCOUNTS_UI_PROFILE_IMAGE_UPDATE = '$trudesk:accounts:ui:profile_image:update'

// NOTIFICATIONS
export const NOTIFICATIONS_UPDATE = '$trudesk:notifications:update'
export const NOTIFICATIONS_MARK_READ = '$trudesk:notifications:mark_read'
export const NOTIFICATIONS_CLEAR = '$trudesk:notifications:clear'

// MESSAGES
export const MESSAGES_SEND = '$trudesk:messages:send'
export const MESSAGES_UI_RECEIVE = '$trudesk:messages:ui:receive'
export const MESSAGES_USER_TYPING = '$trudesk:messages:user_typing'
export const MESSAGES_UI_USER_TYPING = '$trudesk:messages:ui:user_typing'
export const MESSAGES_SPAWN_CHAT_WINDOW = '$trudesk:messages:spawn_chat_window'
export const MESSAGES_UI_SPAWN_CHAT_WINDOW = '$trudesk:messages:ui:spawn_chat_window'
export const MESSAGES_SAVE_CHAT_WINDOW = '$trudesk:messages:save_chat_window'
export const MESSAGES_SAVE_CHAT_WINDOW_COMPLETE = '$trudesk:messages:save_chat_window_complete'
export const MESSAGES_UPDATE_UI_CONVERSATION_NOTIFICATIONS = '$trudesk:messages:ui:conversation_notifications:update'

// NOTICES
export const NOTICE_SHOW = '$trudesk:notice:show'
export const NOTICE_UI_SHOW = '$trudesk:notice:ui:show'
export const NOTICE_CLEAR = '$trudesk:notice:clear'
export const NOTICE_UI_CLEAR = '$trudesk:notice:ui:clear'

// BACKUP / RESTORE
export const BACKUP_RESTORE_SHOW_OVERLAY = '$trudesk:backup_restore:show_overlay'
export const BACKUP_RESTORE_UI_SHOW_OVERLAY = '$trudesk:backup_restore:ui:show_overlay'
export const BACKUP_RESTORE_COMPLETE = '$trudesk:backup_restore:complete'
export const BACKUP_RESTORE_UI_COMPLETE = '$trudesk:backup_restore:ui:complete'
