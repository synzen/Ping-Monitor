// Documentation for mailer module: https://nodemailer.com/about/

const nodemailer = require('nodemailer');
const globalVars = require('./global.js')
const activityLog = globalVars.activityLog
const moment = require('moment')
const emailTimestamps = {}
let failsafeTriggered = false

function sendEmail(client, status) {
  const subject = status ? `UP: ${client.name} (${client.ip})` : `DOWN: ${client.name} (${client.ip})`
  console.log(`Received request to send email (${subject})`)
  const creds = globalVars.config.emailCreds

  if (creds.enabled !== true || failsafeTriggered) return console.log('Returning due to disabled email')

  let timestamps = emailTimestamps[client.ip]
  const emailFailsafe = globalVars.config.emailFailsafe

  if (timestamps && timestamps.length >= emailFailsafe.maxEmails) {
    const recentTimestamp = timestamps[timestamps.length - 1]
    const earliestTimestamp = timestamps[0]

    if (recentTimestamp.diff(earliestTimestamp, 'seconds') < emailFailsafe.intervalSeconds) {
      activityLog.add(`Email blocked from sending due to failsafe, with subject line "${subject}"`)
      console.log(`Email are now blocked from sending due to failsafe, triggering subject line "${subject}"`, error)
      return failsafeTriggered = true
    }
  }

  const transporter = nodemailer.createTransport({
      host: creds.hostname,
      port: 587,
      secure: false, // secure:true for port 465, secure:false for port 587
      auth: {
          user: creds.username,
          pass: creds.password
      }
  });

  let mailOptions = {
      from: creds.from, // sender address
      to: creds.to, // list of receivers, separated by commas
      subject: subject, // Subject line
      text: '', // plain text body
      priority: 'high'
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        activityLog.add(`Email failed to send with subject line "${subject}" (${error})`)
        console.log(`Email failed to send, subject line "${subject}"`, error)
      } else {
        console.log(`Email sent, subject line "${subject}"`)
        activityLog.add(`Email successfully sent with subject line "${subject}"`)
      }
      while (timestamps && timestamps.length > emailFailsafe.maxEmails) {
        timestamps.shift()
      }
      if (!timestamps) timestamps = []
      timestamps.push(moment())
      emailTimestamps[client.ip] = timestamps

  });
}

module.exports = sendEmail
