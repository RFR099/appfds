import express from 'express';
import { tx } from '../db.js';
import { addEvent, getServiceForOperator, ISSUE_CATEGORIES, OPERATOR_LIST_SQL } from '../services.js';
import { dayRange, hhmm, localDate, nowIso, minutesBetween } from '../time.js';
import { bad, bool, HHMM, HttpError, idList, notFound, str } from '../validate.js';
import { photoUpload, savePhotos } from '../photos.js';

/**
 * API do OPERADOR / CHEFE DE CARRINHA. Tudo aqui é filtrado por `operator_id = req.user.id`:
 * um operador nunca obtém dados de serviços que não lhe foram atribuídos (responde 404,
 * para não revelar sequer a existência do serviço) e nunca recebe campos financeiros.
 */
export function operatorRouter(db, { uploadDir }) {
  const r = express.Router();

  const loadOwn = (req) => {
    const id = Number(req.params.id);
    const s = Number.isInteger(id)
      ? db.prepare('SELECT * FROM services WHERE id = ? AND operator_id = ?').get(id, req.user.id)
      : null;
    if (!s) throw notFound('Serviço não encontrado.');
    return s;
  };

  r.get('/today', (req, res) => {
    const [from, to] = dayRange(localDate());
    const list = db
      .prepare(`${OPERATOR_LIST_SQL} WHERE s.operator_id = ? AND s.status <> 'cancelado'
                AND s.scheduled_start >= ? AND s.scheduled_start < ? ORDER BY s.scheduled_start`)
      .all(req.user.id, from, to);
    // Serviço atual: o que está em execução/deslocação; senão o próximo por iniciar.
    const active = list.find((s) => s.status === 'em_execucao' || s.status === 'em_deslocacao')
      // Pode haver um serviço de ontem ainda aberto.
      ?? db.prepare(`${OPERATOR_LIST_SQL} WHERE s.operator_id = ? AND s.status IN ('em_execucao','em_deslocacao')
                     ORDER BY s.scheduled_start LIMIT 1`).get(req.user.id);
    const pending = list.filter((s) => s.status === 'agendado');
    const current = active ?? pending[0] ?? null;
    const next = pending.find((s) => s.id !== current?.id) ?? null;
    res.json({
      date: localDate(),
      current: current ? getServiceForOperator(db, current.id, req.user.id) : null,
      next,
      completed: list.filter((s) => s.status === 'concluido'),
      pending,
      total: list.length,
    });
  });

  r.get('/services', (req, res) => {
    const scope = req.query.scope === 'history' ? 'history' : 'upcoming';
    const [todayStart] = dayRange(localDate());
    const rows =
      scope === 'upcoming'
        ? db.prepare(`${OPERATOR_LIST_SQL} WHERE s.operator_id = ? AND s.status NOT IN ('concluido','cancelado')
                       AND (s.scheduled_start >= ? OR s.status <> 'agendado') ORDER BY s.scheduled_start LIMIT 100`)
            .all(req.user.id, todayStart)
        : db.prepare(`${OPERATOR_LIST_SQL} WHERE s.operator_id = ? AND s.status = 'concluido'
                       ORDER BY s.scheduled_start DESC LIMIT 100`)
            .all(req.user.id);
    res.json(rows);
  });

  r.get('/services/:id', (req, res) => {
    const s = getServiceForOperator(db, Number(req.params.id), req.user.id);
    if (!s) throw notFound('Serviço não encontrado.');
    res.json(s);
  });

  const ensureNoOtherActive = (req, id) => {
    const other = db
      .prepare(`SELECT id FROM services WHERE operator_id = ? AND id <> ? AND status IN ('em_execucao','em_deslocacao')`)
      .get(req.user.id, id);
    if (other) throw new HttpError(409, `Termine primeiro o serviço #${other.id} que está em curso.`);
  };

  r.post('/services/:id/travel', (req, res) => {
    const s = loadOwn(req);
    if (s.status !== 'agendado') throw new HttpError(409, 'O serviço já não está agendado.');
    ensureNoOtherActive(req, s.id);
    const at = nowIso();
    tx(db, () => {
      db.prepare(`UPDATE services SET status = 'em_deslocacao', travel_started_at = ?, updated_at = ? WHERE id = ?`)
        .run(at, at, s.id);
      addEvent(db, s.id, req.user.id, 'deslocacao', `${req.user.name} iniciou deslocação`, null, at);
    });
    res.json(getServiceForOperator(db, s.id, req.user.id));
  });

  r.post('/services/:id/start', (req, res) => {
    const s = loadOwn(req);
    if (!['agendado', 'em_deslocacao'].includes(s.status)) throw new HttpError(409, 'O serviço já foi iniciado.');
    ensureNoOtherActive(req, s.id);
    const at = nowIso();
    const van = s.van_id ? db.prepare('SELECT name FROM vans WHERE id = ?').get(s.van_id) : null;
    const team = db
      .prepare('SELECT e.name FROM service_employees se JOIN employees e ON e.id = se.employee_id WHERE se.service_id = ?')
      .all(s.id)
      .map((e) => e.name);
    tx(db, () => {
      db.prepare(`UPDATE services SET status = 'em_execucao', started_at = ?, started_by = ?, updated_at = ? WHERE id = ?`)
        .run(at, req.user.id, at, s.id);
      addEvent(db, s.id, req.user.id, 'iniciado', `${req.user.name} iniciou serviço`, {
        van: van?.name ?? null, team,
      }, at);
    });
    res.json({ message: `Serviço iniciado às ${hhmm(at)}`, service: getServiceForOperator(db, s.id, req.user.id) });
  });

  /**
   * Terminar serviço: multipart com campo `data` (JSON) + ficheiros `photos`.
   * data = { end_time?: 'HH:MM', completed_ok, had_problems, observations, issues: [{category, description}],
   *          present_employee_ids: number[] }
   */
  r.post('/services/:id/finish', photoUpload.array('photos', 10), (req, res) => {
    const s = loadOwn(req);
    if (s.status !== 'em_execucao') throw new HttpError(409, 'Só é possível terminar um serviço em execução.');
    let data;
    try {
      data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    } catch {
      throw bad('Dados inválidos.');
    }
    const now = new Date();
    let finishedAt = now.toISOString();
    if (data.end_time) {
      if (!HHMM.test(data.end_time)) throw bad('Hora de conclusão inválida.');
      const [h, m] = data.end_time.split(':').map(Number);
      const start = new Date(s.started_at);
      const d = new Date(start);
      d.setHours(h, m, 0, 0);
      if (d < start) d.setDate(d.getDate() + 1); // serviço que passa a meia-noite
      if (d > new Date(now.getTime() + 5 * 60000)) throw bad('A hora de conclusão não pode ser no futuro.');
      finishedAt = d.toISOString();
    }
    const completedOk = bool(data.completed_ok);
    const hadProblems = bool(data.had_problems);
    const observations = str(data.observations, 'Observações', { max: 4000 });
    const issues = Array.isArray(data.issues) ? data.issues : [];
    if (issues.length > 10) throw bad('Demasiados problemas registados.');
    for (const i of issues) {
      if (!ISSUE_CATEGORIES[i?.category]) throw bad('Categoria de problema inválida.');
      i.description = str(i.description, 'Descrição do problema', { max: 1000 });
    }
    const teamIds = db.prepare('SELECT employee_id FROM service_employees WHERE service_id = ?').all(s.id).map((x) => x.employee_id);
    const present = data.present_employee_ids === undefined ? teamIds : idList(data.present_employee_ids, 'Presenças');
    if (present.some((id) => !teamIds.includes(id))) throw bad('Funcionário não pertence a este serviço.');

    tx(db, () => {
      db.prepare(
        `UPDATE services SET status = 'concluido', finished_at = ?, finished_by = ?, completed_ok = ?, had_problems = ?,
                observations = ?, updated_at = ? WHERE id = ?`,
      ).run(finishedAt, req.user.id, completedOk ? 1 : 0, hadProblems || issues.length ? 1 : 0, observations, nowIso(), s.id);
      const setPresent = db.prepare('UPDATE service_employees SET present = ? WHERE service_id = ? AND employee_id = ?');
      for (const id of teamIds) setPresent.run(present.includes(id) ? 1 : 0, s.id, id);
      const dur = minutesBetween(s.started_at, finishedAt);
      addEvent(db, s.id, req.user.id, 'terminado', `${req.user.name} terminou serviço (duração ${Math.floor(dur / 60)}h${String(dur % 60).padStart(2, '0')})`, {
        present: present.length, of: teamIds.length,
      }, finishedAt);
      const insIssue = db.prepare(
        'INSERT INTO service_issues (service_id, category, description, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
      );
      for (const i of issues) {
        insIssue.run(s.id, i.category, i.description, req.user.id, nowIso());
        addEvent(db, s.id, req.user.id, 'problema', `${ISSUE_CATEGORIES[i.category]}${i.description ? `: ${i.description}` : ''}`);
      }
      if (hadProblems && !issues.length) {
        addEvent(db, s.id, req.user.id, 'problema', observations ? `Problema indicado: ${observations}` : 'Problema indicado durante o serviço');
      }
      if (req.files?.length) savePhotos(db, uploadDir, s.id, req.user.id, req.files);
      addEvent(db, s.id, req.user.id, 'concluido', completedOk ? 'Serviço marcado como concluído' : 'Serviço terminado — NÃO concluído na totalidade');
    });
    res.json(getServiceForOperator(db, s.id, req.user.id));
  });

  r.post('/services/:id/photos', photoUpload.array('photos', 10), (req, res) => {
    const s = loadOwn(req);
    if (s.status === 'cancelado') throw new HttpError(409, 'Serviço cancelado.');
    if (!req.files?.length) throw bad('Nenhuma fotografia enviada.');
    tx(db, () => savePhotos(db, uploadDir, s.id, req.user.id, req.files));
    res.json(getServiceForOperator(db, s.id, req.user.id));
  });

  // Operadores autorizados (can_manage_team) podem ajustar a equipa dos SEUS serviços ainda não concluídos.
  const requireTeamPermission = (req) => {
    if (!req.user.can_manage_team) throw new HttpError(403, 'Sem autorização para alterar a equipa.');
  };

  r.get('/employees', (req, res) => {
    requireTeamPermission(req);
    // Apenas nome/cargo — nunca valor/hora.
    res.json(db.prepare(`SELECT id, name, job_title FROM employees WHERE status = 'ativo' ORDER BY name`).all());
  });

  r.post('/services/:id/team', (req, res) => {
    requireTeamPermission(req);
    const s = loadOwn(req);
    if (['concluido', 'cancelado'].includes(s.status)) throw new HttpError(409, 'Serviço já fechado.');
    const empId = Number(req.body?.employee_id);
    const e = db.prepare(`SELECT id, name, hourly_rate FROM employees WHERE id = ? AND status = 'ativo'`).get(empId);
    if (!e) throw bad('Funcionário inválido.');
    tx(db, () => {
      const r2 = db.prepare('INSERT OR IGNORE INTO service_employees (service_id, employee_id, hourly_rate) VALUES (?, ?, ?)')
        .run(s.id, e.id, e.hourly_rate);
      if (r2.changes) addEvent(db, s.id, req.user.id, 'equipa', `${req.user.name} adicionou ${e.name} à equipa`);
    });
    res.json(getServiceForOperator(db, s.id, req.user.id));
  });

  r.delete('/services/:id/team/:employeeId', (req, res) => {
    requireTeamPermission(req);
    const s = loadOwn(req);
    if (['concluido', 'cancelado'].includes(s.status)) throw new HttpError(409, 'Serviço já fechado.');
    const empId = Number(req.params.employeeId);
    const row = db.prepare(
      `SELECT se.is_leader, e.name FROM service_employees se JOIN employees e ON e.id = se.employee_id
        WHERE se.service_id = ? AND se.employee_id = ?`,
    ).get(s.id, empId);
    if (!row) throw notFound('Funcionário não está neste serviço.');
    if (row.is_leader) throw bad('O chefe de carrinha não pode ser removido.');
    tx(db, () => {
      db.prepare('DELETE FROM service_employees WHERE service_id = ? AND employee_id = ?').run(s.id, empId);
      addEvent(db, s.id, req.user.id, 'equipa', `${req.user.name} removeu ${row.name} da equipa`);
    });
    res.json(getServiceForOperator(db, s.id, req.user.id));
  });

  r.get('/profile', (req, res) => {
    const u = db.prepare('SELECT id, username, name, phone, can_manage_team, last_login_at FROM users WHERE id = ?').get(req.user.id);
    const stats = db
      .prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN scheduled_start >= ? THEN 1 ELSE 0 END) AS this_month
                  FROM services WHERE operator_id = ? AND status = 'concluido'`)
      .get(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(), req.user.id);
    const team = db
      .prepare(`SELECT t.name, v.name AS van_name, v.plate FROM teams t LEFT JOIN vans v ON v.id = t.van_id
                 WHERE t.leader_user_id = ? AND t.active = 1`)
      .get(req.user.id);
    res.json({ ...u, stats, team: team ?? null });
  });

  return r;
}
