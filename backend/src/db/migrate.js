import { runSqlMigrations } from './connection.js';

async function main() {
  try {
    await runSqlMigrations();
    console.log('[DB] Migrations applied successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[DB] Migration failed:', error.message);
    process.exit(1);
  }
}

main();
