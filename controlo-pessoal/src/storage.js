// A app foi escrita para correr como artifact do Claude, onde existe
// `window.storage` (API assíncrona get/set). Fora desse ambiente, esta
// camada implementa a mesma API sobre o localStorage do browser.
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      if (value === null) throw new Error(`key not found: ${key}`);
      return { key, value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
  };
}
