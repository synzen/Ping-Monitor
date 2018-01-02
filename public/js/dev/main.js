import React from 'react'
import ReactDOM from 'react-dom'
import request from './util/request.js'
import Alert from './components/alert.js'
import StatusPopup from './components/status-popup.js'
import TopNav from './components/topnav.js'
import ActivityLog from './components/log.js'

function allClientsStatus(obj, status) {
  if (obj.length === 0) return null
  let upCount = 0
  let downCount = 0
  let pendingCount = 0

  for (var x in obj) {
    if (obj[x].pending) pendingCount++
    else if (obj[x].status) upCount++
    else if (!obj[x].status) downCount++
  }

  const count = status === 'up' ? upCount : status === 'down' ? downCount : status === 'pending' ? pendingCount : null

  if (count === obj.length) return {status: true}
  else return {status: false, count: count}
}

function hasClientStatus(obj, status, pending) {
  const state = status === 'up' ? true : status === 'down' ? false : null

  for (var x in obj) {
    if (pending && obj[x].pending) return true
    else if (obj[x].status === state && !obj[x].pending) return true
  }
  return false
}

function hasAllPendingClients(obj) {
  for (var x in obj) {
    if (!obj[x].pending) return false
  }
  return true
}

function hasClient(obj, ip) {
  for (var x in obj) {
    if (obj[x].ip === ip) return true
  }
  return false
}

function getClientDetails(ip, clients) {
  for (var x in clients) {
    if (clients[x].ip === ip) return clients[x]
  }
}

class Main extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showDataBoxes: true,
      uptime: '',
      clients: [],
      filteredClients: [],
      presetFilter: undefined,
      lastCheckDate: undefined,
      activeSearch: false,
      pendingCount: 0,
      upCount: 0,
      downCount: 0,
      downClientIPs: [],
      webOnline: true,
      showActivityLog: false,
      utilsShown: false,
      statusPopupText: '',
      showAlerts: false
    }
  }
  componentWillMount() {
    const self = this
    request('/clients', {}, 'json', function(data, err) {
      self.updateClients(data.clients)
    })
    socket.on('connect', function() {
      self.setState({webOnline: true})
    })
    socket.on('disconnect', function() {
      self.setState({webOnline: false})
    })
    socket.on('updatedClients', function(data) {
      self.updateClients(data)
    })
    socket.on('uptime', function(data) {
      self.setState({uptime: data})
    })
  }
  updateClients(nextClients) {
    const self = this
    if (!nextClients) return request('/clients', {}, 'json', function(data, err) {
      self.updateClients(data.clients)
    })
    const thisClients = this.state.clients
    const filteredClientsClone = []
    let pendingCount = 0
    let upCount = 0
    let downCount = 0
    const downClientIPs = []
    for (var q in nextClients) {
      const updatedClient = nextClients[q]
      if (updatedClient.pending) pendingCount++
      else if (updatedClient.status) upCount++
      else {
        downClientIPs.push(updatedClient.ip)
        downCount++
      }
      if (!updatedClient.pending && updatedClient.status && this.state.filteredClients.length > 0 && allClientsStatus(this.state.filteredClients, 'up').status === true) {
        filteredClientsClone.push(updatedClient)
      } else if (!updatedClient.pending && !updatedClient.status && this.state.filteredClients.length > 0 && allClientsStatus(this.state.filteredClients, 'down').status === true) {
        filteredClientsClone.push(updatedClient)
      } else if (updatedClient.pending && this.state.filteredClients.length > 0 && allClientsStatus(this.state.filteredClients, 'pending').status === true) {
        filteredClientsClone.push(updatedClient)
      }
    }
    const newState = {clients: nextClients, lastCheckDate: new Date().toString(), upCount: upCount, downCount: downCount, downClientIPs: downClientIPs, pendingCount: pendingCount}
    if (!this.state.activeSearch) {
      newState.filteredClients = filteredClientsClone
      this.setState(newState)
    } else {
      this.setState(newState)
      this.search()
    }

    this.search()
  }
  search() {
    const term = this._clientSearch.value
    if (!term) return this.setState({filteredClients: [], activeSearch: false})
    const clients = this.state.clients
    const filteredClients = []
    for (var i in clients) {
      const client = clients[i]
      const nameArray = clients[i].name.split(' ')
      const searchArray = term.split(' ')

      for (var t in searchArray) {
        const searchTerm = searchArray[t]
        for (var x in nameArray) {
          if (nameArray[x].toLowerCase().includes(searchTerm.toLowerCase())) filteredClients.push(client)
        }
        if (client.ip.toLowerCase().includes(searchTerm.toLowerCase())) filteredClients.push(client)//filteredClients[ip] = clients[ip]
      }

    }

    this.setState({filteredClients : filteredClients, activeSearch: true})
  }
  presetFilter(e, status) {
    if (e.target.className.split(' ').includes('disabled')) return
    if (status === 'all') return this.setState({filteredClients: [], activeSearch: false})
    if (status !== 'up' && status !== 'down' && status !== 'pending') return
    const clients = this.state.clients
    const filteredClients = []
    for (var i in clients) {
      if ((status === 'up' && clients[i].status) || (status === 'down' && !clients[i].status && !clients[i].pending) || (status === 'pending' && clients[i].pending)) filteredClients.push(clients[i])
    }
    this.setState({filteredClients : filteredClients, activeSearch: true})
  }
  render() {
    const allFilterBtnClass = this.state.filteredClients.length === 0 ? 'btn btn-info waves-effect waves-light' : 'btn-flat'
    const upFilterBtnClass = this.state.filteredClients.length > 0 && allClientsStatus(this.state.filteredClients, 'up').status ? 'btn btn-success waves-effect waves-light' : this.state.clients.length === 0 || !hasClientStatus(this.state.clients, 'up') ? 'btn-flat disabled' : 'btn-flat upFilterBtn'
    const downFilterBtnClass = this.state.filteredClients.length > 0 && allClientsStatus(this.state.filteredClients, 'down').status ? 'btn btn-danger waves-effect waves-light' : this.state.clients.length === 0 || !hasClientStatus(this.state.clients, 'down') ? 'btn-flat disabled' : 'btn-flat downFilterBtn'
    const pendingFilterBtnClass = this.state.filteredClients.length > 0 && allClientsStatus(this.state.filteredClients, 'pending').status ? 'btn btn-warning waves-effect waves-light' : this.state.clients.length === 0 || !hasClientStatus(this.state.clients, 'pending', true) ? 'btn-flat disabled' : 'btn-flat placeholderFilterBtn'
    const alert = this.state.failCount > 0 ? <div className="alert alert-warning alert-dismissable"><p>{this.state.failCount} client{this.state.failCount > 1 ? 's' : ''} requires attention</p><a href="#" className="close" data-dismiss="alert" aria-label="close"><span className="glyphicon glyphicon-remove"/></a></div> : null

    const siteStatus = this.state.webOnline ? 'CONNECTED' : 'DISCONNECTED'
    const siteStatusClass = this.state.webOnline ? 'online' : 'offline'

    const downClientIPs = this.state.downClientIPs
    const alerts = []
    for (var g in downClientIPs) {
      alerts.push(<Alert key={'downip-' + downClientIPs[g]} name={getClientDetails(downClientIPs[g], this.state.clients).name} ip={downClientIPs[g]}/>)
    }

    return (
    <div id="main-content-wrapper">
    <StatusPopup text={this.state.statusPopupText}/>
    <TopNav toggleActivityLog={() => this.setState({showActivityLog: !this.state.showActivityLog})} webOnline={this.state.webOnline} clients={this.state.clients} setStatusText={(t) => this.setState({statusPopupText: t})}/>
    <div id="header">
      <br/><br/><br/>

      <div>
        <img id="logo" src="companylogo.jpg"/>
        <h4>Network Operations Center</h4>
        <h5 className={siteStatusClass}>{siteStatus}</h5>
      </div>

      <br/>
    </div>
      <div id="main-content">
        <br/>

        {this.state.showAlerts ? alerts : undefined}
        <ActivityLog shown={this.state.showActivityLog} toggleShown={() => this.setState({showActivityLog: !this.state.showActivityLog})}/>
        <br/>

        <div id="filter-box-wrapper">
          <input type="text" ref={(elem) => this._clientSearch = elem} className="form-control" id="client-search" placeholder="Search" onChange={(e) => this.search(e)}/>
          <div id="filter-preset-box">
            <button type="button" className={allFilterBtnClass} onClick={(e) => this.presetFilter(e, 'all')}>All {'('}{this.state.clients.length}{')'}</button>
            <button type="button" className={upFilterBtnClass} onClick={(e) => this.presetFilter(e, 'up')}>{'Up (' + this.state.upCount + ')'}</button>
            <button type="button" className={downFilterBtnClass} onClick={(e) => this.presetFilter(e, 'down')}>Down {'('}{this.state.downCount}{')'}</button>
            <button type="button" className={pendingFilterBtnClass} onClick={(e) => this.presetFilter(e, 'pending')}>{'Pending (' + this.state.pendingCount + ')'}</button>
          </div>
        </div>
        <br/>

        <IPTable updateClients={() => this.updateClients()} filteredClients={this.state.filteredClients.length > 0 ? this.state.filteredClients : this.state.clients} clients={this.state.clients} activeSearch={this.state.activeSearch}/>
        <br/><br/>
        <AddClient updateClients={() => this.updateClients()} clients={this.state.clients}/>


      </div>
      <br/>
      <p className="last-check-date head">Last Checked:</p>
      <p className="last-check-date date">{this.state.lastCheckDate}</p>
      <button className="centered-flex btn-flat waves-effect waves-light tooltipped" data-position="top" data-delay="50" data-tooltip="Visual alerts for every client that is down" onClick={() => this.setState({showAlerts: !this.state.showAlerts})}>{this.state.showAlerts ? 'Disable Alerts' : 'Enable Alerts'}</button>

      <br/><br/>
    </div>
    )
  }
}

class IPTable extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      namesOrdered: false,
      ipOrdered: false,
      statusOrdered: false,
      pageLength: 10,
      currentPage: 0,
      showAll: false,  // Always show table if custom page was set that showed all listings
      clients: [],
      settingCustomPage: false,
      settingCustomPageLen: false,
      overflow: 'auto'
    }
  }
  componentWillReceiveProps(nextProps) {
    if (JSON.stringify(this.props) === JSON.stringify(nextProps)) return
    const lastOrdered = this.state.lastOrdered
    if (this.state.currentPage + 1 > nextProps.clients.length && this.state.currentPage !== 0) this.setState({currentPage: nextProps.clients.length - 1})
    if (!nextProps.activeSearch) {
      this.sortNames(nextProps.clients, false, true)
    }
    else if (nextProps.activeSearch) {
      this.sortNames(nextProps.filteredClients, false, true)
    }
  }
  removeClient(client) {
    const self = this
    request('/removeclient', {client: client}, 'json', function() {})
  }
  sortNames(clients, consistent, normalized) {
    const self = this
    const clientsCopy = JSON.parse(JSON.stringify(clients))
    clientsCopy.sort(function(current, next) {
      if (!self.state.namesOrdered || normalized) return (current.name < next.name) ? -1 : (current.name > next.name) ? 1 : 0;
      else return (current.name > next.name) ? -1 : (current.name < next.name) ? 1 : 0;
    })
    const orderState = consistent ? this.state.namesOrdered : !this.state.namesOrdered
    this.setState({clients: clientsCopy, namesOrdered: orderState})
  }
  sortIP(clients, consistent, normalized) {
    const self = this
    const clientsCopy = JSON.parse(JSON.stringify(clients))
    clientsCopy.sort(function(current, next) {
      const currentIP = parseInt(current.ip.replace(/\./g, ''),10)
      const nextIP = parseInt(next.ip.replace(/\./g, ''),10)
      if (!self.state.ipOrdered || normalized) return (currentIP < nextIP) ? -1 : (currentIP > nextIP) ? 1 : 0;
      else return (currentIP > nextIP) ? -1 : (currentIP < nextIP) ? 1 : 0;
    })
    const orderState = consistent ? this.state.ipOrdered : !this.state.ipOrdered
    this.setState({clients: clientsCopy, ipOrdered: orderState})
  }
  sortStatus(clients, consistent, normalized) {
    const self = this
    const clientsCopy = JSON.parse(JSON.stringify(clients))
    clientsCopy.sort(function(current, next) {
      let goodToBad = 0

      if (current.status && !current.pending && (!next.status || next.pending)) goodToBad = -1
      else if (current.status && !current.pending && next.status && !next.pending) goodToBad = 0
      else if (current.pending && !next.status && !next.pending) goodToBad = -1
      else if (current.pending && next.status && !next.pending) goodToBad = 1
      else if (current.pending && next.pending) goodToBad = 0
      else if (!current.status && !current.pending) goodToBad = 1

      let badToGood = goodToBad === 1 ? -1 : goodToBad === -1 ? 1 : 0

      let x = !self.state.statusOrdered || normalized? goodToBad : badToGood
      return x

    })
    const orderState = consistent ? this.state.statusOrdered : !this.state.statusOrdered
    this.setState({clients: clientsCopy, statusOrdered: orderState})
  }
  setPageLen(e) {
    const len = parseInt(e.target.value, 10)
    if (isNaN(len)) this.setState({settingCustomPageLen: false})
    else if (len < 0) this.setState({settingCustomPageLen: false, pageLength: 1, currentPage: 0})
    else if (len >= this.state.clients.length) this.setState({settingCustomPageLen: false, pageLength: len, showAll: true, currentPage: 0})
    else this.setState({settingCustomPageLen: false, pageLength: len, currentPage: 0})
  }
  changePage(next, e) {
    if (next === true) {
      const nextPageNum = this.state.currentPage + 1
      if (nextPageNum >= this._allPages.length) {
        this._pageInput.value = ''
        if (this.state.settingCustomPage) this.setState({settingCustomPage: false})
        return
      }
      else this.setState({currentPage: nextPageNum, settingCustomPage: false})
    } else if (next === false) {
      const prevPageNum = this.state.currentPage - 1
      if (prevPageNum < 0) {
        this._pageInput.value = ''
        if (this.state.settingCustomPage) this.setState({settingCustomPage: false})
        return
      }
      else this.setState({currentPage: prevPageNum, settingCustomPage: false})
    } else if (e) {
      const page = parseInt(this._pageInput.value, 10)
      // this._pageInput.value = this.state.currentPage + 1
      if (isNaN(page)) {
        this._pageInput.value = ''
        return this.setState({settingCustomPage: false})
      } else if (page > this._allPages.length) {
        this._pageInput.value = this._allPages.length - 1
        this.setState({currentPage: this._allPages.length - 1, settingCustomPage: false})
      } else if (page < 0) {
        this._pageInput.value = 0
        this.setState({currentPage: 0, settingCustomPage: false})
      } else {
        this.setState({currentPage: page - 1, settingCustomPage: false})
      }
    }
  }
  finishEditClient() {
    this.setState({editingClient: undefined})
    this.props.updateClients()
  }
  enterKey(e, fun) {
    if (e.keyCode === 13) fun(e)
  }
  render() {
    const allPages = []
    const clients = this.state.clients
    let currentPage = []
    for (var i in clients) {
      const row = <IPRow key={clients[i].ip} client={clients[i]} removeClient={(ip) => this.removeClient(ip)} editClient={(client) => this.setState({editingClient: client})} changeOverflow={(setting) => this.setState({overflow: setting})}/>
      if (currentPage.length < this.state.pageLength) currentPage.push(row)
      else {
        allPages.push(currentPage)
        currentPage = [row]
      }
    }
    if (currentPage.length > 0) allPages.push(currentPage)
    this._allPages = allPages

    const pageLenDisplayDivClass = this.state.settingCustomPageLen ? 'has-input' : ''
    const pageLenDisplaySpanClass = this.state.settingCustomPageLen ? 'hidden' : ''
    const pageLenInputClass = this.state.settingCustomPageLen ? 'shown' : ''

    const tableBottomDisplayClass = this._allPages.length > 1 || this.state.showAll ? '' : 'minimized'
    const pageDisplayDivClass = this.state.settingCustomPage ? 'has-input' : ''
    const pageDisplaySpanClass = this.state.settingCustomPage ? 'btn-flat waves-effect waves-light hidden' : 'btn-flat waves-effect waves-light'
    const pageInputClass = this.state.settingCustomPage ? 'shown' : ''
    const editingClientDialogClass = this.state.editingClient ? 'shown' : ''
    const editingClientDialogErrClass = this.state.editingClientVerifying ? 'shown' : ''
    const editingClientDialogErrContent = this.state.editingClientVerifying ? <div className="cssload-loader"></div> : <div><h2>Error</h2><h4>Someything happened</h4></div>

    // <th className="centered">Options</th>

    const tableContent = allPages.length > 0 ?
        <div style={{overflow: this.state.overflow}}>
          <EditClientDialog editingClient={this.state.editingClient} finishEditClient={() => this.finishEditClient()} clients={this.props.clients}/>
          <table key="client-table">
            <tbody>
            <tr>
              <th className="centered sortable" onClick={() => this.sortStatus(this.state.clients)}>Status</th>
              <th className="sortable" onClick={() => this.sortNames(this.state.clients)}>Client Name</th>
              <th className="centered long sortable" onClick={() => this.sortIP(this.state.clients)}>IP</th>
              <th className="centered">Edit</th>
              <th className="centered">Remove</th>
            </tr>
            {allPages[this.state.currentPage]}
            </tbody>
          </table>

        </div>
        : <h6 key="client-table-empty">No clients found.</h6>

    return (
      <div className="card">
        <div id="filters-table-wrapper">
          {tableContent}
        </div>
        <div id="client-table-bottom" className={tableBottomDisplayClass}>
          <div>Page Length
            <div id="set-table-page-len" className='has-input' onClick={() => {this.setState({settingCustomPageLen: true}); this._pageLenInput.value = this.state.pageLength}}>
              <span className={pageLenDisplaySpanClass}>{this.state.pageLength}</span>
              <input type="text" ref={(elem) => this._pageLenInput = elem} className={pageLenInputClass} onBlur={(e) => this.setPageLen(e)} onKeyUp={(e) => this.enterKey(e, this.setPageLen.bind(this))}/>
            </div>
          </div>
          <div className="client-table-page-buttons">
            <div><button type="button" className="btn-flat waves-effect waves-light" onClick={() => this.changePage(false)}>{'<'}</button></div>
            <div className={pageDisplayDivClass}>
              <span className={pageDisplaySpanClass} onClick={(e) => {this.setState({settingCustomPage: true}); this._pageInput.value = this.state.currentPage + 1}}>{this.state.currentPage + 1}/{allPages.length}</span>
              <input type="text" ref={(elem) => this._pageInput = elem} className={pageInputClass} onBlur={(e) => this.changePage(null, e)} onKeyUp={(e) => this.enterKey(e, this.changePage.bind(this))}/>
            </div>
            <div><button type="button" className="btn-flat waves-effect waves-light" onClick={() => this.changePage(true)}>{'>'}</button></div>
          </div>
        </div>
      </div>
    )
  }
}

class IPRow extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      removing: false,
      showOptions: false,
      showCopyDialog: false
    }
  }
  componentDidMount() {
    document.addEventListener('click', this.handleClickOutside.bind(this), true);
    const self = this
    this.setState({removing: true})
    setTimeout(function() {
      self.setState({removing: false})
    })
    if (!this.props.client.pending && !this.props.client.status) {
      const self = this

    }
  }
  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside.bind(this), true);
  }
  handleClickOutside(e) {
    if (this.state.showOptions && !this._optionsList.contains(e.target) && !this._optionsBtn.contains(e.target)) this.setState({showOptions: false})
  }
  removeClient() {
    const self = this
    this.setState({removing: true})
    setTimeout(function() {
      self.props.removeClient(self.props.client)
    }, 300)
  }
  showDropdown() {
    const showOptions = !this.state.showOptions
    const self = this
    if (showOptions) this.props.changeOverflow('visible')
    else {
      setTimeout(function() {
        if (self.state.showOptions) return
        self.props.changeOverflow('auto')
      },500)
    }
    this.setState({showOptions: showOptions})
  }
  showCopyDialog(ev) {
    const aux = document.createElement("input");
    aux.setAttribute("value", this._ipContainer.innerHTML);
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    document.body.removeChild(aux);

    this.setState({showCopyDialog: true})
    const self = this
    setTimeout(function() {
      self.setState({showCopyDialog: false})
    },500)
  }
  render() {
    const rowClass = this.state.removing ? 'client-row' : this.state.showOptions ? 'client-row shown active' : 'client-row shown'
    const statusStyle = this.props.client.pending ? {color: '#F0AD4E', fontSize: '17px'} : this.props.client.status ? {color: '#5CB85C', fontSize: '17px'} : {color: '#D9534F', fontSize: '17px'}
    const statusText = this.props.client.pending ? <i className="material-icons status-icon pending-status-icon">brightness_1</i> : this.props.client.status ? <i className="material-icons status-icon up-status-icon">brightness_1</i> : <DownBlinkingStatus />
    const listClass = this.state.showOptions ? 'shown' : ''
    const optionsBtnClass = this.state.showOptions ? 'centered options unselectable active' : 'centered options unselectable'

    // <td className={optionsBtnClass} ref={(elem) => this._optionsBtn = elem} onClick={() => this.showDropdown()}>
    //   <div>
    //     <i className="material-icons">settings</i>
    //     <ul className={listClass} ref={(elem) => this._optionsList = elem} onMouseOver={(e) => e.stopPropagation()}>
    //       <li className="edit unselectable" onClick={() => this.props.editClient(this.props.client)}><i className="material-icons">mode_edit</i></li>
    //       <li className="remove unselectable" onClick={() => this.removeClient()}><i className="material-icons">close</i></li>
    //     </ul>
    //   </div>
    // </td>
    const copyDialogClass = this.state.showCopyDialog ? 'copy-dialog shown' : 'copy-dialog'

    return (
      <tr className={rowClass}>
        <td className="centered unselectable" style={statusStyle}><div>{statusText}</div></td>
        <td>{this.props.client.name}</td>
        <td className="centered copy-area" ><div ref={(elem) => this._ipContainer = elem} onClick={(e) => this.showCopyDialog(e)}>{this.props.client.ip}</div><div className={copyDialogClass}></div></td>

        <td className="centered edit unselectable" onClick={() => this.props.editClient(this.props.client)}><i className="material-icons">mode_edit</i></td>
        <td className="centered remove unselectable" onClick={() => this.removeClient()}><div><i className="material-icons">close</i></div></td>
      </tr>
    )
  }
}

class EditClientDialog extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      editingClient: undefined,
      errText: undefined,
      zIndex: -1,
      errZIndex: -1,
      showErr: false,
    }
  }
  handleClickOutside(e) {
    if (this.state.editingClient && !this._editDialog.contains(e.target)) this.finishEditing()
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.editingClient && !nextProps.editingClient) this.finishEditing()
    else if (!this.props.editingClient && nextProps.editingClient) this.editClient(nextProps.editingClient)
  }
  editClient(client) {
    this._nameInput.value = client.name
    this._ipInput.value = client.ip
    Materialize.updateTextFields()
    document.addEventListener('click', this.handleClickOutside.bind(this), true);
    this.setState({editingClient: client, zIndex: 100})
  }
  validateDetails() {
    this.setState({errText: undefined, errZIndex: 101, showErr: true})
    const nameInput = this._nameInput
    const ipInput = this._ipInput
    const newName = nameInput.value && nameInput.value.trim() !== this.state.editingClient.name ? nameInput.value.trim() : undefined
    const newIP = ipInput.value && ipInput.value.trim() !== this.state.editingClient.ip ? ipInput.value.trim() : undefined
    const clients = this.props.clients
    if (newIP) for (var i in clients) {
      if (clients[i].ip === newIP && clients[i].ip !== this.state.editingClient.ip) return this.setState({errText: 'IP already exists for another client'})
    }
    const self = this
    request('/editclient', {client: this.state.editingClient, newName: newName, newIP: newIP}, 'json', function(err) {
      if (err.internal) {
        self.setState({errText: 'Internal Server Error', showErr: true})
      } else if (err.old) {
        self.finishEditing()
        // self.setState({errText: 'No new information to set.', showErr: true})
      } else if (err.exists) {
        self.setState({errText: 'IP already exists for another client'})
      } else {
        self.finishEditing()
      }
    })
  }
  finishEditing() {
    this.setState({editingClient: undefined, showErr: false, errText: undefined})
    document.removeEventListener('click', this.handleClickOutside.bind(this), true);
    const self = this
    setTimeout(function() {
      if (self.state.editingClient) return
      self._nameInput.value = ''
      self._ipInput.value = ''
      self.setState({zIndex: -1, errZIndex: -1})
      self.props.finishEditClient()
    }, 500)
  }
  removeErrDialog() {
    if (this.state.errText === undefined) return
    this.setState({showErr: false})
    const self = this
    setTimeout(function() {
       self.setState({errZIndex: -1, errText: undefined})
    }, 500)
  }
  enterKey(e) {
    if (e.keyCode === 13) this.validateDetails()
  }
  render() {
    const editingClientDialogClass = this.state.editingClient ? 'modal-backdrop shown' : 'modal-backdrop'
    const cardWrapperClass = this.state.editingClient ? 'shown' : ''
    // These depend on the z-index
    const editingClientDialogErrClass = !this.state.showErr ? '' : this.state.errText === undefined ? 'shown no-pointer' : 'shown'
    const editingClientDialogErrContent = this.state.errText === undefined ? `<div class="cssload-loader" style="color: #1dc1e6; font-size:15px">Validating</div>` : this.state.errText ? `<div style="color: rgb(179,0,0)"><h2>Error</h2><h4>${this.state.errText}</h4></div>` : ''

    return (
      <div id="edit-client-modal" className={editingClientDialogClass} style={{zIndex: this.state.zIndex}}>
        <div className={cardWrapperClass}>
          <div ref={(elem) => this._editDialog = elem} className="card">

            <div style={{zIndex: this.state.errZIndex}} className={editingClientDialogErrClass} dangerouslySetInnerHTML={{__html: editingClientDialogErrContent}} onClick={() => this.removeErrDialog()}></div>
            <h5><i className="material-icons">mode_edit</i>Editing {this.state.editingClient ? this.state.editingClient.name : ''} {` (${this.state.editingClient ? this.state.editingClient.ip : ''})`}</h5>
            <div>
              <label htmlFor="edit-client-name">Name</label>
              <input type="text" ref={(elem) => this._nameInput = elem} className="form-control" id="edit-client-name" placeholder="New Client Name" onKeyUp={(e) => this.enterKey(e)}/>
            </div>
            <div>
              <label htmlFor="edit-client-ip">IP</label>
              <input type="text" ref={(elem) => this._ipInput = elem} className="form-control" id="edit-client-ip" placeholder="New Client IP" onKeyUp={(e) => this.enterKey(e)}/>
            </div>
            <button className="btn btn-info waves-effect waves-light card" onClick={() => this.validateDetails()}>Confirm</button>
            <button className="btn btn-default waves-effect waves-light card" onClick={() => this.finishEditing()}>Cancel</button>

          </div>
        </div>
      </div>
    )
  }
}

class DownBlinkingStatus extends React.Component {
  componentDidMount() {
    const self = this
    this._interval = setInterval(function() {
      const statusElem = self._statusIcon
      if (!statusElem) return clearInterval(self._interval)
      const statusElemClass = statusElem.classList
      if (statusElemClass.contains('full')) statusElemClass.remove('full')
      else statusElemClass.add('full')
    }, 500)
  }
  render() {
    return (
      <i ref={(elem) => this._statusIcon = elem} className="material-icons status-icon down-status-icon">brightness_1</i>
    )
  }
}

class AddClient extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      applying: false,
      expandedForm: false,
      formConfirmState: false,
      applyErr: false,
      errText: '',
      errZIndex: -1
    }
  }
  addClient(e) {
    if (e.target.disabled) return
    const clients = this.props.clients
    const clientIP = this.ipInput.value
    const clientName = this.nameInput.value ? this.nameInput.value : clientIP
    this.nameInput.value = this.nameInput.value ? this.nameInput.value : clientIP
    if (!clientIP || !clientName) return
    for (var x in clients) {
      if (clientIP === clients[x].ip) {
        return this.setState({applyErr: true, errText: `IP already exists for client "${clients[x].name}"`, errZIndex: 10})
      }
    }

    this.setState({applying: true, applyErr: false, errZIndex: 10})
    const self = this
    request('/addclient', {client: {name: clientName, ip: clientIP}}, 'json', function(err) {

      if (err.internal) {
        return self.setState({applying: false, applyErr: true, errText: 'Internal database error'})
      } else if (err.empty) {
        return self.setState({applying: false, applyErr: true, errText: 'Found no client name or IP input'})
      } else {
        self.nameInput.value = ''
        self.ipInput.value = ''
        self.setState({applying: false, expandedForm: false})
        setTimeout(function() {
          self.setState({errZIndex: -1})
        },300)
      }
    })
  }
  apply(e) {
    if (!this.state.expandedForm) this.setState({expandedForm: true})
    else this.addClient(e)
  }
  removeErr() {
    if (this.state.applying) return
    const self = this
    self.setState({applyErr: false})
    setTimeout(function() {
      self.setState({errZIndex: -1})
    },300)
  }
  cancelForm() {
    this.nameInput.value = ''
    this.ipInput.value = ''
    this.setState({expandedForm: false, applyErr: false})
  }
  enterKey(e) {
    if (e.keyCode === 13) this.apply(e)
  }
  render() {
    const areaClass = this.state.applying ? '' : this.state.expandedForm ? 'card' : ''
    const applyBtnClass = this.state.applying ? 'btn btn-info waves-effect waves-light apply centered-flex disabled' : !this.state.expandedForm ?  'btn btn-info waves-effect waves-light apply centered-flex' : this.state.applyErr ? 'btn btn-info waves-effect waves-light apply confirm centered-flex disabled' : 'btn btn-info waves-effect waves-light apply confirm centered-flex'
    const applyBtnText = this.state.applying ? 'Testing...' : this.state.expandedForm ? 'Confirm' : <i className="material-icons" style={{fontSize: '150%', color: '#fafafa'}}>add_circle</i>
    const cancelBtnClass = this.state.applying ? 'btn btn-default waves-effect waves-light cancel' : this.state.expandedForm ? 'btn btn-default waves-effect waves-light cancel shown' : 'btn btn-default waves-effect waves-light cancel'
    const formClass = this.state.expandedForm ? 'shown' : ''

    const statusWrapperClass = this.state.applyErr || this.state.applying ? 'shown' : ''
    const loaderAnimStatusClass = this.state.applying ? 'full-box-status shown' : 'full-box-status'
    const errTextStatusClass = this.state.applying ? 'full-box-status' : this.state.applyErr ? 'full-box-status shown' : 'full-box-status'
    const errTextHTML = `<div><h4>Error</h4><h5>${this.state.errText}</h5></div>`

    return (
      <div id="add-client-area" className={areaClass}>
        <div id="add-client-details" className={formClass}>
          <h5 className="blue-color">New Client</h5>
          <div className="input-field">
            <label htmlFor="new-client-name">Name</label>
            <input type="text" ref={(elem) => this.nameInput = elem} className="form-control" id="new-client-name" onKeyUp={(e) => this.enterKey(e)}/>
          </div>
          <div className="input-field">
            <label htmlFor="new-client-ip">IP</label>
            <input type="text" ref={(elem) => this.ipInput = elem} className="form-control" id="new-client-ip" onKeyUp={(e) => this.enterKey(e)}/>
          </div>

          <div id="add-client-err" className={statusWrapperClass} style={{zIndex: this.state.errZIndex}} onClick={() => this.removeErr()}>
            <div className={loaderAnimStatusClass}><div className="cssload-loader"></div></div>
            <div className={errTextStatusClass} style={{cursor: this.state.applyErr ? 'pointer' : 'default'}} dangerouslySetInnerHTML={{__html: errTextHTML}}/>
          </div>

        </div>
        <button type="button" className={applyBtnClass} onClick={(e) => this.apply(e)}>{applyBtnText}</button>
        <button type="button" className={cancelBtnClass} onClick={(e) => this.cancelForm(e)}>Cancel</button>
      </div>
    )
  }
}

ReactDOM.render(
  <Main/>,
  document.getElementById('app')
);
