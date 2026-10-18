import type { FastifyInstance } from 'fastify';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IMPORT_KEY = 'asha-import-2026-temp';

export async function adminImportRoutes(app: FastifyInstance) {
  app.post('/run-import', async (request, reply) => {
    const { key } = (request.body || {}) as { key?: string };
    if (key !== IMPORT_KEY) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const here = path.dirname(fileURLToPath(import.meta.url));
    const script = path.resolve(here, '..', '..', '..', 'prisma', 'import-pg.cjs');

    return new Promise((resolve) => {
      const child = spawn(process.execPath, [script], {
        cwd: path.resolve(here, '..', '..', '..'),
        env: process.env,
      });
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => { out += d.toString(); });
      child.stderr.on('data', (d) => { err += d.toString(); });
      child.on('close', (code) => {
        resolve({ exitCode: code, stdout: out, stderr: err });
      });
      child.on('error', (e) => {
        resolve({ exitCode: -1, stdout: out, stderr: e.message });
      });
    });
  });
}