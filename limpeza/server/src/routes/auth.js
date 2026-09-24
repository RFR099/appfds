import express from 'express';
import { COOKIE, cookieOptions, hashPassword, loginLimiter, signSession, verifyPassword } from '../auth.js';
import { nowIso } from '../time.js';
import { bad, HttpError } from '../validate.js';

export function authRouter(db, { secret, secureCookies, authenticate }) {
  const r = express.Router();
  const limiter = loginLimiter();
  // Hash fictício para que o tempo de resposta não revele se o utilizador existe.
  const dummyHash = hashPassword('dummy-password');

  r.post('/login', (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    const key = `${req.ip}|${username.toLowerCase()}`;
    if (!limiter.check(key)) throw new HttpError(429, 'Demasiadas tentativas. Aguarde alguns minutos.');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    const ok = verifyPassword(password, user?.password_hash ?? dummyHash) && user && user.active;
    if (!ok) {
      limiter.fail(key);
      throw new HttpError(401, 'Utilizador ou password incorretos.');
    }
    limiter.reset(key);
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(nowIso(), user.id);
    res.cookie(COOKIE, signSession(secret, user), cookieOptions(secureCookies));
    res.json(publicUser(user));
  });

  r.post('/logout', (req, res) => {
    res.clearCookie(COOKIE, { ...cookieOptions(secureCookies), maxAge: undefined });
    res.json({ ok: true });
  });

  r.get('/me', authenticate, (req, res) => res.json(publicUser(req.user)));

  r.post('/password', authenticate, (req, res) => {
    const { current, next } = req.body ?? {};
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!verifyPassword(String(current ?? ''), row.password_hash)) throw bad('A password atual está incorreta.');
    if (String(next ?? '').length < 8) throw bad('A nova password deve ter pelo menos 8 caracteres.');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(next)), req.user.id);
    res.json({ ok: true });
  });

  return r;
}

const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role,
  can_manage_team: !!u.can_manage_team,
});
