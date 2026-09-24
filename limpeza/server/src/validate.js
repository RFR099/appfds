export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const bad = (msg, details) => new HttpError(400, msg, details);
export const notFound = (msg = 'Não encontrado.') => new HttpError(404, msg);

export function str(v, label, { required = false, max = 500 } = {}) {
  if (v === undefined || v === null || String(v).trim() === '') {
    if (required) throw bad(`${label} é obrigatório.`);
    return null;
  }
  const s = String(v).trim();
  if (s.length > max) throw bad(`${label} excede ${max} caracteres.`);
  return s;
}

export function num(v, label, { required = false, min = 0, max = 1e9 } = {}) {
  if (v === undefined || v === null || v === '') {
    if (required) throw bad(`${label} é obrigatório.`);
    return null;
  }
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < min || n > max) throw bad(`${label} inválido.`);
  return Math.round(n * 100) / 100;
}

export function int(v, label, opts = {}) {
  const n = num(v, label, opts);
  if (n !== null && !Number.isInteger(n)) throw bad(`${label} inválido.`);
  return n;
}

export function oneOf(v, label, values, { required = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (required) throw bad(`${label} é obrigatório.`);
    return null;
  }
  if (!values.includes(v)) throw bad(`${label} inválido.`);
  return v;
}

export function bool(v) {
  return v === true || v === 1 || v === '1' || v === 'true' || v === 'on';
}

export function idList(v, label) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw bad(`${label} inválido.`);
  const ids = v.map(Number);
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) throw bad(`${label} inválido.`);
  return [...new Set(ids)];
}

export function isoDateTime(v, label, { required = false } = {}) {
  if (!v) {
    if (required) throw bad(`${label} é obrigatório.`);
    return null;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw bad(`${label} inválido.`);
  return d.toISOString();
}

export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
