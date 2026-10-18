// ============================================================
// Migrate data from SQLite (local.db) to PostgreSQL (Render)
// Run: node prisma/migrate-local-to-pg.cjs
// ============================================================

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// SQLite local database
const SQLITE_PATH = path.resolve(__dirname, 'local.db');
const SQLITE_URL = `file:${SQLITE_PATH}`;

// PostgreSQL remote database (from env)
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL || !PG_URL.startsWith('postgres')) {
  console.error('❌ DATABASE_URL must be PostgreSQL. Set it in .env or as env var.');
  process.exit(1);
}

if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`❌ SQLite file not found: ${SQLITE_PATH}`);
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } });
const target = new PrismaClient({ datasources: { db: { url: PG_URL } } });

async function copyModel(modelName, order = []) {
  const sourceModel = source[modelName];
  const targetModel = target[modelName];
  if (!sourceModel || !targetModel) {
    console.log(`⏭️  Skip ${modelName} (not in schema)`);
    return 0;
  }
  const rows = await sourceModel.findMany();
  let ok = 0, fail = 0;
  for (const row of rows) {
    try {
      await targetModel.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      ok++;
    } catch (e) {
      fail++;
      if (fail <= 3) console.warn(`  ⚠️  ${modelName} id=${row.id}:`, e.code || e.name || '', '|', (e.message || 'no message').substring(0, 300));
    }
  }
  console.log(`✅ ${modelName}: ${ok} copied, ${fail} failed (total ${rows.length})`);
  return ok;
}

async function main() {
  console.log('🚀 Starting migration: SQLite → PostgreSQL');
  console.log(`   Source: ${SQLITE_PATH}`);
  console.log(`   Target: ${PG_URL.split('@')[1] || PG_URL}`);

  // Order matters: parent tables first
  await copyModel('user');
  await copyModel('cluster');
  await copyModel('brain');
  await copyModel('channel');
  await copyModel('bot');
  await copyModel('botBrain');
  await copyModel('conversation');
  await copyModel('message');
  await copyModel('contact');
  await copyModel('knowledge');
  await copyModel('knowledgeChunk');
  await copyModel('booking');
  await copyModel('workflow');
  await copyModel('template');
  await copyModel('inboxItem');

  console.log('🎉 Migration complete!');
  await source.$disconnect();
  await target.$disconnect();
}

main().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});