/**
 * MySQL connection pool.
 * A pool reuses connections instead of opening a new one per query,
 * which is what you want for a web server.
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'car_racing_game',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
ssl: { rejectUnauthorized: false }
});

// Fail fast at startup if the DB is unreachable.
async function testConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

module.exports = { pool, testConnection };
