import { Link, useNavigate } from 'react-router-dom'
import { MonthlyChart } from '../components/charts'
import { Card, cx, Empty, ErrorBox, Icon, Loading, PageHeader, Stat, StatusBadge } from '../components/ui'
import { dateTime, localDate, money, money0, monthLong, pct, time } from '../lib/format'
import type { Agg, Alert, MonthAgg, ServiceRow, TimelineEvent } from '../lib/types'
import { useApi } from '../lib/useApi'

interface DashboardData {
  date: string
  today: {
    total: number; in_progress: number; executing: number; traveling: number; completed: number; pending: number
    with_problems: number; vans_in_operation: number; active_operators: number; revenue_planned: number
  }
  tomorrow: number
  board: ServiceRow[]
  month: Agg
  prev_month: Agg
  series: MonthAgg[]
  alerts: Alert[]
  alerts_unread: number
  feed: TimelineEvent[]
  billing: Record<string, { n: number; total: number }>
}

export const EVENT_ICON: Record<string, [string, string]> = {
  criado: ['plus', 'bg-slate-100 text-slate-600'],
  atribuido: ['user', 'bg-slate-100 text-slate-600'],
  equipa: ['employees', 'bg-slate-100 text-slate-600'],
  deslocacao: ['truck', 'bg-sky-100 text-sky-700'],
  iniciado: ['play', 'bg-amber-100 text-amber-700'],
  terminado: ['stop', 'bg-emerald-100 text-emerald-700'],
  concluido: ['check', 'bg-emerald-100 text-emerald-700'],
  problema: ['warning', 'bg-rose-100 text-rose-700'],
  fotografias: ['camera', 'bg-violet-100 text-violet-700'],
  alterado: ['edit', 'bg-slate-100 text-slate-600'],
  cancelado: ['x', 'bg-rose-100 text-rose-700'],
  faturado: ['billing', 'bg-sky-100 text-sky-700'],
  pago: ['billing', 'bg-emerald-100 text-emerald-700'],
}

export default function Dashboard() {
  const { data, error, loading } = useApi<DashboardData>('/admin/dashboard', { poll: 15000 })
  const nav = useNavigate()
  if (loading && !data) return <Loading />
  if (error && !data) return <ErrorBox message={error} />
  if (!data) return null
  const t = data.today
  const delta = data.prev_month.revenue ? ((data.month.revenue - data.prev_month.revenue) / data.prev_month.revenue) * 100 : null

  return (
    <div className="space-y-6">
      <PageHeader title="Visão global da empresa" subtitle="Atualizado automaticamente a cada 15 segundos." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Serviços hoje" value={t.total} sub={`${money0(t.revenue_planned)} previstos · ${data.tomorrow} amanhã`} onClick={() => nav('/diretor/operacao')} />
        <Stat label="Em execução" value={t.in_progress} tone="amber" sub={t.traveling ? `${t.traveling} em deslocação` : 'no terreno'} onClick={() => nav('/diretor/operacao')} />
        <Stat label="Concluídos" value={t.completed} tone="green" sub={t.with_problems ? `${t.with_problems} com problemas` : 'sem problemas'} />
        <Stat label="Pendentes" value={t.pending} tone="slate" sub="por iniciar" />
        <Stat label="Carrinhas em operação" value={t.vans_in_operation} tone="sky" icon={<Icon name="vans" className="size-4" />} />
        <Stat label="Operadores ativos" value={t.active_operators} tone="sky" icon={<Icon name="operators" className="size-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Operação de hoje — por carrinha" className="xl:col-span-2" padded={false}
          actions={<Link to="/diretor/operacao" className="text-xs font-medium text-brand-700 hover:underline">Ver quadro completo →</Link>}>
          {data.board.length === 0 ? <Empty>Sem serviços hoje.</Empty> : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr><th>Carrinha</th><th>Cliente</th><th>Chefe</th><th>Horário</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {data.board.map((s) => (
                    <tr key={s.id} className="cursor-pointer" onClick={() => nav(`/diretor/servicos/${s.id}`)}>
                      <td className="font-medium whitespace-nowrap">{s.van_name ?? <span className="text-rose-600">Sem carrinha</span>}</td>
                      <td>
                        <div className="max-w-[16rem] truncate">{s.client_name}</div>
                        <div className="text-xs text-slate-400">#{s.id} · {s.service_type}</div>
                      </td>
                      <td className="whitespace-nowrap">{s.operator_name ?? <span className="text-rose-600">Sem chefe</span>}</td>
                      <td className="whitespace-nowrap tabular-nums">
                        {time(s.scheduled_start)}–{time(s.scheduled_end)}
                        {s.started_at && <div className="text-xs text-slate-400">início {time(s.started_at)}{s.finished_at && ` · fim ${time(s.finished_at)}`}</div>}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={s.status} />
                          {!!s.had_problems && <span title="Problema registado" className="text-rose-600"><Icon name="warning" className="size-4" /></span>}
                          {s.photo_count > 0 && <span title={`${s.photo_count} fotografias`} className="text-slate-400"><Icon name="camera" className="size-4" /></span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title={<span className="flex items-center gap-2">Alertas {data.alerts_unread > 0 && <span className="rounded-full bg-rose-600 px-1.5 text-[11px] text-white">{data.alerts_unread}</span>}</span>} padded={false}>
          {data.alerts.length === 0 ? <Empty>Sem alertas por ler.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {data.alerts.map((a) => (
                <li key={a.key}>
                  <Link to={`/diretor/servicos/${a.service_id}`} className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                    <span className={cx('mt-1.5 size-2 shrink-0 rounded-full', a.severity === 'alta' ? 'bg-rose-500' : a.severity === 'media' ? 'bg-amber-500' : 'bg-sky-500')} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{a.title}</span>
                      <span className="block truncate text-xs text-slate-500">{a.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={`Resultados — ${monthLong(data.series[data.series.length - 1].month)}`} className="xl:col-span-2">
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Mini label="Faturação" value={money0(data.month.revenue)} sub={delta === null ? undefined : `${delta >= 0 ? '▲' : '▼'} ${pct(Math.abs(delta))} vs mês anterior`} />
            <Mini label="Custos diretos" value={money0(data.month.total_cost)} />
            <Mini label="Lucro" value={money0(data.month.profit)} />
            <Mini label="Margem" value={pct(data.month.margin)} sub={`${data.month.services} serviços concluídos`} />
          </div>
          <MonthlyChart data={data.series} />
          <p className="mt-2 text-xs text-slate-400">Serviços concluídos, últimos 4 meses. Custos diretos = funcionários + combustível + materiais + outros.</p>
        </Card>

        <div className="space-y-6">
          <Card title="Faturação pendente">
            <div className="space-y-3 text-sm">
              <Line label="Por faturar" n={data.billing.por_faturar?.n} v={data.billing.por_faturar?.total} />
              <Line label="Faturado, por receber" n={data.billing.faturado?.n} v={data.billing.faturado?.total} />
              <Link to="/diretor/faturacao" className="block text-xs font-medium text-brand-700 hover:underline">Gerir faturação →</Link>
            </div>
          </Card>
          <Card title="Atividade recente" padded={false}>
            <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto">
              {data.feed.map((e) => <FeedItem key={e.id} e={e} />)}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  )
}

function Line({ label, n, v }: { label: string; n?: number; v?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label} <span className="text-xs text-slate-400">({n ?? 0})</span></span>
      <span className="font-semibold tabular-nums">{money(v ?? 0)}</span>
    </div>
  )
}

export function FeedItem({ e }: { e: TimelineEvent }) {
  const [icon, cls] = EVENT_ICON[e.type] ?? ['dashboard', 'bg-slate-100 text-slate-600']
  return (
    <li>
      <Link to={`/diretor/servicos/${e.service_id}`} className="flex gap-3 px-4 py-2.5 hover:bg-slate-50">
        <span className={cx('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full', cls)}><Icon name={icon} className="size-3.5" /></span>
        <span className="min-w-0 text-sm">
          <span className="block text-slate-800">{e.message}</span>
          <span className="block truncate text-xs text-slate-400">{localDate(new Date(e.at)) === localDate() ? time(e.at) : dateTime(e.at)} · #{e.service_id} {e.client_name}</span>
        </span>
      </Link>
    </li>
  )
}
