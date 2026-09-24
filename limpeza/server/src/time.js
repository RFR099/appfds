// A empresa opera em Portugal: todas as noções de "hoje", "mês", etc. usam a hora de Lisboa.
// Os instantes são guardados em ISO-8601 UTC na base de dados.
process.env.TZ = process.env.APP_TZ || 'Europe/Lisbon';

const pad = (n) => String(n).padStart(2, '0');

export const nowIso = () => new Date().toISOString();

/** 'YYYY-MM-DD' (hora local) de uma data. */
export function localDate(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00`).getTime());
}

/** Intervalo [início, fim) em ISO UTC para um dia local 'YYYY-MM-DD'. */
export function dayRange(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return [new Date(y, m - 1, d).toISOString(), new Date(y, m - 1, d + 1).toISOString()];
}

/** Intervalo [início, fim) em ISO UTC para um período local de datas inclusivas. */
export function periodRange(fromStr, toStr) {
  return [dayRange(fromStr)[0], dayRange(toStr)[1]];
}

/** Intervalo [início, fim) para um mês 'YYYY-MM'. */
export function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  return [new Date(y, m - 1, 1).toISOString(), new Date(y, m, 1).toISOString()];
}

export function monthKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
}

/** Combina 'YYYY-MM-DD' + 'HH:MM' (hora local) num ISO UTC. */
export function combineLocal(dateStr, hhmm) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

export function hhmm(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const minutesBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);
