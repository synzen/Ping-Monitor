/*
    ATTENTION!
    The single source of truth after changes are made via
    web UI is in memory, not from the database! The object
    variable 'clients' MUST be modified after each change
    in the database.
*/

const pingClient = require('./ping.js')
const mysql = require('mysql')
const globalVars = require('./global.js')
const config = globalVars.config
const clients = globalVars.clients
const clientsArray = globalVars.clientsArray
const activityLog = globalVars.activityLog

module.exports = function(client, io, callback) {
  runDatabase(client) // "client" may be more than 1 in an array

  function runDatabase(client) {
    const con = mysql.createConnection(config.sqlCreds) // Format is {host: 'whatever', user: 'whatever', password" 'whatever'}

    con.connect(function(err) {
      if (err) {
        if (typeof callback === 'function') callback({internal: true, err: err})
        return console.log(err)
      }
      con.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.name}\``, function (err) {
        if (err) {
          if (typeof callback === 'function') closeDb(callback, {internal: true, err: err})
          return console.log(err)
        }
        con.query(`USE \`${config.database.name}\``, function (err) {
          if (err) {
            if (typeof callback === 'function') closeDb(callback, {internal: true, err: err})
            return console.log(err)
          }

          createTable(con, client)
        })
      })
    })
  }

  function createTable(con, client) {
      con.query(`CREATE TABLE IF NOT EXISTS \`${config.database.tableName}\` (Name TEXT, IP TEXT, Pending INT)`, function(err) {
        if (err) {
          console.log(err)
          closeDb(con, {internal: true, err: err})
          return
        }
        if (client && client.action === 'add' || Array.isArray(client)) insertNewClient(con, client) // Account for both an array of clients from the export function , and a single client
        else if (client && client.action === 'remove') removeClient(con, client)
        else if (client && client.action === 'update') updateClient(con, client)
        else readAllClients(con)
      });
  }

  function insertNewClient(con, clientPackage) {
    const clientList = Array.isArray(clientPackage) ? clientPackage : [clientPackage]

    const totalClients = clientList.length
    let completed = 0
    for (var i in clientList) {
      const client = clientList[i]
      const ip = client.newIP || client.ip
      io.emit('importLog', {error: null, content: `Pinging client "${client.name}" with IP "${client.ip}" to determine status`})
      pingClient(client, function(dead, client) {
        const pending = dead ? true : false
        const status = pending ? false : true
        con.query('INSERT IGNORE INTO clients (Name, IP, Pending) VALUES (?, ?, ?)', [client.name, ip, pending ? 1 : 0], function(err) {
          if (err) {
            console.log(err)
            if (clientList.length === 1) closeDb(con, {internal: true, err: err})
            else {
              if (++completed === totalClients) closeDb(con)
              io.emit(`importLog`, {error: `Error: Database error encountered for "${client.name}" (${client.ip}), skipping.\n${err}`})
            }
          }
          if (client.newIP && clients[client.ip]) {
            activityLog.add(`Edited client named "${client.name}" (${client.ip}). ${client.newName ? 'New name: "' + client.newName + '".': ''}${client.newIP ? 'New IP: ' + client.newIP + '.' : ''}`)
            removeClient(con, client, true) // Delete old IP entry if it exists
          } else activityLog.add(`Added client named "${client.name}" (${client.ip})`)
          clients[ip] = {
            name: client.newName || client.name,
            ip: ip,
            status: pending ? false : true,
            pending: pending
          }
          io.emit('importLog', {error: null, content: `Added: Client "${client.name}" with IP "${client.ip}", status is ${pending ? 'PENDING' : status ? 'UP' : 'DOWN'}`})
          io.emit('importStatus', `${(completed/clientList.length*100).toFixed(2)}%`)
          if (++completed === totalClients) closeDb(con)
        })
      })
    }

  }

  function removeClient(con, client, doNotClose) {
    con.query('DELETE FROM clients WHERE IP=?', client.ip, function(err) {
      if (err) {
        console.log(err)
        if (!doNotClose) closeDb(con, {internal: true, err: err})
        return
      }
      delete clients[client.ip]
      if (!doNotClose) activityLog.add(`Removed client named "${client.name}" (${client.ip})`)
      if (!doNotClose) closeDb(con)
    })
  }

  function updateClient(con, client) {
    if (client.newIP) return insertNewClient(con, client) // Delete and recreate the entry to determine its dead/alive status

    if (client.newName) {
      clients[client.ip].name = client.newName
      activityLog.add(`Edited client's name from "${client.name}" (${client.ip}) to "${client.newName}"`)
    }
    con.query(`UPDATE clients SET ${client.query} WHERE IP=?`, [client.ip], function(err) {
      if (err) {
        console.log(err)
        return closeDb(con, {internal: true, err: err})
      }
      closeDb(con)
    })
  }

  function readAllClients(con) { // Only run once on server startup to initialize all the clients
    con.query("SELECT Name, IP, Pending FROM clients", function(err, rows) {
      let totalRows = rows.length
      let completed = 0
      if (rows.length === 0) return closeDb(con)
      for (var x in rows) {
        const currentClient = rows[x]
        pingClient(currentClient, function(dead, client) {
          clients[client.IP] = {
            name: client.Name,
            ip: client.IP,
            status: dead ? false : true,
            pending: client.Pending == 1 ? true : false
          }
          if (++completed === totalRows) return closeDb(con)
        })

      }
    });
  }

  function closeDb(con, err) {
    con.end();
    if (typeof callback === 'function') callback(err)
    io.emit('updatedClients', clientsArray())
  }
}
