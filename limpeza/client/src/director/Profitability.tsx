import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MonthlyChart } from '../components/charts'
import { Card, cx, Loading, PageHeader, PeriodPicker, Stat, Tabs } from '../components/ui'
import { qs } from '../lib/api'
import { addDays, dateShort, firstOfMonth, hours, localDate, marginClass, money, money0, pct } from '../lib/format'
import type { Agg, GroupAgg, MonthAgg, ServiceRow } from '../lib/types'
import { useApi } from '../lib/useApi'

interface ProfitData {
  totals: Agg
  overhead: number
  net: number
  net_margin: number | null
  series: MonthAgg[]
  by_client: GroupAgg[]
  by_van: GroupAgg[]
  by_operator: GroupAgg[]
  by_type: GroupAgg[]
  by_client_type: GroupAgg[]
  worst: ServiceRow[]
  best: ServiceRow[]
}
type Dim = 'by_client' | 'by_client_type' | 'by_type' | 'by_van' | 'by_operator'

export default function Profitability() {
  const [from, setFrom] = useState(firstOfMonth(addDays(localDate(), -62)))
  const [to, setTo] = useState(localDate())
  const [dim, setDim] = useState<Dim>('by_client')
  const { data, loading } = useApi<ProfitData>(`/admin/profitability${qs({ from, to })}`)

  return (
    <div className="space-y-5">
      <PageHeader title="Rentabilidade" subtitle="Calculada automaticamente a partir da duração real, custo dos funcionários presentes e custos de cada serviço."
        actions={<PeriodPicker from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b) }} />} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="Faturação" value={money0(data.totals.revenue)} sub={`${data.totals.services} serviços · ${hours(data.totals.hours)}`} />
            <Stat label="Custos diretos" value={money0(data.totals.total_cost)} />
            <Stat label="Lucro bruto" value={money0(data.totals.profit)} tone="green" />
            <Stat label="Margem bruta" value={pct(data.totals.margin)} tone={data.totals.margin !== null && data.totals.margin >= 35 ? 'green' : 'amber'} />
            <Stat label="Custos gerais" value={money0(data.overhead)} />
            <Stat label="Resultado líquido" value={money0(data.net)} sub={`margem líquida ${pct(data.net_margin)}`} tone={data.net >= 0 ? 'green' : 'red'} />
          </div>

          <Card title="Evolução mensal">
            <MonthlyChart data={data.series} />
            <div className="mt-4 overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Mês</th><th className="num">Serviços</th><th className="num">Faturação</th><th className="num">Funcionários</th><th className="num">Combustível</th><th className="num">Materiais</th><th className="num">Outros</th><th className="num">Lucro bruto</th><th className="num">Margem</th><th className="num">Custos gerais</th><th className="num">Resultado</th></tr></thead>
                <tbody>
                  {data.series.map((m) => (
                    <tr key={m.month}>
                      <td>{m.month}</td><td className="num">{m.services}</td><td className="num">{money0(m.revenue)}</td><td className="num">{money0(m.labor)}</td>
                      <td className="num">{money0(m.fuel)}</td><td className="num">{money0(m.materials)}</td><td className="num">{money0(m.other)}</td>
                      <td className="num font-medium">{money0(m.profit)}</td><td className={cx('num', marginClass(m.margin))}>{pct(m.margin)}</td>
                      <td className="num">{money0(m.overhead)}</td><td className={cx('num font-semibold', m.net < 0 && 'text-rose-700')}>{money0(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card padded={false} title={<Tabs value={dim} onChange={setDim} options={[['by_client', 'Por cliente'], ['by_client_type', 'Por tipo de cliente'], ['by_type', 'Por tipo de serviço'], ['by_van', 'Por carrinha'], ['by_operator', 'Por chefe']]} />}>
            <div className="max-h-[30rem] overflow-auto">
              <table className="tbl">
                <thead><tr><th>Nome</th><th className="num">Serviços</th><th className="num">Horas</th><th className="num">Faturação</th><th className="num">Custo</th><th className="num">Lucro</th><th className="num">Margem</th><th className="w-40" /></tr></thead>
                <tbody>
                  {data[dim].map((g) => (
                    <tr key={String(g.key)}>
                      <td>{dim === 'by_client' ? <Link to={`/diretor/clientes/${g.key}`} className="hover:underline">{g.label}</Link> : g.label}</td>
                      <td className="num">{g.services}</td><td className="num">{hours(g.hours)}</td><td className="num">{money0(g.revenue)}</td>
                      <td className="num">{money0(g.total_cost)}</td><td className="num font-medium">{money0(g.profit)}</td>
                      <td className={cx('num font-medium', marginClass(g.margin))}>{pct(g.margin)}</td>
                      <td>
                        <div className="h-1.5 rounded bg-slate-100" title={`Margem ${pct(g.margin)}`}>
                          <div className="h-1.5 rounded" style={{ width: `${Math.max(0, Math.min(100, g.margin ?? 0))}%`, background: 'var(--color-series-1)' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <ServiceList title="Serviços menos rentáveis" rows={data.worst} />
            <ServiceList title="Serviços mais rentáveis" rows={data.best} />
          </div>
        </>
      )}
    </div>
  )
}

function ServiceList({ title, rows }: { title: string; rows: ServiceRow[] }) {
  return (
    <Card title={title} padded={false}>
      <table className="tbl">
        <thead><tr><th>Serviço</th><th>Cliente</th><th className="num">Valor</th><th className="num">Lucro</th><th className="num">Margem</th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td><Link to={`/diretor/servicos/${s.id}`} className="text-brand-700 hover:underline">#{s.id}</Link> <span className="text-xs text-slate-400">{dateShort(s.scheduled_start)}</span></td>
              <td className="max-w-[12rem] truncate">{s.client_name}</td>
              <td className="num">{money(s.value)}</td>
              <td className="num">{money(s.profit)}</td>
              <td className={cx('num font-medium', marginClass(s.margin))}>{pct(s.margin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
