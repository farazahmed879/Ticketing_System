import React from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'
import { observer } from 'mobx-react'

const TruAccordion = observer(props => {
  const [expanded, setExpanded] = React.useState(props.startExpanded)
  const [expandedContentShown, setExpandedContentShown] = React.useState(props.startExpanded)

  const onHeaderClick = e => {
    e.preventDefault()
    if (expanded === false) setExpandedContentShown(true)

    setTimeout(() => {
      const newExpanded = !expanded
      setExpanded(newExpanded)

      if (props.onExpandedChange) props.onExpandedChange(newExpanded)
    }, 10)

    setTimeout(() => {
      setExpandedContentShown(!expanded)
    }, 300)
  }

  const { headerContent, content, contentPadding } = props
  const contentStyle = {}
  if (typeof contentPadding !== 'undefined') contentStyle.padding = contentPadding

  return (
    <div className={clsx('truaccordion-wrapper', expanded && ' expanded')}>
      <div className={'truaccordion-header'} role={'button'} onClick={e => onHeaderClick(e)}>
        <div className={'truaccordion-header-content'}>
          <h4>{headerContent}</h4>
          <div className={'arrow'}>
            <span>
              <i className={'material-icons'}>chevron_right</i>
            </span>
          </div>
        </div>
      </div>
      {expandedContentShown && (
        <div className={'truaccordion-content'}>
          <div className={'truaccordion-content-inner'} style={contentStyle}>
            {content}
          </div>
        </div>
      )}
    </div>
  )
})

TruAccordion.propTypes = {
  startExpanded: PropTypes.bool,
  onExpandedChange: PropTypes.func,
  contentPadding: PropTypes.number,

  headerContent: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired
}

TruAccordion.defaultProps = {
  startExpanded: false
}

export default TruAccordion
