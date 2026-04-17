// ============================================
// PennyWise — PostgreSQL Connection Pool
// Uses the 'pg' package with DATABASE_URL
// ============================================

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }   // required for Supabase / Railway
    : false,
});

// Log successful connection
pool.on('connect', () => {
  console.log('✅ PostgreSQL pool: new client connected');
});

// Log and exit on unexpected errors to avoid silent failures
pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool: unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),   // for transactions
  pool,
};
