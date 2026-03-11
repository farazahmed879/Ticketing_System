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
 *  Updated:    4/3/19 1:23 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'

const TableRow = props => {
  const { clickable, style: propStyle, className, onClick, children } = props
  const clickableStyle = { cursor: 'pointer' }
  let style = propStyle
  if (clickable) {
    style = propStyle ? Object.assign({}, propStyle, clickableStyle) : clickableStyle
  } else {
    style = propStyle ? Object.assign({}, propStyle, { cursor: 'default' }) : { cursor: 'default' }
  }
  return (
    <tr className={className} style={style} onClick={onClick}>
      {children}
    </tr>
  )
}

TableRow.propTypes = {
  clickable: PropTypes.bool,
  onClick: PropTypes.func,
  style: PropTypes.object,
  className: PropTypes.any,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired
}

TableRow.defaultProps = {
  clickable: false
}

export default TableRow
