import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');

/** Segredo de assinatura das sessões: variável de ambiente ou gerado uma vez e guardado em data/. */
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(dataDir, '.session-secret');
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(file, 'utf8').trim();
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  dataDir,
  dbFile: path.join(dataDir, 'limpeza.db'),
  uploadDir: path.join(dataDir, 'uploads'),
  staticDir: path.resolve(root, '..', 'client', 'dist'),
  secureCookies: process.env.SECURE_COOKIES === '1',
  get secret() {
    return loadSecret();
  },
};
