import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown, Scale, NotebookPen, Landmark, Receipt, BarChart3, Pencil, Users, Phone, Mail, LayoutDashboard, Megaphone, MousePointerClick, ThumbsUp, Search, Share2, UserPlus, Settings } from "lucide-react";
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

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function fmtEUR(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// aceita "123,45" ou "123.45" (teclado/decimal PT costuma usar vírgula)
function parseNum(str) {
  if (str === null || str === undefined) return NaN;
  return Number(String(str).trim().replace(",", "."));
}

const STORAGE_KEY = "controlo-pessoal-data";

function FinancasApp() {
  const [tab, setTab] = useState("calendario");
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [events, setEvents] = useState([]);
  const [incomes, setIncomes] = useState([
    { id: uid(), desc: "Saldo anterior", amount: 800, date: "2026-08-01" },
    { id: uid(), desc: "Frangos e companhia", amount: 200, date: "2026-08-01" },
    { id: uid(), desc: "Site pichelaria", amount: 325, date: "2026-08-01" },
  ]);
  const [expenses, setExpenses] = useState([
    { id: uid(), desc: "Site pichelaria (despesa associada)", amount: 25, date: "2026-08-01" },
  ]);
  const [notes, setNotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [migrations, setMigrations] = useState([]);

  // Migrações automáticas: correm só uma vez, mesmo entre utilizadores diferentes,
  // porque ficam registadas (por id) nos dados partilhados.
  const PENDING_MIGRATIONS = [
    {
      id: "hist-mai-jun-jul-2026",
      applyIncomes: (arr) => [
        ...arr,
        { id: uid(), desc: "Receita de maio", amount: 400, date: "2026-05-01" },
        { id: uid(), desc: "Receita de junho", amount: 200, date: "2026-06-01" },
        { id: uid(), desc: "Receita de julho", amount: 200, date: "2026-07-01" },
      ],
    },
    {
      id: "set-2026-frangos-escondidinho",
      applyIncomes: (arr) => [
        ...arr,
        { id: uid(), desc: "Frangos e companhia", amount: 200, date: "2026-09-01" },
      ],
      applyExpenses: (arr) => [
        ...arr,
        { id: uid(), desc: "Frangos e companhia (despesa associada)", amount: 100, date: "2026-09-01" },
      ],
      applyNotes: (arr) => [
        ...arr,
        {
          id: uid(),
          text: "Escondidinho deve 150€ de cartões (agosto e setembro), mais 250€ de gravações e 50€ de publicidade.",
          date: "2026-09-01",
        },
      ],
    },
    {
      id: "remove-escondidinho-ago-nao-pago",
      applyIncomes: (arr) => arr.filter((i) => !(i.desc === "Escondidinho" && i.date === "2026-08-01")),
    },
    {
      id: "add-cliente-amariaviaja",
      applyClients: (arr) => [
        ...arr,
        {
          id: uid(),
          name: "Amariaviaja",
          contact: "",
          note: "Abril: 400€ ganhos — finalizado",
          contractStart: "2026-04-01",
          contractEnd: "2026-04-30",
        },
      ],
    },
    {
      id: "patch-cliente-amariaviaja-fim-contrato",
      applyClients: (arr) =>
        arr.map((c) =>
          c.name === "Amariaviaja" && !c.contractEnd ? { ...c, contractEnd: "2026-04-30", contractStart: c.contractStart || "2026-04-01" } : c
        ),
    },
    {
      id: "add-clientes-frangos-escondidinho",
      applyClients: (arr) => [
        ...arr,
        { id: uid(), name: "Frangos e Companhia", contact: "", note: "", serviceType: "redes_sociais", status: "mensal", contractValue: 0, contractStart: "", contractEnd: "" },
        { id: uid(), name: "Escondidinho", contact: "", note: "", serviceType: "redes_sociais", status: "mensal", contractValue: 0, contractStart: "", contractEnd: "" },
      ],
    },
    {
      id: "set-2026-horas-frangos-escondidinho",
      applyEvents: (arr, clientsBase) => {
        const frangos = clientsBase.find((c) => c.name === "Frangos e Companhia");
        const escondidinho = clientsBase.find((c) => c.name === "Escondidinho");
        return [
          ...arr,
          { id: uid(), date: "2026-09-05", text: "Trabalho para Frangos e Companhia", hours: 1, clientId: frangos ? frangos.id : null },
          { id: uid(), date: "2026-09-12", text: "Trabalho para Frangos e Companhia", hours: 1, clientId: frangos ? frangos.id : null },
          { id: uid(), date: "2026-09-06", text: "Trabalho para Escondidinho", hours: 1, clientId: escondidinho ? escondidinho.id : null },
          { id: uid(), date: "2026-09-13", text: "Trabalho para Escondidinho", hours: 1, clientId: escondidinho ? escondidinho.id : null },
        ];
      },
    },
    {
      id: "add-escondidinho-pendente-ago",
      applyIncomes: (arr) => [
        ...arr,
        { id: uid(), desc: "Escondidinho", amount: 100, date: "2026-08-01", received: false },
      ],
    },
    {
      id: "link-clientes-antigos-receitas",
      applyIncomes: (arr, clientsBase) => {
        const norm = (s) => (s || "").trim().toLowerCase();
        return arr.map((item) => {
          if (item.clientId) return item;
          const match = (clientsBase || []).find((c) => norm(c.name) === norm(item.desc));
          if (!match) return item;
          return { ...item, clientId: match.id, desc: "Pagamento" };
        });
      },
    },
    {
      id: "link-clientes-antigos-despesas",
      applyExpenses: (arr, clientsBase) => {
        const norm = (s) => (s || "").trim().toLowerCase();
        return arr.map((item) => {
          if (item.clientId) return item;
          const match = (clientsBase || []).find((c) => norm(item.desc).includes(norm(c.name)));
          if (!match) return item;
          return { ...item, clientId: match.id, desc: "Despesa associada" };
        });
      },
    },
  ];

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
        // Apply any migrations not yet run, on top of whatever data we have
        let eventsBase = loadedEvents !== null ? loadedEvents : [];
        let incomesBase = loadedIncomes !== null ? loadedIncomes : [
          { id: uid(), desc: "Saldo anterior", amount: 800, date: "2026-08-01" },
          { id: uid(), desc: "Frangos e companhia", amount: 200, date: "2026-08-01" },
          { id: uid(), desc: "Site pichelaria", amount: 325, date: "2026-08-01" },
        ];
        let expensesBase = loadedExpenses !== null ? loadedExpenses : [
          { id: uid(), desc: "Site pichelaria (despesa associada)", amount: 25, date: "2026-08-01" },
        ];
        let notesBase = loadedNotes !== null ? loadedNotes : [];
        let clientsBase = loadedClients !== null ? loadedClients : [];

        const appliedIds = [...loadedMigrations];
        PENDING_MIGRATIONS.forEach((mig) => {
          if (!appliedIds.includes(mig.id)) {
            if (mig.applyClients) clientsBase = mig.applyClients(clientsBase);
            if (mig.applyEvents) eventsBase = mig.applyEvents(eventsBase, clientsBase);
            if (mig.applyIncomes) incomesBase = mig.applyIncomes(incomesBase, clientsBase);
            if (mig.applyExpenses) expensesBase = mig.applyExpenses(expensesBase, clientsBase);
            if (mig.applyNotes) notesBase = mig.applyNotes(notesBase);
            appliedIds.push(mig.id);
          }
        });
        setEvents(eventsBase);
        setIncomes(incomesBase);
        setExpenses(expensesBase);
        setNotes(notesBase);
        setClients(clientsBase);
        setMigrations(appliedIds);
        setLoaded(true);
      }
    })();
  }, []);

  // Persist whenever data changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        const payload = JSON.stringify({ events, incomes, expenses, notes, clients, migrations });
        const res = await window.storage.set(STORAGE_KEY, payload, true);
        setSaveError(!res);
      } catch (e) {
        setSaveError(true);
      }
    })();
  }, [events, incomes, expenses, notes, clients, migrations, loaded]);

  const totalIncome = useMemo(() => incomes.filter((i) => i.received !== false).reduce((s, i) => s + (Number(i.amount) || 0), 0), [incomes]);
  const totalExpense = useMemo(() => expenses.filter((e) => e.received !== false).reduce((s, e) => s + (Number(e.amount) || 0), 0), [expenses]);
  const balance = totalIncome - totalExpense;

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
            const openNotesCount = notes.filter((n) => !n.closed).length;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
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
                  color: tab === key ? INK : INK_SOFT,
                  fontWeight: tab === key ? 600 : 400,
                  textAlign: "left",
                  position: "relative",
                }}
              >
                {icon} {label}
                {key === "notas" && openNotesCount > 0 && (
                  <span
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
                    {openNotesCount}
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

      {/* Content */}
      {!loaded ? (
        <p style={{ color: INK_SOFT, fontSize: 14 }}>A carregar os teus dados…</p>
      ) : (
        <>
          {tab === "calendario" && <CalendarView events={events} setEvents={setEvents} clients={clients} />}
          {tab === "balanco" && <BalancoView incomes={incomes} expenses={expenses} events={events} clients={clients} />}
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
          {tab === "clientes" && <ClientesView clients={clients} setClients={setClients} />}
        </>
      )}

      {saveError && (
        <p style={{ marginTop: 20, fontSize: 12, color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>
          Não foi possível guardar as alterações. Tenta novamente.
        </p>
      )}

      <p style={{ marginTop: 40, fontSize: 11, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
        os dados deste livro são partilhados — quem tiver este artifact vê e edita o mesmo
      </p>
    </div>
  );
}

const SOCIAL_STORAGE_KEY = "controlo-pessoal-social-data";

const PLATFORM_OPTIONS = [
  { key: "instagram", label: "Instagram", emoji: "📷", color: "#E1306C" },
  { key: "facebook", label: "Facebook", emoji: "👍", color: "#1877F2" },
  { key: "tiktok", label: "TikTok", emoji: "🎵", color: "#25F4EE" },
  { key: "linkedin", label: "LinkedIn", emoji: "💼", color: "#0A66C2" },
];

const CONTENT_TYPES = ["Reel", "Carrossel", "Imagem", "Story", "Vídeo"];

function emptySocialStats() {
  return { seguidores: 0, seguidoresDelta: 0, alcance: 0, alcanceDelta: 0, engagement: 0, engagementDelta: 0, visitas: 0, visitasDelta: 0 };
}

function fmtCompact(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1000) {
    return (v / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 1 }) + " mil";
  }
  return v.toLocaleString("pt-PT");
}

function SocialStatCard({ label, value, delta }) {
  const positive = Number(delta) >= 0;
  return (
    <div style={{ border: `1px solid ${LINE}`, background: CARD, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: INK }}>{value}</div>
      <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: positive ? GREEN : RED, marginTop: 4 }}>
        {positive ? "▲" : "▼"} {Math.abs(Number(delta) || 0)}%
      </div>
    </div>
  );
}

function RedesSociaisApp() {
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [stats, setStats] = useState({
    instagram: { ...emptySocialStats(), seguidores: 465 },
    facebook: emptySocialStats(),
    tiktok: emptySocialStats(),
    linkedin: emptySocialStats(),
  });
  const [posts, setPosts] = useState([
    {
      id: "seed-ig-1",
      platform: "instagram",
      tipo: "Vídeo",
      alcance: 0,
      likes: 29,
      partilhas: 0,
      date: "2026-09-18",
    },
    {
      id: "seed-ig-2",
      platform: "instagram",
      tipo: "Carrossel",
      alcance: 0,
      likes: 13,
      partilhas: 0,
      date: "2026-09-22",
    },
  ]);
  const [editingStats, setEditingStats] = useState(false);
  const [statsForm, setStatsForm] = useState(null);
  const [showAddPost, setShowAddPost] = useState(false);
  const [postForm, setPostForm] = useState({ tipo: CONTENT_TYPES[0], alcance: "", likes: "", partilhas: "", date: todayISO() });

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(SOCIAL_STORAGE_KEY, true);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setStats({
            instagram: { ...emptySocialStats(), ...((parsed.stats && parsed.stats.instagram) || {}) },
            facebook: { ...emptySocialStats(), ...((parsed.stats && parsed.stats.facebook) || {}) },
            tiktok: { ...emptySocialStats(), ...((parsed.stats && parsed.stats.tiktok) || {}) },
            linkedin: { ...emptySocialStats(), ...((parsed.stats && parsed.stats.linkedin) || {}) },
          });
          setPosts(parsed.posts || []);
          setPlatform(parsed.platform || "instagram");
        }
      } catch (e) {
        // ainda sem dados guardados — começa vazio
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        const payload = JSON.stringify({ stats, posts, platform });
        const res = await window.storage.set(SOCIAL_STORAGE_KEY, payload, true);
        setSaveError(!res);
      } catch (e) {
        setSaveError(true);
      }
    })();
  }, [stats, posts, platform, loaded]);

  const currentStats = stats[platform] || emptySocialStats();
  const platformPosts = useMemo(
    () => posts.filter((p) => p.platform === platform).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [posts, platform]
  );
  const activePlatformInfo = PLATFORM_OPTIONS.find((p) => p.key === platform);

  function startEditStats() {
    setStatsForm({
      seguidores: String(currentStats.seguidores),
      seguidoresDelta: String(currentStats.seguidoresDelta),
      alcance: String(currentStats.alcance),
      alcanceDelta: String(currentStats.alcanceDelta),
      engagement: String(currentStats.engagement),
      engagementDelta: String(currentStats.engagementDelta),
      visitas: String(currentStats.visitas),
      visitasDelta: String(currentStats.visitasDelta),
    });
    setEditingStats(true);
  }

  function saveStats() {
    setStats({
      ...stats,
      [platform]: {
        seguidores: parseNum(statsForm.seguidores) || 0,
        seguidoresDelta: parseNum(statsForm.seguidoresDelta) || 0,
        alcance: parseNum(statsForm.alcance) || 0,
        alcanceDelta: parseNum(statsForm.alcanceDelta) || 0,
        engagement: parseNum(statsForm.engagement) || 0,
        engagementDelta: parseNum(statsForm.engagementDelta) || 0,
        visitas: parseNum(statsForm.visitas) || 0,
        visitasDelta: parseNum(statsForm.visitasDelta) || 0,
      },
    });
    setEditingStats(false);
    setStatsForm(null);
  }

  function addPost() {
    setPosts([
      ...posts,
      {
        id: uid(),
        platform,
        tipo: postForm.tipo,
        alcance: parseNum(postForm.alcance) || 0,
        likes: parseNum(postForm.likes) || 0,
        partilhas: parseNum(postForm.partilhas) || 0,
        date: postForm.date,
      },
    ]);
    setPostForm({ tipo: CONTENT_TYPES[0], alcance: "", likes: "", partilhas: "", date: todayISO() });
    setShowAddPost(false);
  }

  function removePost(id) {
    setPosts(posts.filter((p) => p.id !== id));
  }

  const weekDays = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const today = todayISO();
    return DAYS_PT.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const iso = d.toISOString().slice(0, 10);
      const post = platformPosts.find((p) => p.date === iso);
      return {
        label,
        dateLabel: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        iso,
        post,
        isToday: iso === today,
      };
    });
  }, [platformPosts]);

  if (!loaded) {
    return <p style={{ color: INK_SOFT, fontSize: 14 }}>A carregar…</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>Redes Sociais</h2>
          <p style={{ margin: 0, fontSize: 13, color: INK_SOFT }}>Acompanha o crescimento e o desempenho dos teus conteúdos.</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PLATFORM_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 20,
                border: `1px solid ${platform === p.key ? p.color : LINE}`,
                background: platform === p.key ? `${p.color}22` : CARD,
                color: platform === p.key ? INK : INK_SOFT,
                fontSize: 12.5,
                fontFamily: "'Manrope', sans-serif",
                fontWeight: platform === p.key ? 600 : 400,
              }}
            >
              <span>{p.emoji}</span> {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 10 }}>
        <SocialStatCard label="Seguidores" value={fmtCompact(currentStats.seguidores)} delta={currentStats.seguidoresDelta} />
        <SocialStatCard label="Alcance" value={fmtCompact(currentStats.alcance)} delta={currentStats.alcanceDelta} />
        <SocialStatCard label="Engagement" value={`${currentStats.engagement}%`} delta={currentStats.engagementDelta} />
        <SocialStatCard label="Visitas ao perfil" value={fmtCompact(currentStats.visitas)} delta={currentStats.visitasDelta} />
      </div>

      <div style={{ marginBottom: 24 }}>
        {!editingStats ? (
          <button
            onClick={startEditStats}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: INK_SOFT, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 0" }}
          >
            <Pencil size={12} /> editar números
          </button>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", padding: 12, border: `1px solid ${LINE}`, background: CARD, marginTop: 8 }}>
            {[
              ["seguidores", "Seguidores"],
              ["seguidoresDelta", "Δ Seguidores %"],
              ["alcance", "Alcance"],
              ["alcanceDelta", "Δ Alcance %"],
              ["engagement", "Engagement %"],
              ["engagementDelta", "Δ Engagement %"],
              ["visitas", "Visitas ao perfil"],
              ["visitasDelta", "Δ Visitas %"],
            ].map(([field, label]) => (
              <div key={field} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>{label}</label>
                <input
                  value={statsForm[field]}
                  onChange={(e) => setStatsForm({ ...statsForm, [field]: e.target.value })}
                  type="text"
                  inputMode="decimal"
                  style={{ width: 110, padding: "6px 8px", border: `1px solid ${LINE}`, background: PAPER, color: INK, fontSize: 12 }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveStats} style={{ padding: "7px 14px", background: INK, color: PAPER, border: "none", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                guardar
              </button>
              <button
                onClick={() => { setEditingStats(false); setStatsForm(null); }}
                style={{ padding: "7px 14px", background: "none", color: INK_SOFT, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
              >
                cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Conteúdos recentes</h3>
          <button
            onClick={() => setShowAddPost(!showAddPost)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, background: GREEN, color: "#08130D", border: "none", fontSize: 12.5, fontFamily: "'Manrope', sans-serif", fontWeight: 700 }}
          >
            <Plus size={13} /> Criar publicação
          </button>
        </div>

        {showAddPost && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 12, border: `1px solid ${LINE}`, background: CARD, marginBottom: 10 }}>
            <select
              value={postForm.tipo}
              onChange={(e) => setPostForm({ ...postForm, tipo: e.target.value })}
              style={{ padding: "8px 10px", border: `1px solid ${LINE}`, background: PAPER, color: INK, fontSize: 13 }}
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              placeholder="Alcance"
              value={postForm.alcance}
              onChange={(e) => setPostForm({ ...postForm, alcance: e.target.value })}
              type="text"
              inputMode="decimal"
              style={{ width: 100, padding: "8px 10px", border: `1px solid ${LINE}`, background: PAPER, color: INK, fontSize: 13 }}
            />
            <input
              placeholder="Likes"
              value={postForm.likes}
              onChange={(e) => setPostForm({ ...postForm, likes: e.target.value })}
              type="text"
              inputMode="decimal"
              style={{ width: 90, padding: "8px 10px", border: `1px solid ${LINE}`, background: PAPER, color: INK, fontSize: 13 }}
            />
            <input
              placeholder="Partilhas"
              value={postForm.partilhas}
              onChange={(e) => setPostForm({ ...postForm, partilhas: e.target.value })}
              type="text"
              inputMode="decimal"
              style={{ width: 100, padding: "8px 10px", border: `1px solid ${LINE}`, background: PAPER, color: INK, fontSize: 13 }}
            />
            <input
              value={postForm.date}
              onChange={(e) => setPostForm({ ...postForm, date: e.target.value })}
              type="date"
              style={{ padding: "8px 10px", border: `1px solid ${LINE}`, background: PAPER, color: INK, fontSize: 13 }}
            />
            <button onClick={addPost} style={{ padding: "8px 16px", background: INK, color: PAPER, border: "none", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
              guardar
            </button>
          </div>
        )}

        {platformPosts.length === 0 ? (
          <p style={{ color: INK_SOFT, fontSize: 13, padding: "14px 0", borderTop: `1px solid ${LINE}` }}>
            Ainda sem conteúdos registados para {activePlatformInfo ? activePlatformInfo.label : ""}.
          </p>
        ) : (
          <div style={{ border: `1px solid ${LINE}`, background: CARD }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr 90px 90px 90px 40px",
                padding: "8px 12px",
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                color: INK_SOFT,
                borderBottom: `1px solid ${LINE}`,
              }}
            >
              <span>data</span>
              <span>tipo</span>
              <span style={{ textAlign: "right" }}>alcance</span>
              <span style={{ textAlign: "right" }}>likes</span>
              <span style={{ textAlign: "right" }}>partilhas</span>
              <span />
            </div>
            {platformPosts.map((p) => (
              <div
                key={p.id}
                className="row-hover"
                style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 90px 90px 40px", padding: "10px 12px", fontSize: 13, alignItems: "center", borderBottom: `1px solid ${LINE}` }}
              >
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, fontSize: 12 }}>
                  {p.date.slice(8, 10)}/{p.date.slice(5, 7)}/{p.date.slice(0, 4)}
                </span>
                <span>{p.tipo}</span>
                <span style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{fmtCompact(p.alcance)}</span>
                <span style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{fmtCompact(p.likes)}</span>
                <span style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{fmtCompact(p.partilhas)}</span>
                <span style={{ display: "flex", justifyContent: "center" }}>
                  <button onClick={() => removePost(p.id)} style={{ background: "none", border: "none", color: INK_SOFT, display: "flex" }} aria-label="remover">
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>Calendário de conteúdos</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8 }}>
          {weekDays.map((d) => (
            <div key={d.iso} style={{ padding: "10px", border: `1px solid ${d.isToday ? GOLD : LINE}`, background: CARD, textAlign: "center" }}>
              <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
                {d.label} · {d.dateLabel}
              </div>
              {d.post ? (
                <div style={{ marginTop: 6, fontSize: 12, color: INK, fontWeight: 600 }}>{d.post.tipo}</div>
              ) : (
                <div style={{ marginTop: 6, fontSize: 11, color: INK_SOFT }}>sem publicação</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {saveError && (
        <p style={{ marginTop: 20, fontSize: 12, color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>
          Não foi possível guardar as alterações. Tenta novamente.
        </p>
      )}
    </div>
  );
}

const SECTIONS = [
  ["dashboard", "Dashboard", "🏠"],
  ["campanhas", "Campanhas", "📢"],
  ["objetivos", "Objetivos", "🎯"],
  ["seo", "SEO", "🔎"],
  ["meta_ads", "Meta Ads", "📊"],
  ["google_ads", "Google Ads", "🔵"],
  ["redes_sociais_secao", "Redes Sociais", "📱"],
  ["leads", "Leads", "👥"],
  ["financas", "Finanças", "📈"],
  ["definicoes", "Definições", "⚙️"],
];

function ComingSoon({ label }) {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center" }}>
      <p style={{ fontSize: 16, color: INK, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
        ainda por construir — em breve
      </p>
    </div>
  );
}

export default function App() {
  const [section, setSection] = useState("financas");

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

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Menu geral */}
        <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${LINE}`, padding: "28px 14px", display: "flex", flexDirection: "column" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px 4px", letterSpacing: "-0.01em" }}>Innovatweb</h1>
          <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, margin: "0 0 26px 4px" }}>o teu controlo empresarial</span>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SECTIONS.map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  background: section === key ? HILITE : "none",
                  border: "none",
                  borderLeft: section === key ? `2px solid ${GOLD}` : "2px solid transparent",
                  padding: "9px 10px",
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 14,
                  color: section === key ? INK : INK_SOFT,
                  fontWeight: section === key ? 600 : 400,
                  textAlign: "left",
                  borderRadius: "0 3px 3px 0",
                }}
              >
                {icon} {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo da secção */}
        <div style={{ flex: 1, padding: "28px 28px 60px", minWidth: 0 }}>
          <div style={{ maxWidth: 920 }}>
            {section === "financas" ? (
              <FinancasApp />
            ) : section === "redes_sociais_secao" ? (
              <RedesSociaisApp />
            ) : (
              <ComingSoon label={(SECTIONS.find((s) => s[0] === section) || [])[1]} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, color, icon, border, strong }) {
  return (
    <div
      style={{
        flex: 1,
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

function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

function LedgerView({ title, items, setItems, accent, placeholder, trackPaid, trackStatus, statusLabels, clients, showClient }) {
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

  // Mensal: mantém sempre uma ocorrência pendente um mês à frente da mais recente
  // já existente na série (mesmo cliente + descrição). Corre ao adicionar (mesmo que
  // a atual ainda não esteja paga) e sempre que se marca uma ocorrência como recebida
  // — nesse caso avança a folga mais um mês.
  function ensureMonthlyBuffer(list, base) {
    if (!trackPaid) return list;
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
    if (!trackPaid) return list;
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
    next = ensureMonthlyBuffer(next, newItem);
    if (newItem.received !== false) next = maybeSpawnNextAnnual(next, newItem);
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
    if (toggled && toggled.received !== false) {
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
    next = ensureMonthlyBuffer(next, edited);
    if (edited && edited.received !== false) next = maybeSpawnNextAnnual(next, edited);
    setItems(next);
    setEditingId(null);
    setEditForm(null);
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
        {hasStatus && totalPending > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: RED }}>
            {labels.no}: {fmtEUR(totalPending)}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={{ color: INK_SOFT, fontSize: 14, padding: "20px 0", borderTop: `1px solid ${LINE}` }}>
          Sem {title.toLowerCase()} para este período.
        </p>
      ) : (
        <div style={{ border: `1px solid ${LINE}`, background: CARD }}>
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
              {hasStatus && (
                <span style={{ textAlign: "center" }}>
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
                </span>
              )}
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
                <button
                  onClick={() => removeItem(item.id)}
                  style={{ background: "none", border: "none", color: INK_SOFT, display: "flex" }}
                  aria-label="remover"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
            )
          )}
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

function ClientesView({ clients, setClients }) {
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
                    <button onClick={() => removeClient(c.id)} style={{ background: "none", border: "none", color: INK_SOFT }} aria-label="remover">
                      <Trash2 size={14} />
                    </button>
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
                  <button onClick={() => removeNote(n.id)} style={{ background: "none", border: "none", color: INK_SOFT }} aria-label="remover">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTHS_ABBR[Number(m) - 1]} ${y.slice(2)}`;
}

const PIE_COLORS = ["#E2604A", "#D8A73A", "#3FB87F", "#5B8DEF", "#B07CC6", "#4FBDC0"];
const HOURLY_RATE = 15;

function BalancoView({ incomes, expenses, events, clients }) {
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
  const MARGIN_START = "2026-09-01";
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

  const expenseBreakdown = useMemo(() => {
    const map = {};
    paidExpenses.filter((e) => matchesFilter(e.date)).forEach((e) => {
      map[e.desc] = (map[e.desc] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [paidExpenses, filterYear, filterMonth]);

  const clientSummary = useMemo(() => {
    const map = {};
    (clients || []).forEach((c) => {
      map[c.id] = { id: c.id, name: c.name, ganho: 0, gasto: 0 };
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
      .map((row) => ({ ...row, liquido: row.ganho - row.gasto }))
      .sort((a, b) => b.liquido - a.liquido);
  }, [clients, receivedIncomes, paidExpenses, filterYear, filterMonth]);

  const hasData = incomes.length > 0 || expenses.length > 0;

  if (!hasData) {
    return <p style={{ color: INK_SOFT, fontSize: 14 }}>Ainda não há receitas ou despesas para mostrar no balanço.</p>;
  }

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, border: `1px solid ${LINE}`, background: CARD }}>
        <StatCell label="receitas" value={fmtEUR(totalIncome)} color={INK} icon={<TrendingUp size={14} />} />
        <StatCell label="despesas" value={fmtEUR(totalExpense)} color={RED} icon={<TrendingDown size={14} />} border />
        <StatCell label="saldo" value={fmtEUR(balance)} color={balance >= 0 ? GREEN : RED} icon={<Scale size={14} />} border strong />
      </div>

      {/* Profit margin block */}
      <div style={{ border: `1px solid ${LINE}`, background: CARD, padding: 20, marginBottom: 8, display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT, marginBottom: 4 }}>margem de lucro (desde set. 2026)</div>
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
          <MiniStat label="horas (set. em diante)" value={`${totalHours.toFixed(1)} h`} />
          <MiniStat label={`mão de obra (${HOURLY_RATE}€/h)`} value={fmtEUR(laborCost)} color={RED} />
          <MiniStat label="lucro real (set. em diante)" value={fmtEUR(lucro)} color={lucro >= 0 ? GREEN : RED} />
        </div>
      </div>
      <p style={{ marginTop: 0, marginBottom: 24, fontSize: 11, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>
        a margem só conta receitas, despesas e horas a partir de setembro de 2026 — meses anteriores contam só para o saldo e o gráfico
      </p>

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
            despesas por descrição · mesmo período selecionado acima
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
            quanto cada empresa já rendeu e custou · mesmo período selecionado acima · atualiza sozinho
          </p>
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 100px 110px",
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
            </div>
            {clientSummary.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 100px 110px",
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
                <span
                  style={{
                    textAlign: "right",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 700,
                    color: row.liquido >= 0 ? GREEN : RED,
                  }}
                >
                  {fmtEUR(row.liquido)}
                </span>
              </div>
            ))}
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
              .filter((c) => c.serviceType === "redes_sociais" || c.serviceType === "redes_sociais_site")
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
                          .filter((c) => c.serviceType === "redes_sociais" || c.serviceType === "redes_sociais_site")
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
                  <button onClick={() => removeEvent(ev.id)} style={{ background: "none", border: "none", color: INK_SOFT, display: "flex" }} aria-label="remover">
                    <Trash2 size={14} />
                  </button>
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
