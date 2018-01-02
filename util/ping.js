const ping = require('ping')
const globalVars = require('./global.js')

// Function built on the ping module to sent a defined number of pings to determine dead/alive

module.exports = function (client, callback) {
  const ip = client.newIP || client.ip || client.IP // Capitalized IP for client retrieved from database
  let successCount = 0
  let failCount = 0
  pingCount = globalVars.config.pingCount
  for (var x = 0; x < pingCount; x++) {
    ping.sys.probe(ip, function(alive) {

      if (alive) successCount++
      else failCount++

      if (successCount >= pingCount) callback(false, client)
      else if (failCount >= pingCount) callback(true, client)
      else if (failCount + successCount >= pingCount) callback(null, client)
    })
  }
}
