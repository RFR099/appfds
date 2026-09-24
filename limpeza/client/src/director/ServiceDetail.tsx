import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, cx, ErrorBox, Icon, InvoiceBadge, Loading, Modal, StatusBadge } from '../components/ui'
import { api, photoUrl } from '../lib/api'
import { date, dateLong, dateTime, duration, hours, ISSUE_CATEGORIES, marginClass, money, pct, time } from '../lib/format'
import type { ServiceFull } from '../lib/types'
import { useApi } from '../lib/useApi'
import { EVENT_ICON } from './Dashboard'

export default function ServiceDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: s, error, loading, reload } = useApi<ServiceFull>(`/admin/services/${id}`, { poll: 20000 })
  const [photo, setPhoto] = useState<number | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (loading && !s) return <Loading />
  if (error && !s) return <ErrorBox message={error} />
  if (!s) return null
  const f = s.finance
  const overran = s.status === 'em_execucao' && new Date(s.scheduled_end) < new Date()

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      await reload()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const mark = (status: string) => act(() => api.post('/admin/billing/mark', { ids: [s.id], status }))

  return (
    <div className="space-y-5">
      <div>
        <button onClick={() => nav(-1)} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <Icon name="back" className="size-4" /> Voltar
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">Serviço #{s.id}</h1>
              <StatusBadge status={s.status} />
              {overran && <Badge tone="red">Ultrapassou o horário</Badge>}
              {!!s.had_problems && <Badge tone="red"><Icon name="warning" className="size-3.5" /> Problemas</Badge>}
              {s.status === 'concluido' && s.completed_ok === 0 && <Badge tone="amber">Não concluído na totalidade</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <Link to={`/diretor/clientes/${s.client.id}`} className="font-medium text-slate-700 hover:underline">{s.client.name}</Link> · {s.service_type} · <span >{dateLong(s.scheduled_start)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {s.status !== 'cancelado' && <Link to={`/diretor/servicos/${s.id}/editar`}><Button variant="secondary"><Icon name="edit" className="size-4" /> Editar</Button></Link>}
            {!['concluido', 'cancelado'].includes(s.status) && <Button variant="secondary" className="text-rose-700" onClick={() => setCancelOpen(true)}>Cancelar serviço</Button>}
            {s.status === 'cancelado' && <Button variant="secondary" disabled={busy} onClick={() => act(() => api.post(`/admin/services/${s.id}/reopen`))}>Reativar</Button>}
          </div>
        </div>
      </div>

      {actionError && <ErrorBox message={actionError} />}
      {(s.conflicts.van.length > 0 || s.conflicts.operator.length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {s.conflicts.van.map((c) => <div key={`v${c.id}`}>⚠ A carrinha também está atribuída ao serviço <Link className="underline" to={`/diretor/servicos/${c.id}`}>#{c.id} {c.title}</Link> no mesmo horário.</div>)}
          {s.conflicts.operator.map((c) => <div key={`o${c.id}`}>⚠ O chefe de carrinha também tem o serviço <Link className="underline" to={`/diretor/servicos/${c.id}`}>#{c.id} {c.title}</Link> no mesmo horário.</div>)}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title="Operação">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Cliente" value={s.client.name} sub={[s.client.contact_name, s.client.phone].filter(Boolean).join(' · ')} />
              <Info label="Local" value={s.address ?? '—'} sub={s.city ?? undefined} />
              <Info label="Horário previsto" value={`${time(s.scheduled_start)} – ${time(s.scheduled_end)}`} sub={date(s.scheduled_start)} />
              <Info label="Carrinha" value={s.van ? `${s.van.name}` : <span className="text-rose-600">Sem carrinha</span>} sub={s.van ? `${s.van.plate} · ${s.van.model ?? ''}` : undefined} />
              <Info label="Chefe de carrinha" value={s.operator?.name ?? <span className="text-rose-600">Sem chefe</span>} sub={s.operator?.phone ?? undefined} />
              <Info label="Criado por" value={s.created_by_name ?? '—'} sub={dateTime(s.created_at)} />
              <Info label="Hora de início" value={time(s.started_at)} sub={s.started_at ? delay(s.scheduled_start, s.started_at) : undefined} />
              <Info label="Fim previsto / real" value={`${time(s.scheduled_end)} / ${time(s.finished_at)}`} sub={s.finished_at ? delay(s.scheduled_end, s.finished_at) : undefined} />
              <Info label="Duração prevista / real" value={`${duration(s.scheduled_start, s.scheduled_end)} / ${duration(s.started_at, s.finished_at)}`} />
            </dl>
            {s.instructions && <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-medium">Instruções para a equipa:</span> {s.instructions}</div>}
          </Card>

          <Card title={`Equipa (${s.employees.length})`} padded={false}>
            <table className="tbl">
              <thead><tr><th>Funcionário</th><th>Função</th><th>Presença</th><th className="num">Valor/hora</th><th className="num">Custo</th></tr></thead>
              <tbody>
                {s.employees.map((e) => (
                  <tr key={e.id}>
                    <td><Link to={`/diretor/funcionarios/${e.id}`} className="font-medium hover:underline">{e.name}</Link></td>
                    <td>{e.is_leader ? <Badge tone="brand">Chefe de carrinha</Badge> : <span className="text-slate-500">{e.job_title}</span>}</td>
                    <td>{e.present === null ? <span className="text-xs text-slate-400">—</span> : e.present ? <Badge tone="green">Presente</Badge> : <Badge tone="red">Ausente</Badge>}</td>
                    <td className="num">{money(e.hourly_rate)}</td>
                    <td className="num">{e.present === 0 ? money(0) : money(e.hourly_rate * f.hours)}</td>
                  </tr>
                ))}
                {s.employees.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-rose-600">Serviço sem equipa atribuída.</td></tr>}
              </tbody>
            </table>
          </Card>

          <Card title="Registo do operador">
            {s.status !== 'concluido' ? <p className="text-sm text-slate-500">O operador ainda não terminou o serviço.</p> : (
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={s.completed_ok ? 'green' : 'amber'}>Serviço concluído: {s.completed_ok ? 'Sim' : 'Não'}</Badge>
                  <Badge tone={s.had_problems ? 'red' : 'green'}>Problemas: {s.had_problems ? 'Sim' : 'Não'}</Badge>
                </div>
                <div>
                  <div className="label">Observações</div>
                  <p className="text-slate-700">{s.observations || <span className="text-slate-400">Sem observações.</span>}</p>
                </div>
                {s.issues.length > 0 && (
                  <div>
                    <div className="label">Avarias / danos</div>
                    <ul className="space-y-1.5">
                      {s.issues.map((i) => (
                        <li key={i.id} className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                          <span className="font-medium text-rose-800">{ISSUE_CATEGORIES[i.category]}</span>
                          {i.description && <span className="text-rose-700"> — {i.description}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {s.photos.length > 0 && (
              <div className="mt-4">
                <div className="label">Fotografias ({s.photos.length})</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {s.photos.map((p) => (
                    <button key={p.id} onClick={() => setPhoto(p.id)} className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 hover:ring-brand-500">
                      <img src={photoUrl(p.id)} alt={p.original_name ?? 'Fotografia do serviço'} loading="lazy" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Rentabilidade">
            <dl className="space-y-2 text-sm">
              <Row label="Valor do serviço" value={money(f.value)} strong />
              <div className="my-2 border-t border-slate-100" />
              <Row label={`Funcionários (${hours(f.hours)})`} value={money(f.labor_cost)} />
              <Row label="Combustível" value={money(f.fuel_cost)} />
              <Row label="Materiais" value={money(f.material_cost)} />
              <Row label="Outros custos" value={money(f.other_cost)} />
              <Row label="Custo total" value={money(f.total_cost)} strong />
              <div className="my-2 border-t border-slate-100" />
              <Row label="Lucro" value={money(f.profit)} strong cls={f.profit < 0 ? 'text-rose-700' : 'text-emerald-700'} />
              <Row label="Margem" value={pct(f.margin)} strong cls={marginClass(f.margin)} />
            </dl>
            {s.status !== 'concluido' && <p className="mt-3 text-xs text-slate-400">Estimativa com a duração prevista. É recalculado com a duração real quando o operador terminar.</p>}
          </Card>

          {s.status === 'concluido' && (
            <Card title="Faturação">
              <div className="mb-3 flex items-center justify-between text-sm">
                <InvoiceBadge status={s.invoice_status} />
                <span className="text-slate-500">{s.invoice_number ?? ''}</span>
              </div>
              <div className="text-xs text-slate-500">
                {s.invoiced_at && <div>Faturado em {date(s.invoiced_at)}</div>}
                {s.paid_at && <div>Pago em {date(s.paid_at)}</div>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {s.invoice_status === 'por_faturar' && <Button disabled={busy} onClick={() => mark('faturado')}>Emitir fatura</Button>}
                {s.invoice_status === 'faturado' && <Button disabled={busy} onClick={() => mark('pago')}>Marcar como pago</Button>}
                {s.invoice_status !== 'por_faturar' && <Button variant="ghost" disabled={busy} onClick={() => mark('por_faturar')}>Anular</Button>}
              </div>
            </Card>
          )}

          <Card title="Histórico / timeline" padded={false}>
            <ol className="relative px-4 py-3">
              {s.events.map((e, i) => {
                const [icon, cls] = EVENT_ICON[e.type] ?? ['dashboard', 'bg-slate-100 text-slate-600']
                return (
                  <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < s.events.length - 1 && <span className="absolute top-7 left-3.5 h-[calc(100%-1.5rem)] w-px bg-slate-200" />}
                    <span className={cx('relative grid size-7 shrink-0 place-items-center rounded-full', cls)}><Icon name={icon} className="size-3.5" /></span>
                    <div className="min-w-0 text-sm">
                      <div className="text-xs font-semibold text-slate-500 tabular-nums">{new Date(e.at).toDateString() === new Date().toDateString() ? time(e.at) : dateTime(e.at)}</div>
                      <div className="text-slate-800">{e.message}</div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>
      </div>

      <Modal open={photo !== null} onClose={() => setPhoto(null)} title="Fotografia" wide>
        {photo && <img src={photoUrl(photo)} alt="Fotografia do serviço" className="w-full rounded-lg" />}
      </Modal>
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Cancelar serviço #${s.id}`}
        footer={<>
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Voltar</Button>
          <Button variant="danger" disabled={busy} onClick={() => act(() => api.post(`/admin/services/${s.id}/cancel`, { reason })).then(() => setCancelOpen(false))}>Cancelar serviço</Button>
        </>}>
        <label className="block text-sm">
          <span className="label">Motivo (opcional)</span>
          <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: pedido do cliente" />
        </label>
      </Modal>
    </div>
  )
}

function delay(planned: string, actual: string) {
  const m = Math.round((new Date(actual).getTime() - new Date(planned).getTime()) / 60000)
  if (Math.abs(m) < 2) return 'à hora prevista'
  return m > 0 ? `${m} min depois do previsto` : `${-m} min antes do previsto`
}

function Info({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
      {sub && <dd className="text-xs text-slate-500">{sub}</dd>}
    </div>
  )
}

function Row({ label, value, strong, cls }: { label: string; value: string; strong?: boolean; cls?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className={cx('tabular-nums', strong && 'font-semibold', cls ?? 'text-slate-900')}>{value}</dd>
    </div>
  )
}
