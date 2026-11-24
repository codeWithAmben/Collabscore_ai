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
  const { host, port, user, password, database } = config.db;
  const adminConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
    connectTimeout: 4000
  });

  try {
    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await adminConnection.query(`USE \`${database}\`;`);
    const schemaSql = await fs.readFile(INIT_SQL_PATH, 'utf8');
    await adminConnection.query(schemaSql);
  } finally {
    await adminConnection.end();
  }
}

export async function initDatabase() {
  if (pool) {
    return { mode: dbMode, pool };
  }

  try {
    await runSqlMigrations();
    const { host, port, user, password, database } = config.db;
    const nextPool = mysql.createPool({
      host,
      port,
      user,
      password,
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
    if (!config.allowMemoryFallback) {
      throw error;
    }
    pool = null;
    dbMode = 'memory-demo';
    console.warn(
      `[DB] MySQL unavailable (${error.code || error.message}). Running in pre-seeded memory-demo mode.`
    );
    return { mode: dbMode, pool: null };
  }
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
