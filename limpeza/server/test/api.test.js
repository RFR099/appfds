import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import '../src/time.js';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'limpeza-test-'));
const uploadDir = path.join(tmp, 'uploads');
let db;
let app;

const H = { 'X-Requested-With': 'limpeza-app' };
async function login(username, password) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').set(H).send({ username, password });
  assert.equal(res.status, 200, res.text);
  return agent;
}

const FINANCIAL_KEYS = ['value', 'hourly_rate', 'labor_cost', 'fuel_cost', 'material_cost', 'other_cost', 'total_cost',
  'profit', 'margin', 'revenue', 'invoice_status', 'invoice_number', 'finance'];
function assertNoFinancialData(obj, where) {
  const walk = (o, p) => {
    if (Array.isArray(o)) return o.forEach((x, i) => walk(x, `${p}[${i}]`));
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) {
        assert.ok(!FINANCIAL_KEYS.includes(k), `${where}: campo financeiro "${p}.${k}" exposto ao operador`);
        walk(v, `${p}.${k}`);
      }
    }
  };
  walk(obj, '');
}

// PNG mínimo válido (1x1)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

before(() => {
  db = openDb(':memory:');
  seed(db, { uploadDir });
  app = createApp(db, { secret: 'test-secret', uploadDir });
});
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('dados de demonstração', () => {
  test('quantidades pedidas', () => {
    const n = (sql) => db.prepare(sql).get().n;
    assert.equal(n(`SELECT COUNT(*) AS n FROM users WHERE role = 'director'`), 1);
    assert.equal(n(`SELECT COUNT(*) AS n FROM users WHERE role = 'operator'`), 10);
    assert.equal(n('SELECT COUNT(*) AS n FROM employees WHERE id NOT IN (SELECT employee_id FROM users WHERE employee_id IS NOT NULL)'), 40);
    assert.equal(n('SELECT COUNT(*) AS n FROM vans'), 15);
    assert.equal(n('SELECT COUNT(*) AS n FROM clients'), 100);
    assert.equal(n('SELECT COUNT(*) AS n FROM services'), 300);
  });
});

describe('autenticação', () => {
  test('sem sessão → 401', async () => {
    assert.equal((await request(app).get('/api/admin/dashboard')).status, 401);
    assert.equal((await request(app).get('/api/op/today')).status, 401);
    assert.equal((await request(app).get('/api/photos/1')).status, 401);
  });
  test('password errada → 401', async () => {
    const r = await request(app).post('/api/auth/login').set(H).send({ username: 'diretor', password: 'x' });
    assert.equal(r.status, 401);
  });
  test('pedido de escrita sem cabeçalho anti-CSRF → 403', async () => {
    const r = await request(app).post('/api/auth/login').send({ username: 'diretor', password: 'diretor123' });
    assert.equal(r.status, 403);
  });
  test('cookie de sessão é httpOnly e SameSite=Strict', async () => {
    const r = await request(app).post('/api/auth/login').set(H).send({ username: 'diretor', password: 'diretor123' });
    const c = r.headers['set-cookie'][0];
    assert.match(c, /HttpOnly/);
    assert.match(c, /SameSite=Strict/);
  });
});

describe('permissões do operador', () => {
  test('não acede a nenhuma rota administrativa (mesmo alterando o URL)', async () => {
    const op = await login('carlos.silva', 'operador123');
    for (const p of ['dashboard', 'operation', 'services', 'services/1', 'clients', 'clients/1', 'employees', 'employees/1',
      'operators', 'vans', 'teams', 'costs', 'billing', 'profitability', 'reports/summary', 'reports/services.csv',
      'reports/payroll.csv', 'settings', 'alerts', 'events', 'lookups']) {
      const r = await op.get(`/api/admin/${p}`);
      assert.equal(r.status, 403, `/api/admin/${p}`);
    }
    assert.equal((await op.post('/api/admin/services').set(H).send({})).status, 403);
    assert.equal((await op.put('/api/admin/employees/1').set(H).send({})).status, 403);
  });

  test('só vê os seus serviços; serviços e fotos de outros → 404', async () => {
    const carlos = db.prepare(`SELECT id FROM users WHERE username = 'carlos.silva'`).get().id;
    const other = db.prepare('SELECT id FROM services WHERE operator_id <> ? LIMIT 1').get(carlos).id;
    const otherPhoto = db.prepare(
      'SELECT p.id FROM service_photos p JOIN services s ON s.id = p.service_id WHERE s.operator_id <> ? LIMIT 1',
    ).get(carlos).id;
    const op = await login('carlos.silva', 'operador123');
    assert.equal((await op.get(`/api/op/services/${other}`)).status, 404);
    assert.equal((await op.post(`/api/op/services/${other}/start`).set(H)).status, 404);
    assert.equal((await op.post(`/api/op/services/${other}/photos`).set(H).attach('photos', PNG, 'a.png')).status, 404);
    assert.equal((await op.get(`/api/photos/${otherPhoto}`)).status, 404);
    for (const scope of ['upcoming', 'history']) {
      const list = await op.get(`/api/op/services?scope=${scope}`);
      assert.ok(list.body.length > 0);
      const owners = db.prepare(`SELECT DISTINCT operator_id FROM services WHERE id IN (${list.body.map((s) => s.id).join(',')})`).all();
      assert.deepEqual(owners.map((o) => o.operator_id), [carlos]);
    }
  });

  test('nenhuma resposta do operador contém dados financeiros', async () => {
    const op = await login('carlos.silva', 'operador123');
    const today = await op.get('/api/op/today');
    assertNoFinancialData(today.body, 'today');
    for (const scope of ['upcoming', 'history']) assertNoFinancialData((await op.get(`/api/op/services?scope=${scope}`)).body, scope);
    assertNoFinancialData((await op.get(`/api/op/services/${today.body.current.id}`)).body, 'detalhe');
    assertNoFinancialData((await op.get('/api/op/employees')).body, 'funcionários');
    assertNoFinancialData((await op.get('/api/op/profile')).body, 'perfil');
  });

  test('operador sem autorização não pode alterar a equipa', async () => {
    const op = await login('rui.fernandes', 'operador123');
    assert.equal((await op.get('/api/op/employees')).status, 403);
    const cur = (await op.get('/api/op/today')).body.current;
    assert.equal((await op.post(`/api/op/services/${cur.id}/team`).set(H).send({ employee_id: 40 })).status, 403);
  });

  test('conta desativada perde o acesso imediatamente', async () => {
    const op = await login('paulo.ribeiro', 'operador123');
    assert.equal((await op.get('/api/op/today')).status, 200);
    db.prepare(`UPDATE users SET active = 0 WHERE username = 'paulo.ribeiro'`).run();
    assert.equal((await op.get('/api/op/today')).status, 401);
    db.prepare(`UPDATE users SET active = 1 WHERE username = 'paulo.ribeiro'`).run();
  });

  test('diretor não usa a API do tablet', async () => {
    const dir = await login('diretor', 'diretor123');
    assert.equal((await dir.get('/api/op/today')).status, 403);
  });
});

describe('fluxo operacional completo', () => {
  test('diretor cria → operador inicia e termina → diretor recebe dados e rentabilidade', async () => {
    const dir = await login('diretor', 'diretor123');
    const lookups = (await dir.get('/api/admin/lookups')).body;
    const operator = lookups.operators.find((o) => o.name === 'Tiago Martins');
    // Liberta o operador de serviços em curso criados pelo seed.
    db.prepare(`UPDATE services SET status = 'agendado', started_at = NULL WHERE operator_id = ? AND status IN ('em_execucao','em_deslocacao')`)
      .run(operator.id);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const emps = lookups.employees.filter((e) => e.status === 'ativo' && e.job_title !== 'Chefe de carrinha').slice(0, 3);
    const create = await dir.post('/api/admin/services').set(H).send({
      client_id: lookups.clients[0].id, date, start_time: '00:00', end_time: '23:59', value: 500,
      van_id: lookups.vans[13].id, operator_id: operator.id, employee_ids: emps.map((e) => e.id),
      fuel_cost: 25, material_cost: 40, other_cost: 15, service_type: 'Limpeza profunda',
    });
    assert.equal(create.status, 201, create.text);
    const id = create.body.id;

    const op = await login('tiago.martins', 'operador123');
    const upcoming = await op.get('/api/op/services?scope=upcoming');
    assert.ok(upcoming.body.some((s) => s.id === id), 'serviço disponível no tablet do operador');
    const detail = await op.get(`/api/op/services/${id}`);
    assert.equal(detail.body.team.length, 4, 'chefe + 3 funcionários');

    const start = await op.post(`/api/op/services/${id}/start`).set(H);
    assert.equal(start.status, 200, start.text);
    assert.match(start.body.message, /Serviço iniciado às \d\d:\d\d/);
    assert.equal((await op.post(`/api/op/services/${id}/start`).set(H)).status, 409);

    const absent = emps[2].id;
    const present = detail.body.team.map((t) => t.id).filter((x) => x !== absent);
    const fin = await op.post(`/api/op/services/${id}/finish`).set(H)
      .field('data', JSON.stringify({
        completed_ok: true, had_problems: true, observations: 'Faltou detergente.',
        issues: [{ category: 'material', description: 'Detergente em falta' }], present_employee_ids: present,
      }))
      .attach('photos', PNG, 'foto.png');
    assert.equal(fin.status, 200, fin.text);
    assert.equal(fin.body.status, 'concluido');
    assert.equal(fin.body.photos.length, 1);
    assertNoFinancialData(fin.body, 'terminar');

    const full = (await dir.get(`/api/admin/services/${id}`)).body;
    assert.equal(full.status, 'concluido');
    assert.ok(full.started_at && full.finished_at);
    assert.equal(full.issues.length, 1);
    assert.equal(full.employees.find((e) => e.id === absent).present, 0);
    const types = full.events.map((e) => e.type);
    for (const t of ['criado', 'atribuido', 'equipa', 'iniciado', 'terminado', 'problema', 'fotografias', 'concluido']) {
      assert.ok(types.includes(t), `timeline contém ${t}`);
    }
    // Rentabilidade: custo de funcionários só conta os presentes; margem = lucro / valor.
    const f = full.finance;
    const hours = (new Date(full.finished_at) - new Date(full.started_at)) / 3600000;
    const rates = full.employees.filter((e) => e.present).reduce((a, e) => a + e.hourly_rate, 0);
    assert.ok(Math.abs(f.labor_cost - hours * rates) < 0.05, 'custo de funcionários = horas reais x valor/hora dos presentes');
    assert.equal(f.value, 500);
    assert.equal(f.total_cost, Math.round((f.labor_cost + 25 + 40 + 15) * 100) / 100);
    assert.equal(f.profit, Math.round((500 - f.total_cost) * 100) / 100);
    assert.equal(f.margin, Math.round((f.profit / 500) * 10000) / 100);

    const alerts = (await dir.get('/api/admin/alerts')).body.alerts.filter((a) => a.service_id === id).map((a) => a.type);
    for (const t of ['concluido', 'problema', 'fotografias']) assert.ok(alerts.includes(t), `alerta ${t}`);
  });

  test('ficheiro que não é imagem é rejeitado', async () => {
    const op = await login('carlos.silva', 'operador123');
    const cur = (await op.get('/api/op/today')).body.current;
    const r = await op.post(`/api/op/services/${cur.id}/photos`).set(H).attach('photos', Buffer.from('<script>alert(1)</script>'), 'x.png');
    assert.equal(r.status, 400);
  });
});

describe('alertas', () => {
  test('carrinha em dois serviços, sem chefe, sem equipa, não iniciado, ultrapassou', async () => {
    const dir = await login('diretor', 'diretor123');
    const types = new Set((await dir.get('/api/admin/alerts')).body.alerts.map((a) => a.type));
    for (const t of ['carrinha_dupla', 'sem_chefe', 'sem_equipa', 'nao_iniciado', 'ultrapassou']) assert.ok(types.has(t), t);
  });
});
