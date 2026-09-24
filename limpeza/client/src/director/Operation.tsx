import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, cx, Empty, Icon, Loading, PageHeader, StatusBadge } from '../components/ui'
import { addDays, dateLong, localDate, localHHMM, STATUS, time } from '../lib/format'
import type { ServiceRow, TimelineEvent } from '../lib/types'
import { useApi } from '../lib/useApi'
import { FeedItem } from './Dashboard'

interface Lane {
  van: { id: number; name: string; plate: string; status: string }
  current: ServiceRow | null
  services: ServiceRow[]
}
interface OperationData {
  date: string
  lanes: Lane[]
  unassigned: ServiceRow[]
  events: TimelineEvent[]
}

const BLOCK: Record<string, string> = {
  agendado: 'bg-slate-200 text-slate-700 ring-slate-300',
  em_deslocacao: 'bg-sky-100 text-sky-900 ring-sky-300',
  em_execucao: 'bg-amber-100 text-amber-900 ring-amber-300',
  concluido: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  cancelado: 'bg-rose-50 text-rose-400 ring-rose-200 line-through',
}
const START_H = 6
const END_H = 22
const toMin = (iso: string) => {
  const [h, m] = localHHMM(iso).split(':').map(Number)
  return h * 60 + m
}

export default function Operation() {
  const [date, setDate] = useState(localDate())
  const [view, setView] = useState<'quadro' | 'lista'>('quadro')
  const { data, loading } = useApi<OperationData>(`/admin/operation?date=${date}`, { poll: 15000 })
  const nav = useNavigate()
  const isToday = date === localDate()
  const nowMin = toMin(new Date().toISOString())
  const pctOf = (min: number) => `${((Math.min(Math.max(min, START_H * 60), END_H * 60) - START_H * 60) / ((END_H - START_H) * 60)) * 100}%`

  return (
    <div>
      <PageHeader title="Operação" subtitle={<span >{dateLong(`${date}T12:00:00`)}</span>}
        actions={<>
          <Button variant="secondary" onClick={() => setDate(addDays(date, -1))} aria-label="Dia anterior"><Icon name="back" className="size-4" /></Button>
          <input type="date" className="field w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <Button variant="secondary" onClick={() => setDate(addDays(date, 1))} aria-label="Dia seguinte"><Icon name="chevron" className="size-4" /></Button>
          {!isToday && <Button variant="ghost" onClick={() => setDate(localDate())}>Hoje</Button>}
          <div className="ml-2 inline-flex rounded-lg bg-slate-100 p-1">
            {(['quadro', 'lista'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cx('rounded-md px-3 py-1 text-sm capitalize', view === v ? 'bg-white shadow-sm' : 'text-slate-500')}>{v}</button>
            ))}
          </div>
        </>} />

      {loading && !data ? <Loading /> : data && (
        <div className="grid gap-5 2xl:grid-cols-4">
          <div className="space-y-5 2xl:col-span-3">
            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              {Object.entries(STATUS).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5"><span className={cx('size-3 rounded ring-1', BLOCK[k])} />{v.label}</span>
              ))}
            </div>

            {view === 'quadro' ? (
              <Card padded={false}>
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="flex border-b border-slate-200 text-[11px] text-slate-400">
                      <div className="w-44 shrink-0 px-3 py-2 font-semibold tracking-wide uppercase">Carrinha</div>
                      <div className="relative h-8 flex-1">
                        {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
                          <span key={i} className="absolute top-2 -translate-x-1/2" style={{ left: pctOf((START_H + i) * 60) }}>{String(START_H + i).padStart(2, '0')}h</span>
                        ))}
                      </div>
                    </div>
                    {data.lanes.map((l) => (
                      <div key={l.van.id} className="flex border-b border-slate-100 last:border-0">
                        <div className="w-44 shrink-0 px-3 py-2.5">
                          <div className="text-sm font-medium text-slate-800">{l.van.name}</div>
                          <div className="truncate text-xs text-slate-400">
                            {l.van.status === 'manutencao' ? <span className="text-amber-600">Em manutenção</span> : l.current ? `${l.current.operator_name ?? 'sem chefe'}` : 'Sem serviços'}
                          </div>
                        </div>
                        <div className="relative my-1.5 flex-1">
                          {Array.from({ length: END_H - START_H }, (_, i) => (
                            <span key={i} className="absolute inset-y-0 w-px bg-slate-100" style={{ left: pctOf((START_H + i) * 60) }} />
                          ))}
                          {isToday && <span className="absolute inset-y-0 z-10 w-0.5 bg-rose-500" style={{ left: pctOf(nowMin) }} title="Agora" />}
                          {l.services.map((s) => {
                            const a = toMin(s.scheduled_start)
                            let b = toMin(s.scheduled_end)
                            if (b <= a) b = END_H * 60
                            return (
                              <Link key={s.id} to={`/diretor/servicos/${s.id}`} title={`#${s.id} ${s.client_name} · ${time(s.scheduled_start)}–${time(s.scheduled_end)} · ${STATUS[s.status].label}`}
                                className={cx('absolute top-0 bottom-0 overflow-hidden rounded-md px-2 py-1 text-[11px] leading-tight ring-1 hover:z-20 hover:shadow-md', BLOCK[s.status])}
                                style={{ left: pctOf(a), width: `calc(${pctOf(b)} - ${pctOf(a)} - 2px)` }}>
                                <div className="truncate font-semibold">{s.client_name}</div>
                                <div className="truncate opacity-75">{time(s.scheduled_start)}–{time(s.scheduled_end)} · {s.operator_name ?? 'sem chefe'}</div>
                              </Link>
                            )
                          })}
                          <div className="h-10" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.lanes.map((l) => (
                  <button key={l.van.id} onClick={() => l.current && nav(`/diretor/servicos/${l.current.id}`)}
                    className={cx('rounded-xl border bg-white p-4 text-left shadow-sm transition', l.current ? 'border-slate-200 hover:border-brand-300' : 'border-dashed border-slate-200 opacity-70')}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{l.van.name}</span>
                      {l.current && <StatusBadge status={l.current.status} />}
                    </div>
                    {l.current ? (
                      <>
                        <div className="mt-2 truncate font-semibold text-slate-900">{l.current.client_name}</div>
                        <div className="text-sm text-slate-600">{l.current.operator_name ?? 'Sem chefe'}</div>
                        <div className="mt-1 text-xs text-slate-400">{time(l.current.scheduled_start)}–{time(l.current.scheduled_end)} · {l.services.length} serviço(s) no dia</div>
                      </>
                    ) : <div className="mt-2 text-sm text-slate-400">{l.van.status === 'manutencao' ? 'Em manutenção' : 'Sem serviços neste dia'}</div>}
                  </button>
                ))}
              </div>
            )}

            {data.unassigned.length > 0 && (
              <Card title="Serviços sem carrinha atribuída">
                <ul className="space-y-1 text-sm">
                  {data.unassigned.map((s) => (
                    <li key={s.id}><Link to={`/diretor/servicos/${s.id}`} className="text-rose-700 hover:underline">#{s.id} {s.client_name} — {time(s.scheduled_start)}</Link></li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <Card title="Registo de atividade do dia" padded={false}>
            {data.events.length === 0 ? <Empty>Sem atividade.</Empty> : (
              <ul className="max-h-[75vh] divide-y divide-slate-100 overflow-y-auto">
                {data.events.map((e) => <FeedItem key={e.id} e={e} />)}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
