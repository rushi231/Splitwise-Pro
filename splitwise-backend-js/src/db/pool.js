const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // An idle client emitted an error - log it, don't crash the process
  console.error("Unexpected error on idle Postgres client", err);
});

module.exports = { pool };
