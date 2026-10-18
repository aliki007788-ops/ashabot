/* ابزار مشترک اسکریپت‌های کیت میزکار (بدون وابستگی؛ فقط Node) */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const kitSrc = path.join(root, 'workspace-kit', 'src');
const kitVersionFile = path.join(root, 'workspace-kit', 'VERSION');
const wsRoot = path.join(root, 'apps', 'web', 'src', 'workspaces');

function listFiles(dir) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name !== '.kit-meta.json') out.push(path.relative(dir, p).split(path.sep).join('/'));
    }
  })(dir);
  return out.sort();
}

function checksum(dir) {
  const h = crypto.createHash('sha256');
  for (const f of listFiles(dir)) {
    h.update(f + '\0');
    // نرمال‌سازی پایان خط تا ویندوز/لینوکس checksum یکسان بدهند
    h.update(fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

function kitVersion() {
  return fs.readFileSync(kitVersionFile, 'utf8').trim();
}

function workspaces() {
  if (!fs.existsSync(wsRoot)) return [];
  return fs
    .readdirSync(wsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(wsRoot, e.name, 'manifest.ts')))
    .map((e) => e.name)
    .sort();
}

module.exports = { root, kitSrc, wsRoot, listFiles, checksum, kitVersion, workspaces, fs, path };
