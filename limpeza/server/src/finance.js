import { localDate, monthRange } from './time.js';

const r2 = (n) => Math.round(((n ?? 0) + Number.EPSILON) * 100) / 100;

/** Agrega os serviços CONCLUÍDOS no intervalo [from, to) — base de todos os números financeiros. */
export function aggregate(db, from, to, extraWhere = '', params = []) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS services, SUM(s.value) AS revenue, SUM(f.labor_cost) AS labor, SUM(s.fuel_cost) AS fuel,
              SUM(s.material_cost) AS materials, SUM(s.other_cost) AS other, SUM(f.hours) AS hours
         FROM services s JOIN service_fin f ON f.service_id = s.id
        WHERE s.status = 'concluido' AND s.scheduled_start >= ? AND s.scheduled_start < ? ${extraWhere}`,
    )
    .get(from, to, ...params);
  return finishAgg(row);
}

export function finishAgg(row) {
  const revenue = r2(row.revenue);
  const total = r2((row.labor ?? 0) + (row.fuel ?? 0) + (row.materials ?? 0) + (row.other ?? 0));
  const profit = r2(revenue - total);
  return {
    ...row,
    services: row.services ?? 0,
    revenue,
    labor: r2(row.labor),
    fuel: r2(row.fuel),
    materials: r2(row.materials),
    other: r2(row.other),
    hours: r2(row.hours),
    total_cost: total,
    profit,
    margin: revenue > 0 ? r2((profit / revenue) * 100) : null,
  };
}

/** Agrupa por uma coluna (cliente, carrinha, operador, tipo...). */
export function groupedAggregate(db, from, to, groupExpr, labelExpr, joins = '') {
  const rows = db
    .prepare(
      `SELECT ${groupExpr} AS key, ${labelExpr} AS label, COUNT(*) AS services, SUM(s.value) AS revenue,
              SUM(f.labor_cost) AS labor, SUM(s.fuel_cost) AS fuel, SUM(s.material_cost) AS materials,
              SUM(s.other_cost) AS other, SUM(f.hours) AS hours
         FROM services s JOIN service_fin f ON f.service_id = s.id ${joins}
        WHERE s.status = 'concluido' AND s.scheduled_start >= ? AND s.scheduled_start < ?
        GROUP BY ${groupExpr}`,
    )
    .all(from, to);
  return rows.map(finishAgg).sort((a, b) => b.revenue - a.revenue);
}

export function expensesTotal(db, fromDate, toDateExclusive) {
  return r2(
    db.prepare('SELECT SUM(amount) AS t FROM expenses WHERE date >= ? AND date < ?').get(fromDate, toDateExclusive).t,
  );
}

/** Últimos `n` meses (inclui o atual), com receita, custos diretos, custos gerais e resultado. */
export function monthlySeries(db, n = 6, endDate = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const [from, to] = monthRange(ym);
    const agg = aggregate(db, from, to);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const overhead = expensesTotal(db, localDate(d), localDate(next));
    out.push({ month: ym, ...agg, overhead, net: r2(agg.profit - overhead) });
  }
  return out;
}

/** Linhas de trabalho (serviços concluídos com presença) de um funcionário num intervalo. */
export function employeeWork(db, employeeId, from, to) {
  return db
    .prepare(
      `SELECT s.id AS service_id, s.title, c.name AS client_name, s.scheduled_start, s.started_at, s.finished_at,
              f.hours, se.hourly_rate, se.is_leader, ROUND(f.hours * se.hourly_rate, 2) AS amount
         FROM service_employees se
         JOIN services s ON s.id = se.service_id
         JOIN service_fin f ON f.service_id = s.id
         JOIN clients c ON c.id = s.client_id
        WHERE se.employee_id = ? AND s.status = 'concluido' AND COALESCE(se.present, 1) = 1
          AND s.scheduled_start >= ? AND s.scheduled_start < ?
        ORDER BY s.scheduled_start DESC`,
    )
    .all(employeeId, from, to);
}

export function summarizeWork(rows) {
  const days = new Set(rows.map((r) => localDate(new Date(r.scheduled_start))));
  return {
    services: rows.length,
    hours: r2(rows.reduce((a, r) => a + r.hours, 0)),
    days: days.size,
    amount: r2(rows.reduce((a, r) => a + r.amount, 0)),
  };
}

export { r2 };
