// Gera client/demo/snapshot.json: um retrato das respostas da API (dados de demonstração) para a
// versão estática de demonstração do frontend (npm run build:demo no client). Não é usado em produção.
import '../src/time.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';
import { localDate } from '../src/time.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, '..', 'client', 'demo', 'snapshot.json');
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'limpeza-demo-'));
const db = openDb(':memory:');
seed(db, { uploadDir });
const app = createApp(db, { secret: 'demo', uploadDir });
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;

async function login(username, password) {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'limpeza-app' },
    body: JSON.stringify({ username, password }),
  });
  return { cookie: r.headers.get('set-cookie').split(';')[0], user: await r.json() };
}
const responses = {};
async function get(session, url) {
  const r = await fetch(`${base}${url}`, { headers: { cookie: session.cookie } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  const j = await r.json();
  responses[url] = j;
  return j;
}

const dir = await login('diretor', 'diretor123');
for (const u of ['/admin/dashboard', '/admin/alerts', '/admin/lookups', '/admin/settings', '/admin/operators', '/admin/vans',
  '/admin/teams', '/admin/clients', '/admin/employees', '/admin/costs', '/admin/billing', '/admin/profitability',
  '/admin/reports/summary', '/admin/events', '/admin/services?page_size=500']) await get(dir, u);
const today = localDate();
for (let i = -3; i <= 7; i++) {
  const d = new Date(); d.setDate(d.getDate() + i);
  await get(dir, `/admin/operation?date=${localDate(d)}`);
}
for (const { id } of db.prepare('SELECT id FROM services').all()) await get(dir, `/admin/services/${id}`);
for (const { id } of db.prepare('SELECT id FROM clients').all()) await get(dir, `/admin/clients/${id}`);
for (const { id } of db.prepare('SELECT id FROM employees').all()) await get(dir, `/admin/employees/${id}`);

const op = await login('carlos.silva', 'operador123');
for (const u of ['/op/today', '/op/services?scope=upcoming', '/op/services?scope=history', '/op/employees', '/op/profile']) await get(op, u);
for (const { id } of db.prepare('SELECT id FROM services WHERE operator_id = ?').all(op.user.id)) await get(op, `/op/services/${id}`);

// Fotografias: ficheiros distintos em data URI + mapa id → ficheiro.
const files = {};
const photos = {};
for (const p of db.prepare('SELECT id, filename, mime FROM service_photos').all()) {
  if (!files[p.filename]) files[p.filename] = `data:${p.mime};base64,${fs.readFileSync(path.join(uploadDir, p.filename)).toString('base64')}`;
  photos[p.id] = p.filename;
}

server.close();
fs.rmSync(uploadDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({
  recordedAt: new Date().toISOString(), today,
  users: { diretor: dir.user, 'carlos.silva': op.user },
  responses, files, photos,
}));
console.log(`snapshot: ${Object.keys(responses).length} respostas, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB → ${out}`);
