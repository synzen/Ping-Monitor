# Ping-Monitor

A ping monitor site with a sleek, modern and responsive design. Built with Express, React and SASS with a host of features able monitor any number of client IPs - features include:

  * Websockets - No need to ever refresh the page as all client status visible on the page are real-time.
  * Emails - Send an email notification for when a client is offline.
  * Security - Allow only certain IPs to access the interface (usually local IPs), as well as a possible password to limit access.
  * Imports/Exports - Easily import and export client details with excel sheets for backups or additions.
  * Activity Log - Shows all important activities that has happened in an activity log with timestamps for the duration that the process is running.
  * Killswitch - Stop the process from the UI if an emergency occurs.

Technical/user documentation is provided in the root directory as Word docs/PDFs named as `NOC Technical` and `Noc UI`.

## Getting Started

  * Install [Node](https://nodejs.org/en/)
  * Install [MySQL](https://www.mysql.com/products/community/)
  * Clone this repo
  * Put MySQL credentials in config.json under "database" and any other details as needed
  * Run `npm install` to install dependencies
  * Run `npm run startserver` in terminal/command prompt in the main directory
  * Enter localhost:8081 in any web browser
