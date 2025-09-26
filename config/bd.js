require('dotenv').config();

// Validación de variables de entorno
if (!process.env.SECRET || !process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.error('ERROR: Faltan variables de entorno necesarias');
  process.exit(1);
}


const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
console.log('✅ Conexión a MariaDB establecida');

module.exports = pool;