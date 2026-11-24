import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INIT_SQL_PATH = path.resolve(__dirname, '../../sql/001_init.sql');

let pool = null;
let dbMode = 'uninitialized';

function buildBaseDbOptions() {
  const { host, port, user, password, ssl } = config.db;
  return {
    host,
    port,
    user,
    password,
    ...(ssl ? { ssl: { rejectUnauthorized: false } } : {})
  };
}

export function parseJsonColumn(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (Buffer.isBuffer(value)) {
    try {
      return JSON.parse(value.toString('utf8'));
    } catch {
      return null;
    }
  }
  return value;
}

export async function runSqlMigrations() {
  const { database } = config.db;
  const schemaSql = await fs.readFile(INIT_SQL_PATH, 'utf8');
  const baseOpts = buildBaseDbOptions();

  try {
    const directConnection = await mysql.createConnection({
      ...baseOpts,
      database,
      multipleStatements: true,
      connectTimeout: 10000
    });
    try {
      await directConnection.query(schemaSql);
    } finally {
      await directConnection.end();
    }
  } catch (error) {
    if (error?.code !== 'ER_BAD_DB_ERROR' && error?.errno !== 1049) {
      throw error;
    }

    const adminConnection = await mysql.createConnection({
      ...baseOpts,
      multipleStatements: true,
      connectTimeout: 10000
    });
    try {
      await adminConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
      await adminConnection.query(`USE \`${database}\`;`);
      await adminConnection.query(schemaSql);
    } finally {
      await adminConnection.end();
    }
  }
}

export async function initDatabase() {
  if (pool) {
    return { mode: dbMode, pool };
  }

  const maxAttempts = config.hasExplicitDbConfig ? 3 : 1;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await runSqlMigrations();
      const { host, port, database } = config.db;
      const nextPool = mysql.createPool({
        ...buildBaseDbOptions(),
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: 'Z',
        dateStrings: false
      });
      await nextPool.query('SELECT 1');
      pool = nextPool;
      dbMode = 'mysql';
      console.log(`[DB] Connected to MySQL (${host}:${port}/${database})`);
      return { mode: dbMode, pool };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.warn(
          `[DB] MySQL connection attempt ${attempt}/${maxAttempts} failed (${error.code || error.message}); retrying in 1.5s...`
        );
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  if (!config.allowMemoryFallback) {
    throw lastError;
  }

  pool = null;
  dbMode = 'memory-demo';
  console.warn(
    `[DB] MySQL unavailable (${lastError?.code || lastError?.message}). Running in pre-seeded memory-demo mode.`
  );
  return { mode: dbMode, pool: null };
}

export function getPool() {
  return pool;
}

export function isMySqlReady() {
  return dbMode === 'mysql' && pool !== null;
}

export function getDbMode() {
  return dbMode;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
