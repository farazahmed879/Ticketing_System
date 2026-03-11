import React from 'react'
import PropTypes from 'prop-types'

const Spacer = props => {
  return (
    <div style={{ display: 'block', marginTop: props.top, marginBottom: props.bottom }}>
      {props.showBorder && <hr style={{ display: 'block', margin: 0, height: props.borderSize }} />}
    </div>
  )
}

Spacer.propTypes = {
  top: PropTypes.number,
  bottom: PropTypes.number,
  showBorder: PropTypes.bool,
  // borderColor: PropTypes.string,
  borderSize: PropTypes.number
}

Spacer.defaultProps = {
  top: 15,
  bottom: 15,
  showBorder: false,
  borderSize: 2
}

export default Spacer
