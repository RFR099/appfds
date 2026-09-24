import './time.js';
import { createApp } from './app.js';
import { config } from './config.js';
import { openDb } from './db.js';
import { seed } from './seed.js';

const db = openDb(config.dbFile);
if (!db.prepare('SELECT COUNT(*) AS n FROM users').get().n) {
  console.log('Base de dados vazia — a criar dados de demonstração…');
  seed(db, { uploadDir: config.uploadDir });
}
const app = createApp(db, {
  secret: config.secret,
  uploadDir: config.uploadDir,
  staticDir: config.staticDir,
  secureCookies: config.secureCookies,
});
app.listen(config.port, () => console.log(`Plataforma a correr em http://localhost:${config.port}`));
