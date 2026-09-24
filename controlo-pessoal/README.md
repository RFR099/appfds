# controlo-pessoal

App de controlo empresarial (Innovatweb): finanças (calendário, balanço,
receitas, despesas, notas, clientes) e redes sociais.

Independente do resto do repositório (`fds-backend` / `frontend`).

```bash
npm install
npm run dev
```

Os dados ficam guardados no `localStorage` do browser — ver `src/storage.js`,
que implementa a API `window.storage` que a app usava como artifact do Claude.
