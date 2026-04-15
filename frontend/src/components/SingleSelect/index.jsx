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
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { each, isArray, findIndex } from 'lodash'
import $ from 'jquery'

import helpers from 'lib/helpers'

const SingleSelect = props => {
  const { width: propWidth, items, multiple, showTextbox, defaultValue, disabled, onSelectChange } = props
  const selectRef = React.useRef()
  const valueRef = React.useRef(defaultValue || '')

  const updateSelectizeItems = React.useCallback(() => {
    const selectElement = selectRef.current
    if (selectElement && selectElement.selectize) {
      const selectize = selectElement.selectize
      // Remove any options that were removed from Items array
      each(selectize.options, function (i) {
        const indexOfOption = findIndex(items, o => {
          return i.value === o.value
        })
        if (indexOfOption === -1) {
          selectize.removeOption(i.value, true)
        }
      })

      // Populate Options & Add existing selected values
      selectize.addOption(items)
      selectize.refreshOptions(false)
      selectize.addItem(valueRef.current, true)

      // Force an update of each item from items prop
      each(items, function (i) {
        selectize.updateOption(i.value, i)
      })

      disabled ? selectize.disable() : selectize.enable()
    }
  }, [items, disabled])

  const handleSelectChange = React.useCallback(
    e => {
      if (e.target.value === '') {
        if (onSelectChange && multiple) onSelectChange(e, [])
        else return
      }

      if (multiple) valueRef.current = selectRef.current.selectize.items
      else valueRef.current = e.target.value

      if (valueRef.current && onSelectChange) onSelectChange(e, valueRef.current)
    },
    [multiple, onSelectChange]
  )

  React.useEffect(() => {
    helpers.UI.selectize()
    const $select = $(selectRef.current)

    if (multiple) valueRef.current = []
    if (defaultValue) valueRef.current = defaultValue

    updateSelectizeItems()
    $select.on('change', handleSelectChange)

    return () => {
      const selectize = selectRef.current?.selectize
      if (selectize) selectize.destroy()
      $select.off('change', handleSelectChange)
    }
  }, []) // Initial mount

  React.useEffect(() => {
    updateSelectizeItems()
  }, [items, defaultValue, disabled, updateSelectizeItems])

  let width = '100%'
  if (propWidth) width = propWidth

  const value = multiple && !isArray(valueRef.current) ? [valueRef.current] : valueRef.current

  return (
    <div className={'uk-clearfix'}>
      <div className='uk-width-1-1 uk-float-right' style={{ paddingRight: '10px', width: width }}>
        <select
          className='selectize'
          ref={selectRef}
          data-md-selectize-inline
          data-md-selectize-notextbox={showTextbox ? 'false' : 'true'}
          value={value}
          onChange={() => {}}
          disabled={disabled}
          data-md-selectize-bottom='true'
          multiple={multiple}
          data-md-selectize-top-offset='-32'
        />
      </div>
    </div>
  )
}

SingleSelect.propTypes = {
  width: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  multiple: PropTypes.bool,
  showTextbox: PropTypes.bool,
  defaultValue: PropTypes.string,
  disabled: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  onSelectChange: PropTypes.func
}

SingleSelect.defaultProps = {
  showTextbox: true,
  disabled: false,
  multiple: false
}

export default SingleSelect
