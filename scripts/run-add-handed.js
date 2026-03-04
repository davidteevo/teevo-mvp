/**
 * One-off script to add `handed` column to listings.
 * Requires DATABASE_URL in .env.local (Supabase: Project Settings → Database → Connection string → URI).
 * Run: node -r dotenv/config scripts/run-add-handed.js (if you have dotenv)
 * Or: node scripts/run-add-handed.js (script loads .env.local manually)
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Load .env.local into process.env
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1).replace(/\\n/g, "\n");
      process.env[key] = val;
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "Missing DATABASE_URL. Add it to .env.local from Supabase: Project Settings → Database → Connection string (URI)."
  );
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE listings
      ADD COLUMN IF NOT EXISTS handed text CHECK (handed IN ('left', 'right'));
    `);
    console.log("Done. Column listings.handed added (or already exists).");
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
