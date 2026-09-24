// A app foi escrita para correr como artifact do Claude, com uma API
// assíncrona `window.storage` (get/set). Esta camada implementa essa API:
// - publicada como artifact: guarda na base de dados partilhada do artifact
//   (capability "db"), para quem tiver o link ver e editar os mesmos dados;
// - fora do artifact (npm run dev): guarda no localStorage do browser.

const COLLECTION = "app";

const dbPromise =
  window.claude && typeof window.claude.use === "function"
    ? window.claude.use("db").catch(() => null)
    : Promise.resolve(null);

function localGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// A db aceita uma escrita de cada vez por documento: guardamos só o valor
// mais recente e escrevemo-lo quando a escrita anterior terminar.
const pending = new Map();
const writing = new Map();

async function flush(db, key) {
  try {
    while (pending.has(key)) {
      const value = pending.get(key);
      pending.delete(key);
      await db.doc(`${COLLECTION}/${key}`).set({ value, updatedAt: new Date().toISOString() });
    }
  } finally {
    // no mesmo passo síncrono em que vemos que não há mais nada pendente,
    // para nenhuma escrita nova ficar à espera de um ciclo que já acabou
    writing.delete(key);
  }
}

if (!window.storage) {
  window.storage = {
    async get(key) {
      const db = await dbPromise;
      let value = null;
      if (db) {
        const snap = await db.doc(`${COLLECTION}/${key}`).get();
        value = snap.exists ? snap.data()?.value ?? null : null;
      } else {
        value = localGet(key);
      }
      if (value === null) throw new Error(`key not found: ${key}`);
      return { key, value };
    },
    async set(key, value) {
      const db = await dbPromise;
      if (!db) return localSet(key, value) ? { key, value } : null;
      pending.set(key, value);
      if (!writing.has(key)) {
        writing.set(key, flush(db, key));
      }
      await writing.get(key);
      return { key, value };
    },
  };
}
