import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Empty, Icon, Loading, PageHeader, PeriodPicker, Stat } from '../components/ui'
import { qs } from '../lib/api'
import { firstOfMonth, hours, lastOfMonth, money } from '../lib/format'
import { useApi } from '../lib/useApi'
import EmployeeModal, { type Employee } from './EmployeeModal'

interface Row extends Employee {
  id: number
  user_id: number | null
  operator_username: string | null
  period: { services: number; hours: number; days: number; amount: number }
  unpaid: number
}

export default function Employees() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(lastOfMonth())
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ativo')
  const { data, loading, reload } = useApi<{ rows: Row[] }>(`/admin/employees${qs({ from, to })}`)
  const [edit, setEdit] = useState<Partial<Employee> | null>(null)
  const nav = useNavigate()
  const rows = (data?.rows ?? []).filter((e) => (!status || e.status === status) && (!q || e.name.toLowerCase().includes(q.toLowerCase())))
  const tot = rows.reduce((a, e) => ({ h: a.h + e.period.hours, v: a.v + e.period.amount, u: a.u + e.unpaid }), { h: 0, v: 0, u: 0 })

  return (
    <div>
      <PageHeader title="Funcionários" subtitle="Registos internos — sem acesso à aplicação. Apenas os chefes de carrinha têm conta (ver Operadores)."
        actions={<Button onClick={() => setEdit({ status: 'ativo', job_title: 'Operador de limpeza', hourly_rate: 8.5 })}><Icon name="plus" className="size-4" /> Novo funcionário</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Funcionários" value={rows.length} sub={status ? `estado: ${status}` : 'todos'} />
        <Stat label="Horas no período" value={hours(tot.h)} />
        <Stat label="Valor do período" value={money(tot.v)} />
        <Stat label="Por pagar (meses em aberto)" value={money(tot.u)} tone="amber" />
      </div>
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          <input className="field max-w-xs" placeholder="Pesquisar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="field w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ativo">Ativos</option><option value="inativo">Inativos</option><option value="">Todos</option>
          </select>
          <div className="flex-1" />
          <PeriodPicker from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b) }} />
        </div>
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty>Nenhum funcionário.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Nome</th><th>Cargo</th><th>Estado</th><th className="num">Valor/hora</th><th className="num">Serviços</th><th className="num">Dias</th><th className="num">Horas</th><th className="num">Valor período</th><th className="num">Por pagar</th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="cursor-pointer" onClick={() => nav(`/diretor/funcionarios/${e.id}`)}>
                    <td className="font-medium">{e.name}</td>
                    <td>{e.job_title} {e.user_id && <Badge tone="brand">acesso tablet</Badge>}</td>
                    <td>{e.status === 'ativo' ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                    <td className="num">{money(e.hourly_rate)}</td>
                    <td className="num">{e.period.services}</td>
                    <td className="num">{e.period.days}</td>
                    <td className="num">{hours(e.period.hours)}</td>
                    <td className="num font-medium">{money(e.period.amount)}</td>
                    <td className="num">{e.unpaid > 0 ? <span className="text-orange-700">{money(e.unpaid)}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {edit && <EmployeeModal initial={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </div>
  )
}
