import React from 'react'
import ReactDOM from 'react-dom'

export default class Alert extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      shown: false
    }
  }
  componentWillMount() {
    const self = this
    setTimeout(function() {
      self.setState({shown: true})
    })
  }
  componentWillLeave(callback) {
    this.setState({shown: false})
    setTimeout(function() {
      callback()
    }, 500)
  }
  render() {
    const alertClass = this.state.shown ? 'alert shown' : 'alert'
    return (<div className={alertClass}><i className="material-icons">error</i><span>Client {'"' + this.props.name + '"'} ({this.props.ip}) is down</span></div>)
  }
}
