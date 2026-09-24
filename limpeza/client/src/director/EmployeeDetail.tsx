import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, Empty, ErrorBox, Icon, Loading, PageHeader, PeriodPicker, Stat, StatusBadge } from '../components/ui'
import { api, qs } from '../lib/api'
import { date, dateShort, firstOfMonth, hours, lastOfMonth, money, monthLong, time } from '../lib/format'
import type { Status } from '../lib/types'
import { useApi } from '../lib/useApi'
import EmployeeModal, { type Employee } from './EmployeeModal'

interface Work { service_id: number; title: string; client_name: string; scheduled_start: string; started_at: string | null; finished_at: string | null; hours: number; hourly_rate: number; is_leader: number; amount: number }
interface Sum { services: number; hours: number; days: number; amount: number }
interface Detail extends Employee {
  id: number
  operator_username: string | null
  summary: Sum
  work: Work[]
  months: (Sum & { period: string; payment: { paid_at: string; amount: number } | null })[]
  upcoming: { id: number; title: string; client_name: string; scheduled_start: string; scheduled_end: string; status: Status }[]
}

export default function EmployeeDetail() {
  const { id } = useParams()
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(lastOfMonth())
  const { data: e, error, loading, reload } = useApi<Detail>(`/admin/employees/${id}${qs({ from, to })}`)
  const [edit, setEdit] = useState(false)
  const [payErr, setPayErr] = useState<string | null>(null)
  if (loading && !e) return <Loading />
  if (error || !e) return <ErrorBox message={error ?? 'Erro'} />
  const currentMonth = firstOfMonth().slice(0, 7)

  const pay = async (period: string) => {
    setPayErr(null)
    try {
      await api.post(`/admin/employees/${e.id}/payments`, { period })
      reload()
    } catch (err) {
      setPayErr((err as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={e.name}
        subtitle={<span className="flex flex-wrap items-center gap-2">{e.job_title} · {money(e.hourly_rate)}/h
          {e.status === 'ativo' ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>}
          {e.operator_username ? <Badge tone="brand">Acesso ao tablet ({e.operator_username})</Badge> : <Badge>Sem acesso à aplicação</Badge>}</span>}
        actions={<Button variant="secondary" onClick={() => setEdit(true)}><Icon name="edit" className="size-4" /> Editar</Button>} />

      <div className="flex justify-end"><PeriodPicker from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b) }} /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Serviços realizados" value={e.summary.services} />
        <Stat label="Dias trabalhados" value={e.summary.days} />
        <Stat label="Horas trabalhadas" value={hours(e.summary.hours)} />
        <Stat label="Valor a pagar (período)" value={money(e.summary.amount)} tone="green" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Pagamentos mensais" padded={false}>
          {payErr && <div className="p-3"><ErrorBox message={payErr} /></div>}
          <table className="tbl">
            <thead><tr><th>Mês</th><th className="num">Horas</th><th className="num">Valor</th><th>Estado</th></tr></thead>
            <tbody>
              {e.months.map((m) => (
                <tr key={m.period}>
                  <td >{monthLong(m.period)}</td>
                  <td className="num">{hours(m.hours)}</td>
                  <td className="num">{money(m.payment?.amount ?? m.amount)}</td>
                  <td>
                    {m.payment ? <Badge tone="green">Pago {date(m.payment.paid_at)}</Badge>
                      : m.amount === 0 ? <span className="text-xs text-slate-400">—</span>
                      : m.period === currentMonth ? <Badge tone="amber">Mês a decorrer</Badge>
                      : <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => pay(m.period)}>Registar pagamento</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Próximos serviços" className="lg:col-span-2" padded={false}>
          {e.upcoming.length === 0 ? <Empty>Sem serviços agendados.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {e.upcoming.map((s) => (
                <li key={s.id}>
                  <Link to={`/diretor/servicos/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                    <span><span >{dateShort(s.scheduled_start)}</span> {time(s.scheduled_start)} · <b>{s.client_name}</b></span>
                    <StatusBadge status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title={`Histórico no período (${e.work.length})`} padded={false}>
        {e.work.length === 0 ? <Empty>Sem serviços concluídos neste período.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Serviço</th><th>Data</th><th>Cliente</th><th>Início / fim</th><th className="num">Horas</th><th className="num">€/h</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {e.work.map((w) => (
                  <tr key={w.service_id}>
                    <td><Link to={`/diretor/servicos/${w.service_id}`} className="text-brand-700 hover:underline">#{w.service_id}</Link> {w.is_leader ? <Badge tone="brand">chefe</Badge> : null}</td>
                    <td >{dateShort(w.scheduled_start)}</td>
                    <td>{w.client_name}</td>
                    <td className="tabular-nums">{time(w.started_at)} – {time(w.finished_at)}</td>
                    <td className="num">{hours(w.hours)}</td>
                    <td className="num">{money(w.hourly_rate)}</td>
                    <td className="num font-medium">{money(w.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {edit && <EmployeeModal initial={e} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload() }} />}
    </div>
  )
}
