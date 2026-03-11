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
 *  Updated:    2/7/19 7:06 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'

import $ from 'jquery'

const SpinLoader = props => {
  const spinnerRef = React.useRef()

  React.useEffect(() => {
    if (spinnerRef.current && props.animate) {
      const $spinnerRef = $(spinnerRef.current)

      if (props.active) {
        $spinnerRef.css({ opacity: 1 }).show()
      } else {
        $spinnerRef.animate({ opacity: 0 }, props.animateDelay, () => {
          $spinnerRef.hide()
        })
      }
    }
  }, [props.active, props.animate, props.animateDelay])

  return (
    <div
      ref={spinnerRef}
      className={clsx('card-spinner', props.extraClass, !props.active && !props.animate && 'hide')}
      style={props.style}
    >
      <div className='spinner' style={props.spinnerStyle} />
    </div>
  )
}

SpinLoader.propTypes = {
  active: PropTypes.bool,
  extraClass: PropTypes.string,
  style: PropTypes.object,
  spinnerStyle: PropTypes.object,
  animate: PropTypes.bool,
  animateDelay: PropTypes.number
}

SpinLoader.defaultProps = {
  animate: false,
  animateDelay: 700
}

export default SpinLoader
