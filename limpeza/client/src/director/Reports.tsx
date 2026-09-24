import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RankBars } from '../components/charts'
import { Card, cx, Empty, Icon, Loading, PageHeader, Stat } from '../components/ui'
import { DEMO, qs } from '../lib/api'
import { EVENT_ICON } from './Dashboard'
import { addDays, dateTime, firstOfMonth, hours, ISSUE_CATEGORIES, lastOfMonth, localDate, marginClass, money, money0, monthLong, pct, STATUS } from '../lib/format'
import type { Agg, GroupAgg, TimelineEvent } from '../lib/types'
import { useApi } from '../lib/useApi'

interface Summary {
  month: string
  totals: Agg
  overhead: number
  net: number
  status_counts: Record<string, number>
  problems: { category: string; n: number }[]
  punctuality: { services: number; on_time_pct: number | null; avg_overrun_min: number | null }
  top_clients: GroupAgg[]
  by_operator: GroupAgg[]
  payroll: { id: number; name: string; job_title: string; services: number; days: number; hours: number; amount: number }[]
  payroll_total: number
}

export default function Reports() {
  const [month, setMonth] = useState(localDate().slice(0, 7))
  const { data, loading } = useApi<Summary>(`/admin/reports/summary?month=${month}`)
  const range = { from: firstOfMonth(`${month}-01`), to: lastOfMonth(`${month}-01`) }
  const [hFrom, setHFrom] = useState(addDays(localDate(), -7))
  const [hType, setHType] = useState('')
  const hist = useApi<{ rows: TimelineEvent[] }>(`/admin/events${qs({ from: hFrom, to: localDate(), type: hType })}`)

  return (
    <div className="space-y-5">
      <PageHeader title="Relatórios" subtitle={<span >Resumo de {monthLong(month)}</span>}
        actions={<>
          <input type="month" className="field w-auto" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          {!DEMO && <>
          <a className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-300 hover:bg-slate-50" href={`/api/admin/reports/services.csv${qs(range)}`}><Icon name="download" className="size-4" /> Serviços (CSV)</a>
          <a className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-300 hover:bg-slate-50" href={`/api/admin/reports/payroll.csv?month=${month}`}><Icon name="download" className="size-4" /> Pagamentos (CSV)</a>
          <a className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-300 hover:bg-slate-50" href={`/api/admin/reports/clients.csv${qs(range)}`}><Icon name="download" className="size-4" /> Clientes (CSV)</a>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => window.print()}>Imprimir</button>
          </>}
        </>} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="Serviços concluídos" value={data.totals.services} sub={`${data.status_counts.cancelado ?? 0} cancelados`} />
            <Stat label="Faturação" value={money0(data.totals.revenue)} />
            <Stat label="Lucro bruto" value={money0(data.totals.profit)} sub={`margem ${pct(data.totals.margin)}`} />
            <Stat label="Resultado líquido" value={money0(data.net)} sub={`custos gerais ${money0(data.overhead)}`} />
            <Stat label="Pontualidade" value={pct(data.punctuality.on_time_pct)} sub="início até 15 min do previsto" />
            <Stat label="Desvio médio de duração" value={data.punctuality.avg_overrun_min === null ? '—' : `${data.punctuality.avg_overrun_min > 0 ? '+' : ''}${data.punctuality.avg_overrun_min} min`} />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Top clientes (faturação)">
              {data.top_clients.length === 0 ? <Empty>Sem dados.</Empty> : <RankBars rows={data.top_clients.map((c) => ({ label: c.label, value: c.revenue, sub: pct(c.margin) }))} />}
            </Card>
            <Card title="Desempenho por chefe de carrinha" padded={false}>
              <table className="tbl">
                <thead><tr><th>Chefe</th><th className="num">Serviços</th><th className="num">Faturação</th><th className="num">Margem</th></tr></thead>
                <tbody>{data.by_operator.map((o) => <tr key={String(o.key)}><td>{o.label}</td><td className="num">{o.services}</td><td className="num">{money0(o.revenue)}</td><td className={cx('num', marginClass(o.margin))}>{pct(o.margin)}</td></tr>)}</tbody>
              </table>
            </Card>
            <Card title="Estados e problemas">
              <ul className="space-y-1.5 text-sm">
                {Object.entries(STATUS).map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-slate-600">{v.label}</span><b>{data.status_counts[k] ?? 0}</b></li>)}
              </ul>
              <div className="my-3 border-t border-slate-100" />
              <div className="label">Problemas registados</div>
              {data.problems.length === 0 ? <p className="text-sm text-slate-400">Nenhum.</p> : (
                <ul className="space-y-1.5 text-sm">{data.problems.map((p) => <li key={p.category} className="flex justify-between"><span className="text-slate-600">{ISSUE_CATEGORIES[p.category]}</span><b>{p.n}</b></li>)}</ul>
              )}
            </Card>
          </div>
          <Card title={`Mapa de pagamentos a funcionários — total ${money(data.payroll_total)}`} padded={false}>
            <div className="max-h-[28rem] overflow-auto">
              <table className="tbl">
                <thead><tr><th>Funcionário</th><th>Cargo</th><th className="num">Serviços</th><th className="num">Dias</th><th className="num">Horas</th><th className="num">Valor a pagar</th></tr></thead>
                <tbody>{data.payroll.map((p) => (
                  <tr key={p.id}><td><Link to={`/diretor/funcionarios/${p.id}`} className="hover:underline">{p.name}</Link></td><td className="text-slate-500">{p.job_title}</td><td className="num">{p.services}</td><td className="num">{p.days}</td><td className="num">{hours(p.hours)}</td><td className="num font-medium">{money(p.amount)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Card title="Histórico completo de atividade" padded={false}
        actions={<>
          <select className="field w-auto py-1" value={hType} onChange={(e) => setHType(e.target.value)}>
            <option value="">Todos os eventos</option>
            {Object.keys(EVENT_ICON).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input type="date" className="field w-auto py-1" value={hFrom} onChange={(e) => e.target.value && setHFrom(e.target.value)} aria-label="Desde" />
        </>}>
        {hist.loading && !hist.data ? <Loading /> : !hist.data?.rows.length ? <Empty>Sem eventos.</Empty> : (
          <div className="max-h-[30rem] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Data/hora</th><th>Serviço</th><th>Quem</th><th>Evento</th></tr></thead>
              <tbody>{hist.data.rows.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap tabular-nums">{dateTime(e.at)}</td>
                  <td><Link to={`/diretor/servicos/${e.service_id}`} className="text-brand-700 hover:underline">#{e.service_id}</Link> <span className="text-xs text-slate-500">{e.client_name}</span></td>
                  <td className="whitespace-nowrap">{e.actor_name ?? '—'} <span className="text-xs text-slate-400">{e.actor_role === 'director' ? 'diretor' : e.actor_role === 'operator' ? 'operador' : ''}</span></td>
                  <td>{e.message}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
