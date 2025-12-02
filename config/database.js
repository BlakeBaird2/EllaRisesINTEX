// ========================================================================
// Database Configuration
// ========================================================================

require('dotenv').config();
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.RDS_HOSTNAME || process.env.DB_HOST || 'localhost',
    port: process.env.RDS_PORT || process.env.DB_PORT || 5432,
    user: process.env.RDS_USERNAME || process.env.DB_USER,
    password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.RDS_DB_NAME || process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },
  pool: { min: 2, max: 10 }
});

module.exports = db;
