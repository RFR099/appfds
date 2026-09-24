import express from 'express';
import { computeAlerts } from '../alerts.js';
import { getSettings, DEFAULT_SETTINGS, tx } from '../db.js';
import { hashPassword } from '../auth.js';
import {
  aggregate, employeeWork, expensesTotal, groupedAggregate, monthlySeries, r2, summarizeWork,
} from '../finance.js';
import {
  addEvent, findOperatorConflicts, findVanConflicts, getServiceFull, STATUS_LABEL,
} from '../services.js';
import {
  combineLocal, dayRange, isValidDateStr, localDate, monthKey, monthRange, nowIso, periodRange,
} from '../time.js';
import {
  bad, bool, HHMM, HttpError, idList, int, isoDateTime, notFound, num, oneOf, str,
} from '../validate.js';

const SERVICE_TYPES = [
  'Limpeza de manutenção', 'Limpeza profunda', 'Limpeza pós-obra', 'Limpeza de vidros',
  'Limpeza industrial', 'Higienização e desinfeção', 'Limpeza de escadas/condomínio', 'Tratamento de pavimentos',
];
const CLIENT_TYPES = ['Hotel', 'Condomínio', 'Escritório', 'Restaurante', 'Clínica', 'Loja', 'Escola', 'Indústria', 'Particular', 'Ginásio'];
const EXPENSE_CATEGORIES = ['combustivel', 'manutencao', 'seguros', 'portagens', 'equipamento', 'materiais', 'administrativos', 'outros'];

const SERVICE_LIST_SQL = `
  SELECT s.id, s.title, s.service_type, s.scheduled_start, s.scheduled_end, s.status, s.started_at, s.finished_at,
         s.value, s.fuel_cost, s.material_cost, s.other_cost, s.invoice_status, s.invoice_number, s.had_problems,
         s.city, s.client_id, s.van_id, s.operator_id,
         c.name AS client_name, v.name AS van_name, u.name AS operator_name,
         f.hours, f.labor_cost,
         ROUND(f.labor_cost + s.fuel_cost + s.material_cost + s.other_cost, 2) AS total_cost,
         ROUND(s.value - (f.labor_cost + s.fuel_cost + s.material_cost + s.other_cost), 2) AS profit,
         (SELECT COUNT(*) FROM service_employees se WHERE se.service_id = s.id) AS team_size,
         (SELECT COUNT(*) FROM service_photos p WHERE p.service_id = s.id) AS photo_count
    FROM services s
    JOIN clients c ON c.id = s.client_id
    JOIN service_fin f ON f.service_id = s.id
    LEFT JOIN vans v ON v.id = s.van_id
    LEFT JOIN users u ON u.id = s.operator_id`;

/** Lê ?from=&to= (datas locais) com um valor por omissão; devolve também o intervalo ISO. */
function period(req, defFrom, defTo) {
  const from = isValidDateStr(req.query.from) ? req.query.from : defFrom;
  const to = isValidDateStr(req.query.to) ? req.query.to : defTo;
  if (from > to) throw bad('Intervalo de datas inválido.');
  const [fromIso, toIso] = periodRange(from, to);
  return { from, to, fromIso, toIso };
}
const firstOfMonth = (d = new Date()) => localDate(new Date(d.getFullYear(), d.getMonth(), 1));
const lastOfMonth = (d = new Date()) => localDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));

function csv(res, filename, header, rows) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita injeção de fórmulas no Excel
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [header, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`﻿${body}`);
}

const dec = (n) => (n === null || n === undefined ? '' : String(r2(n)).replace('.', ','));

export function adminRouter(db) {
  const r = express.Router();

  /* ------------------------------------------------------------ DASHBOARD */
  r.get('/dashboard', (req, res) => {
    const today = localDate();
    const [from, to] = dayRange(today);
    const board = db
      .prepare(`${SERVICE_LIST_SQL} WHERE s.scheduled_start >= ? AND s.scheduled_start < ? AND s.status <> 'cancelado'
                ORDER BY v.name, s.scheduled_start`)
      .all(from, to);
    const count = (st) => board.filter((s) => st.includes(s.status)).length;
    const running = board.filter((s) => ['em_execucao', 'em_deslocacao'].includes(s.status));
    const now = new Date();
    const monthAgg = aggregate(db, ...monthRange(monthKey(now)));
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevAgg = aggregate(db, ...monthRange(monthKey(prev)));
    const alerts = computeAlerts(db);
    const feed = db
      .prepare(`SELECT ev.id, ev.service_id, ev.at, ev.type, ev.message, u.name AS actor_name, c.name AS client_name
                  FROM service_events ev JOIN services s ON s.id = ev.service_id JOIN clients c ON c.id = s.client_id
                  LEFT JOIN users u ON u.id = ev.actor_id
                 WHERE ev.at <= ? ORDER BY ev.at DESC, ev.id DESC LIMIT 15`)
      .all(nowIso());
    const billing = db
      .prepare(`SELECT invoice_status, COUNT(*) AS n, SUM(value) AS total FROM services
                 WHERE status = 'concluido' GROUP BY invoice_status`)
      .all();
    const [tFrom, tTo] = dayRange(localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)));
    res.json({
      date: today,
      today: {
        total: board.length,
        in_progress: count(['em_execucao', 'em_deslocacao']),
        executing: count(['em_execucao']),
        traveling: count(['em_deslocacao']),
        completed: count(['concluido']),
        pending: count(['agendado']),
        with_problems: board.filter((s) => s.had_problems).length,
        vans_in_operation: new Set(running.map((s) => s.van_id).filter(Boolean)).size,
        active_operators: new Set(running.map((s) => s.operator_id).filter(Boolean)).size,
        revenue_planned: r2(board.reduce((a, s) => a + s.value, 0)),
      },
      tomorrow: db.prepare(`SELECT COUNT(*) AS n FROM services WHERE status <> 'cancelado' AND scheduled_start >= ? AND scheduled_start < ?`).get(tFrom, tTo).n,
      board,
      month: monthAgg,
      prev_month: prevAgg,
      series: monthlySeries(db, 4),
      alerts: alerts.filter((a) => !a.read).slice(0, 8),
      alerts_unread: alerts.filter((a) => !a.read).length,
      feed,
      billing: Object.fromEntries(billing.map((b) => [b.invoice_status, { n: b.n, total: r2(b.total) }])),
    });
  });

  /* ------------------------------------------------------------ OPERAÇÃO (quadro por carrinha) */
  r.get('/operation', (req, res) => {
    const date = isValidDateStr(req.query.date) ? req.query.date : localDate();
    const [from, to] = dayRange(date);
    const services = db
      .prepare(`${SERVICE_LIST_SQL} WHERE s.scheduled_start >= ? AND s.scheduled_start < ? ORDER BY s.scheduled_start`)
      .all(from, to);
    const vans = db.prepare('SELECT id, name, plate, status FROM vans ORDER BY name').all();
    const lanes = vans.map((v) => {
      const list = services.filter((s) => s.van_id === v.id);
      const current = list.find((s) => ['em_execucao', 'em_deslocacao'].includes(s.status))
        ?? list.find((s) => s.status === 'agendado') ?? list[list.length - 1] ?? null;
      return { van: v, current, services: list };
    });
    const unassigned = services.filter((s) => !s.van_id);
    const events = db
      .prepare(`SELECT ev.id, ev.service_id, ev.at, ev.type, ev.message, u.name AS actor_name, c.name AS client_name
                  FROM service_events ev JOIN services s ON s.id = ev.service_id JOIN clients c ON c.id = s.client_id
                  LEFT JOIN users u ON u.id = ev.actor_id
                 WHERE ev.at >= ? AND ev.at < ? ORDER BY ev.at DESC, ev.id DESC LIMIT 200`)
      .all(from, to);
    res.json({ date, lanes, unassigned, events });
  });

  /* ------------------------------------------------------------ ALERTAS */
  r.get('/alerts', (req, res) => {
    const alerts = computeAlerts(db);
    res.json({ alerts, unread: alerts.filter((a) => !a.read).length });
  });
  r.post('/alerts/read', (req, res) => {
    const keys = Array.isArray(req.body?.keys) ? req.body.keys.map(String).slice(0, 500) : [];
    const ins = db.prepare('INSERT OR REPLACE INTO alert_reads (alert_key, read_at) VALUES (?, ?)');
    tx(db, () => keys.forEach((k) => ins.run(k, nowIso())));
    res.json({ ok: true });
  });

  /* ------------------------------------------------------------ LISTAS PARA FORMULÁRIOS */
  r.get('/lookups', (req, res) => {
    res.json({
      clients: db.prepare('SELECT id, name, type, address, city FROM clients WHERE active = 1 ORDER BY name').all(),
      vans: db.prepare('SELECT id, name, plate, status FROM vans ORDER BY name').all(),
      operators: db.prepare(`SELECT u.id, u.name, u.employee_id, u.active FROM users u WHERE u.role = 'operator' ORDER BY u.name`).all(),
      employees: db.prepare(`SELECT id, name, job_title, hourly_rate, status FROM employees ORDER BY name`).all(),
      teams: db.prepare('SELECT id, name, van_id, leader_user_id FROM teams WHERE active = 1 ORDER BY name').all()
        .map((t) => ({ ...t, member_ids: db.prepare('SELECT employee_id FROM team_members WHERE team_id = ?').all(t.id).map((m) => m.employee_id) })),
      service_types: SERVICE_TYPES,
      client_types: CLIENT_TYPES,
      expense_categories: EXPENSE_CATEGORIES,
    });
  });

  /* ------------------------------------------------------------ SERVIÇOS */
  function serviceFilters(req) {
    const where = [];
    const params = [];
    if (isValidDateStr(req.query.from)) { where.push('s.scheduled_start >= ?'); params.push(dayRange(req.query.from)[0]); }
    if (isValidDateStr(req.query.to)) { where.push('s.scheduled_start < ?'); params.push(dayRange(req.query.to)[1]); }
    if (STATUS_LABEL[req.query.status]) { where.push('s.status = ?'); params.push(req.query.status); }
    if (['por_faturar', 'faturado', 'pago'].includes(req.query.invoice_status)) {
      where.push(`s.invoice_status = ? AND s.status = 'concluido'`); params.push(req.query.invoice_status);
    }
    for (const k of ['client_id', 'van_id', 'operator_id']) {
      if (req.query[k]) { where.push(`s.${k} = ?`); params.push(Number(req.query[k])); }
    }
    if (req.query.problems === '1') where.push('s.had_problems = 1');
    if (req.query.q) {
      where.push('(c.name LIKE ? OR s.title LIKE ? OR s.city LIKE ? OR CAST(s.id AS TEXT) = ?)');
      const q = `%${String(req.query.q).slice(0, 100)}%`;
      params.push(q, q, q, String(req.query.q).replace('#', ''));
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
  }

  r.get('/services', (req, res) => {
    const { sql, params } = serviceFilters(req);
    const pageSize = Math.min(Math.max(Number(req.query.page_size) || 50, 1), 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const order = req.query.sort === 'asc' ? 'ASC' : 'DESC';
    const base = `SELECT * FROM (${SERVICE_LIST_SQL} ${sql}) x`;
    const totals = db
      .prepare(`SELECT COUNT(*) AS n, SUM(value) AS value, SUM(total_cost) AS cost, SUM(profit) AS profit FROM (${base})`)
      .get(...params);
    const rows = db.prepare(`${base} ORDER BY scheduled_start ${order} LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize);
    res.json({ rows, total: totals.n, page, page_size: pageSize, totals: { value: r2(totals.value), cost: r2(totals.cost), profit: r2(totals.profit) } });
  });

  r.get('/services/:id', (req, res) => {
    const s = getServiceFull(db, Number(req.params.id));
    if (!s) throw notFound('Serviço não encontrado.');
    res.json({
      ...s,
      conflicts: ['concluido', 'cancelado'].includes(s.status) ? { van: [], operator: [] } : {
        van: findVanConflicts(db, s.van_id, s.scheduled_start, s.scheduled_end, s.id),
        operator: findOperatorConflicts(db, s.operator_id, s.scheduled_start, s.scheduled_end, s.id),
      },
    });
  });

  function parseServiceInput(body, existing) {
    const clientId = int(body.client_id, 'Cliente', { required: true, min: 1 });
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (!client) throw bad('Cliente inválido.');
    if (!isValidDateStr(body.date)) throw bad('Data inválida.');
    if (!HHMM.test(body.start_time ?? '') || !HHMM.test(body.end_time ?? '')) throw bad('Horário inválido.');
    const start = combineLocal(body.date, body.start_time);
    let end = combineLocal(body.date, body.end_time);
    if (end <= start) {
      const d = new Date(end);
      d.setDate(d.getDate() + 1);
      end = d.toISOString();
    }
    const vanId = int(body.van_id, 'Carrinha', { min: 1 });
    if (vanId && !db.prepare('SELECT id FROM vans WHERE id = ?').get(vanId)) throw bad('Carrinha inválida.');
    const operatorId = int(body.operator_id, 'Chefe de carrinha', { min: 1 });
    let operator = null;
    if (operatorId) {
      operator = db.prepare(`SELECT id, name, employee_id, active FROM users WHERE id = ? AND role = 'operator'`).get(operatorId);
      if (!operator) throw bad('Chefe de carrinha inválido.');
      if (!operator.active && operatorId !== existing?.operator_id) throw bad('Este operador está inativo.');
    }
    const employeeIds = idList(body.employee_ids, 'Funcionários');
    for (const id of employeeIds) {
      const e = db.prepare('SELECT status FROM employees WHERE id = ?').get(id);
      if (!e) throw bad('Funcionário inválido.');
    }
    const teamId = int(body.team_id, 'Equipa', { min: 1 });
    return {
      client,
      fields: {
        client_id: clientId,
        title: str(body.title, 'Título', { max: 200 }) ?? client.name,
        service_type: oneOf(body.service_type, 'Tipo de serviço', SERVICE_TYPES) ?? SERVICE_TYPES[0],
        address: str(body.address, 'Morada', { max: 300 }) ?? client.address,
        city: str(body.city, 'Localidade', { max: 100 }) ?? client.city,
        instructions: str(body.instructions, 'Instruções', { max: 4000 }),
        scheduled_start: start,
        scheduled_end: end,
        value: num(body.value, 'Valor do serviço', { required: true, max: 1e7 }),
        van_id: vanId,
        operator_id: operatorId,
        team_id: teamId && db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId) ? teamId : null,
        fuel_cost: num(body.fuel_cost, 'Combustível', { max: 1e6 }) ?? 0,
        material_cost: num(body.material_cost, 'Materiais', { max: 1e6 }) ?? 0,
        other_cost: num(body.other_cost, 'Outros custos', { max: 1e6 }) ?? 0,
      },
      operator,
      employeeIds,
    };
  }

  /** Sincroniza os funcionários do serviço mantendo snapshot de valor/hora e presenças já registadas. */
  function syncServiceEmployees(serviceId, operator, employeeIds) {
    const current = new Map(
      db.prepare('SELECT * FROM service_employees WHERE service_id = ?').all(serviceId).map((x) => [x.employee_id, x]),
    );
    const wanted = new Set(employeeIds);
    if (operator?.employee_id) wanted.add(operator.employee_id);
    for (const [id] of current) {
      if (!wanted.has(id)) db.prepare('DELETE FROM service_employees WHERE service_id = ? AND employee_id = ?').run(serviceId, id);
    }
    for (const id of wanted) {
      const isLeader = operator?.employee_id === id ? 1 : 0;
      if (current.has(id)) {
        db.prepare('UPDATE service_employees SET is_leader = ? WHERE service_id = ? AND employee_id = ?').run(isLeader, serviceId, id);
      } else {
        const rate = db.prepare('SELECT hourly_rate FROM employees WHERE id = ?').get(id).hourly_rate;
        db.prepare('INSERT INTO service_employees (service_id, employee_id, hourly_rate, is_leader) VALUES (?, ?, ?, ?)')
          .run(serviceId, id, rate, isLeader);
      }
    }
    const names = db.prepare(
      'SELECT e.name FROM service_employees se JOIN employees e ON e.id = se.employee_id WHERE se.service_id = ? ORDER BY se.is_leader DESC, e.name',
    ).all(serviceId).map((x) => x.name);
    return names;
  }

  function warningsFor(fields, excludeId) {
    const w = [];
    for (const c of findVanConflicts(db, fields.van_id, fields.scheduled_start, fields.scheduled_end, excludeId)) {
      w.push(`A carrinha já está atribuída ao serviço #${c.id} (${c.title}) no mesmo horário.`);
    }
    for (const c of findOperatorConflicts(db, fields.operator_id, fields.scheduled_start, fields.scheduled_end, excludeId)) {
      w.push(`O chefe de carrinha já tem o serviço #${c.id} (${c.title}) no mesmo horário.`);
    }
    if (!fields.operator_id) w.push('Serviço sem chefe de carrinha — não ficará visível em nenhum tablet.');
    return w;
  }

  r.post('/services/check', (req, res) => {
    const { fields } = parseServiceInput(req.body ?? {}, null);
    res.json({ warnings: warningsFor(fields, Number(req.body?.id) || 0) });
  });

  r.post('/services', (req, res) => {
    const { fields, operator, employeeIds } = parseServiceInput(req.body ?? {}, null);
    const at = nowIso();
    const id = tx(db, () => {
      const cols = Object.keys(fields);
      const info = db.prepare(
        `INSERT INTO services (${cols.join(', ')}, created_by, created_at, updated_at)
         VALUES (${cols.map(() => '?').join(', ')}, ?, ?, ?)`,
      ).run(...cols.map((k) => fields[k]), req.user.id, at, at);
      const sid = Number(info.lastInsertRowid);
      addEvent(db, sid, req.user.id, 'criado', `Serviço criado pelo diretor ${req.user.name}`, null, at);
      if (operator) addEvent(db, sid, req.user.id, 'atribuido', `Serviço atribuído ao operador ${operator.name}`, null, at);
      const names = syncServiceEmployees(sid, operator, employeeIds);
      if (names.length) addEvent(db, sid, req.user.id, 'equipa', `Equipa definida: ${names.join(', ')}`, null, at);
      return sid;
    });
    res.status(201).json({ id, warnings: warningsFor(fields, id) });
  });

  r.put('/services/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!existing) throw notFound('Serviço não encontrado.');
    if (existing.status === 'cancelado') throw new HttpError(409, 'Serviço cancelado não pode ser editado.');
    const { fields, operator, employeeIds } = parseServiceInput(req.body ?? {}, existing);
    // Correção de horas reais (só diretor), p.ex. se o operador se esqueceu de terminar.
    if (existing.status === 'concluido' || existing.started_at) {
      const sa = isoDateTime(req.body.started_at, 'Hora real de início');
      const fa = isoDateTime(req.body.finished_at, 'Hora real de fim');
      if (sa) fields.started_at = sa;
      if (fa && existing.status === 'concluido') fields.finished_at = fa;
      if ((fields.started_at ?? existing.started_at) && (fields.finished_at ?? existing.finished_at)
        && (fields.finished_at ?? existing.finished_at) <= (fields.started_at ?? existing.started_at)) {
        throw bad('A hora de fim tem de ser posterior à hora de início.');
      }
    }
    const labels = {
      client_id: 'cliente', title: 'título', service_type: 'tipo', address: 'morada', city: 'localidade',
      instructions: 'instruções', scheduled_start: 'início previsto', scheduled_end: 'fim previsto', value: 'valor',
      van_id: 'carrinha', fuel_cost: 'combustível', material_cost: 'materiais', other_cost: 'outros custos',
      started_at: 'hora real de início', finished_at: 'hora real de fim', team_id: 'equipa base',
    };
    const changed = Object.keys(fields).filter((k) => k !== 'operator_id' && fields[k] !== existing[k] && labels[k]);
    const at = nowIso();
    tx(db, () => {
      const cols = Object.keys(fields);
      db.prepare(`UPDATE services SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
        .run(...cols.map((k) => fields[k]), at, id);
      if (changed.length) {
        addEvent(db, id, req.user.id, 'alterado', `Alterado pelo diretor: ${changed.map((k) => labels[k]).join(', ')}`, {
          before: Object.fromEntries(changed.map((k) => [k, existing[k]])),
          after: Object.fromEntries(changed.map((k) => [k, fields[k]])),
        }, at);
      }
      if (fields.operator_id !== existing.operator_id) {
        addEvent(db, id, req.user.id, 'atribuido', operator ? `Serviço atribuído ao operador ${operator.name}` : 'Chefe de carrinha removido', null, at);
      }
      const before = db.prepare('SELECT employee_id FROM service_employees WHERE service_id = ? ORDER BY employee_id').all(id).map((x) => x.employee_id).join(',');
      const names = syncServiceEmployees(id, operator, employeeIds);
      const after = db.prepare('SELECT employee_id FROM service_employees WHERE service_id = ? ORDER BY employee_id').all(id).map((x) => x.employee_id).join(',');
      if (before !== after) addEvent(db, id, req.user.id, 'equipa', `Equipa alterada: ${names.join(', ') || '(sem funcionários)'}`, null, at);
    });
    res.json({ id, warnings: warningsFor(fields, id) });
  });

  r.post('/services/:id/cancel', (req, res) => {
    const id = Number(req.params.id);
    const s = db.prepare('SELECT status FROM services WHERE id = ?').get(id);
    if (!s) throw notFound('Serviço não encontrado.');
    if (s.status === 'concluido') throw new HttpError(409, 'Serviço concluído não pode ser cancelado.');
    const reason = str(req.body?.reason, 'Motivo', { max: 500 });
    tx(db, () => {
      db.prepare(`UPDATE services SET status = 'cancelado', updated_at = ? WHERE id = ?`).run(nowIso(), id);
      addEvent(db, id, req.user.id, 'cancelado', `Serviço cancelado pelo diretor${reason ? `: ${reason}` : ''}`);
    });
    res.json({ ok: true });
  });

  r.post('/services/:id/reopen', (req, res) => {
    const id = Number(req.params.id);
    const s = db.prepare('SELECT status FROM services WHERE id = ?').get(id);
    if (!s) throw notFound('Serviço não encontrado.');
    if (s.status !== 'cancelado') throw new HttpError(409, 'Só serviços cancelados podem ser reativados.');
    tx(db, () => {
      db.prepare(`UPDATE services SET status = 'agendado', updated_at = ? WHERE id = ?`).run(nowIso(), id);
      addEvent(db, id, req.user.id, 'alterado', 'Serviço reativado pelo diretor');
    });
    res.json({ ok: true });
  });

  /* ------------------------------------------------------------ FATURAÇÃO */
  function nextInvoiceNumber() {
    const year = new Date().getFullYear();
    const last = db.prepare(`SELECT invoice_number FROM services WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`)
      .get(`FT ${year}/%`);
    const n = last ? Number(last.invoice_number.split('/')[1]) + 1 : 1;
    return `FT ${year}/${String(n).padStart(4, '0')}`;
  }

  r.post('/billing/mark', (req, res) => {
    const ids = idList(req.body?.ids, 'Serviços');
    const status = oneOf(req.body?.status, 'Estado', ['por_faturar', 'faturado', 'pago'], { required: true });
    if (!ids.length) throw bad('Selecione pelo menos um serviço.');
    const at = nowIso();
    let updated = 0;
    tx(db, () => {
      for (const id of ids) {
        const s = db.prepare('SELECT id, status, invoice_status, invoice_number, value FROM services WHERE id = ?').get(id);
        if (!s || s.status !== 'concluido' || s.invoice_status === status) continue;
        if (status === 'por_faturar') {
          db.prepare(`UPDATE services SET invoice_status = 'por_faturar', invoice_number = NULL, invoiced_at = NULL, paid_at = NULL WHERE id = ?`).run(id);
          addEvent(db, id, req.user.id, 'faturado', 'Faturação anulada', null, at);
        } else {
          const number = s.invoice_number ?? nextInvoiceNumber();
          db.prepare(`UPDATE services SET invoice_status = ?, invoice_number = ?, invoiced_at = COALESCE(invoiced_at, ?), paid_at = ? WHERE id = ?`)
            .run(status, number, at, status === 'pago' ? at : null, id);
          addEvent(db, id, req.user.id, status === 'pago' ? 'pago' : 'faturado',
            status === 'pago' ? `Pagamento recebido (${number})` : `Faturado — ${number}`, null, at);
        }
        updated++;
      }
    });
    res.json({ updated });
  });

  r.get('/billing', (req, res) => {
    const p = period(req, localDate(new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1)), localDate());
    const summary = db
      .prepare(`SELECT invoice_status, COUNT(*) AS n, SUM(value) AS total FROM services
                 WHERE status = 'concluido' AND scheduled_start >= ? AND scheduled_start < ? GROUP BY invoice_status`)
      .all(p.fromIso, p.toIso);
    const byClient = db
      .prepare(`SELECT c.id, c.name, COUNT(*) AS n, SUM(s.value) AS total,
                       SUM(CASE WHEN s.invoice_status <> 'pago' THEN s.value ELSE 0 END) AS open_amount
                  FROM services s JOIN clients c ON c.id = s.client_id
                 WHERE s.status = 'concluido' AND s.scheduled_start >= ? AND s.scheduled_start < ?
                 GROUP BY c.id ORDER BY total DESC LIMIT 20`)
      .all(p.fromIso, p.toIso)
      .map((x) => ({ ...x, total: r2(x.total), open_amount: r2(x.open_amount) }));
    const vat = Number(getSettings(db).vat_rate) || 0;
    res.json({
      ...p,
      vat_rate: vat,
      summary: Object.fromEntries(['por_faturar', 'faturado', 'pago'].map((k) => {
        const row = summary.find((x) => x.invoice_status === k);
        return [k, { n: row?.n ?? 0, total: r2(row?.total ?? 0) }];
      })),
      by_client: byClient,
      series: monthlySeries(db, 4).map((m) => ({ month: m.month, revenue: m.revenue, services: m.services })),
    });
  });

  /* ------------------------------------------------------------ CUSTOS */
  r.get('/costs', (req, res) => {
    const p = period(req, firstOfMonth(), lastOfMonth());
    const agg = aggregate(db, p.fromIso, p.toIso);
    const toExcl = localDate(new Date(new Date(`${p.to}T00:00:00`).getTime() + 86400000));
    const expenses = db
      .prepare(`SELECT x.*, v.name AS van_name FROM expenses x LEFT JOIN vans v ON v.id = x.van_id
                 WHERE x.date >= ? AND x.date < ? ORDER BY x.date DESC, x.id DESC`)
      .all(p.from, toExcl);
    const byCategory = {};
    for (const e of expenses) byCategory[e.category] = r2((byCategory[e.category] ?? 0) + e.amount);
    const byVan = db
      .prepare(`SELECT v.id, v.name, COUNT(s.id) AS services, SUM(s.fuel_cost) AS fuel,
                       (SELECT SUM(amount) FROM expenses x WHERE x.van_id = v.id AND x.date >= ? AND x.date < ?) AS expenses
                  FROM vans v LEFT JOIN services s ON s.van_id = v.id AND s.status = 'concluido'
                       AND s.scheduled_start >= ? AND s.scheduled_start < ?
                 GROUP BY v.id ORDER BY v.name`)
      .all(p.from, toExcl, p.fromIso, p.toIso)
      .map((x) => ({ ...x, fuel: r2(x.fuel), expenses: r2(x.expenses), total: r2((x.fuel ?? 0) + (x.expenses ?? 0)) }));
    const overhead = expensesTotal(db, p.from, toExcl);
    res.json({
      ...p,
      direct: agg,
      overhead,
      overhead_by_category: byCategory,
      total: r2(agg.total_cost + overhead),
      by_van: byVan,
      expenses,
      series: monthlySeries(db, 4).map((m) => ({ month: m.month, labor: m.labor, fuel: m.fuel, materials: m.materials, other: m.other, overhead: m.overhead })),
    });
  });

  function parseExpense(body) {
    if (!isValidDateStr(body.date)) throw bad('Data inválida.');
    const vanId = int(body.van_id, 'Carrinha', { min: 1 });
    if (vanId && !db.prepare('SELECT id FROM vans WHERE id = ?').get(vanId)) throw bad('Carrinha inválida.');
    return {
      date: body.date,
      category: oneOf(body.category, 'Categoria', EXPENSE_CATEGORIES, { required: true }),
      description: str(body.description, 'Descrição', { required: true, max: 300 }),
      amount: num(body.amount, 'Valor', { required: true, max: 1e7 }),
      van_id: vanId,
    };
  }
  r.post('/expenses', (req, res) => {
    const e = parseExpense(req.body ?? {});
    const info = db.prepare(
      'INSERT INTO expenses (date, category, description, amount, van_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(e.date, e.category, e.description, e.amount, e.van_id, req.user.id, nowIso());
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  });
  r.put('/expenses/:id', (req, res) => {
    const e = parseExpense(req.body ?? {});
    const info = db.prepare('UPDATE expenses SET date = ?, category = ?, description = ?, amount = ?, van_id = ? WHERE id = ?')
      .run(e.date, e.category, e.description, e.amount, e.van_id, Number(req.params.id));
    if (!info.changes) throw notFound();
    res.json({ ok: true });
  });
  r.delete('/expenses/:id', (req, res) => {
    const info = db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(req.params.id));
    if (!info.changes) throw notFound();
    res.json({ ok: true });
  });

  /* ------------------------------------------------------------ RENTABILIDADE */
  r.get('/profitability', (req, res) => {
    const p = period(req, localDate(new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1)), localDate());
    const totals = aggregate(db, p.fromIso, p.toIso);
    const toExcl = localDate(new Date(new Date(`${p.to}T00:00:00`).getTime() + 86400000));
    const overhead = expensesTotal(db, p.from, toExcl);
    const services = db
      .prepare(`SELECT * FROM (${SERVICE_LIST_SQL} WHERE s.status = 'concluido' AND s.scheduled_start >= ? AND s.scheduled_start < ?)`)
      .all(p.fromIso, p.toIso)
      .map((s) => ({ ...s, margin: s.value > 0 ? r2((s.profit / s.value) * 100) : null }));
    const sorted = [...services].sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0));
    res.json({
      ...p,
      totals,
      overhead,
      net: r2(totals.profit - overhead),
      net_margin: totals.revenue > 0 ? r2(((totals.profit - overhead) / totals.revenue) * 100) : null,
      series: monthlySeries(db, 4),
      by_client: groupedAggregate(db, p.fromIso, p.toIso, 's.client_id', 'c.name', 'JOIN clients c ON c.id = s.client_id'),
      by_van: groupedAggregate(db, p.fromIso, p.toIso, 's.van_id', `COALESCE(v.name, '(sem carrinha)')`, 'LEFT JOIN vans v ON v.id = s.van_id'),
      by_operator: groupedAggregate(db, p.fromIso, p.toIso, 's.operator_id', `COALESCE(u.name, '(sem chefe)')`, 'LEFT JOIN users u ON u.id = s.operator_id'),
      by_type: groupedAggregate(db, p.fromIso, p.toIso, 's.service_type', 's.service_type'),
      by_client_type: groupedAggregate(db, p.fromIso, p.toIso, 'c.type', 'c.type', 'JOIN clients c ON c.id = s.client_id'),
      worst: sorted.slice(0, 10),
      best: sorted.slice(-10).reverse(),
    });
  });

  /* ------------------------------------------------------------ CLIENTES */
  r.get('/clients', (req, res) => {
    const [mFrom] = monthRange(monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)));
    const q = req.query.q ? `%${String(req.query.q).slice(0, 100)}%` : null;
    const rows = db
      .prepare(`SELECT c.*,
                  (SELECT COUNT(*) FROM services s WHERE s.client_id = c.id AND s.status = 'concluido') AS services_done,
                  (SELECT COUNT(*) FROM services s WHERE s.client_id = c.id AND s.status IN ('agendado','em_deslocacao','em_execucao')) AS services_open,
                  (SELECT SUM(value) FROM services s WHERE s.client_id = c.id AND s.status = 'concluido' AND s.scheduled_start >= ?) AS revenue_12m,
                  (SELECT SUM(value) FROM services s WHERE s.client_id = c.id AND s.status = 'concluido' AND s.invoice_status <> 'pago') AS open_amount,
                  (SELECT MAX(scheduled_start) FROM services s WHERE s.client_id = c.id AND s.status = 'concluido') AS last_service
                 FROM clients c ${q ? 'WHERE c.name LIKE ? OR c.city LIKE ? OR c.nif LIKE ?' : ''} ORDER BY c.name`)
      .all(mFrom, ...(q ? [q, q, q] : []))
      .map((c) => ({ ...c, revenue_12m: r2(c.revenue_12m), open_amount: r2(c.open_amount) }));
    res.json(rows);
  });

  r.get('/clients/:id', (req, res) => {
    const c = db.prepare('SELECT * FROM clients WHERE id = ?').get(Number(req.params.id));
    if (!c) throw notFound('Cliente não encontrado.');
    const services = db.prepare(`${SERVICE_LIST_SQL} WHERE s.client_id = ? ORDER BY s.scheduled_start DESC LIMIT 200`).all(c.id);
    const totals = aggregate(db, '0000', '9999', 'AND s.client_id = ?', [c.id]);
    res.json({ ...c, services, totals });
  });

  function parseClient(body) {
    return {
      name: str(body.name, 'Nome', { required: true, max: 200 }),
      type: oneOf(body.type, 'Tipo', CLIENT_TYPES, { required: true }),
      nif: str(body.nif, 'NIF', { max: 20 }),
      contact_name: str(body.contact_name, 'Contacto', { max: 120 }),
      phone: str(body.phone, 'Telefone', { max: 30 }),
      email: str(body.email, 'Email', { max: 150 }),
      address: str(body.address, 'Morada', { max: 300 }),
      city: str(body.city, 'Localidade', { max: 100 }),
      postal_code: str(body.postal_code, 'Código postal', { max: 20 }),
      notes: str(body.notes, 'Notas', { max: 2000 }),
      active: body.active === undefined ? 1 : bool(body.active) ? 1 : 0,
    };
  }
  r.post('/clients', (req, res) => {
    const c = parseClient(req.body ?? {});
    const cols = Object.keys(c);
    const info = db.prepare(`INSERT INTO clients (${cols.join(', ')}, created_at) VALUES (${cols.map(() => '?').join(', ')}, ?)`)
      .run(...cols.map((k) => c[k]), nowIso());
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  });
  r.put('/clients/:id', (req, res) => {
    const c = parseClient(req.body ?? {});
    const cols = Object.keys(c);
    const info = db.prepare(`UPDATE clients SET ${cols.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...cols.map((k) => c[k]), Number(req.params.id));
    if (!info.changes) throw notFound();
    res.json({ ok: true });
  });

  /* ------------------------------------------------------------ FUNCIONÁRIOS (sem acesso à app) */
  r.get('/employees', (req, res) => {
    const p = period(req, firstOfMonth(), lastOfMonth());
    const paidPeriods = new Set(
      db.prepare('SELECT employee_id || \':\' || period AS k FROM employee_payments').all().map((x) => x.k),
    );
    const rows = db
      .prepare(`SELECT e.*, u.id AS user_id, u.username AS operator_username FROM employees e
                  LEFT JOIN users u ON u.employee_id = e.id ORDER BY e.status, e.name`)
      .all()
      .map((e) => {
        const work = summarizeWork(employeeWork(db, e.id, p.fromIso, p.toIso));
        // Valor em dívida: meses já trabalhados sem pagamento registado (últimos 12 meses).
        let unpaid = 0;
        for (let i = 0; i < 12; i++) {
          const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
          const ym = monthKey(d);
          if (paidPeriods.has(`${e.id}:${ym}`)) continue;
          unpaid += summarizeWork(employeeWork(db, e.id, ...monthRange(ym))).amount;
        }
        return { ...e, period: work, unpaid: r2(unpaid) };
      });
    res.json({ ...p, rows });
  });

  r.get('/employees/:id', (req, res) => {
    const e = db.prepare(`SELECT e.*, u.id AS user_id, u.username AS operator_username FROM employees e
                            LEFT JOIN users u ON u.employee_id = e.id WHERE e.id = ?`).get(Number(req.params.id));
    if (!e) throw notFound('Funcionário não encontrado.');
    const p = period(req, firstOfMonth(), lastOfMonth());
    const work = employeeWork(db, e.id, p.fromIso, p.toIso);
    const payments = db.prepare('SELECT * FROM employee_payments WHERE employee_id = ? ORDER BY period DESC').all(e.id);
    const months = [];
    for (let i = 0; i < 6; i++) {
      const ym = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - i, 1));
      const sum = summarizeWork(employeeWork(db, e.id, ...monthRange(ym)));
      months.push({ period: ym, ...sum, payment: payments.find((x) => x.period === ym) ?? null });
    }
    const upcoming = db
      .prepare(`SELECT s.id, s.title, s.scheduled_start, s.scheduled_end, s.status, c.name AS client_name
                  FROM service_employees se JOIN services s ON s.id = se.service_id JOIN clients c ON c.id = s.client_id
                 WHERE se.employee_id = ? AND s.status IN ('agendado','em_deslocacao','em_execucao') ORDER BY s.scheduled_start LIMIT 20`)
      .all(e.id);
    res.json({ ...e, ...p, summary: summarizeWork(work), work, months, payments, upcoming });
  });

  function parseEmployee(body) {
    return {
      name: str(body.name, 'Nome', { required: true, max: 120 }),
      job_title: str(body.job_title, 'Cargo', { max: 80 }) ?? 'Operador de limpeza',
      status: oneOf(body.status, 'Estado', ['ativo', 'inativo']) ?? 'ativo',
      hourly_rate: num(body.hourly_rate, 'Valor/hora', { required: true, max: 1000 }),
      phone: str(body.phone, 'Telefone', { max: 30 }),
      email: str(body.email, 'Email', { max: 150 }),
      nif: str(body.nif, 'NIF', { max: 20 }),
      hired_at: isValidDateStr(body.hired_at) ? body.hired_at : null,
      notes: str(body.notes, 'Notas', { max: 2000 }),
    };
  }
  r.post('/employees', (req, res) => {
    const e = parseEmployee(req.body ?? {});
    const cols = Object.keys(e);
    const info = db.prepare(`INSERT INTO employees (${cols.join(', ')}, created_at) VALUES (${cols.map(() => '?').join(', ')}, ?)`)
      .run(...cols.map((k) => e[k]), nowIso());
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  });
  r.put('/employees/:id', (req, res) => {
    const e = parseEmployee(req.body ?? {});
    const cols = Object.keys(e);
    const info = db.prepare(`UPDATE employees SET ${cols.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...cols.map((k) => e[k]), Number(req.params.id));
    if (!info.changes) throw notFound();
    res.json({ ok: true });
  });
  r.post('/employees/:id/payments', (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT id FROM employees WHERE id = ?').get(id)) throw notFound();
    const period_ = String(req.body?.period ?? '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period_)) throw bad('Período inválido.');
    const sum = summarizeWork(employeeWork(db, id, ...monthRange(period_)));
    try {
      db.prepare('INSERT INTO employee_payments (employee_id, period, hours, amount, paid_at, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, period_, sum.hours, sum.amount, nowIso(), str(req.body?.notes, 'Notas', { max: 300 }), req.user.id);
    } catch {
      throw new HttpError(409, 'Este período já foi pago.');
    }
    res.status(201).json({ ok: true, ...sum });
  });

  /* ------------------------------------------------------------ OPERADORES (contas com acesso ao tablet) */
  r.get('/operators', (req, res) => {
    const [from, to] = monthRange(monthKey());
    const [dFrom, dTo] = dayRange(localDate());
    const rows = db
      .prepare(`SELECT u.id, u.username, u.name, u.phone, u.active, u.can_manage_team, u.last_login_at, u.employee_id,
                       e.hourly_rate, t.name AS team_name, v.name AS van_name,
                       (SELECT COUNT(*) FROM services s WHERE s.operator_id = u.id AND s.status = 'concluido' AND s.scheduled_start >= ? AND s.scheduled_start < ?) AS month_done,
                       (SELECT COUNT(*) FROM services s WHERE s.operator_id = u.id AND s.status <> 'cancelado' AND s.scheduled_start >= ? AND s.scheduled_start < ?) AS today_total,
                       (SELECT COUNT(*) FROM services s WHERE s.operator_id = u.id AND s.status = 'concluido' AND s.had_problems = 1 AND s.scheduled_start >= ?) AS month_problems,
                       (SELECT s.status FROM services s WHERE s.operator_id = u.id AND s.status IN ('em_execucao','em_deslocacao') LIMIT 1) AS current_status
                  FROM users u LEFT JOIN employees e ON e.id = u.employee_id
                  LEFT JOIN teams t ON t.leader_user_id = u.id AND t.active = 1 LEFT JOIN vans v ON v.id = t.van_id
                 WHERE u.role = 'operator' ORDER BY u.active DESC, u.name`)
      .all(from, to, dFrom, dTo, from);
    res.json(rows);
  });

  r.post('/operators', (req, res) => {
    const b = req.body ?? {};
    const username = str(b.username, 'Utilizador', { required: true, max: 40 });
    if (!/^[a-z0-9._-]{3,40}$/i.test(username)) throw bad('Utilizador só pode ter letras, números, ".", "_" ou "-".');
    const password = String(b.password ?? '');
    if (password.length < 8) throw bad('A password deve ter pelo menos 8 caracteres.');
    const name = str(b.name, 'Nome', { required: true, max: 120 });
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) throw new HttpError(409, 'Esse utilizador já existe.');
    const id = tx(db, () => {
      let employeeId = int(b.employee_id, 'Funcionário', { min: 1 });
      if (employeeId) {
        if (!db.prepare('SELECT id FROM employees WHERE id = ?').get(employeeId)) throw bad('Funcionário inválido.');
        if (db.prepare('SELECT id FROM users WHERE employee_id = ?').get(employeeId)) throw bad('Esse funcionário já tem conta.');
        db.prepare(`UPDATE employees SET job_title = 'Chefe de carrinha' WHERE id = ?`).run(employeeId);
      } else {
        employeeId = Number(db.prepare(`INSERT INTO employees (name, job_title, hourly_rate, phone, created_at) VALUES (?, 'Chefe de carrinha', ?, ?, ?)`)
          .run(name, num(b.hourly_rate, 'Valor/hora', { max: 1000 }) ?? 10.5, str(b.phone, 'Telefone', { max: 30 }), nowIso()).lastInsertRowid);
      }
      return Number(db.prepare(`INSERT INTO users (username, password_hash, role, name, employee_id, phone, can_manage_team, created_at)
                                VALUES (?, ?, 'operator', ?, ?, ?, ?, ?)`)
        .run(username, hashPassword(password), name, employeeId, str(b.phone, 'Telefone', { max: 30 }), bool(b.can_manage_team) ? 1 : 0, nowIso())
        .lastInsertRowid);
    });
    res.status(201).json({ id });
  });

  r.put('/operators/:id', (req, res) => {
    const id = Number(req.params.id);
    const u = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'operator'`).get(id);
    if (!u) throw notFound('Operador não encontrado.');
    const b = req.body ?? {};
    const name = str(b.name, 'Nome', { required: true, max: 120 });
    db.prepare('UPDATE users SET name = ?, phone = ?, active = ?, can_manage_team = ? WHERE id = ?')
      .run(name, str(b.phone, 'Telefone', { max: 30 }), bool(b.active) ? 1 : 0, bool(b.can_manage_team) ? 1 : 0, id);
    if (b.password) {
      if (String(b.password).length < 8) throw bad('A password deve ter pelo menos 8 caracteres.');
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(b.password)), id);
    }
    res.json({ ok: true });
  });

  /* ------------------------------------------------------------ CARRINHAS */
  r.get('/vans', (req, res) => {
    const [from, to] = monthRange(monthKey());
    const [dFrom, dTo] = dayRange(localDate());
    const rows = db
      .prepare(`SELECT v.*, t.name AS team_name, u.name AS leader_name,
                  (SELECT COUNT(*) FROM services s WHERE s.van_id = v.id AND s.status = 'concluido' AND s.scheduled_start >= ? AND s.scheduled_start < ?) AS month_services,
                  (SELECT SUM(s.fuel_cost) FROM services s WHERE s.van_id = v.id AND s.status = 'concluido' AND s.scheduled_start >= ? AND s.scheduled_start < ?) AS month_fuel,
                  (SELECT SUM(amount) FROM expenses x WHERE x.van_id = v.id AND x.date >= ?) AS month_expenses,
                  (SELECT s.status || '|' || c.name || '|' || COALESCE(ou.name,'') FROM services s JOIN clients c ON c.id = s.client_id
                     LEFT JOIN users ou ON ou.id = s.operator_id
                    WHERE s.van_id = v.id AND s.status IN ('em_execucao','em_deslocacao') LIMIT 1) AS current,
                  (SELECT COUNT(*) FROM services s WHERE s.van_id = v.id AND s.status <> 'cancelado' AND s.scheduled_start >= ? AND s.scheduled_start < ?) AS today_total
                 FROM vans v LEFT JOIN teams t ON t.van_id = v.id AND t.active = 1 LEFT JOIN users u ON u.id = t.leader_user_id
                ORDER BY v.name`)
      .all(from, to, from, to, firstOfMonth(), dFrom, dTo)
      .map((v) => {
        const [status, client, operator] = v.current ? v.current.split('|') : [];
        return { ...v, month_fuel: r2(v.month_fuel), month_expenses: r2(v.month_expenses), current: v.current ? { status, client, operator } : null };
      });
    res.json(rows);
  });
  function parseVan(body) {
    return {
      name: str(body.name, 'Nome', { required: true, max: 60 }),
      plate: str(body.plate, 'Matrícula', { required: true, max: 20 })?.toUpperCase(),
      model: str(body.model, 'Modelo', { max: 80 }),
      year: int(body.year, 'Ano', { min: 1980, max: 2100 }),
      status: oneOf(body.status, 'Estado', ['ativa', 'manutencao', 'inativa']) ?? 'ativa',
      km: int(body.km, 'Quilómetros', { max: 5e6 }),
      notes: str(body.notes, 'Notas', { max: 2000 }),
    };
  }
  r.post('/vans', (req, res) => {
    const v = parseVan(req.body ?? {});
    const cols = Object.keys(v);
    try {
      const info = db.prepare(`INSERT INTO vans (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...cols.map((k) => v[k]));
      res.status(201).json({ id: Number(info.lastInsertRowid) });
    } catch {
      throw new HttpError(409, 'Já existe uma carrinha com essa matrícula.');
    }
  });
  r.put('/vans/:id', (req, res) => {
    const v = parseVan(req.body ?? {});
    const cols = Object.keys(v);
    let info;
    try {
      info = db.prepare(`UPDATE vans SET ${cols.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...cols.map((k) => v[k]), Number(req.params.id));
    } catch {
      throw new HttpError(409, 'Já existe uma carrinha com essa matrícula.');
    }
    if (!info.changes) throw notFound();
    res.json({ ok: true });
  });

  /* ------------------------------------------------------------ EQUIPAS (modelos: carrinha + chefe + funcionários) */
  r.get('/teams', (req, res) => {
    const rows = db
      .prepare(`SELECT t.*, v.name AS van_name, u.name AS leader_name FROM teams t
                  LEFT JOIN vans v ON v.id = t.van_id LEFT JOIN users u ON u.id = t.leader_user_id
                 ORDER BY t.active DESC, t.name`)
      .all()
      .map((t) => ({
        ...t,
        members: db.prepare(`SELECT e.id, e.name, e.job_title, e.hourly_rate, e.status FROM team_members tm
                               JOIN employees e ON e.id = tm.employee_id WHERE tm.team_id = ? ORDER BY e.name`).all(t.id),
      }));
    res.json(rows);
  });
  function saveTeam(id, body) {
    const name = str(body.name, 'Nome', { required: true, max: 80 });
    const vanId = int(body.van_id, 'Carrinha', { min: 1 });
    const leaderId = int(body.leader_user_id, 'Chefe de carrinha', { min: 1 });
    if (leaderId && !db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'operator'`).get(leaderId)) throw bad('Chefe inválido.');
    if (vanId && !db.prepare('SELECT id FROM vans WHERE id = ?').get(vanId)) throw bad('Carrinha inválida.');
    const members = idList(body.member_ids, 'Funcionários');
    const active = body.active === undefined ? 1 : bool(body.active) ? 1 : 0;
    return tx(db, () => {
      let tid = id;
      if (tid) {
        const info = db.prepare('UPDATE teams SET name = ?, van_id = ?, leader_user_id = ?, active = ? WHERE id = ?').run(name, vanId, leaderId, active, tid);
        if (!info.changes) throw notFound();
        db.prepare('DELETE FROM team_members WHERE team_id = ?').run(tid);
      } else {
        tid = Number(db.prepare('INSERT INTO teams (name, van_id, leader_user_id, active) VALUES (?, ?, ?, ?)').run(name, vanId, leaderId, active).lastInsertRowid);
      }
      const ins = db.prepare('INSERT INTO team_members (team_id, employee_id) VALUES (?, ?)');
      for (const m of members) {
        if (!db.prepare('SELECT id FROM employees WHERE id = ?').get(m)) throw bad('Funcionário inválido.');
        ins.run(tid, m);
      }
      return tid;
    });
  }
  r.post('/teams', (req, res) => res.status(201).json({ id: saveTeam(null, req.body ?? {}) }));
  r.put('/teams/:id', (req, res) => res.json({ id: saveTeam(Number(req.params.id), req.body ?? {}) }));

  /* ------------------------------------------------------------ HISTÓRICO GLOBAL */
  r.get('/events', (req, res) => {
    const p = period(req, localDate(new Date(Date.now() - 7 * 86400000)), localDate());
    const where = ['ev.at >= ?', 'ev.at < ?'];
    const params = [p.fromIso, p.toIso];
    if (req.query.type) { where.push('ev.type = ?'); params.push(String(req.query.type)); }
    if (req.query.actor_id) { where.push('ev.actor_id = ?'); params.push(Number(req.query.actor_id)); }
    const rows = db
      .prepare(`SELECT ev.id, ev.service_id, ev.at, ev.type, ev.message, u.name AS actor_name, u.role AS actor_role, c.name AS client_name
                  FROM service_events ev JOIN services s ON s.id = ev.service_id JOIN clients c ON c.id = s.client_id
                  LEFT JOIN users u ON u.id = ev.actor_id WHERE ${where.join(' AND ')} AND ev.at <= ?
                 ORDER BY ev.at DESC, ev.id DESC LIMIT 500`)
      .all(...params, nowIso());
    res.json({ ...p, rows });
  });

  /* ------------------------------------------------------------ RELATÓRIOS */
  r.get('/reports/summary', (req, res) => {
    const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(req.query.month)) ? String(req.query.month) : monthKey();
    const [from, to] = monthRange(ym);
    const [y, m] = ym.split('-').map(Number);
    const fromDate = localDate(new Date(y, m - 1, 1));
    const toDate = localDate(new Date(y, m, 1));
    const totals = aggregate(db, from, to);
    const overhead = expensesTotal(db, fromDate, toDate);
    const statusCounts = db.prepare(`SELECT status, COUNT(*) AS n FROM services WHERE scheduled_start >= ? AND scheduled_start < ? GROUP BY status`).all(from, to);
    const problems = db.prepare(`SELECT i.category, COUNT(*) AS n FROM service_issues i JOIN services s ON s.id = i.service_id
                                  WHERE s.scheduled_start >= ? AND s.scheduled_start < ? GROUP BY i.category`).all(from, to);
    const punctuality = db.prepare(`SELECT COUNT(*) AS n,
                                      SUM(CASE WHEN started_at <= datetime(scheduled_start, '+15 minutes') THEN 1 ELSE 0 END) AS on_time,
                                      AVG((julianday(finished_at) - julianday(started_at)) * 1440 - (julianday(scheduled_end) - julianday(scheduled_start)) * 1440) AS avg_overrun
                                     FROM services WHERE status = 'concluido' AND started_at IS NOT NULL AND scheduled_start >= ? AND scheduled_start < ?`).get(from, to);
    const payroll = db.prepare(`SELECT e.id, e.name, e.job_title FROM employees e ORDER BY e.name`).all()
      .map((e) => ({ ...e, ...summarizeWork(employeeWork(db, e.id, from, to)) }))
      .filter((e) => e.services > 0);
    res.json({
      month: ym,
      totals,
      overhead,
      net: r2(totals.profit - overhead),
      status_counts: Object.fromEntries(statusCounts.map((x) => [x.status, x.n])),
      problems,
      punctuality: {
        services: punctuality.n,
        on_time_pct: punctuality.n ? r2((punctuality.on_time / punctuality.n) * 100) : null,
        avg_overrun_min: punctuality.avg_overrun === null ? null : Math.round(punctuality.avg_overrun),
      },
      top_clients: groupedAggregate(db, from, to, 's.client_id', 'c.name', 'JOIN clients c ON c.id = s.client_id').slice(0, 10),
      by_operator: groupedAggregate(db, from, to, 's.operator_id', `COALESCE(u.name, '(sem chefe)')`, 'LEFT JOIN users u ON u.id = s.operator_id'),
      payroll,
      payroll_total: r2(payroll.reduce((a, x) => a + x.amount, 0)),
    });
  });

  r.get('/reports/services.csv', (req, res) => {
    const p = period(req, firstOfMonth(), lastOfMonth());
    const rows = db.prepare(`${SERVICE_LIST_SQL} WHERE s.scheduled_start >= ? AND s.scheduled_start < ? ORDER BY s.scheduled_start`).all(p.fromIso, p.toIso);
    const fmt = (iso) => (iso ? new Date(iso).toLocaleString('pt-PT') : '');
    csv(res, `servicos_${p.from}_${p.to}.csv`,
      ['Serviço', 'Data/hora prevista', 'Fim previsto', 'Início real', 'Fim real', 'Cliente', 'Título', 'Tipo', 'Localidade', 'Carrinha', 'Chefe', 'Estado', 'Horas', 'Valor', 'Funcionários', 'Combustível', 'Materiais', 'Outros', 'Custo total', 'Lucro', 'Margem %', 'Faturação', 'Nº fatura'],
      rows.map((s) => [`#${s.id}`, fmt(s.scheduled_start), fmt(s.scheduled_end), fmt(s.started_at), fmt(s.finished_at), s.client_name, s.title, s.service_type, s.city, s.van_name, s.operator_name,
        STATUS_LABEL[s.status], dec(s.hours), dec(s.value), dec(s.labor_cost), dec(s.fuel_cost), dec(s.material_cost), dec(s.other_cost), dec(s.total_cost), dec(s.profit),
        s.value > 0 ? dec((s.profit / s.value) * 100) : '', s.invoice_status, s.invoice_number]));
  });

  r.get('/reports/payroll.csv', (req, res) => {
    const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(req.query.month)) ? String(req.query.month) : monthKey();
    const [from, to] = monthRange(ym);
    const rows = db.prepare('SELECT e.id, e.name, e.job_title, e.hourly_rate, e.nif FROM employees e ORDER BY e.name').all()
      .map((e) => ({ ...e, ...summarizeWork(employeeWork(db, e.id, from, to)), paid: db.prepare('SELECT paid_at FROM employee_payments WHERE employee_id = ? AND period = ?').get(e.id, ym) }))
      .filter((e) => e.services > 0);
    csv(res, `pagamentos_${ym}.csv`, ['Funcionário', 'Cargo', 'NIF', 'Valor/hora', 'Serviços', 'Dias', 'Horas', 'Valor a pagar', 'Pago em'],
      rows.map((e) => [e.name, e.job_title, e.nif, dec(e.hourly_rate), e.services, e.days, dec(e.hours), dec(e.amount), e.paid ? new Date(e.paid.paid_at).toLocaleDateString('pt-PT') : '']));
  });

  r.get('/reports/clients.csv', (req, res) => {
    const p = period(req, firstOfMonth(), lastOfMonth());
    const rows = groupedAggregate(db, p.fromIso, p.toIso, 's.client_id', 'c.name', 'JOIN clients c ON c.id = s.client_id');
    csv(res, `clientes_${p.from}_${p.to}.csv`, ['Cliente', 'Serviços', 'Horas', 'Faturação', 'Custo', 'Lucro', 'Margem %'],
      rows.map((x) => [x.label, x.services, dec(x.hours), dec(x.revenue), dec(x.total_cost), dec(x.profit), dec(x.margin)]));
  });

  /* ------------------------------------------------------------ DEFINIÇÕES */
  r.get('/settings', (req, res) => res.json(getSettings(db)));
  r.put('/settings', (req, res) => {
    const b = req.body ?? {};
    const ins = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    tx(db, () => {
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (b[key] === undefined) continue;
        const v = str(b[key], key, { max: 300 }) ?? '';
        if (key.endsWith('_min') || key === 'vat_rate' || key === 'default_fuel_cost') num(v, key, { required: true, max: 10000 });
        ins.run(key, v);
      }
    });
    res.json(getSettings(db));
  });

  return r;
}
