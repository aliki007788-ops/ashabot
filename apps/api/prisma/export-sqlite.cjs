// Export all data from SQLite local.db to JSON files
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const SQLITE_URL = `file:${path.resolve(__dirname, 'local.db')}`;
const prisma = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } });

const OUT_DIR = path.resolve(__dirname, 'dump');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const MODELS = [
  'user', 'cluster', 'brain', 'channel', 'bot', 'botBrain',
  'conversation', 'message', 'contact', 'knowledgeChunk',
  'booking', 'workflow',
];

async function main() {
  for (const model of MODELS) {
    if (!prisma[model]) {
      console.log(`⏭️  Skip ${model}`);
      continue;
    }
    try {
      const rows = await prisma[model].findMany();
      const file = path.join(OUT_DIR, `${model}.json`);
      fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
      console.log(`✅ ${model}: ${rows.length} rows → ${file}`);
    } catch (e) {
      console.log(`❌ ${model}: ${e.message.split('\n')[0]}`);
    }
  }
  await prisma.$disconnect();
  console.log('🎉 Export complete!');
}

main().catch((e) => { console.error(e); process.exit(1); });