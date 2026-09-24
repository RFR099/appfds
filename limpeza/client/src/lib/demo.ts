/*
 * Modo de demonstração (build com VITE_DEMO=1): o frontend corre sem servidor, a partir de um retrato
 * das respostas da API (demo/snapshot.json, gerado por server/scripts/record-demo.js).
 * As horas são deslocadas para o momento atual, para que os serviços "em execução" o continuem a estar.
 * As ações do operador (iniciar/terminar) são simuladas em memória; as do diretor não são guardadas.
 */
import raw from 'virtual:demo-snapshot'
import type { OpService, OpServiceRow, ServiceRow, User } from './types'

interface Snapshot {
  recordedAt: string
  users: Record<string, User>
  responses: Record<string, unknown>
  files: Record<string, string>
  photos: Record<string, string>
}

const PASSWORDS: Record<string, string> = { diretor: 'diretor123', 'carlos.silva': 'operador123' }
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const QUARTER = 15 * 60000
const shift = Math.round((Date.now() - new Date((raw as Snapshot).recordedAt).getTime()) / QUARTER) * QUARTER

// Cópia profunda com as datas/horas ISO deslocadas.
const snap: Snapshot = JSON.parse(JSON.stringify(raw), (_k, v) =>
  typeof v === 'string' && ISO.test(v) ? new Date(new Date(v).getTime() + shift).toISOString() : v,
)
const R = snap.responses
const extraPhotos: Record<string, string> = {}
let nextPhoto = 100000

export class DemoError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let user: User | null = null
try {
  const u = sessionStorage.getItem('demo-user')
  if (u) user = snap.users[u] ?? null
} catch {
  /* sem armazenamento: começa sem sessão */
}

export function demoPhotoUrl(id: number) {
  return extraPhotos[id] ?? snap.files[snap.photos[id]] ?? ''
}

const clone = <T,>(x: T): T => structuredClone(x)
const NOT_SAVED = 'Modo de demonstração: esta alteração não é guardada. Experimente o fluxo do operador (iniciar e terminar serviço).'

export async function demoRequest<T>(method: string, url: string, body?: unknown): Promise<T> {
  await new Promise((r) => setTimeout(r, 120))
  const [path, query = ''] = url.split('?')
  const params = new URLSearchParams(query)

  if (path === '/auth/login') {
    const { username, password } = body as { username: string; password: string }
    const key = username.toLowerCase()
    if (!snap.users[key] || PASSWORDS[key] !== password) {
      throw new DemoError(401, 'Na demonstração use diretor / diretor123 ou carlos.silva / operador123.')
    }
    user = snap.users[key]
    try { sessionStorage.setItem('demo-user', key) } catch { /* ignorar */ }
    return clone(user) as T
  }
  if (path === '/auth/logout') {
    user = null
    try { sessionStorage.removeItem('demo-user') } catch { /* ignorar */ }
    return { ok: true } as T
  }
  if (!user) throw new DemoError(401, 'Sessão não iniciada.')
  if (path === '/auth/me') return clone(user) as T
  if (path === '/auth/password') throw new DemoError(400, NOT_SAVED)

  // A mesma separação de acessos do servidor real.
  if (path.startsWith('/admin') && user.role !== 'director') throw new DemoError(403, 'Sem permissão para aceder a este recurso.')
  if (path.startsWith('/op') && user.role !== 'operator') throw new DemoError(403, 'Sem permissão para aceder a este recurso.')

  if (method === 'GET') {
    if (path === '/admin/services') return listServices(params) as T
    const hit = R[url] ?? R[path] ?? fallback(path)
    if (hit === undefined) throw new DemoError(404, 'Não disponível na demonstração.')
    return clone(hit) as T
  }

  if (path === '/admin/services/check') return { warnings: [] } as T
  if (path.startsWith('/op/services/')) return opAction(path, body) as T
  throw new DemoError(400, NOT_SAVED)
}

/** URLs com parâmetros não gravados usam a versão por omissão (ex.: outro período → período por omissão). */
function fallback(path: string) {
  if (path === '/admin/operation') return R[Object.keys(R).find((k) => k.startsWith('/admin/operation?'))!]
  return undefined
}

/** Filtros da lista de serviços, aplicados sobre a lista completa gravada. */
function listServices(p: URLSearchParams) {
  let rows = (R['/admin/services?page_size=500'] as { rows: ServiceRow[] }).rows
  const dayStart = (d: string) => new Date(`${d}T00:00:00`).getTime()
  if (p.get('from')) rows = rows.filter((s) => new Date(s.scheduled_start).getTime() >= dayStart(p.get('from')!))
  if (p.get('to')) rows = rows.filter((s) => new Date(s.scheduled_start).getTime() < dayStart(p.get('to')!) + 86400000)
  if (p.get('status')) rows = rows.filter((s) => s.status === p.get('status'))
  if (p.get('invoice_status')) rows = rows.filter((s) => s.status === 'concluido' && s.invoice_status === p.get('invoice_status'))
  for (const k of ['client_id', 'van_id', 'operator_id'] as const) {
    if (p.get(k)) rows = rows.filter((s) => String(s[k]) === p.get(k))
  }
  if (p.get('problems') === '1') rows = rows.filter((s) => s.had_problems)
  const q = p.get('q')?.toLowerCase().replace('#', '')
  if (q) rows = rows.filter((s) => `${s.client_name} ${s.title} ${s.city}`.toLowerCase().includes(q) || String(s.id) === q)
  rows = [...rows].sort((a, b) => (p.get('sort') === 'asc' ? 1 : -1) * a.scheduled_start.localeCompare(b.scheduled_start))
  const size = Number(p.get('page_size')) || 50
  const page = Number(p.get('page')) || 1
  const sum = (f: (s: ServiceRow) => number) => Math.round(rows.reduce((a, s) => a + f(s), 0) * 100) / 100
  return {
    rows: clone(rows.slice((page - 1) * size, page * size)), total: rows.length, page, page_size: size,
    totals: { value: sum((s) => s.value), cost: sum((s) => s.total_cost), profit: sum((s) => s.profit) },
  }
}

/* ---------------- Operador: ações simuladas em memória ---------------- */
const hhmm = (d: Date) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })

function opAction(path: string, body: unknown) {
  const m = path.match(/^\/op\/services\/(\d+)\/(travel|start|finish|photos|team)(?:\/(\d+))?$/)
  const svc = m && (R[`/op/services/${m[1]}`] as OpService | undefined)
  if (!m || !svc) throw new DemoError(404, 'Serviço não encontrado.')
  const action = m[2]
  const now = new Date()
  const iso = now.toISOString()
  const ev = (type: string, message: string, at = iso) => svc.events.push({ at, type, message })
  const name = user!.name
  const others = () => Object.entries(R).some(([k, v]) => k.startsWith('/op/services/') && k !== `/op/services/${svc.id}`
    && ['em_execucao', 'em_deslocacao'].includes((v as OpService).status))

  if (action === 'travel') {
    if (svc.status !== 'agendado') throw new DemoError(409, 'O serviço já não está agendado.')
    if (others()) throw new DemoError(409, 'Termine primeiro o serviço que está em curso.')
    Object.assign(svc, { status: 'em_deslocacao', travel_started_at: iso })
    ev('deslocacao', `${name} iniciou deslocação`)
  } else if (action === 'start') {
    if (!['agendado', 'em_deslocacao'].includes(svc.status)) throw new DemoError(409, 'O serviço já foi iniciado.')
    if (others()) throw new DemoError(409, 'Termine primeiro o serviço que está em curso.')
    Object.assign(svc, { status: 'em_execucao', started_at: iso })
    ev('iniciado', `${name} iniciou serviço`)
    sync(svc)
    return { message: `Serviço iniciado às ${hhmm(now)}`, service: clone(svc) }
  } else if (action === 'finish') {
    if (svc.status !== 'em_execucao') throw new DemoError(409, 'Só é possível terminar um serviço em execução.')
    const fd = body as FormData
    const data = JSON.parse(String(fd.get('data')))
    let end = now
    if (data.end_time) {
      const [h, mi] = String(data.end_time).split(':').map(Number)
      end = new Date(now)
      end.setHours(h, mi, 0, 0)
      if (end > new Date(now.getTime() + 5 * 60000)) throw new DemoError(400, 'A hora de conclusão não pode ser no futuro.')
    }
    const issues = (data.issues ?? []) as { category: string; description: string }[]
    Object.assign(svc, {
      status: 'concluido', finished_at: end.toISOString(), completed_ok: data.completed_ok ? 1 : 0,
      had_problems: data.had_problems || issues.length ? 1 : 0, observations: data.observations || null,
    })
    svc.team.forEach((t) => { t.present = (data.present_employee_ids as number[]).includes(t.id) ? 1 : 0 })
    const mins = Math.round((end.getTime() - new Date(svc.started_at!).getTime()) / 60000)
    ev('terminado', `${name} terminou serviço (duração ${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')})`, end.toISOString())
    issues.forEach((i, k) => {
      svc.issues.push({ id: 90000 + k, category: i.category, description: i.description || null, created_at: iso })
      ev('problema', i.description || i.category)
    })
    addPhotos(svc, fd)
    ev('concluido', data.completed_ok ? 'Serviço marcado como concluído' : 'Serviço terminado — NÃO concluído na totalidade')
  } else if (action === 'photos') {
    addPhotos(svc, body as FormData)
  } else {
    throw new DemoError(400, NOT_SAVED)
  }
  sync(svc)
  return clone(svc)
}

function addPhotos(svc: OpService, fd: FormData) {
  const files = fd.getAll('photos').filter((f): f is File => f instanceof File)
  if (!files.length) return
  for (const f of files) {
    const id = nextPhoto++
    extraPhotos[id] = URL.createObjectURL(f)
    svc.photos.push({ id, created_at: new Date().toISOString() })
  }
  svc.events.push({ at: new Date().toISOString(), type: 'fotografias', message: `${files.length} fotografia(s) adicionada(s)` })
}

/** Mantém as listas do operador ("Hoje", "Serviços", "Histórico") coerentes com o serviço alterado. */
function sync(svc: OpService) {
  const toRow = (r: OpServiceRow) => Object.assign(r, { status: svc.status, started_at: svc.started_at, finished_at: svc.finished_at, had_problems: svc.had_problems })
  const today = R['/op/today'] as { current: OpService | null; next: OpServiceRow | null; completed: OpServiceRow[]; pending: OpServiceRow[] }
  const all = [...today.completed, ...today.pending, ...(today.next ? [today.next] : [])]
  const row = all.find((r) => r.id === svc.id)
  if (row) {
    toRow(row)
    today.pending = today.pending.filter((r) => r.status === 'agendado')
    if (svc.status === 'concluido' && !today.completed.some((r) => r.id === svc.id)) today.completed.push(row)
  }
  if (svc.status === 'concluido') {
    today.current = today.pending[0] ? (R[`/op/services/${today.pending[0].id}`] as OpService) : null
    today.next = today.pending.find((r) => r.id !== today.current?.id) ?? null
  } else {
    today.current = svc
    today.next = today.pending.find((r) => r.id !== svc.id) ?? null
  }
  const up = R['/op/services?scope=upcoming'] as OpServiceRow[]
  const hist = R['/op/services?scope=history'] as OpServiceRow[]
  const u = up.find((r) => r.id === svc.id)
  if (u) toRow(u)
  if (svc.status === 'concluido') {
    R['/op/services?scope=upcoming'] = up.filter((r) => r.id !== svc.id)
    if (u && !hist.some((r) => r.id === svc.id)) hist.unshift(u)
  }
}
