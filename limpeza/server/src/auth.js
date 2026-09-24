import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export const COOKIE = 'lp_session';
const SESSION_HOURS = 12;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [alg, saltHex, hashHex] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

export function signSession(secret, user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, secret, { expiresIn: `${SESSION_HOURS}h` });
}

export function cookieOptions(secure) {
  return { httpOnly: true, sameSite: 'strict', secure, path: '/', maxAge: SESSION_HOURS * 3600 * 1000 };
}

/**
 * Carrega o utilizador da sessão a partir da BD em cada pedido: se a conta for desativada
 * ou mudar de função, o acesso muda imediatamente (não confiamos só no conteúdo do token).
 */
export function authenticate(db, secret) {
  const stmt = db.prepare(
    'SELECT id, username, role, name, employee_id, active, can_manage_team FROM users WHERE id = ?',
  );
  return (req, res, next) => {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: 'Sessão não iniciada.' });
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({ error: 'Sessão expirada. Inicie sessão novamente.' });
    }
    const user = stmt.get(Number(payload.sub));
    if (!user || !user.active) return res.status(401).json({ error: 'Conta inativa ou inexistente.' });
    req.user = user;
    next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Sessão não iniciada.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sem permissão para aceder a este recurso.' });
    }
    next();
  };
}

/**
 * Defesa CSRF: o cookie é SameSite=Strict e, adicionalmente, todos os pedidos que alteram
 * dados têm de trazer um cabeçalho personalizado (que um formulário de outro site não consegue enviar).
 */
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'limpeza-app') {
    return res.status(403).json({ error: 'Pedido rejeitado (CSRF).' });
  }
  next();
}

/** Limitador simples de tentativas de login por IP+utilizador. */
export function loginLimiter({ max = 10, windowMs = 10 * 60 * 1000 } = {}) {
  const hits = new Map();
  return {
    check(key) {
      const now = Date.now();
      const e = hits.get(key);
      if (!e || now - e.first > windowMs) return true;
      return e.count < max;
    },
    fail(key) {
      const now = Date.now();
      const e = hits.get(key);
      if (!e || now - e.first > windowMs) hits.set(key, { first: now, count: 1 });
      else e.count++;
    },
    reset(key) {
      hits.delete(key);
    },
  };
}
