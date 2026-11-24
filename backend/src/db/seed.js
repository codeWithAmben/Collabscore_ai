import { initDatabase, closePool, isMySqlReady } from './connection.js';
import { ensureDemoSeedData } from './repository.js';

async function main() {
  try {
    await initDatabase();
    if (!isMySqlReady()) {
      console.error(
        '[DB] Seed skipped: MySQL is not reachable. Start Laragon MySQL on 127.0.0.1:3306 and re-run npm run db:seed.'
      );
      process.exit(1);
    }
    const user = await ensureDemoSeedData({ resetEvaluations: false });
    console.log(`[DB] Seeded CollabScore AI demo workspace for ${user.email}.`);
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('[DB] Seed failed:', error.message);
    await closePool();
    process.exit(1);
  }
}

main();
