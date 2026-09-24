import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { hashPassword } from './auth.js';
import { DEFAULT_SETTINGS, tx } from './db.js';
import { employeeWork, summarizeWork } from './finance.js';
import { localDate, monthKey, monthRange } from './time.js';

/*
 * Dados de demonstração realistas: 1 diretor, 10 operadores (chefes de carrinha), 40 funcionários,
 * 15 carrinhas, 10 equipas, 100 clientes, 300 serviços (passado, hoje e próximos dias), custos,
 * faturação e pagamentos. As datas são relativas ao momento em que o seed corre, para que o
 * dashboard de "hoje" tenha sempre serviços em execução, concluídos e pendentes.
 */

// PRNG determinístico (mulberry32) — os mesmos dados em cada execução (exceto as datas).
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPERATORS = [
  ['Carlos Silva', 'carlos.silva'], ['Pedro Oliveira', 'pedro.oliveira'], ['Miguel Sousa', 'miguel.sousa'],
  ['Rui Fernandes', 'rui.fernandes'], ['Tiago Martins', 'tiago.martins'], ['Nuno Pereira', 'nuno.pereira'],
  ['Sérgio Gomes', 'sergio.gomes'], ['Bruno Lopes', 'bruno.lopes'], ['Hugo Marques', 'hugo.marques'],
  ['Paulo Ribeiro', 'paulo.ribeiro'],
];
const FIRST_F = ['Ana', 'Maria', 'Sofia', 'Beatriz', 'Inês', 'Joana', 'Catarina', 'Rita', 'Marta', 'Sandra', 'Patrícia', 'Cláudia', 'Helena', 'Filipa', 'Daniela', 'Vera', 'Lúcia', 'Rosa', 'Fátima', 'Paula', 'Teresa', 'Mónica'];
const FIRST_M = ['João', 'Pedro', 'José', 'António', 'Manuel', 'Luís', 'Ricardo', 'André', 'Diogo', 'Fábio', 'Rafael', 'Vítor', 'Jorge', 'Fernando', 'Mário', 'Daniel', 'Gonçalo', 'Marco'];
const LAST = ['Costa', 'Ferreira', 'Santos', 'Rodrigues', 'Almeida', 'Carvalho', 'Teixeira', 'Moreira', 'Mendes', 'Pinto', 'Cardoso', 'Rocha', 'Neves', 'Coelho', 'Cunha', 'Correia', 'Monteiro', 'Barbosa', 'Azevedo', 'Machado', 'Vieira', 'Lima', 'Araújo', 'Fonseca', 'Nogueira', 'Freitas'];
const CITIES = [
  ['Porto', '4000'], ['Porto', '4050'], ['Porto', '4150'], ['Matosinhos', '4450'], ['Vila Nova de Gaia', '4400'],
  ['Maia', '4470'], ['Gondomar', '4420'], ['Valongo', '4440'], ['Vila do Conde', '4480'], ['Póvoa de Varzim', '4490'],
  ['Espinho', '4500'], ['Braga', '4700'],
];
const STREETS = ['Rua de Santa Catarina', 'Avenida da Boavista', 'Rua do Almada', 'Rua de Cedofeita', 'Avenida dos Aliados', 'Rua Brito Capelo',
  'Rua Formosa', 'Avenida da República', 'Rua de Camões', 'Rua Álvares Cabral', 'Rua do Heroísmo', 'Rua da Constituição', 'Rua Júlio Dinis',
  'Avenida Fernão de Magalhães', 'Rua de Costa Cabral', 'Rua Oliveira Monteiro', 'Rua de Serpa Pinto', 'Avenida Menéres', 'Rua Roberto Ivens',
  'Rua 5 de Outubro', 'Avenida Vasco da Gama', 'Rua do Freixo', 'Rua Direita', 'Avenida do Brasil', 'Rua da Liberdade'];
const CLIENT_NAMES = {
  Hotel: ['Hotel Atlântico', 'Hotel Ribeira Douro', 'Hotel Boavista Palace', 'Hotel Foz Garden', 'Hotel Aliados', 'Hotel Miragaia', 'Hotel Infante Sagres', 'Hotel Serra Mar', 'Hotel Clérigos', 'Hotel Cedofeita Suites', 'Hostel Porto Central', 'Hotel Mar à Vista', 'Hotel Parque Maia', 'Hotel Gaia Riverside'],
  'Condomínio': ['Condomínio Jardins da Boavista', 'Condomínio Edifício Mar', 'Condomínio Quinta do Lago', 'Condomínio Residências do Parque', 'Condomínio Torre Antas', 'Condomínio Solar da Foz', 'Condomínio Varandas do Douro', 'Condomínio Edifício Aurora', 'Condomínio Pinhal Verde', 'Condomínio Monte Castro', 'Condomínio Vila Serena', 'Condomínio Parque Nascente', 'Condomínio Mirante Norte', 'Condomínio Praça Nova', 'Condomínio Horizonte', 'Condomínio Belavista'],
  'Escritório': ['Lusotec Consultoria, Lda', 'Nortempresa, SA', 'Douro Advogados', 'Invicta Seguros', 'Atlântida Contabilidade', 'Porto Digital Hub', 'Cedro Engenharia', 'Galeria Business Center', 'Maré Alta Imobiliária', 'Norte Logística, SA', 'Brisa Tech', 'Grupo Ferreira & Filhos', 'Oceano Azul Software', 'Mercúrio Contabilistas', 'Aliança Mediação'],
  Restaurante: ['Restaurante O Tasco do Rio', 'Churrasqueira Central', 'Restaurante Mar Salgado', 'Cervejaria Galiza Nova', 'Pastelaria Doce Porto', 'Restaurante Vinha Velha', 'Marisqueira Leça', 'Café Majestade'],
  'Clínica': ['Clínica Dentária Sorriso', 'Clínica Médica da Boavista', 'Centro de Fisioterapia Ativa', 'Laboratório Análises Norte', 'Clínica Veterinária Foz', 'Centro Médico Maia', 'Clínica Oftalmológica Visão'],
  Loja: ['Loja Moda Porto', 'Livraria Letras', 'Ótica Central', 'Farmácia Nova Esperança', 'Supermercado Frescos da Vila', 'Loja Casa & Deco', 'Sapataria Passo Certo', 'Florista Primavera'],
  Escola: ['Colégio São Bento', 'Escola de Línguas Global', 'Jardim de Infância Arco-Íris', 'Academia de Música Allegro', 'Centro de Estudos Saber Mais', 'Escola de Condução Estrada Viva'],
  'Indústria': ['Metalúrgica Vale do Ave', 'Têxtil Norte, SA', 'Armazéns Leixões', 'Gráfica Invicta', 'Cortiças do Norte', 'Plásticos Maia, Lda', 'Alimentar Douro, SA', 'Vidreira Gaia'],
  'Ginásio': ['Ginásio Força Total', 'Health Club Foz', 'Estúdio Pilates Equilíbrio', 'Box Crossfit Invicta'],
  Particular: ['Moradia Sr. Almeida', 'Apartamento Dra. Neves', 'Moradia Família Barbosa', 'Apartamento Sr. Cardoso', 'Moradia Sra. Pinto', 'Moradia Eng. Teixeira', 'Apartamento Sra. Fonseca', 'Moradia Família Lima', 'Apartamento Sr. Monteiro', 'Moradia Dr. Coelho', 'Apartamento Sra. Rocha', 'Moradia Família Vieira', 'Loft Sr. Azevedo', 'Moradia Família Correia'],
};
const TYPES_FOR_CLIENT = {
  Hotel: ['Limpeza de manutenção', 'Limpeza profunda', 'Limpeza de vidros', 'Higienização e desinfeção'],
  'Condomínio': ['Limpeza de escadas/condomínio', 'Limpeza de vidros', 'Tratamento de pavimentos'],
  'Escritório': ['Limpeza de manutenção', 'Limpeza de vidros', 'Limpeza profunda'],
  Restaurante: ['Limpeza profunda', 'Higienização e desinfeção'],
  'Clínica': ['Higienização e desinfeção', 'Limpeza de manutenção'],
  Loja: ['Limpeza de manutenção', 'Limpeza de vidros'],
  Escola: ['Limpeza de manutenção', 'Limpeza profunda', 'Higienização e desinfeção'],
  'Indústria': ['Limpeza industrial', 'Tratamento de pavimentos', 'Limpeza profunda'],
  'Ginásio': ['Higienização e desinfeção', 'Limpeza de manutenção'],
  Particular: ['Limpeza profunda', 'Limpeza pós-obra', 'Limpeza de manutenção'],
};
const VAN_MODELS = ['Renault Trafic', 'Peugeot Expert', 'Citroën Jumpy', 'Ford Transit Custom', 'Mercedes-Benz Vito', 'Opel Vivaro', 'Toyota Proace'];
const OBSERVATIONS = [
  'Tudo conforme planeado.', 'Cliente satisfeito com o resultado.', 'Acesso ao edifício demorou alguns minutos.',
  'Foi necessário reforçar a limpeza das casas de banho.', 'Vidros exteriores com muita sujidade — levou mais tempo.',
  'Responsável do cliente pediu reforço na próxima visita.', 'Estacionamento difícil no local.', null, null, null,
];
const ISSUES = [
  ['equipamento', 'Aspirador industrial deixou de funcionar a meio do serviço.'],
  ['equipamento', 'Mangueira da máquina lavadora com fuga.'],
  ['local', 'Zona de trabalho ocupada — não foi possível limpar a garagem.'],
  ['local', 'Sem água quente disponível no local.'],
  ['material', 'Faltou detergente desengordurante.'],
  ['material', 'Sacos do lixo insuficientes.'],
  ['cliente', 'Cliente não estava no local à hora combinada.'],
  ['cliente', 'Cliente pediu trabalho extra não previsto.'],
  ['outro', 'Trânsito intenso atrasou a chegada.'],
];

/** Gera um PNG simples (placeholder de fotografia) sem dependências externas. */
function makePng(w, h, [r1, g1, b1], [r2, g2, b2], seedN) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const t = (x + y) / (w + h);
      const stripe = ((Math.floor((x + seedN * 13) / 24) + Math.floor(y / 24)) % 2) * 14;
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = Math.min(255, r1 + (r2 - r1) * t + stripe);
      raw[o + 1] = Math.min(255, g1 + (g2 - g1) * t + stripe);
      raw[o + 2] = Math.min(255, b1 + (b2 - b1) * t + stripe);
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function seed(db, { uploadDir, now = new Date() } = {}) {
  const rand = rng(20260924);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (a, b) => a + rand() * (b - a);
  const intBetween = (a, b) => Math.floor(between(a, b + 1));
  const round5 = (n) => Math.round(n / 5) * 5;
  const money = (n) => Math.round(n * 100) / 100;
  const addMin = (d, m) => new Date(d.getTime() + m * 60000);
  const q15 = (d) => { const x = new Date(d); x.setMinutes(Math.round(x.getMinutes() / 15) * 15, 0, 0); return x; };
  const phone = () => `9${pick(['1', '2', '3', '6'])}${String(intBetween(0, 9999999)).padStart(7, '0')}`;
  const nif = (first) => {
    const d = [first, ...Array.from({ length: 7 }, () => intBetween(0, 9))];
    const sum = d.reduce((a, n, i) => a + n * (9 - i), 0);
    const c = 11 - (sum % 11);
    return [...d, c >= 10 ? 0 : c].join('');
  };
  const passwordHashOp = hashPassword('operador123');

  const photoFiles = [];
  fs.mkdirSync(uploadDir, { recursive: true });
  const palettes = [[[90, 140, 170], [200, 220, 230]], [[120, 150, 110], [220, 230, 200]], [[160, 130, 100], [235, 220, 200]],
    [[100, 110, 140], [210, 210, 235]], [[70, 120, 120], [190, 225, 220]], [[150, 150, 150], [235, 235, 235]]];
  palettes.forEach(([a, b], i) => {
    const f = `demo-foto-${i + 1}.png`;
    fs.writeFileSync(path.join(uploadDir, f), makePng(480, 320, a, b, i));
    photoFiles.push(f);
  });

  return tx(db, () => {
    const createdAt = new Date(now.getTime() - 400 * 86400000).toISOString();
    const insSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSetting.run(k, v);

    const insUser = db.prepare(`INSERT INTO users (username, password_hash, role, name, employee_id, phone, can_manage_team, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insEmp = db.prepare(`INSERT INTO employees (name, job_title, status, hourly_rate, phone, email, nif, hired_at, created_at)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const directorId = Number(insUser.run('diretor', hashPassword('diretor123'), 'director', 'Ricardo Almeida', null, '912 345 678', 0, createdAt).lastInsertRowid);

    // Operadores (chefes de carrinha) — também são funcionários (entram no custo de mão de obra).
    const operators = OPERATORS.map(([name, username], i) => {
      const empId = Number(insEmp.run(name, 'Chefe de carrinha', 'ativo', money(between(10.5, 12.5)), phone(), `${username}@brilhototal.pt`, nif(2),
        localDate(new Date(now.getTime() - intBetween(300, 2500) * 86400000)), createdAt).lastInsertRowid);
      const id = Number(insUser.run(username, passwordHashOp, 'operator', name, empId, phone(), i < 3 ? 1 : 0, createdAt).lastInsertRowid);
      return { id, name, empId };
    });

    // 40 funcionários sem acesso à aplicação.
    const used = new Set(OPERATORS.map((o) => o[0]));
    const fixed = ['Ana Costa', 'João Ferreira', 'Pedro Santos'];
    const employees = [];
    for (let i = 0; i < 40; i++) {
      let name = fixed[i];
      while (!name || used.has(name)) name = `${pick(rand() < 0.62 ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
      used.add(name);
      const job = i % 13 === 5 ? 'Especialista em vidros' : i % 11 === 7 ? 'Operador de máquinas' : 'Operador de limpeza';
      const status = [37, 38, 39].includes(i) ? 'inativo' : 'ativo';
      const rate = money(job === 'Operador de limpeza' ? between(8.2, 9.2) : between(9.2, 10.2));
      const id = Number(insEmp.run(name, job, status, rate, phone(), null, nif(2),
        localDate(new Date(now.getTime() - intBetween(40, 2200) * 86400000)), createdAt).lastInsertRowid);
      employees.push({ id, name, status, rate });
    }
    const activeEmps = employees.filter((e) => e.status === 'ativo');

    // 15 carrinhas.
    const insVan = db.prepare('INSERT INTO vans (name, plate, model, year, status, km, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const L = 'ABCDEFGHJKLMNPRSTVXZ';
    const vans = Array.from({ length: 15 }, (_, i) => {
      const plate = `${L[intBetween(0, 19)]}${L[intBetween(0, 19)]}-${String(intBetween(10, 99))}-${L[intBetween(0, 19)]}${L[intBetween(0, 19)]}`;
      const status = i === 14 ? 'manutencao' : 'ativa';
      return {
        id: Number(insVan.run(`Carrinha ${String(i + 1).padStart(2, '0')}`, plate, pick(VAN_MODELS), intBetween(2016, 2025), status,
          intBetween(18000, 240000), status === 'manutencao' ? 'Na oficina — revisão dos travões.' : null).lastInsertRowid),
      };
    });

    // 10 equipas base: carrinha i + chefe i + 3 funcionários. Os restantes funcionários são "volantes".
    const insTeam = db.prepare('INSERT INTO teams (name, van_id, leader_user_id, active) VALUES (?, ?, ?, 1)');
    const insMember = db.prepare('INSERT INTO team_members (team_id, employee_id) VALUES (?, ?)');
    const teams = operators.map((op, i) => {
      const id = Number(insTeam.run(`Equipa ${String(i + 1).padStart(2, '0')}`, vans[i].id, op.id).lastInsertRowid);
      const members = activeEmps.slice(i * 3, i * 3 + 3);
      members.forEach((m) => insMember.run(id, m.id));
      return { id, members, van: vans[i].id, op };
    });
    const floaters = activeEmps.slice(30);

    // 100 clientes.
    const insClient = db.prepare(`INSERT INTO clients (name, type, nif, contact_name, phone, email, address, city, postal_code, notes, active, created_at)
                                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const clients = [];
    for (const [type, names] of Object.entries(CLIENT_NAMES)) {
      for (const name of names) {
        if (clients.length >= 100) break;
        const [city, cp] = pick(CITIES);
        const contact = `${pick([...FIRST_F, ...FIRST_M])} ${pick(LAST)}`;
        const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 18);
        const c = {
          type, name, city,
          address: `${pick(STREETS)}, ${intBetween(1, 1500)}`,
          weight: type === 'Hotel' || type === 'Condomínio' || type === 'Escritório' ? 3 : type === 'Particular' ? 0.6 : 1.3,
        };
        c.id = Number(insClient.run(name, type, nif(type === 'Particular' ? 2 : 5), contact, rand() < 0.5 ? phone() : `22${intBetween(1000000, 9999999)}`,
          `geral@${slug}.pt`, c.address, city, `${cp}-${String(intBetween(1, 999)).padStart(3, '0')}`,
          rand() < 0.15 ? 'Chave na portaria. Contactar responsável à chegada.' : null, 1, createdAt).lastInsertRowid);
        clients.push(c);
      }
    }
    const totalWeight = clients.reduce((a, c) => a + c.weight, 0);
    const pickClient = () => {
      let x = rand() * totalWeight;
      for (const c of clients) { x -= c.weight; if (x <= 0) return c; }
      return clients[clients.length - 1];
    };

    const insService = db.prepare(`INSERT INTO services (client_id, title, service_type, address, city, instructions, scheduled_start, scheduled_end, value,
        van_id, operator_id, team_id, status, travel_started_at, started_at, started_by, finished_at, finished_by, completed_ok, had_problems, observations,
        fuel_cost, material_cost, other_cost, invoice_status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'por_faturar', ?, ?, ?)`);
    const insSE = db.prepare('INSERT INTO service_employees (service_id, employee_id, hourly_rate, is_leader, present) VALUES (?, ?, ?, ?, ?)');
    const insEv = db.prepare('INSERT INTO service_events (service_id, at, actor_id, type, message) VALUES (?, ?, ?, ?, ?)');
    const insIssue = db.prepare('INSERT INTO service_issues (service_id, category, description, created_by, created_at) VALUES (?, ?, ?, ?, ?)');
    const insPhoto = db.prepare(`INSERT INTO service_photos (service_id, filename, original_name, mime, size, uploaded_by, created_at)
                                 VALUES (?, ?, ?, 'image/png', ?, ?, ?)`);
    const empRate = new Map([...employees.map((e) => [e.id, e.rate])]);
    for (const op of operators) empRate.set(op.empId, db.prepare('SELECT hourly_rate FROM employees WHERE id = ?').get(op.empId).hourly_rate);

    let count = 0;
    /**
     * Cria um serviço. o = { start: Date, minutes, opIdx|null, status, client?, van?, teamSize?, noTeam?,
     *                        actualStartDelta?, actualEndDelta?, problem?, photos?, travelOnly? }
     */
    function makeService(o) {
      const client = o.client ?? pickClient();
      const type = pick(TYPES_FOR_CLIENT[client.type]);
      const team = o.opIdx === null ? null : teams[o.opIdx];
      const op = team?.op ?? null;
      let members = o.noTeam ? [] : team ? [...team.members] : [pick(floaters), pick(activeEmps)];
      members = [...new Set(members)];
      if (!o.noTeam && rand() < 0.2 && members.length) members[intBetween(0, members.length - 1)] = pick(floaters);
      if (!o.noTeam && o.teamSize) members = members.slice(0, o.teamSize);
      if (!o.noTeam && rand() < 0.15) members.push(pick(floaters));
      members = [...new Set(members.map((m) => m.id))].filter((id) => employees.find((e) => e.id === id)?.status === 'ativo');
      const people = members.length + (op ? 1 : 0);
      const start = o.start;
      const end = addMin(start, o.minutes);
      const hours = o.minutes / 60;
      const value = round5(Math.max(60, hours * Math.max(people, 1) * between(22.5, 29) + (type === 'Limpeza pós-obra' ? 80 : 0)));
      const fuel = money(between(10, 38));
      const materials = money(between(12, 22) + hours * Math.max(people, 1) * between(1.5, 3.5));
      const other = rand() < 0.35 ? money(between(3, 25)) : 0;
      const createdTs = new Date(Math.min(start.getTime() - intBetween(1, 12) * 86400000 - intBetween(0, 8) * 3600000, now.getTime() - 3600000));
      createdTs.setHours(intBetween(8, 18), intBetween(0, 59));
      let travel = null; let started = null; let finished = null; let ok = null; let problems = 0; let obs = null;
      const st = o.status;
      if (['em_deslocacao', 'em_execucao', 'concluido'].includes(st)) travel = addMin(start, -intBetween(18, 40) + (o.actualStartDelta ?? 0));
      if (['em_execucao', 'concluido'].includes(st)) started = addMin(start, o.actualStartDelta ?? intBetween(-10, 20));
      if (st === 'concluido') {
        finished = addMin(end, o.actualEndDelta ?? intBetween(-25, 40));
        if (finished <= started) finished = addMin(started, 60);
        problems = o.problem ?? (rand() < 0.08 ? 1 : 0);
        ok = problems && rand() < 0.3 ? 0 : 1;
        obs = problems ? null : pick(OBSERVATIONS);
      }
      const van = o.van ?? team?.van ?? pick(vans).id;
      const info = insService.run(client.id, client.name, type, client.address, client.city,
        rand() < 0.3 ? pick(['Levar escadote grande.', 'Pedir chave na receção.', 'Atenção ao piso de madeira — usar produto neutro.', 'Cliente pede discrição durante o horário de abertura.', 'Estacionar nas traseiras do edifício.']) : null,
        start.toISOString(), end.toISOString(), value, van, op?.id ?? null, team?.id ?? null, st,
        travel?.toISOString() ?? null, started?.toISOString() ?? null, started ? op?.id ?? null : null,
        finished?.toISOString() ?? null, finished ? op?.id ?? null : null, ok, st === 'concluido' ? problems : null, obs,
        fuel, materials, other, directorId, createdTs.toISOString(), (finished ?? started ?? createdTs).toISOString());
      const sid = Number(info.lastInsertRowid);
      if (op) insSE.run(sid, op.empId, empRate.get(op.empId), 1, st === 'concluido' ? 1 : null);
      for (const id of members) {
        if (id === op?.empId) continue;
        insSE.run(sid, id, empRate.get(id), 0, st === 'concluido' ? (rand() < 0.04 ? 0 : 1) : null);
      }
      // Timeline
      const ev = (at, actor, type_, msg) => insEv.run(sid, at.toISOString(), actor, type_, msg);
      ev(createdTs, directorId, 'criado', 'Serviço criado pelo diretor Ricardo Almeida');
      if (op) ev(addMin(createdTs, intBetween(2, 30)), directorId, 'atribuido', `Serviço atribuído ao operador ${op.name}`);
      if (members.length) {
        const names = db.prepare('SELECT e.name FROM service_employees se JOIN employees e ON e.id = se.employee_id WHERE se.service_id = ? ORDER BY se.is_leader DESC, e.name').all(sid).map((x) => x.name);
        ev(addMin(createdTs, intBetween(31, 60)), directorId, 'equipa', `Equipa definida: ${names.join(', ')}`);
      }
      if (travel) ev(travel, op.id, 'deslocacao', `${op.name} iniciou deslocação`);
      if (started) ev(started, op.id, 'iniciado', `${op.name} iniciou serviço`);
      if (finished) {
        const dur = Math.round((finished - started) / 60000);
        ev(finished, op.id, 'terminado', `${op.name} terminou serviço (duração ${Math.floor(dur / 60)}h${String(dur % 60).padStart(2, '0')})`);
        if (problems) {
          const [cat, desc] = pick(ISSUES);
          insIssue.run(sid, cat, desc, op.id, finished.toISOString());
          ev(finished, op.id, 'problema', desc);
        }
        const nPhotos = o.photos ?? (rand() < 0.3 || problems ? intBetween(1, 3) : 0);
        if (nPhotos) {
          for (let k = 0; k < nPhotos; k++) insPhoto.run(sid, pick(photoFiles), `IMG_${intBetween(1000, 9999)}.jpg`, 12000, op.id, finished.toISOString());
          ev(finished, op.id, 'fotografias', `${nPhotos} fotografia(s) adicionada(s)`);
        }
        ev(addMin(finished, 1), op.id, 'concluido', ok ? 'Serviço marcado como concluído' : 'Serviço terminado — NÃO concluído na totalidade');
      }
      if (st === 'cancelado') ev(addMin(start, -intBetween(60, 1440)), directorId, 'cancelado', 'Serviço cancelado pelo diretor: pedido do cliente');
      count++;
      return sid;
    }

    // ---- HOJE (24 serviços), horários relativos a "agora".
    const base = q15(now);
    const T = (min) => addMin(base, min);
    for (let i = 0; i < 10; i++) {
      // s1: concluído de manhã
      if (i <= 7) makeService({ start: T(-390 + i * 5), minutes: 180, opIdx: i, status: 'concluido', photos: i % 3 === 0 ? 2 : 0, problem: i === 2 ? 1 : 0 });
      if (i <= 5) makeService({ start: T(-120 + i * 5), minutes: 210, opIdx: i, status: 'em_execucao', actualStartDelta: intBetween(-5, 12) });
      if (i === 6) makeService({ start: T(20), minutes: 180, opIdx: i, status: 'em_deslocacao', actualStartDelta: 0 });
      if (i === 7) makeService({ start: T(-240), minutes: 195, opIdx: i, status: 'em_execucao', actualStartDelta: 10 }); // ultrapassou
      if (i === 8) makeService({ start: T(-45), minutes: 180, opIdx: i, status: 'agendado' }); // não iniciado
      if (i === 9) makeService({ start: T(-60), minutes: 240, opIdx: i, status: 'em_execucao', actualStartDelta: 5 });
      if (i === 8 || i === 9) makeService({ start: T(-400 + i * 10), minutes: 150, opIdx: i, status: 'concluido' });
      if (i <= 3) makeService({ start: T(150 + i * 10), minutes: 150, opIdx: i, status: 'agendado' });
    }

    // ---- PRÓXIMOS DIAS (~46 serviços), incluindo situações que geram alertas.
    const slotUsed = new Set();
    const dayAt = (offsetDays, h, m) => { const d = new Date(now); d.setDate(d.getDate() + offsetDays); d.setHours(h, m, 0, 0); return d; };
    const tomorrow = dayAt(1, 0, 0);
    const tomorrowIsWeekend = [0, 6].includes(tomorrow.getDay());
    const alertDay = tomorrowIsWeekend ? (tomorrow.getDay() === 6 ? 3 : 2) : 1;
    makeService({ start: dayAt(alertDay, 9, 0), minutes: 180, opIdx: null, status: 'agendado' }); // sem chefe
    makeService({ start: dayAt(alertDay, 14, 0), minutes: 180, opIdx: 4, status: 'agendado', noTeam: true }); // sem equipa
    slotUsed.add(`${alertDay}:4:pm`);
    makeService({ start: dayAt(alertDay, 8, 30), minutes: 240, opIdx: 2, status: 'agendado' }); // carrinha 03
    makeService({ start: dayAt(alertDay, 10, 0), minutes: 180, opIdx: 5, status: 'agendado', van: vans[2].id }); // carrinha 03 em duplicado
    slotUsed.add(`${alertDay}:2:am`); slotUsed.add(`${alertDay}:5:am`);
    let futureTarget = 42;
    for (let guard = 0; futureTarget > 0 && guard < 2000; guard++) {
      const day = intBetween(1, 10);
      const d = dayAt(day, 0, 0);
      if (d.getDay() === 0 || (d.getDay() === 6 && rand() < 0.7)) continue;
      const opIdx = intBetween(0, 9);
      const slot = rand() < 0.55 ? 'am' : 'pm';
      const key = `${day}:${opIdx}:${slot}`;
      if (slotUsed.has(key)) continue;
      slotUsed.add(key);
      const start = slot === 'am' ? dayAt(day, pick([7, 8, 8, 9]), pick([0, 30])) : dayAt(day, pick([13, 14, 14, 15]), pick([0, 30]));
      makeService({ start, minutes: pick([120, 150, 180, 210, 240]), opIdx, status: 'agendado' });
      futureTarget--;
    }

    // ---- HISTÓRICO (restantes até 300), últimos ~100 dias.
    const pastSlots = new Set();
    for (let guard = 0; count < 300 && guard < 10000; guard++) {
      const day = -intBetween(1, 100);
      const d = dayAt(day, 0, 0);
      if (d.getDay() === 0 || (d.getDay() === 6 && rand() < 0.75)) continue;
      const opIdx = intBetween(0, 9);
      const slot = rand() < 0.55 ? 'am' : 'pm';
      const key = `${day}:${opIdx}:${slot}`;
      if (pastSlots.has(key)) continue;
      pastSlots.add(key);
      const start = slot === 'am' ? dayAt(day, pick([7, 8, 8, 9]), pick([0, 30])) : dayAt(day, pick([13, 14, 14, 15]), pick([0, 30]));
      makeService({ start, minutes: pick([120, 150, 180, 180, 210, 240, 300]), opIdx, status: rand() < 0.04 ? 'cancelado' : 'concluido' });
    }

    // ---- FATURAÇÃO: numeração sequencial por data de conclusão.
    const done = db.prepare(`SELECT id, finished_at FROM services WHERE status = 'concluido' ORDER BY finished_at`).all();
    const nums = {};
    const updInv = db.prepare('UPDATE services SET invoice_status = ?, invoice_number = ?, invoiced_at = ?, paid_at = ? WHERE id = ?');
    for (const s of done) {
      const f = new Date(s.finished_at);
      const age = (now - f) / 86400000;
      let status = 'por_faturar';
      if (age > 35) status = rand() < 0.92 ? 'pago' : 'faturado';
      else if (age > 7) status = rand() < 0.2 ? 'pago' : rand() < 0.85 ? 'faturado' : 'por_faturar';
      if (status === 'por_faturar') continue;
      const invAt = addMin(f, intBetween(1, 4) * 1440);
      const y = invAt.getFullYear();
      nums[y] = (nums[y] ?? 0) + 1;
      const number = `FT ${y}/${String(nums[y]).padStart(4, '0')}`;
      const paidAt = status === 'pago' ? new Date(Math.min(addMin(invAt, intBetween(5, 30) * 1440).getTime(), now.getTime() - 3600000)) : null;
      updInv.run(status, number, invAt.toISOString(), paidAt?.toISOString() ?? null, s.id);
      insEv.run(s.id, invAt.toISOString(), directorId, 'faturado', `Faturado — ${number}`);
      if (paidAt) insEv.run(s.id, paidAt.toISOString(), directorId, 'pago', `Pagamento recebido (${number})`);
    }

    // ---- CUSTOS GERAIS (últimos 3 meses + atual).
    const insExp = db.prepare('INSERT INTO expenses (date, category, description, amount, van_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    let expenses = 0;
    for (let mi = 3; mi >= 0; mi--) {
      const m0 = new Date(now.getFullYear(), now.getMonth() - mi, 1);
      const inMonth = (day) => { const d = new Date(m0.getFullYear(), m0.getMonth(), day); return d <= now ? localDate(d) : null; };
      const add = (day, cat, desc, amount, van = null) => {
        const date = inMonth(day);
        if (!date) return;
        insExp.run(date, cat, desc, money(amount), van, directorId, new Date(`${date}T10:00:00`).toISOString());
        expenses++;
      };
      vans.forEach((v, i) => add(1, 'seguros', `Seguro mensal — Carrinha ${String(i + 1).padStart(2, '0')}`, 62 + (i % 3) * 6, v.id));
      for (let k = 0; k < intBetween(3, 6); k++) {
        const vi = intBetween(0, 14);
        add(intBetween(2, 27), 'manutencao', pick(['Revisão periódica', 'Substituição de pneus', 'Mudança de óleo e filtros', 'Reparação de travões', 'Inspeção periódica obrigatória']) + ` — Carrinha ${String(vi + 1).padStart(2, '0')}`, between(80, 480), vans[vi].id);
      }
      add(28, 'portagens', 'Via Verde — portagens da frota', between(140, 280));
      add(10, 'materiais', 'Encomenda de detergentes e consumíveis (stock armazém)', between(320, 780));
      if (rand() < 0.7) add(intBetween(5, 25), 'equipamento', pick(['Aspirador industrial Kärcher', 'Máquina lavadora de pavimentos (peças)', 'Escadote telescópico', 'Kit de limpeza de vidros', 'Monoescova — manutenção']), between(150, 900));
      add(5, 'administrativos', 'Contabilidade — avença mensal', 350);
      add(5, 'administrativos', 'Software de gestão e comunicações', 169);
      add(15, 'administrativos', 'Renda do armazém', 900);
    }

    // ---- PAGAMENTOS A FUNCIONÁRIOS: meses completos anteriores pagos no dia 5 do mês seguinte.
    const insPay = db.prepare('INSERT INTO employee_payments (employee_id, period, hours, amount, paid_at, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
    let payments = 0;
    const allEmpIds = db.prepare('SELECT id FROM employees').all().map((x) => x.id);
    for (let mi = 3; mi >= 1; mi--) {
      const m0 = new Date(now.getFullYear(), now.getMonth() - mi, 1);
      const ym = monthKey(m0);
      const paidAt = new Date(m0.getFullYear(), m0.getMonth() + 1, 5, 11, 0);
      if (paidAt > now) continue;
      for (const id of allEmpIds) {
        const sum = summarizeWork(employeeWork(db, id, ...monthRange(ym)));
        if (!sum.services) continue;
        insPay.run(id, ym, sum.hours, sum.amount, paidAt.toISOString(), 'Transferência bancária', directorId);
        payments++;
      }
    }

    // Os alertas antigos (eventos com mais de 48 h) não aparecem; os de hoje ficam por ler.
    return {
      diretor: 1, operadores: operators.length, funcionarios: employees.length, carrinhas: vans.length, equipas: teams.length,
      clientes: clients.length, servicos: count, custos_gerais: expenses, pagamentos: payments,
    };
  });
}
