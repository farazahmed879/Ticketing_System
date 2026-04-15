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
 *  Updated:    2/11/19 7:41 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'

const PDropDown = React.forwardRef((props, ref) => {
  const {
    id,
    title,
    titleHref,
    showTitlebar,
    leftArrow,
    showArrow,
    override,
    topOffset,
    leftOffset,
    rightComponent,
    children,
    className,
    footerComponent,
    minHeight,
    minWidth,
    isListItems,
    onShow
  } = props

  const dropRef = React.useRef()
  const pTriggerRef = React.useRef(null)

  const hideDropdownOnMouseUp = React.useCallback(e => {
    if (dropRef.current) {
      if (!dropRef.current.contains(e.target) && (!pTriggerRef.current || !pTriggerRef.current.contains(e.target))) {
        document.removeEventListener('mouseup', hideDropdownOnMouseUp)
        dropRef.current.classList.remove('pDropOpen')
      }
    }
  }, [])

  const closeOnClick = React.useCallback(() => {
    if (dropRef.current) {
      document.removeEventListener('mouseup', hideDropdownOnMouseUp)
      dropRef.current.classList.remove('pDropOpen')
    }
  }, [hideDropdownOnMouseUp])

  React.useImperativeHandle(ref, () => ({
    show (pTrigger) {
      if (!pTrigger) {
        console.error('Invalid pTrigger sent to show method')
        return true
      }

      pTriggerRef.current = pTrigger

      if (dropRef.current) {
        const dropElement = dropRef.current
        if (dropElement.classList.contains('pDropOpen')) {
          dropElement.classList.remove('pDropOpen')
          return true
        }

        // Bind Doc event
        document.removeEventListener('mouseup', hideDropdownOnMouseUp)
        document.addEventListener('mouseup', hideDropdownOnMouseUp)

        const pageContent = document.getElementById('page-content')
        if (pageContent) {
          let pageOffsetLeft = 0
          let pageOffsetTop = 0
          let pTriggerOffsetLeft = pTrigger.getBoundingClientRect().left
          let pTriggerOffsetTop = pTrigger.getBoundingClientRect().top
          const pTriggerHeight = pTrigger.offsetHeight

          let left0 = 250
          if (dropElement.classList.contains('pSmall')) left0 = 180
          if (dropElement.classList.contains('p-dropdown-left')) left0 = 0

          if (pageContent.contains(pTrigger)) {
            pageOffsetLeft = pageContent.clientLeft
            pageOffsetTop = pageContent.clientTop
            pTriggerOffsetLeft = pTrigger.offsetLeft
            pTriggerOffsetTop = pTrigger.offsetTop
          }

          pageOffsetTop += pTriggerOffsetTop

          let left = pTriggerOffsetLeft - window.scrollX - pageOffsetLeft - left0

          if (leftOffset) left += Number(leftOffset)

          left = left + 'px'

          const tOffset = pTriggerOffsetTop - window.scrollY + pageOffsetTop
          let top = pTriggerHeight + tOffset

          if (topOffset) top += Number(topOffset)

          const noticeFrame = document.getElementById('notice-banner')
          let hasNotice = false
          if (noticeFrame) hasNotice = !noticeFrame.classList.contains('uk-hidden')
          if (hasNotice && !dropElement.classList.contains('opt-ignore-notice')) top -= 30

          top = top + 'px'

          const aLinks = dropElement.querySelectorAll('a')
          for (const link of aLinks) {
            link.removeEventListener('click', closeOnClick)
            link.addEventListener('click', closeOnClick)
          }

          const closeOnClickElems = dropElement.querySelectorAll('.close-on-click')
          for (const link of closeOnClickElems) {
            link.removeEventListener('click', closeOnClick)
            link.addEventListener('click', closeOnClick)
          }

          dropElement.style.position = 'absolute'
          dropElement.style.left = left
          dropElement.style.top = top
          dropElement.classList.add('pDropOpen')

          onShow()
        }
      }
    }
  }))

  React.useEffect(() => {
    return () => {
      document.removeEventListener('mouseup', hideDropdownOnMouseUp)
    }
  }, [hideDropdownOnMouseUp])

  return (
    <div
      id={id}
      ref={dropRef}
      className={clsx('p-dropdown', leftArrow && 'p-dropdown-left', !showArrow && 'p-dropdown-hide-arrow', className)}
      data-override={override}
      data-top-offset={topOffset}
      data-left-offset={leftOffset}
      style={{ minHeight, minWidth }}
    >
      {showTitlebar && (
        <div className='actions'>
          {titleHref && <a href={titleHref}>{title}</a>}
          {!titleHref && <span style={{ paddingLeft: '5px' }}>{title}</span>}
          {rightComponent && <div className='uk-float-right'>{rightComponent}</div>}
        </div>
      )}
      {isListItems && (
        <div className='items close-on-click'>
          <ul>{children}</ul>
        </div>
      )}
      {!isListItems && <div>{children}</div>}
      {footerComponent && (
        <div
          className={'bottom-actions actions uk-float-left'}
          style={{ borderBottom: 'none', borderTop: '1px solid rgba(0,0,0,0.2)' }}
        >
          {footerComponent}
        </div>
      )}
    </div>
  )
})

PDropDown.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string,
  titleHref: PropTypes.string,
  showTitlebar: PropTypes.bool,
  leftArrow: PropTypes.bool,
  showArrow: PropTypes.bool,
  override: PropTypes.bool,
  topOffset: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  leftOffset: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  rightComponent: PropTypes.element,
  footerComponent: PropTypes.element,
  minHeight: PropTypes.number,
  minWidth: PropTypes.number,
  isListItems: PropTypes.bool,
  className: PropTypes.string,
  onShow: PropTypes.func.isRequired,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired
}

PDropDown.defaultProps = {
  showTitlebar: true,
  leftArrow: false,
  showArrow: true,
  override: false,
  topOffset: '0',
  leftOffset: '0',
  minHeight: 0,
  isListItems: true,
  onShow: () => {}
}

export default PDropDown
