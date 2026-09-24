import { nowIso } from './time.js';

export const STATUS_LABEL = {
  agendado: 'Agendado',
  em_deslocacao: 'Em deslocação',
  em_execucao: 'Em execução',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const ISSUE_CATEGORIES = {
  equipamento: 'Equipamento danificado',
  local: 'Problema no local',
  material: 'Material em falta',
  cliente: 'Problema com cliente',
  outro: 'Outro',
};

export function addEvent(db, serviceId, actorId, type, message, data = null, at = nowIso()) {
  db.prepare(
    'INSERT INTO service_events (service_id, at, actor_id, type, message, data) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(serviceId, at, actorId ?? null, type, message, data ? JSON.stringify(data) : null);
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function financeOf(s, fin) {
  const labor = fin?.labor_cost ?? 0;
  const total = round2(labor + s.fuel_cost + s.material_cost + s.other_cost);
  const profit = round2(s.value - total);
  return {
    value: s.value,
    hours: fin?.hours ?? 0,
    labor_cost: labor,
    fuel_cost: s.fuel_cost,
    material_cost: s.material_cost,
    other_cost: s.other_cost,
    total_cost: total,
    profit,
    margin: s.value > 0 ? round2((profit / s.value) * 100) : null,
  };
}

/** Serviço completo — APENAS para a área do diretor (inclui dados financeiros e de clientes). */
export function getServiceFull(db, id) {
  const s = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!s) return null;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(s.client_id);
  const van = s.van_id ? db.prepare('SELECT id, name, plate, model FROM vans WHERE id = ?').get(s.van_id) : null;
  const operator = s.operator_id
    ? db.prepare('SELECT id, name, username, phone, employee_id FROM users WHERE id = ?').get(s.operator_id)
    : null;
  const employees = db
    .prepare(
      `SELECT e.id, e.name, e.job_title, se.hourly_rate, se.is_leader, se.present
         FROM service_employees se JOIN employees e ON e.id = se.employee_id
        WHERE se.service_id = ? ORDER BY se.is_leader DESC, e.name`,
    )
    .all(id);
  const issues = db
    .prepare('SELECT id, category, description, created_at FROM service_issues WHERE service_id = ? ORDER BY id')
    .all(id);
  const photos = db
    .prepare('SELECT id, original_name, created_at FROM service_photos WHERE service_id = ? ORDER BY id')
    .all(id);
  const events = db
    .prepare(
      `SELECT ev.id, ev.at, ev.type, ev.message, u.name AS actor_name, u.role AS actor_role
         FROM service_events ev LEFT JOIN users u ON u.id = ev.actor_id
        WHERE ev.service_id = ? ORDER BY ev.at, ev.id`,
    )
    .all(id);
  const createdBy = s.created_by ? db.prepare('SELECT name FROM users WHERE id = ?').get(s.created_by) : null;
  const fin = db.prepare('SELECT hours, labor_cost FROM service_fin WHERE service_id = ?').get(id);
  return {
    ...s,
    client,
    van,
    operator,
    employees,
    issues,
    photos,
    events,
    created_by_name: createdBy?.name ?? null,
    finance: financeOf(s, fin),
  };
}

/**
 * Vista do serviço para o OPERADOR. Lista branca de campos: nada financeiro (valor, custos,
 * valor/hora dos funcionários) e apenas os dados do cliente necessários para executar o trabalho.
 */
export function getServiceForOperator(db, id, operatorUserId) {
  const s = db.prepare('SELECT * FROM services WHERE id = ? AND operator_id = ?').get(id, operatorUserId);
  if (!s) return null;
  const client = db.prepare('SELECT name, contact_name, phone FROM clients WHERE id = ?').get(s.client_id);
  const van = s.van_id ? db.prepare('SELECT id, name, plate, model FROM vans WHERE id = ?').get(s.van_id) : null;
  const leader = db.prepare('SELECT name FROM users WHERE id = ?').get(s.operator_id);
  const team = db
    .prepare(
      `SELECT e.id, e.name, se.is_leader, se.present
         FROM service_employees se JOIN employees e ON e.id = se.employee_id
        WHERE se.service_id = ? ORDER BY se.is_leader DESC, e.name`,
    )
    .all(id);
  const issues = db
    .prepare('SELECT id, category, description, created_at FROM service_issues WHERE service_id = ? ORDER BY id')
    .all(id);
  const photos = db.prepare('SELECT id, created_at FROM service_photos WHERE service_id = ? ORDER BY id').all(id);
  const events = db
    .prepare(
      `SELECT ev.at, ev.type, ev.message FROM service_events ev
        WHERE ev.service_id = ? AND ev.type NOT IN ('faturado','pago','custos') ORDER BY ev.at, ev.id`,
    )
    .all(id);
  return {
    id: s.id,
    title: s.title,
    service_type: s.service_type,
    client: { name: client?.name, contact_name: client?.contact_name, phone: client?.phone },
    address: s.address,
    city: s.city,
    instructions: s.instructions,
    scheduled_start: s.scheduled_start,
    scheduled_end: s.scheduled_end,
    status: s.status,
    travel_started_at: s.travel_started_at,
    started_at: s.started_at,
    finished_at: s.finished_at,
    completed_ok: s.completed_ok,
    had_problems: s.had_problems,
    observations: s.observations,
    van,
    leader_name: leader?.name ?? null,
    team,
    issues,
    photos,
    events,
  };
}

/** Resumo leve para listas do operador (sem dados financeiros). */
export const OPERATOR_LIST_SQL = `
  SELECT s.id, s.title, s.service_type, s.address, s.city, s.scheduled_start, s.scheduled_end, s.status,
         s.started_at, s.finished_at, s.had_problems, c.name AS client_name, v.name AS van_name,
         (SELECT COUNT(*) FROM service_employees se WHERE se.service_id = s.id) AS team_size
    FROM services s
    JOIN clients c ON c.id = s.client_id
    LEFT JOIN vans v ON v.id = s.van_id`;

/** Serviços ativos (não cancelados / não concluídos) que se sobrepõem no tempo com a mesma carrinha. */
export function findVanConflicts(db, vanId, start, end, excludeId = 0) {
  if (!vanId) return [];
  return db
    .prepare(
      `SELECT s.id, s.title, s.scheduled_start, s.scheduled_end FROM services s
        WHERE s.van_id = ? AND s.id <> ? AND s.status NOT IN ('cancelado','concluido')
          AND s.scheduled_start < ? AND s.scheduled_end > ?`,
    )
    .all(vanId, excludeId, end, start);
}

export function findOperatorConflicts(db, operatorId, start, end, excludeId = 0) {
  if (!operatorId) return [];
  return db
    .prepare(
      `SELECT s.id, s.title, s.scheduled_start, s.scheduled_end FROM services s
        WHERE s.operator_id = ? AND s.id <> ? AND s.status NOT IN ('cancelado','concluido')
          AND s.scheduled_start < ? AND s.scheduled_end > ?`,
    )
    .all(operatorId, excludeId, end, start);
}
