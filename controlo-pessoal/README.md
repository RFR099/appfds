# controlo-pessoal

App de controlo financeiro (Innovatweb): calendário, balanço, receitas,
despesas, notas e clientes.

Independente do resto do repositório (`fds-backend` / `frontend`).

```bash
npm install
npm run dev
```

Os dados ficam guardados no `localStorage` do browser — ver `src/storage.js`,
que implementa a API `window.storage` que a app usava como artifact do Claude.

## Publicar como artifact do Claude

```bash
npm run build:artifact
```

Gera `dist-artifact/controlo-pessoal.html` (um único ficheiro, com JS e CSS
inline), que é publicado como artifact com a capability `db`. Aí os dados
ficam na base de dados partilhada do artifact em vez do `localStorage`.

## Testes

```bash
npm test
```

Testam as contas do Balanço (saldo, previsto, margem, lucro por cliente,
objetivo do mês, reserva para impostos), os pagamentos em atraso, a pesquisa,
o CSV, os cartões no telemóvel,
a leitura de valores em formato português, as datas, os pagamentos mensais
e a confirmação ao apagar.
