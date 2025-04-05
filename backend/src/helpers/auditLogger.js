const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../logs/audit.log');

function logAudit(action, details) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ACTION: ${action} DETAILS: ${JSON.stringify(details)}\n`;
  fs.appendFile(logFile, entry, err => {
    if (err) console.error('Failed to write audit log:', err);
  });
}

module.exports = { logAudit };
