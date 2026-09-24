import './time.js';
import fs from 'node:fs';
import { config } from './config.js';
import { openDb } from './db.js';
import { seed } from './seed.js';

// Recria a base de dados de demonstração do zero (datas relativas ao momento atual).
for (const f of [config.dbFile, `${config.dbFile}-wal`, `${config.dbFile}-shm`]) fs.rmSync(f, { force: true });
fs.rmSync(config.uploadDir, { recursive: true, force: true });
const db = openDb(config.dbFile);
const stats = seed(db, { uploadDir: config.uploadDir });
console.log('Dados de demonstração criados:', stats);
