import React from 'react'
import PropTypes from 'prop-types'

import helpers from 'lib/helpers'

const Input = props => {
  const { name, type, defaultValue, onChange } = props
  // eslint-disable-next-line no-unused-vars
  const [value, setValue] = React.useState('')

  React.useEffect(() => {
    helpers.UI.inputs()
  }, [])

  const handleChange = e => {
    const newVal = e.target.value
    setValue(newVal)
    if (onChange) onChange(newVal)
  }

  return (
    <div>
      <input className={'md-input'} name={name} type={type} defaultValue={defaultValue} onChange={handleChange} />
    </div>
  )
}

Input.propTypes = {
  name: PropTypes.string,
  type: PropTypes.string,
  defaultValue: PropTypes.string,
  onChange: PropTypes.func
}

Input.defaultProps = {
  type: 'text'
}

export default Input
