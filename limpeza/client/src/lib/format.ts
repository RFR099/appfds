const TZ = 'Europe/Lisbon'
const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const eur0 = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const num1 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 })

export const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : eur.format(n))
export const money0 = (n: number | null | undefined) => (n === null || n === undefined ? '—' : eur0.format(n))
export const pct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${num1.format(n)}%`)
export const hours = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${num1.format(n)} h`)
export const number = (n: number | null | undefined) => (n === null || n === undefined ? '—' : num1.format(n))

export const time = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '—'
export const date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ }) : '—'
export const dateShort = (iso?: string | null) =>
  iso ? cap(new Date(iso).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short', timeZone: TZ })) : '—'
export const dateTime = (iso?: string | null) => (iso ? `${date(iso)} ${time(iso)}` : '—')
export const dateLong = (iso?: string | null) =>
  iso ? cap(new Date(iso).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })) : '—'

export function duration(a?: string | null, b?: string | null) {
  if (!a || !b) return '—'
  const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
  return `${Math.floor(m / 60)}h${String(Math.abs(m % 60)).padStart(2, '0')}`
}

/** Data local 'YYYY-MM-DD' em Lisboa. */
export function localDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
export function localHHMM(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}
export const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d + n))
  return x.toISOString().slice(0, 10)
}
export const firstOfMonth = (ymd = localDate()) => `${ymd.slice(0, 7)}-01`
export const lastOfMonth = (ymd = localDate()) => {
  const [y, m] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`
}
export const monthLong = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return cap(new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' }))
}

export const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  agendado: { label: 'Pendente', cls: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
  em_deslocacao: { label: 'Em deslocação', cls: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  em_execucao: { label: 'Em execução', cls: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  concluido: { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  cancelado: { label: 'Cancelado', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-400' },
}

export const INVOICE: Record<string, { label: string; cls: string }> = {
  por_faturar: { label: 'Por faturar', cls: 'bg-orange-50 text-orange-800 ring-orange-200' },
  faturado: { label: 'Faturado', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  pago: { label: 'Pago', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
}

export const ISSUE_CATEGORIES: Record<string, string> = {
  equipamento: 'Equipamento danificado',
  local: 'Problema no local',
  material: 'Material em falta',
  cliente: 'Problema com cliente',
  outro: 'Outro',
}

export const EXPENSE_LABEL: Record<string, string> = {
  combustivel: 'Combustível',
  manutencao: 'Manutenção',
  seguros: 'Seguros',
  portagens: 'Portagens',
  equipamento: 'Equipamento',
  materiais: 'Materiais (stock)',
  administrativos: 'Administrativos',
  outros: 'Outros',
}

export const marginClass = (m: number | null | undefined) =>
  m === null || m === undefined ? 'text-slate-500' : m >= 35 ? 'text-emerald-700' : m >= 15 ? 'text-amber-700' : 'text-rose-700'
