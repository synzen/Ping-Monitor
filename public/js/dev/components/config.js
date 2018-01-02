import React from 'react'
import ReactDOM from 'react-dom'
import request from '../util/request.js'

export default class Configuration extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      shown: false,
      zIndex: -1,
      allowEmailConfig: false,
      emailSettingsHeight: '0',
      emailFailsafeHeight: '0',
      pingSettingsHeight: '0',
      errHTML: ''
    }
  }
  componentDidMount() {
    this.setDefaultVals()
  }
  sendToServer() {
    const emailSettings = {
      enabled: this._emailEnableSelect.options[this._emailEnableSelect.selectedIndex].value === 'enabled' ? true : false,
      hostname: this._emailHostname.value,
      username: this._emailUsername.value,
      password: this._emailPassword.value,
      from: this._emailTo.value,
      to: this._emailFrom.value
    }
    const emailFailsafe = {
      intervalSeconds: this._failsafeInterval.value,
      maxEmails: this._failsafeCount.value
    }
    const pingSettings = {
      pingCount: this._pingCount.value,
      pingDelayMin: this._pingDelay.value,
      pingConfirms: this._pingConfirms.value
    }
    const self = this
    request('/setconfig', {emailSettings: emailSettings, emailFailsafe: emailFailsafe, pingSettings}, 'json', function(data) {
      console.log('completed config set')
      if (data.err) self.props.setStatusText(data.err)
      else self.props.setStatusText('Successful')
      self.hide()
    })
  }
  setDefaultVals() {
    const self = this
    request('/getconfig', {}, 'json', function(result) {
      const allowEmailConfig = result.allowEmailConfig
      const data = result.data
      self.setState({allowEmailConfig: allowEmailConfig})
      if (data.err) return self.props.setStatusText(data.err)
      if (data.emailCreds.enabled === true) self._enabledOption.selected = true
      else self._enabledOption.selected = false
      self._emailHostname.value = data.emailCreds.hostname
      self._emailUsername.value = data.emailCreds.username
      self._emailPassword.value = data.emailCreds.password
      self._emailTo.value = data.emailCreds.to
      self._emailFrom.value = data.emailCreds.from
      self._failsafeInterval.value = data.emailFailsafe.intervalSeconds
      self._failsafeCount.value = data.emailFailsafe.maxEmails
      self._pingCount.value = data.pingCount
      self._pingDelay.value = data.pingDelayMin
      self._pingConfirms.value = data.pingConfirms
    })
  }
  handleClickOutside(e) {
    if (this.state.shown && !this._dialog.contains(e.target)) this.hide()
  }
  hide() {
    this.setDefaultVals()
    this.setState({shown: false})
    const self = this
    document.removeEventListener('click', this.handleClickOutside.bind(this), true)
    setTimeout(function() {
      self.setState({zIndex: -1})
    }, 500)
  }
  show() {
    Materialize.updateTextFields()
    document.addEventListener('click', this.handleClickOutside.bind(this), true)
    this.setState({shown: true, zIndex: 100})
  }
  render() {
    const backdropClass = this.state.shown ? 'modal-backdrop shown' : 'modal-backdrop'
    const cardClass = this.state.shown ? 'long-modal-card shown' : ''

    const emailConfigForm = this.state.allowEmailConfig ?
    <div><h6 className="spaced-flex"><b>Email Settings</b>{this.state.emailSettingsHeight === '490px' ? <div className="btn btn-flat centered-flex unselectable" onClick={() => this.setState({emailSettingsHeight: this.state.emailSettingsHeight === '490px' ? '0' : '490px'})}><i className="material-icons">expand_less</i></div> : <div className="btn btn-flat centered-flex unselectable" onClick={() => this.setState({emailSettingsHeight: this.state.emailSettingsHeight === '490px' ? '0' : '490px'})}><i className="material-icons">expand_more</i></div>}</h6>
    <div className="config-input-group" style={{maxHeight: this.state.emailSettingsHeight}}>
      <div className="input-field" style={{paddingBottom: '2px'}}>
        <select ref={(elem) => this._emailEnableSelect = elem}>
          <option value="enabled" ref={(elem) => this._enabledOption = elem}>Enabled</option>
          <option value="disabled" ref={(elem) => this._disabledOption = elem}>Disabled</option>
        </select>
        <label>Enable/Disable</label>
      </div>
      <div className="input-field">
        <input ref={(elem) => this._emailHostname = elem} id="config-email-hostname" type="text"/>
        <label htmlFor="config-email-hostname">Hostname</label>
      </div>
      <div className="input-field">
        <input ref={(elem) => this._emailUsername = elem} id="config-email-username" type="text"/>
        <label htmlFor="config-email-username">Username</label>
      </div>
      <div className="input-field">
        <input ref={(elem) => this._emailPassword = elem} id="config-email-password" type="text"/>
        <label htmlFor="config-email-password">Password</label>
      </div>
      <div className="input-field">
        <input ref={(elem) => this._emailFrom = elem} id="config-email-from" type="email"/>
        <label htmlFor="config-email-from" data-error="Invalid Email">From</label>
      </div>
      <div className="input-field">
        <input className="tooltipped" data-position="bottom" data-delay="50" data-tooltip="Each recipient is separated by a comma." ref={(elem) => this._emailTo = elem} id="config-email-to" type="text"/>
        <label htmlFor="config-email-to">To</label>
      </div>
    </div>
    <br/></div>
    :
    null

    return (
      <div>
      <div className={backdropClass} style={{zIndex: this.state.zIndex}}>
        <div className={cardClass}>
          <div ref={(elem) => this._dialog = elem} className="card">
          <div></div>
          <p style={{fontSize: '120%'}} className="red-color"><b>Only limited validation is provided. Proceed with caution.</b></p>

          {emailConfigForm}

          <h6 className="spaced-flex"><b>Email Failsafe</b>{this.state.emailFailsafeHeight === '165px' ? <div className="btn btn-flat centered-flex unselectable" onClick={() => this.setState({emailFailsafeHeight: this.state.emailFailsafeHeight === '165px' ? '0' : '165px'})}><i className="material-icons">expand_less</i></div> : <div className="btn btn-flat centered-flex unselectable" onClick={() => this.setState({emailFailsafeHeight: this.state.emailFailsafeHeight === '165px' ? '0' : '165px'})}><i className="material-icons">expand_more</i></div>}</h6>
          <div className="config-input-group" style={{maxHeight: this.state.emailFailsafeHeight}}>
            <div className="input-field">
              <input className="tooltipped" data-position="bottom" data-delay="50" data-tooltip="The maximum number of emails allowed in an interval before disabling emails." ref={(elem) => this._failsafeCount = elem} id="config-failsafe-email-count"  type="number"/>
              <label htmlFor="config-failsafe-email-count">Max Emails</label>
            </div>
            <div className="input-field">
              <input className="tooltipped" data-position="bottom" data-delay="50" data-tooltip="The interval during which the number of emails must be sent to trigger the failsafe." ref={(elem) => this._failsafeInterval = elem} id="config-failsafe-email-interval"  type="number"/>
              <label htmlFor="config-failsafe-email-interval">Interval (sec)</label>
            </div>
          </div>

          <br/>

          <h6 className="spaced-flex"><b>Ping Settings</b>{this.state.pingSettingsHeight === '240px' ? <div className="btn btn-flat centered-flex unselectable" onClick={() => this.setState({pingSettingsHeight: this.state.pingSettingsHeight === '240px' ? '0' : '240px'})}><i className="material-icons">expand_less</i></div> : <div className="btn btn-flat centered-flex unselectable" onClick={() => this.setState({pingSettingsHeight: this.state.pingSettingsHeight === '240px' ? '0' : '240px'})}><i className="material-icons">expand_more</i></div>}</h6>
          <div className="config-input-group" style={{maxHeight: this.state.pingSettingsHeight}}>
            <div className="input-field">
              <input className="tooltipped" data-position="bottom" data-delay="50" data-tooltip="The number of pings sent to each client to determine its status." ref={(elem) => this._pingCount = elem} id="config-ping-count" type="number"/>
              <label htmlFor="config-ping-count">Number of Pings</label>
            </div>
            <div className="input-field">
              <input className="tooltipped" data-position="bottom" data-delay="50" data-tooltip="The delay between every round of pings in minutes." ref={(elem) => this._pingDelay = elem} id="config-ping-delay" type="number"/>
              <label htmlFor="config-ping-delay">Delay (min)</label>
            </div>
            <div className="input-field">
              <input className="tooltipped" data-position="bottom" data-delay="50" data-tooltip="The number of instances a status should be confirmed before official status update." ref={(elem) => this._pingConfirms = elem} id="config-ping-confirms" type="number"/>
              <label htmlFor="config-ping-confirms">Number of Confirmations</label>
            </div>
          </div>

          <div>
            <br/>
            <button className="btn btn-success waves-effect waves-light" onClick={() => this.sendToServer()}>Save</button>
            <button className="btn btn-default waves-effect waves-light" onClick={() => this.hide()}>Cancel</button>
          </div>

          </div>
        </div>
      </div>
      <button type="button" className="btn-flat waves-effect waves-light" onClick={() => this.show()}>Config</button>
      </div>
    )
  }
}
