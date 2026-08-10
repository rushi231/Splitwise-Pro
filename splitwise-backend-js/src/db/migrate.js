const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

// Minimal migration runner: tracks applied migrations in a table,
// runs any .sql file in migrations/ that hasn't been applied yet,
// in filename order. Good enough for a solo project; swap for
// node-pg-migrate or Prisma Migrate if this grows.

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getApplied() {
  const res = await pool.query("SELECT filename FROM schema_migrations");
  return new Set(res.rows.map((r) => r.filename));
}

async function run() {
  await ensureMigrationsTable();
  const applied = await getApplied();

  const dir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(dir, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      console.log(`applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`failed: ${file}`, err);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log("migrations up to date");
  await pool.end();
}

run();
