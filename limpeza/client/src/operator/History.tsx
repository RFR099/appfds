import { useNavigate } from 'react-router-dom'
import { Icon, Loading } from '../components/ui'
import { dateShort, duration, time } from '../lib/format'
import type { OpServiceRow } from '../lib/types'
import { useApi } from '../lib/useApi'

export default function History() {
  const { data, loading } = useApi<OpServiceRow[]>('/op/services?scope=history')
  const nav = useNavigate()
  if (loading && !data) return <Loading />
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Histórico</h1>
      <p className="text-lg text-slate-500">Os seus últimos serviços concluídos.</p>
      <div className="space-y-3">
        {data?.map((s) => (
          <button key={s.id} onClick={() => nav(`/operador/servicos/${s.id}`)} className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 active:bg-slate-50">
            <div className="w-28 shrink-0">
              <div className="text-lg font-bold text-slate-900">{dateShort(s.scheduled_start)}</div>
              <div className="text-base text-slate-500 tabular-nums">{time(s.started_at)}–{time(s.finished_at)}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-bold">{s.client_name}</div>
              <div className="text-base text-slate-500">Duração {duration(s.started_at, s.finished_at)} · {s.van_name}</div>
            </div>
            {!!s.had_problems && <span className="text-rose-600" title="Problema registado"><Icon name="warning" className="size-7" /></span>}
            <Icon name="check" className="size-7 text-emerald-600" />
          </button>
        ))}
        {data?.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-xl text-slate-500">Ainda sem serviços concluídos.</p>}
      </div>
    </div>
  )
}
