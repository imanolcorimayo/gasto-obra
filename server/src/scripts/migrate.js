import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import logger from '../../lib/logger.js';

// Tiny migration runner: applies numbered .sql files in `migrations/` once each,
// tracking applied versions in `schema_migrations`. No ORM, no framework.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'gasto_obra',
    multipleStatements: true, // each .sql file runs as one batch
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(255) PRIMARY KEY,
        applied_ts BIGINT UNSIGNED NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [applied] = await conn.query('SELECT version FROM schema_migrations');
    const done = new Set(applied.map((r) => r.version));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      logger.info(`Applying migration ${file}`);
      await conn.query(sql);
      await conn.query(
        'INSERT INTO schema_migrations (version, applied_ts) VALUES (?, ?)',
        [file, Date.now()]
      );
      count++;
    }

    logger.info(count ? `Applied ${count} migration(s)` : 'No pending migrations');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  logger.error('Migration failed', { error: err.message });
  process.exit(1);
});
