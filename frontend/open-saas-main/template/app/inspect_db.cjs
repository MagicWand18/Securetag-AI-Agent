const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load env manually
const envPath = path.resolve(__dirname, '.env.server');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.trim();
  }
});

async function inspect() {
  console.log("Connecting to DB...");
  const client = new Client({
    connectionString: process.env.SECURETAG_DB_URL,
  });
  
  try {
    await client.connect();
    console.log("Connected.");
    
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'securetag' AND table_name = 'scan_result';
    `);
    
    console.log("Columns:", res.rows);
    
    // Also check one row to see if 'findings' is inside a json column
    const rowRes = await client.query(`SELECT * FROM securetag.scan_result LIMIT 1`);
    if (rowRes.rows.length > 0) {
      const row = rowRes.rows[0];
      console.log("Row keys:", Object.keys(row));
      if (row.summary_json) {
        console.log("summary_json keys:", Object.keys(row.summary_json));
      }
      if (row.findings_json) {
        console.log("findings_json found!");
      }
    }
    
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

inspect();
