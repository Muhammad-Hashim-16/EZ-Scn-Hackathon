require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setup() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString || !connectionString.includes('railway.app')) {
    console.log('❌ ERROR: Please paste your live Railway DATABASE_URL into your .env file first!');
    process.exit(1);
  }

  console.log('Connecting to Live Railway Database...');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    console.log('Running schema.sql... (This might take a few seconds)');
    await client.query(schemaSql);
    console.log('✅ Base tables created successfully!');

    console.log('Reading seed_demo.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed_demo.sql'), 'utf8');
    
    console.log('Running seed_demo.sql...');
    await client.query(seedSql);
    console.log('✅ Demo categories injected successfully!');

    console.log('\n🎉 ALL DONE! Your live database on Railway is fully initialized and ready!');
  } catch (error) {
    console.error('❌ An error occurred:', error);
  } finally {
    await client.end();
  }
}

setup();
