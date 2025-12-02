// ========================================================================
// Database Configuration
// ========================================================================

require('dotenv').config();
const knex = require('knex');

// Get database credentials from environment variables
const dbConfig = {
  host: process.env.RDS_HOSTNAME || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.RDS_PORT || process.env.DB_PORT || 5432),
  user: process.env.RDS_USERNAME || process.env.DB_USER || 'postgres',
  password: String(process.env.RDS_PASSWORD || process.env.DB_PASSWORD || ''),
  database: process.env.RDS_DB_NAME || process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const db = knex({
  client: 'pg',
  connection: dbConfig,
  pool: { min: 2, max: 10 }
});

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Database connection successful');
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err.message);
  });

module.exports = db;
