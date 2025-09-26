const mysql = require('mysql2');

function logQuery(sql, params) {
  const queryDebug = mysql.format(sql, params);
  console.log('🧠 QUERY:', queryDebug);
}

module.exports = logQuery;