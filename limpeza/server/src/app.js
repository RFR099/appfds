import './time.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { authenticate as makeAuth, csrfGuard, requireRole } from './auth.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { operatorRouter } from './routes/operator.js';
import { photoRoute } from './photos.js';
import { HttpError } from './validate.js';

/**
 * Monta a aplicação. A separação de acessos é feita no SERVIDOR:
 *   /api/admin/*  → apenas função "director"
 *   /api/op/*     → apenas função "operator", sempre filtrado pelos serviços atribuídos ao próprio
 * Mudar o URL no browser não dá acesso a nada: a API recusa (403/404) independentemente da interface.
 */
export function createApp(db, { secret, uploadDir, staticDir, secureCookies = false } = {}) {
  if (!secret) throw new Error('secret obrigatório');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
    });
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const authenticate = makeAuth(db, secret);
  const api = express.Router();
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(csrfGuard);
  api.use('/auth', authRouter(db, { secret, secureCookies, authenticate }));
  api.get('/photos/:id', authenticate, photoRoute(db, uploadDir));
  api.use('/admin', authenticate, requireRole('director'), adminRouter(db));
  api.use('/op', authenticate, requireRole('operator'), operatorRouter(db, { uploadDir }));
  api.use((req, res) => res.status(404).json({ error: 'Recurso inexistente.' }));
  app.use('/api', api);

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    app.get(/.*/, (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Fotografia demasiado grande (máx. 10 MB).' : 'Envio de ficheiros inválido.' });
    }
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
    const ref = crypto.randomBytes(4).toString('hex');
    console.error(`[erro ${ref}]`, err);
    res.status(500).json({ error: `Erro interno (ref. ${ref}).` });
  });
  return app;
}
