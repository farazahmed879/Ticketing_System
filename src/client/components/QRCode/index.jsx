import React from 'react'
import PropTypes from 'prop-types'

import $ from 'jquery'
import 'qrcode'

const QRCode = props => {
  const { size, code, css: propCss } = props
  const qrcodeDivRef = React.useRef()

  React.useEffect(() => {
    if (qrcodeDivRef.current) {
      const $div = $(qrcodeDivRef.current)
      $div.empty()
      $div.qrcode({ width: size, height: size, text: code })
    }
  }, [size, code])

  const css = propCss || {}

  return (
    <div style={css}>
      <div ref={qrcodeDivRef}></div>
    </div>
  )
}

QRCode.propTypes = {
  code: PropTypes.string.isRequired,
  size: PropTypes.number,
  css: PropTypes.object
}

QRCode.defaultProps = {
  size: 240
}

export default QRCode
