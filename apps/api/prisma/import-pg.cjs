const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const PG_URL = process.env.DATABASE_URL;
if (!PG_URL || !PG_URL.startsWith('postgres')) {
  console.error('❌ DATABASE_URL must be PostgreSQL');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: PG_URL } } });
const DUMP_DIR = path.resolve(__dirname, 'dump');

const MODELS = [
  'user', 'cluster', 'brain', 'channel', 'bot',
  'conversation', 'message', 'contact', 'knowledgeChunk',
  'booking', 'workflow',
];

async function main() {
  for (const model of MODELS) {
    if (!prisma[model]) { console.log(`⏭️  Skip ${model}`); continue; }
    const file = path.join(DUMP_DIR, `${model}.json`);
    if (!fs.existsSync(file)) { console.log(`⏭️  No dump: ${model}`); continue; }
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    let ok = 0, fail = 0;
    for (const row of rows) {
      try {
        await prisma[model].upsert({
          where: { id: row.id },
          create: row,
          update: row,
        });
        ok++;
      } catch (e) {
        fail++;
        if (fail <= 3) {
          console.warn(`  ⚠️  ${model} ${row.id}: ${e.code || e.name} | ${(e.message || '').substring(0, 150)}`);
        }
      }
    }
    console.log(`✅ ${model}: ${ok}/${rows.length}, ${fail} failed`);
  }

  const bbFile = path.join(DUMP_DIR, 'botBrain.json');
  if (fs.existsSync(bbFile)) {
    const rows = JSON.parse(fs.readFileSync(bbFile, 'utf8'));
    let ok = 0, fail = 0;
    for (const row of rows) {
      try {
        await prisma.botBrain.upsert({
          where: { botId_brainId: { botId: row.botId, brainId: row.brainId } },
          create: { botId: row.botId, brainId: row.brainId },
          update: {},
        });
        ok++;
      } catch (e) { fail++; }
    }
    console.log(`✅ botBrain: ${ok}/${rows.length}, ${fail} failed`);
  }

  await prisma.$disconnect();
  console.log('🎉 Import complete!');
}

main().catch((e) => { console.error(e); process.exit(1); });