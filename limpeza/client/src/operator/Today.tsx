import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon, Loading } from '../components/ui'
import type { OpService, OpServiceRow } from '../lib/types'
import { useApi } from '../lib/useApi'
import { ServiceActions, ServiceCard, ServiceRowCard, Toast } from './shared'

interface TodayData {
  date: string
  current: OpService | null
  next: OpServiceRow | null
  completed: OpServiceRow[]
  pending: OpServiceRow[]
  total: number
}

export default function Today() {
  const { data, loading, reload, setData } = useApi<TodayData>('/op/today', { poll: 30000 })
  const loc = useLocation()
  const [toast, setToast] = useState<string | null>((loc.state as { toast?: string } | null)?.toast ?? null)
  const nav = useNavigate()
  const clearToast = useCallback(() => setToast(null), [])

  if (loading && !data) return <Loading />
  if (!data) return null
  const c = data.current

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast} onDone={clearToast} />}
      <h1 className="text-3xl font-bold text-slate-900">Os meus serviços</h1>

      <div className="grid grid-cols-3 gap-3">
        <Counter label="Hoje" value={data.total} />
        <Counter label="Concluídos" value={data.completed.length} tone="text-emerald-700" />
        <Counter label="Pendentes" value={data.pending.length} tone="text-amber-700" />
      </div>

      {c ? (
        <>
          <ServiceCard s={c} heading={c.status === 'agendado' ? 'Próximo serviço a iniciar' : 'Serviço atual'} />
          <ServiceActions s={c} onChanged={(s, message) => {
            setData({ ...data, current: s })
            if (message) setToast(message)
            reload()
          }} />
          {c.status === 'em_execucao' && (
            <button onClick={() => nav(`/operador/servicos/${c.id}`)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-lg font-semibold text-slate-700 ring-1 ring-slate-200">
              <Icon name="camera" className="size-6" /> Fotografias / detalhes
            </button>
          )}
        </>
      ) : (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
          <Icon name="check" className="mx-auto size-14 text-emerald-600" />
          <div className="mt-3 text-2xl font-bold text-slate-900">Sem serviços por fazer hoje</div>
          <div className="mt-1 text-lg text-slate-500">Bom trabalho! Veja os próximos dias em “Serviços”.</div>
        </div>
      )}

      {data.next && (
        <section>
          <h2 className="mb-2 text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">Próximo serviço</h2>
          <ServiceRowCard s={data.next} onClick={() => nav(`/operador/servicos/${data.next!.id}`)} />
        </section>
      )}

      {data.pending.filter((p) => p.id !== c?.id && p.id !== data.next?.id).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">Pendentes hoje</h2>
          <div className="space-y-3">
            {data.pending.filter((p) => p.id !== c?.id && p.id !== data.next?.id).map((s) => <ServiceRowCard key={s.id} s={s} onClick={() => nav(`/operador/servicos/${s.id}`)} />)}
          </div>
        </section>
      )}

      {data.completed.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">Concluídos hoje</h2>
          <div className="space-y-3">
            {data.completed.map((s) => <ServiceRowCard key={s.id} s={s} onClick={() => nav(`/operador/servicos/${s.id}`)} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function Counter({ label, value, tone = 'text-slate-900' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 text-center shadow-sm ring-1 ring-slate-200">
      <div className={`text-4xl font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="text-base font-semibold text-slate-500">{label}</div>
    </div>
  )
}
