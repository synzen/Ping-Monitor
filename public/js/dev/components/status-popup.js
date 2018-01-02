import React from 'react'
import ReactDOM from 'react-dom'
import request from '../util/request.js'
import ImportClients from './import.js'
import ExportClients from './export.js'

export default class StatusPopup extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      shown: false,
      zIndex: -1,
      text: ''
    }
  }
  componentWillMount() {
    const self = this
    if (this.props.text) {
      this.setState({text: this.props.text, zIndex: 1, shown: true})
      setTimeout(function() {
        self.setState({shown: false})
      }, 4000)
    }
    request('/importing', {}, 'json', function(data) {
      if (data.importing) self.setState({shown: true, text: 'Import is in progress from a previous session...'})
    })
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.text !== nextProps.text) {
      const self = this
      this.setState({text: nextProps.text, zIndex: 1, shown: true})
      setTimeout(function() {
        self.setState({shown: false})
      }, 4000)
    }
  }
  render() {
    const statusTextClass = this.state.shown ? 'centered-flex unselectable shown' : 'centered-flex unselectable'

    return (
      <div id="status-popup-wrapper" className="centered-flex" style={{zIndex: this.state.zIndex}}>
        <div className={statusTextClass}>{this.state.text}</div>
      </div>
    )
  }
}
