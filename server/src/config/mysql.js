import 'dotenv/config';
import mysql from 'mysql2/promise';
import logger from '../../lib/logger.js';

// MySQL holds the agentic-chat conversation state (sessions, messages, tool calls,
// media). Domain data (expenses, projects, ...) stays in Firestore, behind tools.
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gasto_obra',
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_POOL_SIZE) || 10,
  charset: 'utf8mb4',
  timezone: 'Z',
});

/**
 * Run a parameterized query. Returns rows for SELECT, a ResultSetHeader otherwise.
 * Always pass values via `params` — never string-interpolate into `sql`.
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Verify connectivity at boot; throws if MySQL is unreachable. */
export async function pingDb() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    logger.info('MySQL connected', {
      host: process.env.MYSQL_HOST || 'localhost',
      db: process.env.MYSQL_DATABASE || 'gasto_obra',
    });
  } finally {
    conn.release();
  }
}

export { pool };
