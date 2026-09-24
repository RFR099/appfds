import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, cx, ErrorBox, Field, Icon, Loading, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { localDate, localHHMM, marginClass, money, pct } from '../lib/format'
import type { Lookups, ServiceFull } from '../lib/types'
import { useApi } from '../lib/useApi'

interface Form {
  client_id: string
  title: string
  service_type: string
  address: string
  city: string
  date: string
  start_time: string
  end_time: string
  value: string
  team_id: string
  van_id: string
  operator_id: string
  employee_ids: number[]
  fuel_cost: string
  material_cost: string
  other_cost: string
  instructions: string
  started_at: string
  finished_at: string
}

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const EMPTY: Form = {
  client_id: '', title: '', service_type: '', address: '', city: '', date: localDate(), start_time: '09:00', end_time: '12:00',
  value: '', team_id: '', van_id: '', operator_id: '', employee_ids: [], fuel_cost: '20', material_cost: '', other_cost: '0',
  instructions: '', started_at: '', finished_at: '',
}

export default function ServiceForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: lk } = useApi<Lookups>('/admin/lookups')
  const { data: existing } = useApi<ServiceFull>(id ? `/admin/services/${id}` : null)
  const [f, setF] = useState<Form>(EMPTY)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [empFilter, setEmpFilter] = useState('')

  useEffect(() => {
    if (!existing) return
    setF({
      client_id: String(existing.client_id), title: existing.title, service_type: existing.service_type,
      address: existing.address ?? '', city: existing.city ?? '', date: localDate(new Date(existing.scheduled_start)),
      start_time: localHHMM(existing.scheduled_start), end_time: localHHMM(existing.scheduled_end), value: String(existing.value),
      team_id: existing.team_id ? String(existing.team_id) : '', van_id: existing.van_id ? String(existing.van_id) : '',
      operator_id: existing.operator_id ? String(existing.operator_id) : '',
      employee_ids: existing.employees.filter((e) => !e.is_leader).map((e) => e.id),
      fuel_cost: String(existing.fuel_cost), material_cost: String(existing.material_cost), other_cost: String(existing.other_cost),
      instructions: existing.instructions ?? '', started_at: toLocalInput(existing.started_at), finished_at: toLocalInput(existing.finished_at),
    })
  }, [existing])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const payload = useMemo(() => ({
    ...f,
    id: id ? Number(id) : undefined,
    client_id: f.client_id ? Number(f.client_id) : null,
    van_id: f.van_id ? Number(f.van_id) : null,
    operator_id: f.operator_id ? Number(f.operator_id) : null,
    team_id: f.team_id ? Number(f.team_id) : null,
    started_at: f.started_at ? new Date(f.started_at).toISOString() : undefined,
    finished_at: f.finished_at ? new Date(f.finished_at).toISOString() : undefined,
  }), [f, id])

  // Verificação de conflitos (carrinha / chefe no mesmo horário) enquanto o diretor preenche.
  useEffect(() => {
    if (!f.client_id || !f.value || !f.date) return
    const t = setTimeout(() => {
      api.post<{ warnings: string[] }>('/admin/services/check', payload).then((r) => setWarnings(r.warnings)).catch(() => undefined)
    }, 400)
    return () => clearTimeout(t)
  }, [payload, f.client_id, f.value, f.date])

  if (!lk || (id && !existing)) return <Loading />

  const pickClient = (cid: string) => {
    const c = lk.clients.find((x) => String(x.id) === cid)
    setF((x) => ({ ...x, client_id: cid, title: c?.name ?? '', address: c?.address ?? '', city: c?.city ?? '' }))
  }
  const applyTeam = (tid: string) => {
    const t = lk.teams.find((x) => String(x.id) === tid)
    if (!t) return set('team_id', '')
    setF((x) => ({ ...x, team_id: tid, van_id: t.van_id ? String(t.van_id) : x.van_id, operator_id: t.leader_user_id ? String(t.leader_user_id) : x.operator_id, employee_ids: t.member_ids }))
  }
  const toggleEmp = (eid: number) => set('employee_ids', f.employee_ids.includes(eid) ? f.employee_ids.filter((x) => x !== eid) : [...f.employee_ids, eid])

  // Estimativa de custo/margem (prevista).
  const [sh, sm] = f.start_time.split(':').map(Number)
  const [eh, em] = f.end_time.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 1440
  const hrs = mins / 60
  const leader = lk.operators.find((o) => String(o.id) === f.operator_id)
  const leaderRate = leader?.employee_id ? lk.employees.find((e) => e.id === leader.employee_id)?.hourly_rate ?? 0 : 0
  const rates = f.employee_ids.reduce((a, eid) => a + (lk.employees.find((e) => e.id === eid)?.hourly_rate ?? 0), 0) + leaderRate
  const labor = hrs * rates
  const cost = labor + Number(f.fuel_cost || 0) + Number(f.material_cost || 0) + Number(f.other_cost || 0)
  const value = Number(f.value || 0)
  const margin = value ? ((value - cost) / value) * 100 : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = id ? await api.put<{ id: number }>(`/admin/services/${id}`, payload) : await api.post<{ id: number }>('/admin/services', payload)
      nav(`/diretor/servicos/${r.id}`, { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const empList = lk.employees.filter((e) => (e.status === 'ativo' || f.employee_ids.includes(e.id)) && e.id !== leader?.employee_id && e.job_title !== 'Chefe de carrinha')
    .filter((e) => !empFilter || e.name.toLowerCase().includes(empFilter.toLowerCase()))

  return (
    <form onSubmit={submit}>
      <PageHeader title={id ? `Editar serviço #${id}` : 'Novo serviço'}
        subtitle="Cliente → horário → valor → carrinha → chefe de carrinha → funcionários. O serviço fica disponível no tablet do chefe."
        actions={<>
          <Button type="button" variant="secondary" onClick={() => nav(-1)}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? 'A guardar…' : id ? 'Guardar alterações' : 'Criar serviço'}</Button>
        </>} />
      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title={<Step n={1}>Cliente e local</Step>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cliente *" className="sm:col-span-2">
                <select className="field" required value={f.client_id} onChange={(e) => pickClient(e.target.value)}>
                  <option value="">Selecione o cliente…</option>
                  {lk.clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.city}</option>)}
                </select>
              </Field>
              <Field label="Título"><input className="field" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Por omissão, o nome do cliente" /></Field>
              <Field label="Tipo de serviço">
                <select className="field" value={f.service_type} onChange={(e) => set('service_type', e.target.value)}>
                  <option value="">—</option>
                  {lk.service_types.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Morada"><input className="field" value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
              <Field label="Localidade"><input className="field" value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
            </div>
          </Card>

          <Card title={<Step n={2}>Horário e valor</Step>}>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Data *"><input type="date" className="field" required value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
              <Field label="Início *"><input type="time" className="field" required value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></Field>
              <Field label="Fim previsto *" hint={mins > 0 ? `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')} de duração` : undefined}>
                <input type="time" className="field" required value={f.end_time} onChange={(e) => set('end_time', e.target.value)} />
              </Field>
              <Field label="Valor do serviço (€) *"><input type="number" step="0.01" min="0" className="field" required value={f.value} onChange={(e) => set('value', e.target.value)} /></Field>
            </div>
            {existing && (existing.started_at || existing.status === 'concluido') && (
              <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                <Field label="Hora real de início (correção)"><input type="datetime-local" className="field" value={f.started_at} onChange={(e) => set('started_at', e.target.value)} /></Field>
                {existing.status === 'concluido' && <Field label="Hora real de fim (correção)"><input type="datetime-local" className="field" value={f.finished_at} onChange={(e) => set('finished_at', e.target.value)} /></Field>}
              </div>
            )}
          </Card>

          <Card title={<Step n={3}>Carrinha, chefe e equipa</Step>}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Equipa base (preenche automaticamente)">
                <select className="field" value={f.team_id} onChange={(e) => applyTeam(e.target.value)}>
                  <option value="">— Nenhuma —</option>
                  {lk.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Carrinha">
                <select className="field" value={f.van_id} onChange={(e) => set('van_id', e.target.value)}>
                  <option value="">— Sem carrinha —</option>
                  {lk.vans.map((v) => <option key={v.id} value={v.id} disabled={v.status === 'inativa'}>{v.name} · {v.plate}{v.status === 'manutencao' ? ' (manutenção)' : ''}</option>)}
                </select>
              </Field>
              <Field label="Chefe de carrinha (acesso ao tablet)">
                <select className="field" value={f.operator_id} onChange={(e) => set('operator_id', e.target.value)}>
                  <option value="">— Sem chefe —</option>
                  {lk.operators.filter((o) => o.active || String(o.id) === f.operator_id).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="label mb-0">Funcionários ({f.employee_ids.length} selecionados{leader ? ' + chefe' : ''})</span>
                <input className="field w-48 py-1.5" placeholder="Filtrar…" value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} />
              </div>
              <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-3">
                {empList.map((e) => {
                  const on = f.employee_ids.includes(e.id)
                  return (
                    <label key={e.id} className={cx('flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm', on ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50')}>
                      <input type="checkbox" checked={on} onChange={() => toggleEmp(e.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{e.name}{e.status !== 'ativo' && ' (inativo)'}</span>
                        <span className="block text-xs text-slate-400">{e.job_title} · {money(e.hourly_rate)}/h</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card title={<Step n={4}>Custos previstos e instruções</Step>}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Combustível (€)"><input type="number" step="0.01" min="0" className="field" value={f.fuel_cost} onChange={(e) => set('fuel_cost', e.target.value)} /></Field>
              <Field label="Materiais (€)"><input type="number" step="0.01" min="0" className="field" value={f.material_cost} onChange={(e) => set('material_cost', e.target.value)} /></Field>
              <Field label="Outros custos (€)"><input type="number" step="0.01" min="0" className="field" value={f.other_cost} onChange={(e) => set('other_cost', e.target.value)} /></Field>
              <Field label="Instruções para a equipa (visível no tablet)" className="sm:col-span-3">
                <textarea className="field" rows={3} value={f.instructions} onChange={(e) => set('instructions', e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <Card title="Rentabilidade prevista">
            <dl className="space-y-2 text-sm">
              <Row label="Valor" value={money(value)} />
              <Row label={`Funcionários (${hrs.toFixed(1)} h × ${money(rates)}/h)`} value={money(labor)} />
              <Row label="Combustível + materiais + outros" value={money(cost - labor)} />
              <Row label="Custo total" value={money(cost)} strong />
              <Row label="Lucro" value={money(value - cost)} strong />
              <div className="flex justify-between"><dt className="text-slate-600">Margem</dt><dd className={cx('font-semibold', marginClass(margin))}>{pct(margin)}</dd></div>
            </dl>
          </Card>
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="mb-1 flex items-center gap-1.5 font-semibold"><Icon name="warning" className="size-4" /> Atenção</div>
              <ul className="list-disc space-y-1 pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              <p className="mt-2 text-xs text-amber-700">Pode guardar na mesma — o alerta ficará visível no dashboard.</p>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-5 place-items-center rounded-full bg-brand-700 text-[11px] text-white">{n}</span>
      {children}
    </span>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className={cx('tabular-nums', strong && 'font-semibold text-slate-900')}>{value}</dd>
    </div>
  )
}
