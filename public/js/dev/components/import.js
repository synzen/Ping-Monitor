import React from 'react'
import ReactDOM from 'react-dom'
import request from '../util/request.js'

export default class ImportClients extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      shown: false,
      zIndex: -1,
      statusText: 'Awaiting Input...',
      progressHTML: '',
      errorHTML: '',
      importing: false,
      finishedImport: false
    }
  }
  componentDidMount() {
    const self = this
    request('/importing', {}, 'json', function(data) {
      if (data.importing) self.setState({importing: true, statusText: ''})
    })

    socket.on('importStatus', function(data) {
      if (self.state.importing || self.state.finishedImport) self.setState({statusText: data})
    })
    socket.on('importLog', function(log) {
      // if (!self.state.importing) return
      if (log.error) {
        self.setState({errorHTML: self.state.errorHTML += `<p>${log.error.replace(/(Error:)/, '<span class="red-color">$1</span>')}</p>`})
      }
      else self.setState({progressHTML: self.state.progressHTML += `<p>${log.content.replace(/(Added:)/, '<span class="green-color">$1</span>')}</p>`})
    })

    socket.on('connect', function() {
      self.setState({statusText: 'Awaiting Input...'})
    })
    socket.on('disconnect', function() {
      self.setState({statusText: '<span class="red-color"><b>DISCONNECTED</b></span>'})
    })
  }
  handleClickOutside(e) {
    if (this.state.shown && !this._dialog.contains(e.target)) this.hide()
  }
  handleFile(e) {
    const btnClass = this._addFileBtn.classList
    if (btnClass.contains('disabled')) return
    const self = this
    const files = e.target.files
    // for (var i = 0; i != files.length; ++i) {
    const f = files[0]
    const reader = new FileReader()
    reader.onload = function(e) {
      const data = e.target.result
      let workbook
      try {workbook = XLSX.read(data, {type: 'binary'})} catch(e) {
        return self.setState({statusText: `<span class="red-color" style="text-align: center">Invalid Workbook<br/>${f.name}</span>`, errorHTML: '', progressHTML: ''})
      }
      self.setState({errorHTML: '', progressHTML: '', importing: true})
      request('/import', {workbookSheets: workbook.Sheets, fileName: f.name}, 'json', function(data) {

        setTimeout(function() {
          self.setState({importing: false, finishedImport: true})
        }, 500)
      })
    }
    reader.readAsBinaryString(f)
  }
  hide() {
    document.removeEventListener('click', this.handleClickOutside.bind(this), true)
    this.setState({shown: false})
    const self = this
    setTimeout(function() {
      const newState = {zIndex: -1, finishedImport: false}
      if (!self.state.importing) {
        newState.errorHTML = ''
        newState.progressHTML = ''
        newState.statusText = 'Awaiting Input...'
      }
      self.setState(newState)
    }, 300)
  }
  selectFile(e) {
    const btnClass = this._addFileBtn.classList
    if (btnClass.contains('disabled')) return e.preventDefault()
    e.target.value = null
  }
  show() {
    document.addEventListener('click', this.handleClickOutside.bind(this), true)
    this.setState({shown: true, zIndex: 100})
  }
  render() {
    const titleText = this.state.importing ? 'Import in progress...' : 'Select a File'
    const backdropClass = this.state.shown ? 'modal-backdrop shown' : 'modal-backdrop'
    const cardWrapperClass = this.state.shown ? 'shown' : ''
    const progressHTML = this.state.progressHTML
    const errorHTML = this.state.errorHTML
    const progressDivClass = this.state.progressHTML ? 'shown' : ''
    const errorsDivClass = this.state.errorHTML ? 'shown' : ''
    const addFileBtnClass = this.state.importing ? "btn btn-info card-small disabled" : "btn btn-info card-small"
    const addFileBtnText = this.state.importing ? "Importing..." : "Choose a file"

    const statusWrapperClass = this.state.importing ? 'loading' : ''
    const loaderAnimStatusClass = this.state.importing ? 'full-box-status shown' : 'full-box-status'
    const textStatusClass = !this.state.importing ? 'full-box-status shown' : 'full-box-status shown'
    const textStatusHTML = this.state.statusText === '100.00%' ? `<span class="green-color" style="font-weight: 600">Completed</span>` : this.state.statusText
    const closeBtnClass = this.state.importing ? 'btn btn-default card-small minimized' : 'btn btn-default card-small'

    return (
      <div id="import-clients-area">

      <div className={backdropClass} style={{zIndex: this.state.zIndex}}>
        <div className={cardWrapperClass}>
          <div ref={(elem) => this._dialog = elem} className="card">

              <h5 className="centered-flex">{titleText}</h5>
              <div id="import-clients-status-wrapper" className={statusWrapperClass}>
                <div className={loaderAnimStatusClass}><div className="cssload-loader" style={{color: '#1dc1e6', fontSize:'15px'}}></div></div>
                <div className={textStatusClass} style={{color: this.state.importing ? '#4dd0e1' : 'black'}} dangerouslySetInnerHTML={{__html: textStatusHTML}}></div>
              </div>
              <div id="import-clients-progress"className={progressDivClass} dangerouslySetInnerHTML={{__html: progressHTML}}></div>
              <div id="import-clients-errors" className={errorsDivClass} dangerouslySetInnerHTML={{__html: errorHTML}}></div>
              <br/>
              <div>
                <input type="file" name="file" id="file" className="inputfile" onChange={(e) => this.handleFile(e)} onClick={(e) => this.selectFile(e)}/>
                <label ref={(elem) => this._addFileBtn = elem} className={addFileBtnClass} htmlFor="file">{addFileBtnText}</label>
                <button className={closeBtnClass} onClick={() => this.hide()}>Close</button>
              </div>

              </div>
            </div>
          </div>

        <button type="button" className="btn-flat card waves-effect waves-light util-btn" onClick={() => this.show()}>Import</button>
      </div>
    )
  }
}
