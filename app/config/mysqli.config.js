const mysql = require('mysql2/promise');

const mysqli = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Arsha2026',
  charset: 'utf8mb4',
});

module.exports = mysqli;
