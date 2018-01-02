import React from 'react'
import ReactDOM from 'react-dom'
import request from '../util/request.js'

export default class ActivityLog extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      shown: undefined,
      logHTML: ''
    }
  }
  componentWillMount() {
    const self = this
    this.setState({shown: this.props.shown})
    request('/activitylog', {}, 'json', function(data) {
      self.updateLog(data.log)
    })

    socket.on('activityLog', this.updateLog.bind(this))
  }
  componentWillReceiveProps(nextProps) {
    if (this.state.shown !== nextProps.shown) this.setState({shown: nextProps.shown})
  }
  updateLog(log) {
    let html = ''
    for (var x = log.length - 1; x >= 0; x--) {
      const timestamp = `<span style="color: gray">${log[x].timestamp}</span>`
      const content = log[x].content
          .replace(/(ONLINE)/, '<span class="green-color"><b>$1</b></span>')
          .replace(/(OFFLINE)/, '<span class="red-color"><b>$1</b></span>')
          .replace(/(kill signal.*)/i, '<span class="red-color"><b>$1</b></span>')

      html += `<p>${timestamp} - ${content}</p>`
    }
    this.setState({logHTML: html})
  }
  render() {
    const logWrapperClass = this.state.logHTML && this.state.shown ? 'shown card-small' : 'card-small'

    return (
      <div><br/>
      <div id="activity-log-wrapper" className={logWrapperClass}>
        <div><h5>Server Activity Log</h5><i className="material-icons" onClick={() => this.props.toggleShown()}>close</i></div>
        <div id="activity-log" dangerouslySetInnerHTML={{__html: this.state.logHTML}}>
        </div>
      </div>
      </div>
    )
  }
}
