require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
  .then((result) => {
    console.log(result.rows);
    pool.end();
  })
  .catch((err) => {
    console.error("Query failed:", err.message);
    pool.end();
  });
