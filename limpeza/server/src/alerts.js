import { getSettings } from './db.js';
import { dayRange, localDate } from './time.js';

/**
 * Alertas do diretor. São calculados a partir do estado atual (não ficam "presos" quando a
 * situação se resolve) e dos eventos recentes registados pelos operadores.
 * Cada alerta tem uma chave estável para poder ser marcado como lido.
 */
export function computeAlerts(db, now = new Date()) {
  const settings = getSettings(db);
  const startTol = Number(settings.alert_start_tolerance_min) || 15;
  const overTol = Number(settings.alert_overrun_tolerance_min) || 15;
  const nowIso = now.toISOString();
  const [todayStart] = dayRange(localDate(now));
  const horizon = new Date(now.getTime() + 14 * 86400000).toISOString();
  const alerts = [];
  const base = `SELECT s.id, s.title, s.scheduled_start, s.scheduled_end, s.status, c.name AS client_name,
                       v.name AS van_name, u.name AS operator_name
                  FROM services s JOIN clients c ON c.id = s.client_id
                  LEFT JOIN vans v ON v.id = s.van_id LEFT JOIN users u ON u.id = s.operator_id`;

  const late = db
    .prepare(`${base} WHERE s.status = 'agendado' AND s.scheduled_start >= ? AND s.scheduled_start < ?`)
    .all(todayStart, new Date(now.getTime() - startTol * 60000).toISOString());
  for (const s of late) {
    alerts.push({
      key: `nao-iniciado:${s.id}`, type: 'nao_iniciado', severity: 'alta', service_id: s.id, at: s.scheduled_start,
      title: 'Serviço ainda não iniciado.',
      detail: `${s.client_name} — previsto para ${fmt(s.scheduled_start)}${s.operator_name ? ` (${s.operator_name})` : ''}`,
    });
  }

  const over = db
    .prepare(`${base} WHERE s.status = 'em_execucao' AND s.scheduled_end < ?`)
    .all(new Date(now.getTime() - overTol * 60000).toISOString());
  for (const s of over) {
    alerts.push({
      key: `ultrapassou:${s.id}`, type: 'ultrapassou', severity: 'media', service_id: s.id, at: s.scheduled_end,
      title: 'Serviço ultrapassou o horário previsto.',
      detail: `${s.client_name} — fim previsto ${fmt(s.scheduled_end)}${s.operator_name ? ` (${s.operator_name})` : ''}`,
    });
  }

  const upcoming = db
    .prepare(`${base} WHERE s.status NOT IN ('cancelado','concluido') AND s.scheduled_end >= ? AND s.scheduled_start < ?
              ORDER BY s.scheduled_start`)
    .all(todayStart, horizon);
  const empCount = db.prepare('SELECT COUNT(*) AS n FROM service_employees WHERE service_id = ? AND is_leader = 0');
  for (const s of upcoming) {
    if (!s.operator_name) {
      alerts.push({
        key: `sem-chefe:${s.id}`, type: 'sem_chefe', severity: 'alta', service_id: s.id, at: s.scheduled_start,
        title: 'Serviço não tem chefe de carrinha.',
        detail: `${s.client_name} — ${fmt(s.scheduled_start)}`,
      });
    }
    if (empCount.get(s.id).n === 0) {
      alerts.push({
        key: `sem-equipa:${s.id}`, type: 'sem_equipa', severity: 'media', service_id: s.id, at: s.scheduled_start,
        title: 'Serviço não tem equipa atribuída.',
        detail: `${s.client_name} — ${fmt(s.scheduled_start)}`,
      });
    }
  }
  // Carrinha atribuída a dois serviços em simultâneo.
  const byVan = new Map();
  for (const s of upcoming) {
    if (!s.van_name) continue;
    const list = byVan.get(s.van_name) ?? [];
    for (const o of list) {
      if (o.scheduled_start < s.scheduled_end && s.scheduled_start < o.scheduled_end) {
        alerts.push({
          key: `carrinha-dupla:${o.id}-${s.id}`, type: 'carrinha_dupla', severity: 'alta', service_id: s.id, at: s.scheduled_start,
          title: 'Carrinha está atribuída a dois serviços.',
          detail: `${s.van_name}: #${o.id} ${o.client_name} e #${s.id} ${s.client_name} (${fmt(s.scheduled_start)})`,
        });
      }
    }
    list.push(s);
    byVan.set(s.van_name, list);
  }

  // Eventos registados pelos operadores (últimas 48 h).
  const since = new Date(now.getTime() - 48 * 3600000).toISOString();
  const events = db
    .prepare(
      `SELECT ev.id, ev.service_id, ev.at, ev.type, ev.message, c.name AS client_name, u.name AS actor_name
         FROM service_events ev JOIN services s ON s.id = ev.service_id JOIN clients c ON c.id = s.client_id
         LEFT JOIN users u ON u.id = ev.actor_id
        WHERE ev.type IN ('concluido','problema','fotografias') AND ev.at >= ? AND ev.at <= ?
        ORDER BY ev.at DESC`,
    )
    .all(since, nowIso);
  const map = {
    concluido: ['Serviço concluído.', 'info'],
    problema: ['Operador registou um problema.', 'alta'],
    fotografias: ['Operador adicionou fotografias.', 'info'],
  };
  for (const ev of events) {
    const [title, severity] = map[ev.type];
    alerts.push({
      key: `evento:${ev.id}`, type: ev.type, severity, service_id: ev.service_id, at: ev.at, title,
      detail: `${ev.client_name}${ev.actor_name ? ` — ${ev.actor_name}` : ''}: ${ev.message}`,
    });
  }

  const read = new Set(db.prepare('SELECT alert_key FROM alert_reads').all().map((r) => r.alert_key));
  const order = { alta: 0, media: 1, info: 2 };
  return alerts
    .map((a) => ({ ...a, read: read.has(a.key) }))
    .sort((a, b) => Number(a.read) - Number(b.read) || order[a.severity] - order[b.severity] || (b.at > a.at ? 1 : -1));
}

function fmt(iso) {
  const d = new Date(iso);
  const today = localDate() === localDate(d);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return today ? `hoje ${hm}` : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hm}`;
}
