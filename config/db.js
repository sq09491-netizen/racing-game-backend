const mysql = require('mysql2/promise');

// Aiven Service Connection URI
const connectionString = process.env.DATABASE_URL || 
  'mysql://avnadmin:AVNS_RtNVnQSJRszxYM4PPAO@mysql-266c6faf-sq09491-ae12.b.aivencloud.com:26300/defaultdb?ssl-mode=REQUIRED';

const pool = mysql.createPool(connectionString);

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to Aiven MySQL successfully!');
    await conn.ping();
    conn.release();
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message);
  }
}

module.exports = { pool, testConnection };
