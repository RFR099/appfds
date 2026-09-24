import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown, Scale, NotebookPen, Landmark, Receipt, BarChart3, Pencil, Users, Phone, Mail, Download, Upload, Clock, Search, Check, Settings } from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const MONTHS_ABBR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const PAPER = "#050805";
const INK = "#F3F5F1";
const INK_SOFT = "#8B948A";
const GOLD = "#D8A73A";
const RED = "#E2604A";
const LINE = "#1E221C";
const CARD = "#0E100C";
const GREEN = "#3FB87F";
const HILITE = "#171A13";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_PT = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

// data local (não UTC): toISOString daria o dia anterior entre a meia-noite e a 1h em PT
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtEUR(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// aceita "123,45", "123.45", "1.500", "1.500,50", "1 500 €"
function parseNum(str) {
  if (str === null || str === undefined) return NaN;
  let s = String(str).trim().replace(/[\s€]/g, "");
  if (s === "") return NaN;
  if (s.includes(",")) {
    // vírgula é a casa decimal; pontos só podem ser separadores de milhares
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.500" ou "12.000.000": pontos de milhares, não decimais
    s = s.replace(/\./g, "");
  }
  return Number(s);
}

// Guarda um ficheiro no computador de quem usa a app. Dentro do claude.ai
// passa pela capability "downloads" (pede confirmação); fora, link normal.
async function saveFile(filename, data, mime) {
  try {
    const downloads = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
    if (downloads) {
      await downloads.save({ filename, data });
    } else {
      const url = URL.createObjectURL(new Blob([data], { type: mime }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    return { ok: true, text: `Ficheiro guardado: ${filename}` };
  } catch (e) {
    return { ok: false, text: e && e.code === "declined" ? "Cancelado." : "Não foi possível guardar o ficheiro." };
  }
}

// true em ecrãs estreitos (telemóvel): as tabelas passam a cartões
function useIsNarrow(maxWidth = 640) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

// compara sem acentos nem maiúsculas ("Café" encontra "cafe")
function normalizeText(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Apagar pede confirmação no próprio sítio: o primeiro clique mostra
// "apagar? sim / não" por cima da linha, sem mexer no resto da tabela.
function DeleteButton({ onConfirm, question = "apagar?" }) {
  const [asking, setAsking] = useState(false);
  const small = { padding: "2px 8px", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", background: "none" };
  return (
    <span style={{ position: "relative", display: "flex" }}>
      <button onClick={() => setAsking(true)} style={{ background: "none", border: "none", color: asking ? RED : INK_SOFT, display: "flex" }} aria-label="remover">
        <Trash2 size={14} />
      </button>
      {asking && (
        <span
          role="alertdialog"
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 8px",
            background: CARD,
            border: `1px solid ${RED}`,
            whiteSpace: "nowrap",
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            color: INK,
          }}
        >
          {question}
          <button autoFocus onClick={() => { setAsking(false); onConfirm(); }} style={{ ...small, border: `1px solid ${RED}`, color: RED }}>
            sim
          </button>
          <button onClick={() => setAsking(false)} style={{ ...small, border: `1px solid ${LINE}`, color: INK_SOFT }}>
            não
          </button>
        </span>
      )}
    </span>
  );
}

const STORAGE_KEY = "controlo-pessoal-data";

// Definições editáveis no Balanço e guardadas junto com os dados: taxa horária
// da mão de obra, mês a partir do qual conta a margem, % do saldo a pôr de
// parte para impostos e objetivo de faturação mensal.
const DEFAULT_SETTINGS = { hourlyRate: 15, marginStart: "2026-09-01", taxReserve: 25, monthlyGoal: 1000 };

// Dados de partida — só usados quando ainda não há nada guardado. Espelham o
// livro real a 24/09/2026 e já incluem o efeito das correções automáticas
// ("migrações") das versões anteriores, cujos ids ficam em `migrations`.
const SEED_DATA = {
  events: [
    {
      id: "mjxz8g8n",
      date: "2026-09-05",
      text: "Trabalho para Frangos e Companhia",
      hours: 1,
      clientId: "ajxztgv5"
    },
    {
      id: "5u3yxjnh",
      date: "2026-09-12",
      text: "Trabalho para Frangos e Companhia",
      hours: 1,
      clientId: "ajxztgv5"
    },
    {
      id: "i31ign8i",
      date: "2026-09-06",
      text: "Trabalho para Escondidinho",
      hours: 1,
      clientId: "tpassy9p"
    },
    {
      id: "b0lquxvg",
      date: "2026-09-13",
      text: "Trabalho para Escondidinho",
      hours: 1,
      clientId: "tpassy9p"
    }
  ],
  incomes: [
    {
      id: "1ymso1ro",
      desc: "Receita de maio",
      amount: 400,
      date: "2026-05-01",
      received: true,
      clientId: null
    },
    {
      id: "u4x9yltq",
      desc: "Receita de junho",
      amount: 200,
      date: "2026-06-01",
      received: true,
      clientId: null
    },
    {
      id: "zeqsfkbm",
      desc: "Receita de julho",
      amount: 200,
      date: "2026-07-01",
      received: true,
      clientId: null
    },
    {
      id: "3b6i18ci",
      desc: "Pagamento",
      amount: 200,
      date: "2026-08-01",
      received: true,
      clientId: "ajxztgv5"
    },
    {
      id: "g9ct9ymv",
      desc: "Site",
      amount: 325,
      date: "2026-08-01",
      received: true,
      clientId: "pichfboa"
    },
    {
      id: "vrj7vcug",
      desc: "Pagamento",
      amount: 100,
      date: "2026-08-01",
      received: true,
      clientId: "tpassy9p"
    },
    {
      id: "p1izra09",
      desc: "Pagamento",
      amount: 200,
      date: "2026-09-01",
      received: true,
      clientId: "ajxztgv5"
    },
    {
      id: "esmens09",
      desc: "mensalidade",
      amount: 250,
      date: "2026-09-01",
      received: true,
      clientId: "tpassy9p"
    },
    {
      id: "escart15",
      desc: "cartoes visita",
      amount: 150,
      date: "2026-09-15",
      received: true,
      clientId: "tpassy9p"
    },
    {
      id: "espsite18",
      desc: "site",
      amount: 350,
      date: "2026-09-18",
      received: false,
      clientId: "espomec1"
    },
    {
      id: "prelab19",
      desc: "Pagamento",
      amount: 1500,
      date: "2026-09-19",
      received: false,
      clientId: "prelabt1"
    },
    {
      id: "frout01",
      desc: "Pagamento",
      amount: 200,
      date: "2026-10-01",
      received: false,
      clientId: "ajxztgv5",
      recurrence: "mensal"
    },
    {
      id: "esout01",
      desc: "Pagamento",
      amount: 250,
      date: "2026-10-01",
      received: false,
      clientId: "tpassy9p",
      recurrence: "mensal"
    }
  ],
  expenses: [
    {
      id: "8dukld3y",
      desc: "Site (despesa associada)",
      amount: 25,
      date: "2026-08-01",
      received: true,
      clientId: "pichfboa"
    },
    {
      id: "76hl7ri5",
      desc: "Despesa associada",
      amount: 100,
      date: "2026-09-01",
      received: true,
      clientId: "ajxztgv5"
    }
  ],
  notes: [
    {
      id: "wpm9osnb",
      text: "Escondidinho deve 150€ de cartões (setembro), mais 250€ de gravações e 50€ de publicidade.\nTotal:550€",
      date: "2026-09-01",
      closed: true
    },
    {
      id: "esago14n",
      text: "escondidinho deve 100€ mes de agosto",
      date: "2026-09-14",
      closed: true
    }
  ],
  clients: [
    {
      id: "l42lug6o",
      name: "Amariaviaja",
      contact: "",
      note: "Abril: 400€ ganhos — finalizado",
      contractStart: "2026-04-01",
      contractEnd: "2026-04-30"
    },
    {
      id: "ajxztgv5",
      name: "Frangos e Companhia",
      contact: "",
      note: "",
      serviceType: "redes_sociais",
      status: "mensal",
      contractValue: 0,
      contractStart: "",
      contractEnd: ""
    },
    {
      id: "tpassy9p",
      name: "Escondidinho",
      contact: "",
      note: "",
      serviceType: "redes_sociais",
      status: "mensal",
      contractValue: 0,
      contractStart: "",
      contractEnd: ""
    },
    {
      id: "pichfboa",
      name: "pichelaria fonte boa",
      note: "",
      phone: "",
      email: "",
      serviceType: "site",
      status: "compra_unica",
      contractValue: 0,
      contractStart: "",
      contractEnd: ""
    },
    {
      id: "espomec1",
      name: "espomecanica",
      note: "",
      phone: "",
      email: "",
      serviceType: "site",
      status: "compra_unica",
      contractValue: 0,
      contractStart: "",
      contractEnd: ""
    },
    {
      id: "prelabt1",
      name: "prelabt- gestão de produtos quimicos",
      note: "",
      phone: "",
      email: "",
      status: "compra_unica",
      contractValue: 0,
      contractStart: "",
      contractEnd: ""
    }
  ],
  migrations: [
    "hist-mai-jun-jul-2026",
    "set-2026-frangos-escondidinho",
    "remove-escondidinho-ago-nao-pago",
    "add-cliente-amariaviaja",
    "patch-cliente-amariaviaja-fim-contrato",
    "add-clientes-frangos-escondidinho",
    "set-2026-horas-frangos-escondidinho",
    "add-escondidinho-pendente-ago",
    "link-clientes-antigos-receitas",
    "link-clientes-antigos-despesas"
  ]
};

function FinancasApp() {
  const [tab, setTab] = useState("calendario");
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [events, setEvents] = useState(SEED_DATA.events);
  const [incomes, setIncomes] = useState(SEED_DATA.incomes);
  const [expenses, setExpenses] = useState(SEED_DATA.expenses);
  const [notes, setNotes] = useState(SEED_DATA.notes);
  const [clients, setClients] = useState(SEED_DATA.clients);
  const [migrations, setMigrations] = useState(SEED_DATA.migrations);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // último valor igual ao que está guardado (lido ou gravado): evita regravar
  // o que acabou de chegar de outro aparelho
  const lastSynced = useRef(null);
  const [remoteNotice, setRemoteNotice] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    (async () => {
      let loadedEvents = null;
      let loadedIncomes = null;
      let loadedExpenses = null;
      let loadedNotes = null;
      let loadedClients = null;
      let loadedMigrations = [];
      try {
        const result = await window.storage.get(STORAGE_KEY, true);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          lastSynced.current = result.value;
          if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
          loadedEvents = parsed.events || [];
          loadedIncomes = parsed.incomes || [];
          loadedExpenses = parsed.expenses || [];
          loadedNotes = parsed.notes || [];
          loadedClients = parsed.clients || [];
          loadedMigrations = parsed.migrations || [];
        }
      } catch (e) {
        // key doesn't exist yet — fine, start empty
      } finally {
        // Sem nada guardado, começa pelos dados de partida. A lista `migrations`
        // já não é usada por esta versão, mas continua a ser guardada: versões
        // antigas da app (que aplicavam essas correções automáticas) veem-nas
        // como já feitas e não as repetem por cima dos dados.
        const hasSaved = loadedIncomes !== null;
        setEvents(hasSaved ? loadedEvents : SEED_DATA.events);
        setIncomes(hasSaved ? loadedIncomes : SEED_DATA.incomes);
        setExpenses(hasSaved ? loadedExpenses : SEED_DATA.expenses);
        setNotes(hasSaved ? loadedNotes : SEED_DATA.notes);
        setClients(hasSaved ? loadedClients : SEED_DATA.clients);
        setMigrations(hasSaved ? loadedMigrations : SEED_DATA.migrations);
        setLoaded(true);
      }
    })();
  }, []);

  // Alterações feitas noutro separador/aparelho aparecem aqui sem recarregar,
  // para um separador antigo nunca gravar dados velhos por cima dos novos.
  useEffect(() => {
    if (!loaded || !window.storage.subscribe) return;
    let noticeTimer = null;
    const unsubscribe = window.storage.subscribe(STORAGE_KEY, (value) => {
      if (value === lastSynced.current) return;
      let parsed;
      try {
        parsed = JSON.parse(value);
      } catch (e) {
        return;
      }
      lastSynced.current = value;
      setEvents(parsed.events || []);
      setIncomes(parsed.incomes || []);
      setExpenses(parsed.expenses || []);
      setNotes(parsed.notes || []);
      setClients(parsed.clients || []);
      setMigrations(parsed.migrations || []);
      setSettings({ ...DEFAULT_SETTINGS, ...(parsed.settings || {}) });
      setRemoteNotice(true);
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => setRemoteNotice(false), 4000);
    });
    return () => {
      clearTimeout(noticeTimer);
      unsubscribe();
    };
  }, [loaded]);

  // Persist whenever data changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify({ events, incomes, expenses, notes, clients, migrations, settings });
    if (payload === lastSynced.current) return;
    lastSynced.current = payload;
    (async () => {
      try {
        const res = await window.storage.set(STORAGE_KEY, payload, true);
        setSaveError(!res);
      } catch (e) {
        setSaveError(true);
      }
    })();
  }, [events, incomes, expenses, notes, clients, migrations, settings, loaded]);

  const totalIncome = useMemo(() => incomes.filter((i) => i.received !== false).reduce((s, i) => s + (Number(i.amount) || 0), 0), [incomes]);
  const totalExpense = useMemo(() => expenses.filter((e) => e.received !== false).reduce((s, e) => s + (Number(e.amount) || 0), 0), [expenses]);
  const balance = totalIncome - totalExpense;

  // quantos registos (receitas, despesas, horas) cada cliente tem ligados
  const clientUsage = useMemo(() => {
    const map = {};
    [...incomes, ...expenses, ...events].forEach((r) => {
      if (r.clientId) map[r.clientId] = (map[r.clientId] || 0) + 1;
    });
    return map;
  }, [incomes, expenses, events]);

  const [backupMsg, setBackupMsg] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);

  async function exportBackup() {
    const data = JSON.stringify({ app: "innovatweb-financas", exportedAt: new Date().toISOString(), events, incomes, expenses, notes, clients, migrations, settings }, null, 2);
    setBackupMsg(await saveFile(`innovatweb-financas-${todayISO()}.json`, data, "application/json"));
  }

  // receitas pendentes cuja data já passou (número no separador Balanço)
  const overdueCount = incomes.filter((i) => i.received === false && i.date < todayISO()).length;
  const [query, setQuery] = useState("");
  const searching = query.trim().length >= 2;

  function readBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.incomes) || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.clients)) throw new Error("formato");
        setPendingImport({ name: file.name, data: parsed });
        setBackupMsg(null);
      } catch (e) {
        setPendingImport(null);
        setBackupMsg({ ok: false, text: "Este ficheiro não é uma cópia desta app." });
      }
    };
    reader.readAsText(file);
  }

  function applyImport() {
    const d = pendingImport.data;
    setEvents(d.events || []);
    setIncomes(d.incomes || []);
    setExpenses(d.expenses || []);
    setNotes(d.notes || []);
    setClients(d.clients || []);
    setMigrations(d.migrations || SEED_DATA.migrations);
    setSettings({ ...DEFAULT_SETTINGS, ...(d.settings || {}) });
    setBackupMsg({ ok: true, text: `Dados repostos a partir de ${pendingImport.name}.` });
    setPendingImport(null);
  }

  return (
    <div>
      {/* Sub-nav horizontal + saldo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
          paddingBottom: 14,
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[
            ["calendario", "Calendário", <CalendarDays size={14} />],
            ["balanco", "Balanço", <BarChart3 size={14} />],
            ["receitas", "Receitas", <Landmark size={14} />],
            ["despesas", "Despesas", <Receipt size={14} />],
            ["notas", "Notas", <NotebookPen size={14} />],
            ["clientes", "Clientes", <Users size={14} />],
          ].map(([key, label, icon]) => {
            const badge = key === "notas" ? notes.filter((n) => !n.closed).length : key === "balanco" ? overdueCount : 0;
            const badgeTitle = key === "notas" ? `${badge} nota(s) por fechar` : `${badge} pagamento(s) em atraso`;
            return (
              <button
                key={key}
                onClick={() => { setTab(key); setQuery(""); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: tab === key ? HILITE : "none",
                  border: "none",
                  borderBottom: tab === key ? `2px solid ${GOLD}` : "2px solid transparent",
                  padding: "8px 10px",
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 13,
                  color: tab === key && !searching ? INK : INK_SOFT,
                  fontWeight: tab === key && !searching ? 600 : 400,
                  textAlign: "left",
                  position: "relative",
                }}
              >
                {icon} {label}
                {badge > 0 && (
                  <span
                    title={badgeTitle}
                    aria-label={badgeTitle}
                    style={{
                      marginLeft: 2,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      borderRadius: 8,
                      background: RED,
                      color: "#fff",
                      fontSize: 10,
                      fontFamily: "'IBM Plex Mono', monospace",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, marginBottom: 2 }}>saldo</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: balance >= 0 ? GREEN : RED, fontFamily: "'IBM Plex Mono', monospace" }}>
            {fmtEUR(balance)}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={14} color={INK_SOFT} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          id="pesquisa"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Pesquisar clientes, receitas, despesas, notas…"
          aria-label="Pesquisar"
          style={{ width: "100%", padding: "9px 10px 9px 32px", border: `1px solid ${searching ? GOLD : LINE}`, background: CARD, fontSize: 13, color: INK }}
        />
      </div>

      {/* Content */}
      {!loaded ? (
        <p style={{ color: INK_SOFT, fontSize: 14 }}>A carregar os teus dados…</p>
      ) : searching ? (
        <SearchResults
          query={query}
          incomes={incomes}
          expenses={expenses}
          notes={notes}
          events={events}
          clients={clients}
          onOpen={(t) => { setTab(t); setQuery(""); }}
        />
      ) : (
        <>
          {tab === "calendario" && <CalendarView events={events} setEvents={setEvents} clients={clients} />}
          {tab === "balanco" && <BalancoView incomes={incomes} setIncomes={setIncomes} expenses={expenses} events={events} clients={clients} settings={settings} setSettings={setSettings} />}
          {tab === "receitas" && (
            <LedgerView
              title="Receitas"
              items={incomes}
              setItems={setIncomes}
              accent={GREEN}
              placeholder="Ex: Salário, Freelance, Reembolso…"
              trackPaid
              clients={clients}
            />
          )}
          {tab === "despesas" && (
            <LedgerView
              title="Despesas"
              items={expenses}
              setItems={setExpenses}
              accent={RED}
              placeholder="Ex: Renda, Supermercado, Assinatura…"
              trackStatus
              statusLabels={{ yes: "pago", no: "não pago" }}
              showClient
              clients={clients}
            />
          )}
          {tab === "notas" && <NotesView notes={notes} setNotes={setNotes} />}
          {tab === "clientes" && <ClientesView clients={clients} setClients={setClients} usage={clientUsage} />}
        </>
      )}

      {saveError && (
        <p style={{ marginTop: 20, fontSize: 12, color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>
          Não foi possível guardar as alterações. Tenta novamente.
        </p>
      )}

      {remoteNotice && (
        <div
          role="status"
          style={{ position: "fixed", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", zIndex: 20, padding: "8px 14px", background: HILITE, border: `1px solid ${GOLD}`, color: INK, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}
        >
          atualizado com alterações feitas noutro aparelho
        </div>
      )}

      <div style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>cópia de segurança:</span>
          <button
            onClick={exportBackup}
            disabled={!loaded}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "none", border: `1px solid ${LINE}`, color: INK, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <Download size={13} /> exportar
          </button>
          <label
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${LINE}`, color: INK, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}
          >
            <Upload size={13} /> importar
            <input
              id="importar-copia"
              type="file"
              accept=".json,application/json"
              onChange={(e) => { readBackup(e.target.files[0]); e.target.value = ""; }}
              style={{ display: "none" }}
            />
          </label>
        </div>
        {pendingImport && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 12px", border: `1px solid ${GOLD}`, background: HILITE, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
            <span>
              {pendingImport.name}: {pendingImport.data.incomes.length} receitas, {pendingImport.data.expenses.length} despesas, {pendingImport.data.clients.length} clientes.
              Substitui todos os dados atuais.
            </span>
            <button onClick={applyImport} style={{ padding: "5px 12px", background: INK, color: PAPER, border: "none", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
              repor estes dados
            </button>
            <button onClick={() => setPendingImport(null)} style={{ padding: "5px 12px", background: "none", color: INK_SOFT, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
              cancelar
            </button>
          </div>
        )}
        {backupMsg && (
          <p style={{ margin: 0, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: backupMsg.ok ? GREEN : RED }}>{backupMsg.text}</p>
        )}
        <p style={{ margin: 0, fontSize: 11, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
          os dados deste livro são partilhados — quem tiver este artifact vê e edita o mesmo
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ background: PAPER, minHeight: "100%", fontFamily: "'Manrope', sans-serif", color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input, select { font-family: 'IBM Plex Mono', monospace; }
        input::placeholder { color: ${INK_SOFT}; opacity: 0.6; }
        ::selection { background: ${GOLD}55; }
        .row-hover:hover { background: ${HILITE}; }
        button { cursor: pointer; }
      `}</style>

      <div style={{ maxWidth: 976, margin: "0 auto", padding: "28px 28px 60px" }}>
        <header style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Innovatweb</h1>
          <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>o teu controlo empresarial</span>
        </header>
        <FinancasApp />
      </div>
    </div>
  );
}

// Resultados da pesquisa, agrupados; clicar num abre o separador respetivo.
function SearchResults({ query, incomes, expenses, notes, events, clients, onOpen }) {
  const q = normalizeText(query.trim());
  const nameOf = (id) => ((clients || []).find((c) => c.id === id) || {}).name || "";
  const fmtDate = (d) => d.split("-").reverse().join("/");
  const hit = (...fields) => fields.some((f) => normalizeText(f).includes(q));

  const groups = [
    {
      tab: "receitas",
      label: "Receitas",
      rows: incomes
        .filter((i) => hit(i.desc, nameOf(i.clientId), String(i.amount)))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((i) => ({ id: i.id, date: fmtDate(i.date), main: nameOf(i.clientId) || i.desc, sub: nameOf(i.clientId) ? i.desc : "", value: fmtEUR(i.amount), color: GREEN, tag: i.received === false ? "pendente" : "" })),
    },
    {
      tab: "despesas",
      label: "Despesas",
      rows: expenses
        .filter((e) => hit(e.desc, nameOf(e.clientId), String(e.amount)))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((e) => ({ id: e.id, date: fmtDate(e.date), main: nameOf(e.clientId) || e.desc, sub: nameOf(e.clientId) ? e.desc : "", value: fmtEUR(e.amount), color: RED, tag: e.received === false ? "não pago" : "" })),
    },
    {
      tab: "clientes",
      label: "Clientes",
      rows: (clients || [])
        .filter((c) => hit(c.name, c.note, c.email, c.phone))
        .map((c) => ({ id: c.id, date: "", main: c.name, sub: [c.phone, c.email, c.note].filter(Boolean).join(" · "), value: "", color: INK })),
    },
    {
      tab: "notas",
      label: "Notas",
      rows: notes
        .filter((n) => hit(n.text))
        .map((n) => ({ id: n.id, date: fmtDate(n.date), main: n.text, sub: n.closed ? "fechada" : "", value: "", color: INK })),
    },
    {
      tab: "calendario",
      label: "Calendário",
      rows: events
        .filter((e) => hit(e.text, nameOf(e.clientId)))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((e) => ({ id: e.id, date: fmtDate(e.date), main: e.text, sub: nameOf(e.clientId), value: e.hours ? `${e.hours} h` : "", color: GOLD })),
    },
  ].filter((g) => g.rows.length > 0);

  if (groups.length === 0) {
    return <p style={{ color: INK_SOFT, fontSize: 14 }}>Nada encontrado para “{query.trim()}”.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {groups.map((g) => (
        <section key={g.tab}>
          <h3 style={{ margin: "0 0 8px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, color: INK_SOFT }}>
            {g.label} · {g.rows.length}
          </h3>
          <div style={{ border: `1px solid ${LINE}`, background: CARD }}>
            {g.rows.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpen(g.tab)}
                className="row-hover"
                style={{ display: "flex", width: "100%", gap: 12, alignItems: "baseline", justifyContent: "space-between", padding: "10px 12px", background: "none", border: "none", borderBottom: `1px solid ${LINE}`, color: INK, textAlign: "left", fontFamily: "'Manrope', sans-serif" }}
              >
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{r.main}</span>
                  {(r.date || r.sub || r.tag) && (
                    <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
                      {[r.date, r.sub].filter(Boolean).join(" · ")}
                      {r.tag && <span style={{ color: RED }}>{r.date || r.sub ? " · " : ""}{r.tag}</span>}
                    </span>
                  )}
                </span>
                {r.value && <span style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", color: r.color, whiteSpace: "nowrap" }}>{r.value}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StatCell({ label, value, color, icon, border, strong }) {
  return (
    <div
      style={{
        flex: "1 1 150px",
        padding: "14px 16px",
        borderLeft: border ? `1px solid ${LINE}` : "none",
        background: strong ? HILITE : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: INK_SOFT, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", textTransform: "lowercase" }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color, marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
        {value}
      </div>
    </div>
  );
}

const RECURRENCE_OPTIONS = [
  { value: "compra_unica", label: "Compra única" },
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
];

function recurrenceLabel(value) {
  return RECURRENCE_OPTIONS.find((r) => r.value === value)?.label || "";
}

// Soma meses a uma data AAAA-MM-DD. Se o dia não existir no mês de destino
// (31 → fevereiro), fica no último dia desse mês em vez de saltar para o seguinte.
function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

// Mensal: mantém sempre uma ocorrência pendente um mês à frente da mais recente
// já existente na série (mesmo cliente + descrição). Corre ao adicionar (mesmo que
// a atual ainda não esteja paga) e sempre que se marca uma ocorrência como recebida
// — nesse caso avança a folga mais um mês.
function ensureMonthlyBuffer(list, base) {
  if (base.recurrence !== "mensal") return list;
  const series = list.filter(
    (i) => i.desc === base.desc && (i.clientId || null) === (base.clientId || null) && i.recurrence === "mensal"
  );
  const maxDate = series.reduce((max, i) => (i.date > max ? i.date : max), base.date);
  const nextDate = addMonths(maxDate, 1);
  if (series.some((i) => i.date === nextDate)) return list;
  return [
    ...list,
    { id: uid(), desc: base.desc, amount: base.amount, date: nextDate, received: false, clientId: base.clientId || null, recurrence: base.recurrence },
  ];
}

// Anual: quando fica marcada como recebida, gera a ocorrência seguinte já pendente,
// com um mês de adiantamento.
function maybeSpawnNextAnnual(list, base) {
  if (base.recurrence !== "anual") return list;
  const nextDate = addMonths(base.date, 1);
  const already = list.some(
    (i) =>
      i.desc === base.desc &&
      (i.clientId || null) === (base.clientId || null) &&
      i.recurrence === base.recurrence &&
      i.date === nextDate
  );
  if (already) return list;
  return [
    ...list,
    { id: uid(), desc: base.desc, amount: base.amount, date: nextDate, received: false, clientId: base.clientId || null, recurrence: base.recurrence },
  ];
}

// Marca uma receita como recebida e cria a ocorrência seguinte, se for recorrente.
function markReceived(list, id) {
  let next = list.map((i) => (i.id === id ? { ...i, received: true } : i));
  const marked = next.find((i) => i.id === id);
  if (!marked) return list;
  next = ensureMonthlyBuffer(next, marked);
  return maybeSpawnNextAnnual(next, marked);
}

function LedgerView({ title, items, setItems, accent, placeholder, trackPaid, trackStatus, statusLabels, clients, showClient }) {
  const narrow = useIsNarrow();
  const [csvMsg, setCsvMsg] = useState(null);
  const hasStatus = !!(trackPaid || trackStatus);
  const hasClient = !!(trackPaid || showClient);
  const labels = statusLabels || { yes: "recebido", no: "pendente" };

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [received, setReceived] = useState(true);
  const [clientId, setClientId] = useState("");
  const [recurrence, setRecurrence] = useState("compra_unica");
  const [filterMonth, setFilterMonth] = useState("geral");
  const [filterYear, setFilterYear] = useState("geral");
  const [filterClientId, setFilterClientId] = useState("geral");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [formError, setFormError] = useState("");

  const availableYears = useMemo(() => {
    const years = new Set();
    items.forEach((i) => years.add(i.date.slice(0, 4)));
    return Array.from(years).sort();
  }, [items]);

  const filtered = items.filter((i) => {
    if (filterYear !== "geral" && i.date.slice(0, 4) !== filterYear) return false;
    if (filterMonth !== "geral" && i.date.slice(5, 7) !== filterMonth) return false;
    if (filterClientId !== "geral") {
      if (filterClientId === "sem-cliente") {
        if (i.clientId) return false;
      } else if (i.clientId !== filterClientId) return false;
    }
    return true;
  });

  const total = hasStatus
    ? filtered.filter((i) => i.received !== false).reduce((s, i) => s + (Number(i.amount) || 0), 0)
    : filtered.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalPending = hasStatus ? filtered.filter((i) => i.received === false).reduce((s, i) => s + (Number(i.amount) || 0), 0) : 0;
  const sorted = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));

  function clientName(id) {
    if (!id) return "";
    const c = (clients || []).find((c) => c.id === id);
    return c ? c.name : "";
  }

  function addItem() {
    const finalDesc = desc.trim() || (hasClient ? "Pagamento" : "");
    if (!finalDesc) {
      setFormError("Escreve uma descrição.");
      return;
    }
    if (!amount || isNaN(parseNum(amount))) {
      setFormError("Escreve um valor válido (ex: 100 ou 100,50).");
      return;
    }
    setFormError("");
    const newItem = {
      id: uid(),
      desc: finalDesc,
      amount: parseNum(amount),
      date,
      received: hasStatus ? received : true,
      clientId: hasClient ? (clientId || null) : null,
      recurrence: hasStatus ? recurrence : "compra_unica",
    };
    let next = [...items, newItem];
    if (trackPaid) {
      next = ensureMonthlyBuffer(next, newItem);
      if (newItem.received !== false) next = maybeSpawnNextAnnual(next, newItem);
    }
    setItems(next);
    setDesc("");
    setAmount("");
    setReceived(true);
    setClientId("");
    setRecurrence("compra_unica");
  }

  function removeItem(id) {
    setItems(items.filter((i) => i.id !== id));
  }

  function toggleReceived(id) {
    let next = items.map((i) => (i.id === id ? { ...i, received: !i.received } : i));
    const toggled = next.find((i) => i.id === id);
    if (trackPaid && toggled && toggled.received !== false) {
      next = ensureMonthlyBuffer(next, toggled);
      next = maybeSpawnNextAnnual(next, toggled);
    }
    setItems(next);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditForm({
      desc: item.desc,
      amount: String(item.amount),
      date: item.date,
      received: item.received !== false,
      clientId: item.clientId || "",
      recurrence: item.recurrence || "compra_unica",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function saveEdit(id) {
    const finalDesc = editForm.desc.trim() || (hasClient ? "Pagamento" : "");
    if (!finalDesc || !editForm.amount || isNaN(parseNum(editForm.amount))) return;
    let next = items.map((i) =>
      i.id === id
        ? {
            ...i,
            desc: finalDesc,
            amount: parseNum(editForm.amount),
            date: editForm.date,
            received: hasStatus ? editForm.received : true,
            clientId: hasClient ? (editForm.clientId || null) : null,
            recurrence: hasStatus ? editForm.recurrence : "compra_unica",
          }
        : i
    );
    const edited = next.find((i) => i.id === id);
    if (trackPaid) {
      next = ensureMonthlyBuffer(next, edited);
      if (edited && edited.received !== false) next = maybeSpawnNextAnnual(next, edited);
    }
    setItems(next);
    setEditingId(null);
    setEditForm(null);
  }

  // CSV para o contabilista: o que está filtrado, do mais antigo para o mais recente.
  // ";" e vírgula decimal, como o Excel em português espera.
  async function exportCsv() {
    const esc = (v) => {
      const t = String(v ?? "");
      return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const header = ["data", ...(hasClient ? ["cliente"] : []), hasClient ? "pagamento" : "descrição", "valor", ...(hasStatus ? ["estado", "recorrência"] : [])];
    const rows = [...filtered]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((i) => [
        i.date.split("-").reverse().join("/"),
        ...(hasClient ? [clientName(i.clientId)] : []),
        i.desc,
        (Number(i.amount) || 0).toFixed(2).replace(".", ","),
        ...(hasStatus ? [i.received === false ? labels.no : labels.yes, recurrenceLabel(i.recurrence || "compra_unica")] : []),
      ]);
    const csv = "\ufeff" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    const period =
      filterYear !== "geral" ? (filterMonth !== "geral" ? `${filterYear}-${filterMonth}` : filterYear) : filterMonth !== "geral" ? `mes-${filterMonth}` : "tudo";
    setCsvMsg(await saveFile(`innovatweb-${normalizeText(title)}-${period}.csv`, csv, "text/csv"));
  }

  function renderStatus(item) {
    return (
      <button
        onClick={() => toggleReceived(item.id)}
        style={{
          padding: "3px 8px",
          background: "none",
          border: `1px solid ${item.received === false ? RED : GREEN}`,
          color: item.received === false ? RED : GREEN,
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          borderRadius: 2,
        }}
      >
        {item.received === false ? labels.no : labels.yes}
      </button>
    );
  }

  const gridCols = hasClient
    ? "88px 110px 1fr 85px 90px 100px 54px"
    : hasStatus
    ? "100px 1fr 90px 90px 100px 54px"
    : "110px 1fr 100px 54px";

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {hasClient && (
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={{ flex: "1 1 140px", padding: "9px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 13, color: INK }}
          >
            <option value="">sem cliente</option>
            {(clients || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <input
          value={desc}
          onChange={(e) => { setDesc(e.target.value); if (formError) setFormError(""); }}
          placeholder={hasClient ? "Pagamento (ex: mensalidade, sinal…)" : placeholder}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          style={{
            flex: "1 1 200px",
            padding: "9px 10px",
            border: `1px solid ${LINE}`,
            background: CARD,
            fontSize: 13,
            color: INK,
          }}
        />
        <input
          value={amount}
          onChange={(e) => { setAmount(e.target.value); if (formError) setFormError(""); }}
          placeholder="0.00"
          type="text"
          inputMode="decimal"
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          style={{ width: 100, padding: "9px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 13, color: INK }}
        />
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          style={{ width: 150, padding: "9px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 13, color: INK }}
        />
        {hasStatus && (
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            style={{ width: 130, padding: "9px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 13, color: INK }}
          >
            {RECURRENCE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        )}
        {hasStatus && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace", padding: "0 4px" }}>
            <input type="checkbox" checked={received} onChange={(e) => setReceived(e.target.checked)} />
            já {labels.yes}
          </label>
        )}
        <button
          onClick={addItem}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 14px",
            background: INK,
            color: PAPER,
            border: "none",
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <Plus size={14} /> adicionar
        </button>
      </div>

      {formError && (
        <p style={{ margin: "-6px 0 12px", fontSize: 12, color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>
          {formError}
        </p>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>filtrar:</span>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          style={{ padding: "6px 8px", border: `1px solid ${LINE}`, background: PAPER, fontSize: 12, color: INK }}
        >
          <option value="geral">Todos os meses</option>
          {MONTHS_ABBR.map((m, idx) => (
            <option key={m} value={String(idx + 1).padStart(2, "0")}>{m}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          style={{ padding: "6px 8px", border: `1px solid ${LINE}`, background: PAPER, fontSize: 12, color: INK }}
        >
          <option value="geral">Todos os anos</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {hasClient && (
          <select
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            style={{ padding: "6px 8px", border: `1px solid ${LINE}`, background: PAPER, fontSize: 12, color: INK }}
          >
            <option value="geral">Todos os clientes</option>
            <option value="sem-cliente">Sem cliente</option>
            {(clients || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        {(filterMonth !== "geral" || filterYear !== "geral" || filterClientId !== "geral") && (
          <button
            onClick={() => { setFilterMonth("geral"); setFilterYear("geral"); setFilterClientId("geral"); }}
            style={{ padding: "6px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Geral
          </button>
        )}
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          title="Exportar o que está filtrado para Excel (CSV)"
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 12, color: INK, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <Download size={12} /> CSV
        </button>
        {hasStatus && totalPending > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: RED }}>
            {labels.no}: {fmtEUR(totalPending)}
          </span>
        )}
      </div>
      {csvMsg && (
        <p style={{ margin: "-8px 0 14px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: csvMsg.ok ? GREEN : RED }}>{csvMsg.text}</p>
      )}

      {sorted.length === 0 ? (
        <p style={{ color: INK_SOFT, fontSize: 14, padding: "20px 0", borderTop: `1px solid ${LINE}` }}>
          Sem {title.toLowerCase()} para este período.
        </p>
      ) : (
        // no telemóvel a tabela desliza dentro da caixa, sem arrastar a página
        <div style={{ overflowX: "auto", border: `1px solid ${LINE}`, background: CARD }}>
        <div style={{ minWidth: narrow ? 0 : hasClient ? 660 : 560 }}>
          {!narrow && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridCols,
              padding: "8px 12px",
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              color: INK_SOFT,
              borderBottom: `1px solid ${LINE}`,
            }}
          >
            <span>data</span>
            {hasClient && <span>cliente</span>}
            <span>{hasClient ? "pagamento" : "descrição"}</span>
            <span style={{ textAlign: "right" }}>valor</span>
            {hasStatus && <span style={{ textAlign: "center" }}>estado</span>}
            {hasStatus && <span style={{ textAlign: "center" }}>recorrência</span>}
            <span />
          </div>
          )}
          {sorted.map((item) =>
            editingId === item.id ? (
              <div key={item.id} style={{ padding: "12px", borderBottom: `1px solid ${LINE}`, background: HILITE }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  {hasClient && (
                    <select
                      value={editForm.clientId}
                      onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
                      style={{ flex: "1 1 130px", padding: "7px 9px", border: `1px solid ${GOLD}`, background: CARD, fontSize: 13, color: INK }}
                    >
                      <option value="">sem cliente</option>
                      {(clients || []).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  <input
                    value={editForm.desc}
                    onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })}
                    style={{ flex: "1 1 160px", padding: "7px 9px", border: `1px solid ${GOLD}`, background: CARD, fontSize: 13, color: INK }}
                  />
                  <input
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    type="text"
                    inputMode="decimal"
                    style={{ width: 100, padding: "7px 9px", border: `1px solid ${GOLD}`, background: CARD, fontSize: 13, color: INK }}
                  />
                  <input
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    type="date"
                    style={{ width: 150, padding: "7px 9px", border: `1px solid ${GOLD}`, background: CARD, fontSize: 13, color: INK }}
                  />
                  {hasStatus && (
                    <select
                      value={editForm.recurrence}
                      onChange={(e) => setEditForm({ ...editForm, recurrence: e.target.value })}
                      style={{ width: 130, padding: "7px 9px", border: `1px solid ${GOLD}`, background: CARD, fontSize: 13, color: INK }}
                    >
                      {RECURRENCE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  )}
                  {hasStatus && (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
                      <input
                        type="checkbox"
                        checked={editForm.received}
                        onChange={(e) => setEditForm({ ...editForm, received: e.target.checked })}
                      />
                      {labels.yes}
                    </label>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => saveEdit(item.id)} style={{ padding: "6px 14px", background: INK, color: PAPER, border: "none", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                    guardar
                  </button>
                  <button onClick={cancelEdit} style={{ padding: "6px 14px", background: "none", color: INK_SOFT, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                    cancelar
                  </button>
                </div>
              </div>
            ) : narrow ? (
              <div key={item.id} className="row-hover" style={{ padding: "12px", borderBottom: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{(hasClient && clientName(item.clientId)) || item.desc}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: accent, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
                    {fmtEUR(item.amount)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
                    {item.date.split("-").reverse().join("/")}
                    {hasClient && clientName(item.clientId) ? ` · ${item.desc}` : ""}
                    {item.recurrence && item.recurrence !== "compra_unica" ? ` · ${recurrenceLabel(item.recurrence).toLowerCase()}` : ""}
                  </span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {hasStatus && renderStatus(item)}
                    <button onClick={() => startEdit(item)} style={{ background: "none", border: "none", color: INK_SOFT, display: "flex" }} aria-label="editar">
                      <Pencil size={14} />
                    </button>
                    <DeleteButton onConfirm={() => removeItem(item.id)} />
                  </span>
                </div>
              </div>
            ) : (
            <div
              key={item.id}
              className="row-hover"
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                padding: "10px 12px",
                fontSize: 13,
                alignItems: "center",
                borderBottom: `1px solid ${LINE}`,
              }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, fontSize: 12 }}>
                {item.date.slice(8, 10)}/{item.date.slice(5, 7)}/{item.date.slice(0, 4)}
              </span>
              {hasClient && (
                <span style={{ fontSize: 12, color: item.clientId ? INK : INK_SOFT }}>
                  {clientName(item.clientId) || "—"}
                </span>
              )}
              <span>{item.desc}</span>
              <span style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: accent, fontWeight: 600 }}>
                {fmtEUR(item.amount)}
              </span>
              {hasStatus && <span style={{ textAlign: "center" }}>{renderStatus(item)}</span>}
              {hasStatus && (
                <span
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: item.recurrence && item.recurrence !== "compra_unica" ? INK : INK_SOFT,
                  }}
                >
                  {item.recurrence && item.recurrence !== "compra_unica" ? recurrenceLabel(item.recurrence) : "—"}
                </span>
              )}
              <span style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                <button
                  onClick={() => startEdit(item)}
                  style={{ background: "none", border: "none", color: INK_SOFT, display: "flex" }}
                  aria-label="editar"
                >
                  <Pencil size={14} />
                </button>
                <DeleteButton onConfirm={() => removeItem(item.id)} />
              </span>
            </div>
            )
          )}
          {narrow ? (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", fontSize: 13, fontWeight: 700, background: HILITE }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: INK_SOFT, alignSelf: "center" }}>{hasStatus ? `total ${labels.yes}` : "total"}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: accent }}>{fmtEUR(total)}</span>
            </div>
          ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridCols,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 700,
              background: HILITE,
            }}
          >
            <span />
            {hasClient && <span />}
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: INK_SOFT, alignSelf: "center" }}>{hasStatus ? `total ${labels.yes}` : "total"}</span>
            <span style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: accent }}>{fmtEUR(total)}</span>
            {hasStatus && <span />}
            {hasStatus && <span />}
            <span />
          </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

const SERVICE_OPTIONS = [
  { value: "redes_sociais", label: "Gerir redes sociais" },
  { value: "site", label: "Site" },
  { value: "automacao", label: "Automação" },
  { value: "redes_sociais_site", label: "Gerir redes sociais e site" },
];
const STATUS_OPTIONS = [
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
  { value: "compra_unica", label: "Compra única" },
];

function serviceLabel(value) {
  return SERVICE_OPTIONS.find((s) => s.value === value)?.label || value;
}
function statusLabel(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
}

const inputStyle = {
  padding: "9px 10px",
  border: `1px solid ${LINE}`,
  background: PAPER,
  fontSize: 13,
  color: INK,
  width: "100%",
};
const editInputStyle = { ...inputStyle, border: `1px solid ${GOLD}`, background: HILITE };

function emptyClientForm() {
  return {
    name: "",
    note: "",
    phone: "",
    email: "",
    status: "mensal",
    contractValue: "",
    serviceType: "redes_sociais",
    contractStart: "",
    contractEnd: "",
  };
}

function ClientForm({ value, onChange, idPrefix }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div>
        <label style={fieldLabelStyle}>Nome do cliente</label>
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Nome do cliente"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={fieldLabelStyle}>Nota</label>
        <input
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          placeholder="Nota (opcional)"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={fieldLabelStyle}>Telemóvel</label>
        <input
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value.replace(/[^0-9]/g, "") })}
          placeholder="912345678"
          inputMode="numeric"
          type="tel"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={fieldLabelStyle}>Email</label>
        <input
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="cliente@email.com"
          type="email"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={fieldLabelStyle}>Estado</label>
        <select value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })} style={inputStyle}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={fieldLabelStyle}>Valor do contrato</label>
        <input
          value={value.contractValue}
          onChange={(e) => onChange({ ...value, contractValue: e.target.value })}
          placeholder="0.00"
          type="text"
          inputMode="decimal"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={fieldLabelStyle}>Início do contrato</label>
        <input
          value={value.contractStart}
          onChange={(e) => onChange({ ...value, contractStart: e.target.value })}
          type="date"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={fieldLabelStyle}>Fim do contrato</label>
        <input
          value={value.contractEnd}
          onChange={(e) => onChange({ ...value, contractEnd: e.target.value })}
          type="date"
          style={inputStyle}
        />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={fieldLabelStyle}>Tipo de serviço</label>
        <select value={value.serviceType} onChange={(e) => onChange({ ...value, serviceType: e.target.value })} style={inputStyle}>
          {SERVICE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

const fieldLabelStyle = {
  display: "block",
  fontSize: 10,
  fontFamily: "'IBM Plex Mono', monospace",
  color: INK_SOFT,
  marginBottom: 3,
  textTransform: "lowercase",
};

function ClientesView({ clients, setClients, usage }) {
  const [form, setForm] = useState(emptyClientForm());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyClientForm());

  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name, "pt"));

  function addClient() {
    if (!form.name.trim()) return;
    setClients([
      ...clients,
      {
        id: uid(),
        name: form.name.trim(),
        note: form.note.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        status: form.status,
        contractValue: form.contractValue ? parseNum(form.contractValue) : 0,
        serviceType: form.serviceType,
        contractStart: form.contractStart,
        contractEnd: form.contractEnd,
      },
    ]);
    setForm(emptyClientForm());
  }

  function removeClient(id) {
    setClients(clients.filter((c) => c.id !== id));
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditForm({
      name: c.name || "",
      note: c.note || "",
      phone: c.phone || "",
      email: c.email || "",
      status: c.status || "mensal",
      contractValue: c.contractValue ?? "",
      serviceType: c.serviceType || "redes_sociais",
      contractStart: c.contractStart || "",
      contractEnd: c.contractEnd || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit(id) {
    if (!editForm.name.trim()) return;
    setClients(
      clients.map((c) =>
        c.id === id
          ? {
              ...c,
              name: editForm.name.trim(),
              note: editForm.note.trim(),
              phone: editForm.phone.trim(),
              email: editForm.email.trim(),
              status: editForm.status,
              contractValue: editForm.contractValue ? parseNum(editForm.contractValue) : 0,
              serviceType: editForm.serviceType,
              contractStart: editForm.contractStart,
              contractEnd: editForm.contractEnd,
            }
          : c
      )
    );
    setEditingId(null);
  }

  return (
    <div>
      <div style={{ border: `1px solid ${LINE}`, background: CARD, padding: 16, marginBottom: 18 }}>
        <ClientForm value={form} onChange={setForm} />
        <button
          onClick={addClient}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: INK, color: PAPER, border: "none", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", marginTop: 10 }}
        >
          <Plus size={14} /> adicionar cliente
        </button>
      </div>

      {sorted.length === 0 ? (
        <p style={{ color: INK_SOFT, fontSize: 14 }}>Ainda não tens clientes registados.</p>
      ) : (
        <div style={{ border: `1px solid ${LINE}`, background: CARD }}>
          {sorted.map((c) => (
            <div key={c.id} className="row-hover" style={{ padding: "12px 14px", borderBottom: `1px solid ${LINE}` }}>
              {editingId === c.id ? (
                <div>
                  <ClientForm value={editForm} onChange={setEditForm} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => saveEdit(c.id)} style={{ padding: "6px 14px", background: INK, color: PAPER, border: "none", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                      guardar
                    </button>
                    <button onClick={cancelEdit} style={{ padding: "6px 14px", background: "none", color: INK_SOFT, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                      cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                      {c.phone && (
                        <span style={{ fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 5 }}>
                          <Phone size={11} /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span style={{ fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 5 }}>
                          <Mail size={11} /> {c.email}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {c.status && (
                        <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: GOLD, border: `1px solid ${GOLD}`, padding: "2px 7px", borderRadius: 2 }}>
                          {statusLabel(c.status)}
                        </span>
                      )}
                      {c.serviceType && (
                        <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, border: `1px solid ${LINE}`, padding: "2px 7px", borderRadius: 2 }}>
                          {serviceLabel(c.serviceType)}
                        </span>
                      )}
                      {!!c.contractValue && (
                        <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: GREEN, border: `1px solid ${LINE}`, padding: "2px 7px", borderRadius: 2 }}>
                          {fmtEUR(c.contractValue)}
                        </span>
                      )}
                      {(c.contractStart || c.contractEnd) && (
                        <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, border: `1px solid ${LINE}`, padding: "2px 7px", borderRadius: 2 }}>
                          {c.contractStart ? c.contractStart.split("-").reverse().join("/") : "?"} → {c.contractEnd ? c.contractEnd.split("-").reverse().join("/") : "?"}
                        </span>
                      )}
                    </div>
                    {c.note && <div style={{ fontSize: 12, color: INK_SOFT, marginTop: 6 }}>{c.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => startEdit(c)} style={{ background: "none", border: "none", color: INK_SOFT }} aria-label="editar">
                      <Pencil size={14} />
                    </button>
                    <DeleteButton
                      onConfirm={() => removeClient(c.id)}
                      question={usage[c.id] ? `tem ${usage[c.id]} registo${usage[c.id] === 1 ? "" : "s"} ligado${usage[c.id] === 1 ? "" : "s"}, que fica${usage[c.id] === 1 ? "" : "m"} sem cliente. apagar?` : "apagar cliente?"}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesView({ notes, setNotes }) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const sorted = [...notes].sort((a, b) => {
    if (!!a.closed !== !!b.closed) return a.closed ? 1 : -1;
    return a.date < b.date ? 1 : -1;
  });

  function addNote() {
    if (!text.trim()) return;
    setNotes([...notes, { id: uid(), text: text.trim(), date: todayISO(), closed: false }]);
    setText("");
  }

  function removeNote(id) {
    setNotes(notes.filter((n) => n.id !== id));
  }

  function toggleClosed(id) {
    setNotes(notes.map((n) => (n.id === id ? { ...n, closed: !n.closed } : n)));
  }

  function startEdit(note) {
    setEditingId(note.id);
    setEditText(note.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function saveEdit(id) {
    if (!editText.trim()) return;
    setNotes(notes.map((n) => (n.id === id ? { ...n, text: editText.trim() } : n)));
    setEditingId(null);
    setEditText("");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
          }}
          placeholder="Escreve uma nota, lembrete ou ideia…"
          rows={2}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: `1px solid ${LINE}`,
            background: CARD,
            fontSize: 13,
            color: INK,
            fontFamily: "'Manrope', sans-serif",
            resize: "vertical",
          }}
        />
        <button
          onClick={addNote}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 16px",
            background: INK,
            color: PAPER,
            border: "none",
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <Plus size={14} /> adicionar
        </button>
      </div>

      {sorted.length === 0 ? (
        <p style={{ color: INK_SOFT, fontSize: 14 }}>Ainda não escreveste nenhuma nota.</p>
      ) : (
        <div style={{ border: `1px solid ${LINE}`, background: CARD }}>
          {sorted.map((n) => (
            <div
              key={n.id}
              className="row-hover"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px",
                borderBottom: `1px solid ${LINE}`,
                fontSize: 13,
                opacity: n.closed ? 0.55 : 1,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: INK_SOFT }}>
                    {n.date.slice(8, 10)}/{n.date.slice(5, 7)}/{n.date.slice(0, 4)}
                  </span>
                  {n.closed && (
                    <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: GREEN, border: `1px solid ${GREEN}`, padding: "1px 6px", borderRadius: 2 }}>
                      fechada
                    </span>
                  )}
                </div>
                {editingId === n.id ? (
                  <div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit(n.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      rows={2}
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: `1px solid ${GOLD}`,
                        background: HILITE,
                        fontSize: 13,
                        color: INK,
                        fontFamily: "'Manrope', sans-serif",
                        resize: "vertical",
                        marginBottom: 6,
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => saveEdit(n.id)}
                        style={{ padding: "5px 12px", background: INK, color: PAPER, border: "none", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ padding: "5px 12px", background: "none", color: INK_SOFT, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ whiteSpace: "pre-wrap" }}>{n.text}</div>
                )}
              </div>
              {editingId !== n.id && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleClosed(n.id)}
                    style={{
                      padding: "3px 9px",
                      background: "none",
                      color: n.closed ? INK_SOFT : GREEN,
                      border: `1px solid ${n.closed ? LINE : GREEN}`,
                      fontSize: 11,
                      fontFamily: "'IBM Plex Mono', monospace",
                      borderRadius: 2,
                    }}
                  >
                    {n.closed ? "reabrir" : "fechar"}
                  </button>
                  <button onClick={() => startEdit(n)} style={{ background: "none", border: "none", color: INK_SOFT }} aria-label="editar">
                    <Pencil size={14} />
                  </button>
                  <DeleteButton onConfirm={() => removeNote(n.id)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// dias de `from` até `to` (datas AAAA-MM-DD); positivo se `from` já passou
function daysBetween(from, to) {
  const a = Date.UTC(...from.split("-").map((n, i) => Number(n) - (i === 1 ? 1 : 0)));
  const b = Date.UTC(...to.split("-").map((n, i) => Number(n) - (i === 1 ? 1 : 0)));
  return Math.round((b - a) / 86400000);
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTHS_ABBR[Number(m) - 1]} ${y.slice(2)}`;
}

const PIE_COLORS = ["#E2604A", "#D8A73A", "#3FB87F", "#5B8DEF", "#B07CC6", "#4FBDC0"];
function BalancoView({ incomes, setIncomes, expenses, events, clients, settings, setSettings }) {
  const HOURLY_RATE = Number(settings.hourlyRate) || 0;
  const MARGIN_START = settings.marginStart;
  const [marginYear, marginMonth] = MARGIN_START.split("-").map(Number);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState(null);
  const [settingsError, setSettingsError] = useState("");

  function startEditSettings() {
    setSettingsForm({
      hourlyRate: String(settings.hourlyRate).replace(".", ","),
      marginStart: MARGIN_START.slice(0, 7),
      taxReserve: String(settings.taxReserve).replace(".", ","),
      monthlyGoal: String(settings.monthlyGoal).replace(".", ","),
    });
    setSettingsError("");
    setEditingSettings(true);
  }

  function saveSettings() {
    const rate = parseNum(settingsForm.hourlyRate);
    if (isNaN(rate) || rate < 0) {
      setSettingsError("Escreve uma taxa válida (ex: 15 ou 17,50).");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(settingsForm.marginStart)) {
      setSettingsError("Escolhe o mês de início.");
      return;
    }
    const tax = parseNum(settingsForm.taxReserve);
    if (isNaN(tax) || tax < 0 || tax > 100) {
      setSettingsError("A reserva para impostos é uma percentagem entre 0 e 100.");
      return;
    }
    const goal = parseNum(settingsForm.monthlyGoal);
    if (isNaN(goal) || goal < 0) {
      setSettingsError("Escreve um objetivo mensal válido (ex: 1.000).");
      return;
    }
    setSettings({ ...settings, hourlyRate: rate, marginStart: `${settingsForm.marginStart}-01`, taxReserve: tax, monthlyGoal: goal });
    setEditingSettings(false);
  }

  const [filterYear, setFilterYear] = useState("geral");
  const [filterMonth, setFilterMonth] = useState("geral");

  // Receitas pendentes e despesas não pagas não entram em nenhum cálculo de saldo/margem
  // — só contam quando marcadas como recebidas/pagas.
  const receivedIncomes = incomes.filter((i) => i.received !== false);
  const paidExpenses = expenses.filter((e) => e.received !== false);

  const totalIncome = receivedIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalExpense = paidExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  const availableYears = useMemo(() => {
    const years = new Set();
    [...receivedIncomes, ...paidExpenses].forEach((item) => years.add(item.date.slice(0, 4)));
    return Array.from(years).sort();
  }, [receivedIncomes, paidExpenses]);

  function matchesFilter(dateStr) {
    if (filterYear !== "geral" && dateStr.slice(0, 4) !== filterYear) return false;
    if (filterMonth !== "geral" && dateStr.slice(5, 7) !== filterMonth) return false;
    return true;
  }

  // A % de lucro só considera dados a partir deste mês — meses anteriores
  // continuam a contar para o saldo e para o gráfico, mas não para a margem.
  const marginIncomes = receivedIncomes.filter((i) => i.date >= MARGIN_START);
  const marginExpenses = paidExpenses.filter((e) => e.date >= MARGIN_START);
  const marginEvents = events.filter((e) => e.date >= MARGIN_START);

  const marginIncomeTotal = marginIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const marginExpenseTotal = marginExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalHours = useMemo(() => marginEvents.reduce((s, e) => s + (Number(e.hours) || 0), 0), [marginEvents]);
  const laborCost = totalHours * HOURLY_RATE;
  const lucro = marginIncomeTotal - marginExpenseTotal - laborCost;
  const margem = marginIncomeTotal > 0 ? (lucro / marginIncomeTotal) * 100 : 0;
  const hasMarginData = marginIncomes.length > 0 || marginExpenses.length > 0 || marginEvents.length > 0;

  const monthlyData = useMemo(() => {
    const map = {};
    receivedIncomes.filter((i) => matchesFilter(i.date)).forEach((i) => {
      const k = monthKey(i.date);
      map[k] = map[k] || { key: k, receitas: 0, despesas: 0 };
      map[k].receitas += Number(i.amount) || 0;
    });
    paidExpenses.filter((e) => matchesFilter(e.date)).forEach((e) => {
      const k = monthKey(e.date);
      map[k] = map[k] || { key: k, receitas: 0, despesas: 0 };
      map[k].despesas += Number(e.amount) || 0;
    });
    return Object.values(map)
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map((row) => ({ ...row, mes: monthLabel(row.key), saldo: row.receitas - row.despesas }));
  }, [receivedIncomes, paidExpenses, filterYear, filterMonth]);

  // agrupa pelo cliente quando a despesa tem um; senão pela descrição
  const expenseBreakdown = useMemo(() => {
    const map = {};
    paidExpenses.filter((e) => matchesFilter(e.date)).forEach((e) => {
      const client = e.clientId ? (clients || []).find((c) => c.id === e.clientId) : null;
      const name = client ? client.name : e.desc;
      map[name] = (map[name] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [paidExpenses, clients, filterYear, filterMonth]);

  const clientSummary = useMemo(() => {
    const map = {};
    (clients || []).forEach((c) => {
      map[c.id] = { id: c.id, name: c.name, ganho: 0, gasto: 0, horas: 0 };
    });
    events.filter((e) => matchesFilter(e.date)).forEach((e) => {
      if (!e.clientId || !map[e.clientId]) return;
      map[e.clientId].horas += Number(e.hours) || 0;
    });
    receivedIncomes.filter((i) => matchesFilter(i.date)).forEach((i) => {
      if (!i.clientId || !map[i.clientId]) return;
      map[i.clientId].ganho += Number(i.amount) || 0;
    });
    paidExpenses.filter((e) => matchesFilter(e.date)).forEach((e) => {
      if (!e.clientId || !map[e.clientId]) return;
      map[e.clientId].gasto += Number(e.amount) || 0;
    });
    return Object.values(map)
      .map((row) => {
        const liquido = row.ganho - row.gasto;
        return { ...row, liquido, lucro: liquido - row.horas * HOURLY_RATE };
      })
      .sort((a, b) => b.lucro - a.lucro);
  }, [clients, receivedIncomes, paidExpenses, events, filterYear, filterMonth, HOURLY_RATE]);

  // O que está por receber, agrupado por cliente (independente dos filtros:
  // uma dívida antiga continua a ser dívida).
  const today = todayISO();
  const pendingIncomes = incomes.filter((i) => i.received === false);
  const unpaidExpenses = expenses.filter((e) => e.received === false);
  const totalPending = pendingIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalUnpaid = unpaidExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const forecast = balance + totalPending - totalUnpaid;

  const taxPct = Number(settings.taxReserve) || 0;
  const taxAmount = balance > 0 ? (balance * taxPct) / 100 : 0;

  // objetivo do mês corrente, contra o que já foi recebido este mês
  const goal = Number(settings.monthlyGoal) || 0;
  const thisMonth = todayISO().slice(0, 7);
  const lastMonth = addMonths(`${thisMonth}-01`, -1).slice(0, 7);
  const receivedIn = (m) => receivedIncomes.filter((i) => i.date.slice(0, 7) === m).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const thisMonthTotal = receivedIn(thisMonth);
  const lastMonthTotal = receivedIn(lastMonth);
  const pendingThisMonth = pendingIncomes.filter((i) => i.date.slice(0, 7) === thisMonth).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const goalPct = goal > 0 ? Math.min(100, (thisMonthTotal / goal) * 100) : 0;
  const [thisY, thisM] = thisMonth.split("-").map(Number);

  const receivables = useMemo(() => {
    const map = {};
    pendingIncomes.forEach((i) => {
      const key = i.clientId || "sem-cliente";
      if (!map[key]) {
        const c = (clients || []).find((c) => c.id === i.clientId);
        map[key] = { key, name: c ? c.name : "Sem cliente", total: 0, items: [] };
      }
      map[key].total += Number(i.amount) || 0;
      map[key].items.push(i);
    });
    return Object.values(map)
      .map((g) => ({ ...g, items: g.items.sort((a, b) => (a.date < b.date ? -1 : 1)) }))
      .sort((a, b) => b.total - a.total);
  }, [pendingIncomes, clients]);

  const hasData = incomes.length > 0 || expenses.length > 0;

  if (!hasData) {
    return <p style={{ color: INK_SOFT, fontSize: 14 }}>Ainda não há receitas ou despesas para mostrar no balanço.</p>;
  }

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0, marginBottom: 14, border: `1px solid ${LINE}`, background: CARD }}>
        <StatCell label="receitas" value={fmtEUR(totalIncome)} color={INK} icon={<TrendingUp size={14} />} />
        <StatCell label="despesas" value={fmtEUR(totalExpense)} color={RED} icon={<TrendingDown size={14} />} border />
        <StatCell label="saldo" value={fmtEUR(balance)} color={balance >= 0 ? GREEN : RED} icon={<Scale size={14} />} border strong />
        <StatCell label="saldo previsto" value={fmtEUR(forecast)} color={forecast >= 0 ? GOLD : RED} icon={<Clock size={14} />} border />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", margin: "-6px 0 18px", fontSize: 11, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
        {(totalPending > 0 || totalUnpaid > 0) && (
          <span>previsto = saldo + {fmtEUR(totalPending)} por receber{totalUnpaid > 0 ? ` − ${fmtEUR(totalUnpaid)} por pagar` : ""}</span>
        )}
        {taxPct > 0 && balance > 0 && (
          <span>
            pôr de parte para impostos ({String(taxPct).replace(".", ",")}%): <span style={{ color: GOLD }}>{fmtEUR(taxAmount)}</span> · livre para gastar:{" "}
            <span style={{ color: GREEN }}>{fmtEUR(balance - taxAmount)}</span>
          </span>
        )}
      </div>

      {/* Objetivo do mês */}
      {goal > 0 && (
        <div style={{ border: `1px solid ${LINE}`, background: CARD, padding: 20, marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>
              Objetivo de {MONTHS_PT[thisM - 1].toLowerCase()}
            </h3>
            <span style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: thisMonthTotal >= goal ? GREEN : INK }}>{fmtEUR(thisMonthTotal)}</span> de {fmtEUR(goal)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(goalPct)}
            aria-label={`objetivo de ${MONTHS_PT[thisM - 1].toLowerCase()}`}
            style={{ height: 8, background: HILITE, border: `1px solid ${LINE}` }}
          >
            <div style={{ width: `${goalPct}%`, height: "100%", background: thisMonthTotal >= goal ? GREEN : GOLD }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", marginTop: 10, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
            <span>{Math.round((thisMonthTotal / goal) * 100)}% recebido</span>
            <span>{thisMonthTotal >= goal ? "objetivo atingido" : `faltam ${fmtEUR(goal - thisMonthTotal)}`}</span>
            {pendingThisMonth > 0 && <span>{fmtEUR(pendingThisMonth)} deste mês ainda por receber</span>}
            <span>
              mês anterior: {fmtEUR(lastMonthTotal)}
              {lastMonthTotal > 0 && (
                <span style={{ color: thisMonthTotal >= lastMonthTotal ? GREEN : RED }}>
                  {" "}({thisMonthTotal >= lastMonthTotal ? "+" : "−"}{Math.abs(Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100))}%)
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* A receber */}
      {receivables.length > 0 && (
        <div style={{ border: `1px solid ${LINE}`, background: CARD, padding: 20, marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: INK }}>A receber</h3>
              <p style={{ margin: 0, fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
                pagamentos pendentes por cliente · os mensais criam logo o do mês seguinte
              </p>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: GOLD, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtEUR(totalPending)}</span>
          </div>
          {receivables.map((g) => (
            <div key={g.key} style={{ borderTop: `1px solid ${LINE}`, padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 600 }}>
                <span>{g.name}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: GOLD }}>{fmtEUR(g.total)}</span>
              </div>
              {g.items.map((i) => {
                const d = daysBetween(i.date, today);
                const late = d > 0;
                return (
                  <div key={i.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "4px 12px", marginTop: 5, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
                    <span>
                      {i.date.split("-").reverse().join("/")} · {i.desc}
                      {i.recurrence === "mensal" ? " · mensal" : ""}
                    </span>
                    <span style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
                      <span style={{ color: late ? RED : INK_SOFT }}>
                        {d === 0 ? "hoje" : late ? `há ${d} dia${d === 1 ? "" : "s"}` : `daqui a ${-d} dia${d === -1 ? "" : "s"}`}
                      </span>
                      <span style={{ color: INK }}>{fmtEUR(i.amount)}</span>
                      <button
                        onClick={() => setIncomes(markReceived(incomes, i.id))}
                        aria-label={`marcar ${fmtEUR(i.amount)} de ${g.name} como recebido`}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "none", border: `1px solid ${GREEN}`, color: GREEN, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", borderRadius: 2 }}
                      >
                        <Check size={11} /> recebido
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Profit margin block */}
      <div style={{ border: `1px solid ${LINE}`, background: CARD, padding: 20, marginBottom: 8, display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, marginBottom: 4 }}>margem de lucro (desde {MONTHS_ABBR[marginMonth - 1].toLowerCase()}. {marginYear})</div>
          {hasMarginData ? (
            <div style={{ fontSize: 34, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: margem >= 0 ? GREEN : RED }}>
              {margem.toFixed(1)}%
            </div>
          ) : (
            <div style={{ fontSize: 15, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>sem dados ainda</div>
          )}
        </div>
        <div style={{ height: 40, width: 1, background: LINE }} />
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", flex: 1 }}>
          <MiniStat label={`horas (${MONTHS_ABBR[marginMonth - 1].toLowerCase()}. em diante)`} value={`${totalHours.toFixed(1)} h`} />
          <MiniStat label={`mão de obra (${HOURLY_RATE}€/h)`} value={fmtEUR(laborCost)} color={RED} />
          <MiniStat label={`lucro real (${MONTHS_ABBR[marginMonth - 1].toLowerCase()}. em diante)`} value={fmtEUR(lucro)} color={lucro >= 0 ? GREEN : RED} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 11, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
          a margem só conta receitas, despesas e horas a partir de {MONTHS_PT[marginMonth - 1].toLowerCase()} de {marginYear} — meses anteriores contam só para o saldo e o gráfico
        </p>
        {!editingSettings && (
          <button
            onClick={startEditSettings}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: 0, color: GOLD, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <Settings size={11} /> definições (taxa, mês, impostos, objetivo)
          </button>
        )}
      </div>
      {editingSettings && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: 12, border: `1px solid ${GOLD}`, background: HILITE, margin: "-12px 0 24px" }}>
          <div>
            <label htmlFor="taxa-horaria" style={fieldLabelStyle}>taxa horária (€/h)</label>
            <input
              id="taxa-horaria"
              value={settingsForm.hourlyRate}
              onChange={(e) => setSettingsForm({ ...settingsForm, hourlyRate: e.target.value })}
              type="text"
              inputMode="decimal"
              style={{ ...inputStyle, width: 110 }}
            />
          </div>
          <div>
            <label htmlFor="inicio-margem" style={fieldLabelStyle}>margem conta a partir de</label>
            <input
              id="inicio-margem"
              value={settingsForm.marginStart}
              onChange={(e) => setSettingsForm({ ...settingsForm, marginStart: e.target.value })}
              type="month"
              style={{ ...inputStyle, width: 170 }}
            />
          </div>
          <div>
            <label htmlFor="reserva-impostos" style={fieldLabelStyle}>reserva para impostos (%)</label>
            <input
              id="reserva-impostos"
              value={settingsForm.taxReserve}
              onChange={(e) => setSettingsForm({ ...settingsForm, taxReserve: e.target.value })}
              type="text"
              inputMode="decimal"
              style={{ ...inputStyle, width: 110 }}
            />
          </div>
          <div>
            <label htmlFor="objetivo-mensal" style={fieldLabelStyle}>objetivo mensal (€)</label>
            <input
              id="objetivo-mensal"
              value={settingsForm.monthlyGoal}
              onChange={(e) => setSettingsForm({ ...settingsForm, monthlyGoal: e.target.value })}
              type="text"
              inputMode="decimal"
              style={{ ...inputStyle, width: 120 }}
            />
          </div>
          <button onClick={saveSettings} style={{ padding: "9px 14px", background: INK, color: PAPER, border: "none", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
            guardar
          </button>
          <button onClick={() => setEditingSettings(false)} style={{ padding: "9px 14px", background: "none", color: INK_SOFT, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
            cancelar
          </button>
          {settingsError && <p style={{ width: "100%", margin: 0, fontSize: 12, color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>{settingsError}</p>}
        </div>
      )}

      {/* Monthly comparison chart */}
      <div style={{ border: `1px solid ${LINE}`, background: CARD, padding: "20px 20px 8px", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: INK }}>Receitas vs. despesas por mês</h3>
            <p style={{ margin: 0, fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
              evolução mensal e saldo acumulado
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={{ padding: "6px 8px", border: `1px solid ${LINE}`, background: PAPER, fontSize: 12, color: INK }}
            >
              <option value="geral">Todos os meses</option>
              {MONTHS_ABBR.map((m, idx) => (
                <option key={m} value={String(idx + 1).padStart(2, "0")}>{m}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{ padding: "6px 8px", border: `1px solid ${LINE}`, background: PAPER, fontSize: 12, color: INK }}
            >
              <option value="geral">Todos os anos</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {(filterYear !== "geral" || filterMonth !== "geral") && (
              <button
                onClick={() => { setFilterYear("geral"); setFilterMonth("geral"); }}
                style={{ padding: "6px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Geral
              </button>
            )}
          </div>
        </div>
        {monthlyData.length === 0 ? (
          <p style={{ color: INK_SOFT, fontSize: 13, padding: "20px 0" }}>Sem dados para este período.</p>
        ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={monthlyData} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono", fill: INK_SOFT }} axisLine={{ stroke: LINE }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fontFamily: "IBM Plex Mono", fill: INK_SOFT }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `€${v}`}
            />
            <Tooltip
              formatter={(value, name) => [fmtEUR(value), name]}
              contentStyle={{ background: CARD, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
              labelStyle={{ color: INK, fontFamily: "'Manrope', sans-serif" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", paddingTop: 8 }} />
            <Bar dataKey="receitas" name="Receitas" fill={GREEN} radius={[2, 2, 0, 0]} barSize={22} />
            <Bar dataKey="despesas" name="Despesas" fill={RED} radius={[2, 2, 0, 0]} barSize={22} />
            <Line type="monotone" dataKey="saldo" name="Saldo" stroke={GOLD} strokeWidth={2} dot={{ r: 3, fill: GOLD }} />
          </ComposedChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* Expense breakdown pie */}
      {expenseBreakdown.length > 0 && (
        <div style={{ border: `1px solid ${LINE}`, background: CARD, padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: INK }}>Onde vai o dinheiro</h3>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
            despesas por cliente (ou descrição, se não tiver cliente) · mesmo período selecionado acima
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={expenseBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2} stroke={CARD} strokeWidth={2}>
                  {expenseBreakdown.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => fmtEUR(value)}
                  contentStyle={{ background: CARD, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, minWidth: 180 }}>
              {expenseBreakdown.map((item, idx) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${LINE}`, fontSize: 13 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[idx % PIE_COLORS.length], display: "inline-block" }} />
                    {item.name}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>{fmtEUR(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resumo por cliente/empresa */}
      {clientSummary.length > 0 && (
        <div style={{ border: `1px solid ${LINE}`, background: CARD, padding: 20, marginTop: 28 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: INK }}>Resumo por cliente</h3>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
            quanto cada empresa já rendeu e custou, incluindo as tuas horas a {HOURLY_RATE}€/h · mesmo período selecionado acima
          </p>
          <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 560 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 90px 90px 90px 60px 100px",
                padding: "8px 4px",
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                color: INK_SOFT,
                borderBottom: `1px solid ${LINE}`,
              }}
            >
              <span>cliente</span>
              <span style={{ textAlign: "right" }}>ganhou</span>
              <span style={{ textAlign: "right" }}>gastou</span>
              <span style={{ textAlign: "right" }}>líquido</span>
              <span style={{ textAlign: "right" }}>horas</span>
              <span style={{ textAlign: "right" }}>lucro real</span>
            </div>
            {clientSummary.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 90px 90px 60px 100px",
                  padding: "10px 4px",
                  fontSize: 13,
                  alignItems: "center",
                  borderBottom: `1px solid ${LINE}`,
                }}
              >
                <span style={{ fontWeight: 600 }}>{row.name}</span>
                <span style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: GREEN }}>
                  {fmtEUR(row.ganho)}
                </span>
                <span style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: RED }}>
                  {fmtEUR(row.gasto)}
                </span>
                <span style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: row.liquido >= 0 ? INK : RED }}>
                  {fmtEUR(row.liquido)}
                </span>
                <span style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
                  {row.horas ? `${row.horas} h` : "—"}
                </span>
                <span
                  style={{
                    textAlign: "right",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 700,
                    color: row.lucro >= 0 ? GREEN : RED,
                  }}
                >
                  {fmtEUR(row.lucro)}
                </span>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: color || INK }}>{value}</div>
    </div>
  );
}

function CalendarView({ events, setEvents, clients }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [newEvent, setNewEvent] = useState("");
  const [newHours, setNewHours] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const { year, month } = cursor;
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function isoFor(day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCursor({ year: y, month: m });
  }

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      map[ev.date] = map[ev.date] || [];
      map[ev.date].push(ev);
    });
    return map;
  }, [events]);

  function addEvent() {
    if (!newEvent.trim()) return;
    setEvents([
      ...events,
      { id: uid(), date: selectedDate, text: newEvent.trim(), hours: newHours ? Number(newHours) : 0, clientId: newClientId || null },
    ]);
    setNewEvent("");
    setNewHours("");
    setNewClientId("");
  }

  function removeEvent(id) {
    setEvents(events.filter((e) => e.id !== id));
  }

  function startEdit(ev) {
    setEditingId(ev.id);
    setEditForm({ text: ev.text, hours: ev.hours ? String(ev.hours) : "", clientId: ev.clientId || "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function saveEdit(id) {
    if (!editForm.text.trim()) return;
    setEvents(
      events.map((e) =>
        e.id === id
          ? { ...e, text: editForm.text.trim(), hours: editForm.hours ? Number(editForm.hours) : 0, clientId: editForm.clientId || null }
          : e
      )
    );
    setEditingId(null);
    setEditForm(null);
  }

  const selectedEvents = eventsByDate[selectedDate] || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => changeMonth(-1)} style={{ background: "none", border: `1px solid ${LINE}`, padding: 6 }}>
          <ChevronLeft size={16} color={INK} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          {MONTHS_PT[month]} {year}
        </span>
        <button onClick={() => changeMonth(1)} style={{ background: "none", border: `1px solid ${LINE}`, padding: 6 }}>
          <ChevronRight size={16} color={INK} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: LINE, border: `1px solid ${LINE}` }}>
        {DAYS_PT.map((d) => (
          <div key={d} style={{ background: PAPER, textAlign: "center", fontSize: 11, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace", padding: "6px 0" }}>
            {d}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} style={{ background: PAPER, minHeight: 56 }} />;
          const iso = isoFor(day);
          const has = eventsByDate[iso];
          const isSelected = iso === selectedDate;
          const isToday = iso === todayISO();
          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(iso)}
              style={{
                background: isSelected ? HILITE : CARD,
                border: isSelected ? `1px solid ${GOLD}` : "1px solid transparent",
                minHeight: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "6px 6px",
                position: "relative",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: isToday ? GOLD : INK,
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {day}
              </span>
              {has && (
                <span
                  style={{
                    marginTop: "auto",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: GOLD,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <CalendarDays size={14} color={INK_SOFT} />
          <span style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
            {selectedDate.slice(8, 10)}/{selectedDate.slice(5, 7)}/{selectedDate.slice(0, 4)}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input
            value={newEvent}
            onChange={(e) => setNewEvent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEvent()}
            placeholder="Adicionar nota ou compromisso…"
            style={{ flex: "1 1 160px", padding: "9px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 13, color: INK }}
          />
          <select
            value={newClientId}
            onChange={(e) => setNewClientId(e.target.value)}
            style={{ flex: "1 1 140px", padding: "9px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 13, color: INK }}
          >
            <option value="">sem cliente</option>
            {(clients || [])
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
          <input
            value={newHours}
            onChange={(e) => setNewHours(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEvent()}
            type="number"
            step="0.5"
            min="0"
            placeholder="horas"
            style={{ width: 80, padding: "9px 10px", border: `1px solid ${LINE}`, background: CARD, fontSize: 13, color: INK }}
          />
          <button
            onClick={addEvent}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: INK, color: PAPER, border: "none", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <Plus size={14} /> adicionar
          </button>
        </div>

        {selectedEvents.length === 0 ? (
          <p style={{ color: INK_SOFT, fontSize: 13 }}>Sem notas para este dia.</p>
        ) : (
          <div style={{ border: `1px solid ${LINE}`, background: CARD }}>
            {selectedEvents.map((ev) => {
              const client = ev.clientId ? (clients || []).find((c) => c.id === ev.clientId) : null;

              if (editingId === ev.id) {
                return (
                  <div key={ev.id} style={{ padding: "10px 12px", borderBottom: `1px solid ${LINE}`, background: HILITE }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <input
                        value={editForm.text}
                        onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                        style={{ flex: "1 1 160px", padding: "7px 9px", border: `1px solid ${GOLD}`, background: CARD, fontSize: 13, color: INK }}
                      />
                      <select
                        value={editForm.clientId}
                        onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
                        style={{ flex: "1 1 130px", padding: "7px 9px", border: `1px solid ${GOLD}`, background: CARD, fontSize: 13, color: INK }}
                      >
                        <option value="">sem cliente</option>
                        {(clients || [])
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                      <input
                        value={editForm.hours}
                        onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="horas"
                        style={{ width: 80, padding: "7px 9px", border: `1px solid ${GOLD}`, background: CARD, fontSize: 13, color: INK }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveEdit(ev.id)} style={{ padding: "6px 14px", background: INK, color: PAPER, border: "none", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                        guardar
                      </button>
                      <button onClick={cancelEdit} style={{ padding: "6px 14px", background: "none", color: INK_SOFT, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                        cancelar
                      </button>
                    </div>
                  </div>
                );
              }

              return (
              <div
                key={ev.id}
                className="row-hover"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderBottom: `1px solid ${LINE}`, fontSize: 13 }}
              >
                <span>
                  {ev.text}
                  {client && (
                    <span style={{ marginLeft: 8, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, border: `1px solid ${LINE}`, padding: "1px 6px", borderRadius: 2 }}>
                      {client.name}
                    </span>
                  )}
                  {ev.hours > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: GOLD }}>
                      · {ev.hours}h
                    </span>
                  )}
                </span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(ev)} style={{ background: "none", border: "none", color: INK_SOFT, display: "flex" }} aria-label="editar">
                    <Pencil size={14} />
                  </button>
                  <DeleteButton onConfirm={() => removeEvent(ev.id)} />
                </span>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// usadas pelos testes (App.test.jsx)
export { parseNum, todayISO, addMonths, daysBetween, markReceived, normalizeText };
