import { useNavigate } from 'react-router-dom'
import { Loading } from '../components/ui'
import { dateLong, localDate } from '../lib/format'
import type { OpServiceRow } from '../lib/types'
import { useApi } from '../lib/useApi'
import { ServiceRowCard } from './shared'

/** Serviços atribuídos (hoje e próximos dias), agrupados por dia. */
export default function ServiceList() {
  const { data, loading } = useApi<OpServiceRow[]>('/op/services?scope=upcoming', { poll: 60000 })
  const nav = useNavigate()
  if (loading && !data) return <Loading />
  const groups = new Map<string, OpServiceRow[]>()
  for (const s of data ?? []) {
    const k = localDate(new Date(s.scheduled_start))
    groups.set(k, [...(groups.get(k) ?? []), s])
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Serviços atribuídos</h1>
      {groups.size === 0 && <p className="rounded-2xl bg-white p-8 text-center text-xl text-slate-500">Não tem serviços agendados.</p>}
      {[...groups.entries()].map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-2 text-lg font-bold text-slate-600">{day === localDate() ? 'Hoje' : dateLong(list[0].scheduled_start)}</h2>
          <div className="space-y-3">{list.map((s) => <ServiceRowCard key={s.id} s={s} onClick={() => nav(`/operador/servicos/${s.id}`)} />)}</div>
        </section>
      ))}
    </div>
  )
}
