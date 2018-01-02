import React from 'react'
import ReactDOM from 'react-dom'
import request from '../util/request.js'
import ImportClients from './import.js'
import ExportClients from './export.js'
import Configuration from './config.js'

export default class TopNav extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      utilsShown: false,
      killswitchClicked: false,
      killswitchZIndex: -1
    }
  }
  handleClickOutside(e) {
    if (this.state.killswitchClicked && !this._editDialog.contains(e.target)) this.hide()
  }
  forceRefresh() {
    const self = this
    this.props.setStatusText('Forcing a refresh...')
    request('/ping', {}, 'json', function(data) {
      console.log('completed ping')
      if (data.err) self.props.setStatusText(data.err)
      else self.props.setStatusText('Refresh successful.')
    })
  }
  showKillWarning() {
    document.addEventListener('click', this.handleClickOutside.bind(this), true)
    this.setState({killswitchClicked: true, killswitchZIndex: 100})
  }
  sendKillSignal() {
    this.hide()
    request('/kill', {}, 'json', function(data) {
    })
  }
  hide() {
    this.setState({killswitchClicked: false})
    const self = this
    document.removeEventListener('click', this.handleClickOutside.bind(this), true)
    setTimeout(function() {
      self.setState({killswitchZIndex: -1})
    }, 500)
  }
  render() {
    const utilsBtnsClass = this.state.utilsShown ? 'centered-flex shown' : 'centered-flex'
    const gearBtnClass = this.state.utilsShown ? 'material-icons active' : 'material-icons'

    const backdropClass = this.state.killswitchClicked ? 'modal-backdrop shown' : 'modal-backdrop'
    const cardClass = this.state.killswitchClicked ? 'shown' : ''

    return (
      <div id="top-nav">
        <div className="centered-flex unselectable btn-flat waves-effect waves-light" onClick={() => this.setState({utilsShown: !this.state.utilsShown})}><i className={gearBtnClass}>settings</i></div>
        <div id="utilities-btns" className={utilsBtnsClass}>
          <button type="button" className="btn-flat waves-effect waves-light" onClick={() => this.props.toggleActivityLog()}>Log</button>
          <ImportClients/>
          <ExportClients clients={this.props.clients} setStatusText={(t) => this.props.setStatusText(t)}/>
          <button type="button" className="btn-flat waves-effect waves-light" onClick={() => this.forceRefresh()}>Refresh</button>
          <Configuration setStatusText={this.props.setStatusText}/>
          <button id="utility-kill-btn" type="button" className="btn-flat waves-effect waves-light" onClick={() => this.showKillWarning()}>Kill</button>
        </div>


        <div className={backdropClass} style={{zIndex: this.state.killswitchZIndex}}>
          <div className={cardClass}>
            <div ref={(elem) => this._editDialog = elem} className="card">
              <div></div>
              <div id="killswitch-warning" className="centered-flex">
                  <h4>Are you sure?</h4>
              </div>
              <p className="centered-flex">This will stop the server process, and the UI will be disconnected until the server is manually restarted.</p>
              <div>
              <br/>
                <button className="btn btn-success waves-effect waves-green" onClick={() => this.hide()}>No</button>
                <button className="btn btn-danger waves-effect waves-red" onClick={() => this.sendKillSignal()}>Yes</button>
              </div>

            </div>
          </div>
        </div>


      </div>
    )
  }
}
