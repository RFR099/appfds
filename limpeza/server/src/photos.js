import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { addEvent } from './services.js';
import { nowIso } from './time.js';
import { bad } from './validate.js';

export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

/** Identifica o formato pelos "magic bytes" — não confiamos no mime enviado pelo cliente. */
function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ['image/jpeg', 'jpg'];
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ['image/png', 'png'];
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return ['image/webp', 'webp'];
  if (buf.length > 12 && buf.toString('ascii', 4, 8) === 'ftyp' && /heic|heix|mif1|msf1/.test(buf.toString('ascii', 8, 12))) return ['image/heic', 'heic'];
  return null;
}

export function savePhotos(db, uploadDir, serviceId, userId, files) {
  fs.mkdirSync(uploadDir, { recursive: true });
  const ins = db.prepare(
    `INSERT INTO service_photos (service_id, filename, original_name, mime, size, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const checked = files.map((f) => {
    const kind = sniff(f.buffer);
    if (!kind) throw bad(`"${f.originalname}" não é uma imagem suportada (JPEG, PNG, WEBP ou HEIC).`);
    return { f, kind };
  });
  for (const { f, kind } of checked) {
    const filename = `${crypto.randomUUID()}.${kind[1]}`;
    fs.writeFileSync(path.join(uploadDir, filename), f.buffer);
    ins.run(serviceId, filename, String(f.originalname).slice(0, 200), kind[0], f.size, userId, nowIso());
  }
  addEvent(db, serviceId, userId, 'fotografias', `${checked.length} fotografia(s) adicionada(s)`);
}

export function photoRoute(db, uploadDir) {
  return (req, res) => {
    const p = db
      .prepare('SELECT p.*, s.operator_id FROM service_photos p JOIN services s ON s.id = p.service_id WHERE p.id = ?')
      .get(Number(req.params.id));
    // O operador só vê fotografias dos seus serviços; 404 para não revelar a existência de outras.
    if (!p || (req.user.role !== 'director' && p.operator_id !== req.user.id)) {
      return res.status(404).json({ error: 'Fotografia não encontrada.' });
    }
    const file = path.join(uploadDir, path.basename(p.filename));
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Ficheiro em falta.' });
    res.set({
      'Content-Type': p.mime,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
      'Content-Security-Policy': "default-src 'none'",
    });
    fs.createReadStream(file).pipe(res);
  };
}
