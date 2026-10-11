const fs = require('fs');
const p = 'C:/Users/K.ali/Desktop/robot/bot-platform/apps/api/src/modules/channels/channels.routes.ts';

let c = fs.readFileSync(p, 'utf8');
let changes = 0;

// حذف userId از where ربات‌ها و اتصالات
const replacements = [
  [/\{ id: input\.botId, userId \}/g, '{ id: input.botId }'],
  [/\{ id: query\.botId, userId \}/g, '{ id: query.botId }'],
  [/\{ id: connectionId, bot: \{ userId \} \}/g, '{ id: connectionId }'],
  [/\{ id: input\.connectionId, bot: \{ userId \} \}/g, '{ id: input.connectionId }'],
  [/\{ id: botId, userId \}/g, '{ id: botId }'],
];

replacements.forEach(([pattern, replacement]) => {
  const before = c.length;
  c = c.replace(pattern, replacement);
  if (c.length !== before) {
    changes++;
    console.log('Changed pattern:', pattern.toString());
  }
});

fs.writeFileSync(p, c, 'utf8');
console.log('\nDONE - Total changes:', changes);
console.log('File written:', p);