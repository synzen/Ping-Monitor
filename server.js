/*
    ATTENTION!
    The single source of truth after changes are made via
    web UI is in memory, not from the database! The object
    variable 'clients' MUST be modified after each change
    in the database.
*/

const fs = require('fs')
const express = require('express')
const path = require('path')
const app = express()
const server = require('http').createServer(app)
const bodyParser = require('body-parser')
const ipfilter = require('express-ipfilter').IpFilter
const session = require('express-session')
var RedisStore = require('connect-redis')(session)
const jsonParser = bodyParser.json()
const runDatabase = require('./util/databaseOps.js') // The main function called for any adding, removing, editing clients involved with the database
const sendEmail = require('./util/email.js')
const XLSX = require('xlsx') // Excel import functions, documentation at https://github.com/SheetJS/js-xlsx
const moment = require('moment') // Date formatting
const validIP = require('net').isIP
const pingCycle = require('./util/pingCycle.js') // The function called every X minutes
const io = require('socket.io')(server); // For websocket connection to web
const globalVars = require('./util/global.js') // For use across all modules
const clients = globalVars.clients
const clientsArray = globalVars.clientsArray // Clients is internally an object mapped by client IPs, but on the web it is an array to accomodate React
const activityLog = globalVars.activityLog // Socket emissions that go directly to the web activity log
const config = globalVars.config
const sessionData = {} // Session use to avoid inputting password every time
const startTime = moment()
globalVars.setIo(io)

let importInProgress = false
let masterServer // Spawned server later to be defined
let pingInterval // The setInterval that is initially defined on startup, and can be redefined via web

io.on('connection', function(socket) {
  console.log(`Established connection server side!`)
})

if (config.allowedIPs.length > 0) app.use(ipfilter(config.allowedIPs, {mode: 'allow', logLevel: 'deny', excluding: ['/denied', '/shallnotpass.mp4']}))
app.set('trust proxy', 1);
app.use(session({
cookie:{
    secure: true,
    maxAge: 30 * 60 * 1000,
       },
store: new RedisStore(),
secret: 'jiwAS#423$^Tsgd)G',
saveUninitialized: true,
resave: false
}));

app.use(express.static(path.join(__dirname, 'public/css')));
app.use(express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'public/imgs')));
app.use(express.static(path.join(__dirname, 'public/video')));


app.use(function(err, req, res, next) {
  if (err.message.startsWith('Access denied')){
    return res.status(401).redirect('/denied')
  }
  console.error(err.stack);
  res.status(500).send('Uh oh.')

  res
});

app.get('/', function(req, res) {
  if (!sessionData[req.sessionID] && config.password) return res.redirect('/authorize')
  res.sendFile(path.join(__dirname, 'public/index.html'))
})

app.get('/denied', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/denied.html'))
})

app.get('/authorize', function(req, res) {
  if (!config.password) return res.redirect('/')
  fs.readFile('./config.json', function(err, data) {
    const pass = JSON.parse(data).password
    res.sendFile(path.join(__dirname, 'public/authorize.html'))
  })
})

app.post('/resources/verifypass', jsonParser, function(req, res) {
  const success = req.body.pass === config.password
  if (success) sessionData[req.sessionID] = true
  res.json({success: success})
})

app.post('/resources/clients', jsonParser, function(req, res) {
  res.json({clients: clientsArray()})
})

app.post('/resources/addclient', jsonParser, function(req, res) {
  const client = req.body.client
  for (var ip in clients) {
    if (client.ip === ip) return res.json({err: `IP already exists for client "${clients[ip].name}".`})
  }
  client.action = 'add' // Any time a client is added/removed/updated, .action must be defined
  if (!client.name || !client.ip) return res.json({empty: true})
  runDatabase(client, io, function(err) {
    if (err) res.json(err)
    else res.json({})
  })
})

app.post('/resources/removeclient', jsonParser, function(req, res) {
  const client = req.body.client
  client.action = 'remove' // Any time a client is added/removed/updated, .action must be defined
  runDatabase(client, io, function(err) {
    if (err) res.json(err)
    else res.json({})
  })
})

app.post('/resources/editclient', jsonParser, function(req, res) {
  const client = req.body.client
  client.query = ''
  if (req.body.newName) {
    client.query += `Name="${req.body.newName}"`
    client.newName = req.body.newName
  }
  if (req.body.newIP) {
    client.query += client.query ? `, IP="${req.body.newIP}"` : `IP="${req.body.newIP}"`
    client.newIP = req.body.newIP
  }
  if (!client.query) return res.json({old: true})
  for (var ip in clients) {
    if (ip === client.newIP) return res.json({exists: true})
  }

  client.action = 'update' // Any time a client is added/removed/updated, .action must be defined
  runDatabase(client, io, function(err) {
    if (err) res.json(err)
    else res.json({})
  })
})

app.post('/resources/import', jsonParser, function(req, res) {
  activityLog.add(`Import operation began for workbook "${req.body.fileName}"`)
  importInProgress = true
  const sheets = req.body.workbookSheets
  const overwrite = req.body.overwrite
  const importedClientData = []
  const checkedIPs = []
  io.emit('importStatus', 'Validating sheets...')
  for (var sheetName in sheets) {
    const sheet = XLSX.utils.sheet_to_json(sheets[sheetName])
    io.emit('importLog', {error: null, content: `Reading sheet named ${sheetName}...`})
    for (var a in sheet) {
      const client = {}
      let clientName = ''
      let clientIP = ''
      let clientNewIP = undefined // If overwrite is true
      let invalidIP = ''
      let ipExists = undefined
      let ipDuplicate = undefined
      const sheetItem = sheet[a]
      for (var key in sheetItem) {
        const lKey = key.toLowerCase().trim()
        const value = sheetItem[key].trim()
        if (lKey === 'ip' && value) {
          if (validIP(value) === 0) {
            invalidIP = value
          } else if (checkedIPs.includes(value)) {
            ipDuplicate = value
            invalidIP = value
          }

          for (let existentIP in clients) {
            if (existentIP === value) {
              if (!overwrite) ipExists = invalidIP = value
              else clientNewIP = value
            }

          }
          if (invalidIP) continue
          checkedIPs.push(value)
          clientIP = value
        } else if (lKey === 'name') clientName = value
      }

      if (!clientIP) {
        if (ipExists) io.emit('importLog', {error: `Error: Client IP "${ipExists}"${clientName ? ' (Named "' + clientName + '")' : ''} already exists in database, skipping`})
        else if (ipDuplicate) io.emit('importLog', {error: `Error: Client${clientName ? ' "' + clientName + '"' : ''} IP "${ipDuplicate}" is a duplicate, skipping`})
        else io.emit(`importLog`, {error: `Error: Invalid IP${invalidIP ? ' (' + invalidIP + ')' : ''} found for ${clientName ? 'a client named "' + clientName + '",' : 'an unnamed client,'} skipping`})
        continue
      } else if (!clientName && clientIP) {
        io.emit('importLog', {error: null, content: `No client name for IP "${clientIP}", setting IP as name`})
        clientName = clientIP
        continue
      } else io.emit('importLog', {error: null, content: `Preparing client named "${clientName}", IP "${clientIP}"`})

      importedClientData.push({name: clientName, ip: clientIP, newIP: clientNewIP, action: 'add'}) // Any time a client is added/removed/updated, .action must be defined
    }

  }

  if (importedClientData.length === 0) {
    io.emit('importStatus', `No clients found for import operation.`)
    importInProgress = false
    activityLog.add(`Import operation complete for workbook "${req.body.fileName}" with no clients to import.`)
    return res.json({})
  }

  io.emit('importStatus', '0%')

  runDatabase(importedClientData, io, function(err) {
    importInProgress = false
    console.log('here')
    activityLog.add(`Import operation successful for workbook "${req.body.fileName}"`)
    res.json({})
  })
})

app.post('/resources/importing', jsonParser, function(req, res) {
  res.json({importing: importInProgress})
})

app.post('/resources/export', jsonParser, function(req, res) { // Export POST request is writing the file via backend (here) and then redirecting the user to the file location via URL on the web
  activityLog.add(`Export operation started.`)
  try {
    const wb = {Sheets: {}, SheetNames: []}
    var ws_data = [[ "Name", "IP"]];
    for (var ip in clients) {
      ws_data.push([clients[ip].name, ip])
    }
    var ws = XLSX.utils.aoa_to_sheet(ws_data);
    wb.SheetNames.push('clients')
    wb.Sheets.clients = ws
    XLSX.writeFile(wb, './public/out.xlsx') // File name must match the one the web UI is sending the user to download the export
  } catch(e) {
    activityLog.add(`Export operation failed. ${e}`)
  }
  activityLog.add(`Export operation successful.`)
  res.end()
})

app.get('/export', function(req, res) {
  res.setHeader('Content-disposition', 'attachment; filename=out.xlsx');
  res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.download(__dirname + '/public/out.xlsx');
})

app.post('/resources/activitylog', jsonParser, function(req, res) {
  res.json({log: activityLog.log})
})

app.post('/resources/ping', jsonParser, function(req, res) { // Manually run the ping cycle
  pingCycle.run(clients, io, function(err) {
    if (err) res.json({err: err})
    else res.json({})
  })
})

app.post('/resources/kill', jsonParser, function(req, res) {
  console.log('Web client requested kill signal')
  activityLog.add(`Kill signal received. Stopping server process. This log will wipe on the next change or refresh if server reboots.`)
  setTimeout(function() {
    process.exit(0)
  }, 500)
})

app.post('/resources/getconfig', jsonParser, function(req, res) {
  fs.readFile('./config.json', function(err, data) {
    if (err) return res.json({err: err})
    const configData = JSON.parse(data)
    if (config.password) delete configData.emailCreds
    res.json({data: configData, allowEmailConfig: config.password ? false : true})
  })
})

app.post('/resources/setconfig', jsonParser, function(req, res) {
  const emailSettings = req.body.emailSettings
  const emailFailsafe = req.body.emailFailsafe
  const pingSettings = req.body.pingSettings
  fs.readFile('./config.json', function(err, data) {
    if (err) return res.json({err: err})
    const configFile = JSON.parse(data)

    if (!config.password) configFile.emailCreds = emailSettings
    configFile.emailFailsafe = emailFailsafe

    // Manually check the numbers. If invalid numbers, leave it as the previous value
    configFile.emailFailsafe.intervalSeconds = isNaN(parseInt(emailFailsafe.intervalSeconds, 10)) ? configFile.emailFailsafe.intervalSeconds : parseInt(emailFailsafe.intervalSeconds, 10)
    configFile.emailFailsafe.maxEmails = isNaN(parseInt(emailFailsafe.maxEmails, 10)) ? config.emailFailsafe.maxEmails : parseInt(emailFailsafe.maxEmails, 10)
    configFile.pingCount = isNaN(parseInt(pingSettings.pingCount, 10)) ? configFile.pingCount : parseInt(pingSettings.pingCount, 10)
    configFile.pingDelayMin = isNaN(parseInt(pingSettings.pingDelayMin, 10)) ? configFile.pingDelayMin : parseInt(pingSettings.pingDelayMin, 10)
    configFile.pingConfirms = isNaN(parseInt(pingSettings.pingConfirms, 10)) ? configFile.pingConfirms : parseInt(pingSettings.pingConfirms, 10)
    globalVars.config = configFile

    clearInterval(pingInterval)
    pingInterval = setInterval(pingCycle.run, configFile.pingDelayMin * 60000, clients, io, activityLog)

    fs.writeFile('./config.json', JSON.stringify(configFile, null, 2), function(err) {
      if (err) res.json({err: err})
      else res.json({})
    })
  })

})

function startServer() {
  console.log('Clients updated, starting webserver...')
  const port = 8081
  masterServer = server.listen(port, function () {
    console.log("Webserver on localhost, listening on port " + port + '. Connect via localIP:' + port)
    activityLog.add(`Webserver started`)
  })
  pingCycle.run(clients, io)

  pingInterval = setInterval(pingCycle.run, globalVars.config.pingDelayMin * 60000, clients, io, activityLog)
}

console.log('Updating clients...')
runDatabase(null, io, function() {
  if (!masterServer) startServer()
})
