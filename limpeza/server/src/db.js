import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Registos internos de funcionários. NÃO têm login: só os utilizadores (tabela users) entram na aplicação.
CREATE TABLE IF NOT EXISTS employees (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  job_title   TEXT NOT NULL DEFAULT 'Operador de limpeza',
  status      TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  hourly_rate REAL NOT NULL CHECK (hourly_rate >= 0),
  phone       TEXT,
  email       TEXT,
  nif         TEXT,
  hired_at    TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL
);

-- Contas com acesso à aplicação: apenas DIRETOR e OPERADOR (chefe de carrinha).
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('director','operator')),
  name            TEXT NOT NULL,
  employee_id     INTEGER UNIQUE REFERENCES employees(id),
  phone           TEXT,
  active          INTEGER NOT NULL DEFAULT 1,
  can_manage_team INTEGER NOT NULL DEFAULT 0,
  last_login_at   TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vans (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  plate      TEXT NOT NULL UNIQUE,
  model      TEXT,
  year       INTEGER,
  status     TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','manutencao','inativa')),
  km         INTEGER,
  notes      TEXT
);

CREATE TABLE IF NOT EXISTS clients (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  nif          TEXT,
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  city         TEXT,
  postal_code  TEXT,
  notes        TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  van_id         INTEGER REFERENCES vans(id),
  leader_user_id INTEGER REFERENCES users(id),
  active         INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  PRIMARY KEY (team_id, employee_id)
);

CREATE TABLE IF NOT EXISTS services (
  id               INTEGER PRIMARY KEY,
  client_id        INTEGER NOT NULL REFERENCES clients(id),
  title            TEXT NOT NULL,
  service_type     TEXT NOT NULL,
  address          TEXT,
  city             TEXT,
  instructions     TEXT,
  scheduled_start  TEXT NOT NULL,
  scheduled_end    TEXT NOT NULL,
  value            REAL NOT NULL DEFAULT 0,
  van_id           INTEGER REFERENCES vans(id),
  operator_id      INTEGER REFERENCES users(id),
  team_id          INTEGER REFERENCES teams(id),
  status           TEXT NOT NULL DEFAULT 'agendado'
                   CHECK (status IN ('agendado','em_deslocacao','em_execucao','concluido','cancelado')),
  travel_started_at TEXT,
  started_at       TEXT,
  started_by       INTEGER REFERENCES users(id),
  finished_at      TEXT,
  finished_by      INTEGER REFERENCES users(id),
  completed_ok     INTEGER,
  had_problems     INTEGER,
  observations     TEXT,
  fuel_cost        REAL NOT NULL DEFAULT 0,
  material_cost    REAL NOT NULL DEFAULT 0,
  other_cost       REAL NOT NULL DEFAULT 0,
  invoice_status   TEXT NOT NULL DEFAULT 'por_faturar' CHECK (invoice_status IN ('por_faturar','faturado','pago')),
  invoice_number   TEXT,
  invoiced_at      TEXT,
  paid_at          TEXT,
  created_by       INTEGER REFERENCES users(id),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_services_start ON services(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_services_operator ON services(operator_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_services_van ON services(van_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_services_client ON services(client_id);

-- Funcionários associados a cada serviço. hourly_rate é um snapshot do valor/hora no momento da atribuição.
CREATE TABLE IF NOT EXISTS service_employees (
  service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  hourly_rate REAL NOT NULL,
  is_leader   INTEGER NOT NULL DEFAULT 0,
  present     INTEGER,
  PRIMARY KEY (service_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_service_employees_emp ON service_employees(employee_id);

CREATE TABLE IF NOT EXISTS service_issues (
  id          INTEGER PRIMARY KEY,
  service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('equipamento','local','material','cliente','outro')),
  description TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_photos (
  id            INTEGER PRIMARY KEY,
  service_id    INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  original_name TEXT,
  mime          TEXT NOT NULL,
  size          INTEGER,
  uploaded_by   INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL
);

-- Timeline / histórico completo de cada serviço (quem fez o quê e quando).
CREATE TABLE IF NOT EXISTS service_events (
  id         INTEGER PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  at         TEXT NOT NULL,
  actor_id   INTEGER REFERENCES users(id),
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  data       TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_service ON service_events(service_id, at);
CREATE INDEX IF NOT EXISTS idx_events_at ON service_events(at);

-- Custos gerais da empresa (não diretamente ligados a um serviço).
CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY,
  date        TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  amount      REAL NOT NULL CHECK (amount >= 0),
  van_id      INTEGER REFERENCES vans(id),
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employee_payments (
  id          INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  period      TEXT NOT NULL,
  hours       REAL NOT NULL,
  amount      REAL NOT NULL,
  paid_at     TEXT NOT NULL,
  notes       TEXT,
  created_by  INTEGER REFERENCES users(id),
  UNIQUE (employee_id, period)
);

CREATE TABLE IF NOT EXISTS alert_reads (
  alert_key TEXT PRIMARY KEY,
  read_at   TEXT NOT NULL
);

-- Cálculo financeiro por serviço (usado em todas as agregações da área do diretor).
-- Horas: duração real se o serviço foi iniciado e terminado; caso contrário, duração prevista.
-- Custo de funcionários: horas x soma do valor/hora dos funcionários presentes (ou ainda sem registo de presença).
DROP VIEW IF EXISTS service_fin;
CREATE VIEW service_fin AS
SELECT s.id AS service_id,
       ROUND(CASE WHEN s.started_at IS NOT NULL AND s.finished_at IS NOT NULL
                  THEN (julianday(s.finished_at) - julianday(s.started_at)) * 24
                  ELSE (julianday(s.scheduled_end) - julianday(s.scheduled_start)) * 24 END, 2) AS hours,
       ROUND((CASE WHEN s.started_at IS NOT NULL AND s.finished_at IS NOT NULL
                   THEN (julianday(s.finished_at) - julianday(s.started_at)) * 24
                   ELSE (julianday(s.scheduled_end) - julianday(s.scheduled_start)) * 24 END)
             * COALESCE((SELECT SUM(se.hourly_rate) FROM service_employees se
                         WHERE se.service_id = s.id AND COALESCE(se.present, 1) = 1), 0), 2) AS labor_cost
FROM services s;
`;

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

/** Executa fn dentro de uma transação (rollback em caso de erro). */
export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const DEFAULT_SETTINGS = {
  company_name: 'BrilhoTotal — Serviços de Limpeza',
  company_nif: '514 283 907',
  company_address: 'Rua do Freixo 1012, 4300-219 Porto',
  alert_start_tolerance_min: '15',
  alert_overrun_tolerance_min: '15',
  default_fuel_cost: '20',
  vat_rate: '23',
};

export function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}
