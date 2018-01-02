import React from 'react'
import ReactDOM from 'react-dom'
import request from '../util/request.js'

export default class ExportClients extends React.Component {
  convertToSheet() {
    this.props.setStatusText('Converting and exporting clients...')
    const clients = this.props.clients
    const self = this
    request('/export', {}, 'json', function(data) {
      console.log('done')
      self.props.setStatusText('Export complete.')
      var file_path = `${location.protocol}//${location.hostname}:${location.port}/export`
      console.log(file_path)
      console.log('here')
      var a = document.createElement('A')
      a.href = file_path
      a.download = file_path.substr(file_path.lastIndexOf('/') + 1)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    })
  }
  render() {
    return (
      <div id="export-clients-area">
        <button type="button" className="btn-flat util-btn" onClick={() => this.convertToSheet()}>Export</button>
      </div>
    )
  }
}
