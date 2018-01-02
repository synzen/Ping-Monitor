const globalVars = require('./global.js')
const clients = globalVars.clients
const clientsArray = globalVars.clientsArray
const activityLog = globalVars.activityLog
const pingClient = require('./ping.js')
const runDatabase = require('./databaseOps.js')
const sendEmail = require('./email.js')
const confirmations = {}
let pingingInProgress = false

function getObjLength(obj) {
  let c = 0
  for (var x in obj) c++
  return c
}

function checkAllClients(clients, io, callback) {
  if (pingingInProgress) {
    if (typeof callback === 'function') callback('Unable to refresh, server is currently pinging clients')
    return console.log('Unable to run ping cycle due to ping interval not yet completed')
  }
  console.log('Starting ping cycle...')

  pingingInProgress = true
  const totalClients = getObjLength(clients)
  const pingConfirms = globalVars.config.pingConfirms
  if (totalClients === 0) {
    if (typeof callback === 'function') callback('No clients to refresh.')
    return pingingInProgress = false
  }
  let pingedClients = 0
  for (var ip in clients) {
    const currentClient = clients[ip]
    pingClient(currentClient, function(dead, client) {
      const clientClone = JSON.parse(JSON.stringify(client))

      if (client.pending && dead === false) {
        clientClone.action = 'update'
        clientClone.query = 'Pending=0'

        runDatabase(clientClone, io, function(err) {
          if (err) return;
          clients[clientClone.ip].pending = false
          clients[clientClone.ip].status = true
          activityLog.add(`ONLINE: "${client.name}" (${client.ip}) is now out of PENDING state`)
          io.emit('updatedClients', clientsArray())

          if (++pingedClients === totalClients) {
            console.log('Finished ping cycle')
            if (typeof callback === 'function') callback()
            pingingInProgress = false
          }
        })
      } else {
        if (!client.pending && dead === false && !clients[client.ip].status) { // Dead -> Alive
          if (!confirmations[client.ip] || confirmations[client.ip].status !== true) confirmations[client.ip] = {status: true, count: 1}
          else confirmations[client.ip].count++
          if (confirmations[client.ip].count >= pingConfirms) {
            clients[client.ip].status = true
            activityLog.add(`ONLINE: "${client.name}" (${client.ip})`)
            sendEmail(clients[client.ip], true)
          } else console.log(`Potentially marking client "${client.name}" (${client.ip}) as alive, #${confirmations[client.ip].count}`)

        } else if (!client.pending && dead === true && clients[client.ip].status) { // Alive -> Dead
          if (!confirmations[client.ip] || confirmations[client.ip].status === true) confirmations[client.ip] = {status: false, count: 1}
          else confirmations[client.ip].count++
          if (confirmations[client.ip].count >= pingConfirms) {
            clients[client.ip].status = false
            activityLog.add(`OFFLINE: "${client.name}" (${client.ip})`)
            sendEmail(clients[client.ip], false)
          } else console.log(`Potentially marking client "${client.name}" (${client.ip}) as dead, #${confirmations[client.ip].count}`)

        } else if (dead === true && confirmations[client.ip] && confirmations[client.ip].status === true) delete confirmations[client.ip]
        else if (dead === false && confirmations[client.ip] && confirmations[client.ip].status === false) delete confirmations[client.ip]

        if (++pingedClients === totalClients) {
          pingingInProgress = false
          console.log('Finished ping cycle')
          io.emit('updatedClients', clientsArray())
          if (typeof callback === 'function') callback()
        }
      }
    })
  }
}



exports.run = checkAllClients
exports.pingingInProgress = pingingInProgress
