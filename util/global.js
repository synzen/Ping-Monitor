// Variables used across all files

const fs = require('fs')
const moment = require('moment')
const clients = {}
let config = JSON.parse(fs.readFileSync('./config.json'))
const activityLogLength = config.activityLogLength

fs.watch('./config.json', function(type, filename) {
  fs.readFile('./config.json', function(err, data) {
    if (err) return console.log(err)
    console.log(`Change found for config.json, updating now.`)
    config = JSON.parse(data)
  })
})


let io

function convertClientsToArray() {
  const clientArray = []
  for (var x in clients) {
    clientArray.push(clients[x])
  }
  return clientArray
}

function ActivityLog(maxLength) {
  this.log = []

  this.add = function(content) {
    if (this.log.length > maxLength) this.log.shift()
    const date = moment().format('MMM Do h:mm:ss A')
    this.log.push({timestamp: date, content: content})
    io.emit('activityLog', this.log)
  }
}

const activityLog = new ActivityLog(activityLogLength)

exports.config = config // Susceptile on changes - refer to this object inside any exported function rather than outside
exports.clients = clients

exports.clientsArray = function() { // Convert clients mapped by IPs to an array to accomodate web javascript
  return convertClientsToArray(clients)
}

exports.activityLog = activityLog

exports.setIo = function(a) { // Set IO sent from server.js for ActivityLog to function
  io = a
}
