import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, ErrorBox, Icon, InvoiceBadge, Loading, PageHeader, Stat, StatusBadge } from '../components/ui'
import { dateShort, marginClass, money, money0, pct, time } from '../lib/format'
import type { Agg, Lookups, ServiceRow } from '../lib/types'
import { useApi } from '../lib/useApi'
import ClientModal, { type Client } from './ClientModal'

export default function ClientDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: c, error, loading, reload } = useApi<Client & { id: number; created_at: string; services: ServiceRow[]; totals: Agg }>(`/admin/clients/${id}`)
  const { data: lk } = useApi<Lookups>('/admin/lookups')
  const [edit, setEdit] = useState(false)
  if (loading && !c) return <Loading />
  if (error || !c) return <ErrorBox message={error ?? 'Erro'} />
  const open = c.services.filter((s) => s.status === 'concluido' && s.invoice_status !== 'pago').reduce((a, s) => a + s.value, 0)

  return (
    <div className="space-y-5">
      <PageHeader title={c.name}
        subtitle={<span className="flex flex-wrap items-center gap-2"><Badge>{c.type}</Badge> NIF {c.nif ?? '—'} · {c.address}, {c.postal_code} {c.city}</span>}
        actions={<>
          <Button variant="secondary" onClick={() => setEdit(true)}><Icon name="edit" className="size-4" /> Editar</Button>
          <Link to="/diretor/servicos/novo"><Button><Icon name="plus" className="size-4" /> Novo serviço</Button></Link>
        </>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Serviços concluídos" value={c.totals.services} />
        <Stat label="Faturação total" value={money0(c.totals.revenue)} />
        <Stat label="Lucro" value={money0(c.totals.profit)} tone="green" />
        <Stat label="Margem" value={pct(c.totals.margin)} />
        <Stat label="Em aberto" value={money0(open)} tone={open ? 'amber' : 'default'} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Contacto">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-xs text-slate-500">Pessoa de contacto</dt><dd>{c.contact_name ?? '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">Telefone</dt><dd>{c.phone ?? '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">Email</dt><dd>{c.email ?? '—'}</dd></div>
            {c.notes && <div><dt className="text-xs text-slate-500">Notas</dt><dd>{c.notes}</dd></div>}
          </dl>
        </Card>
        <Card title={`Histórico de serviços (${c.services.length})`} className="lg:col-span-2" padded={false}>
          <div className="max-h-[32rem] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Nº</th><th>Data</th><th>Chefe</th><th>Estado</th><th className="num">Valor</th><th className="num">Margem</th><th>Faturação</th></tr></thead>
              <tbody>
                {c.services.map((s) => (
                  <tr key={s.id} className="cursor-pointer" onClick={() => nav(`/diretor/servicos/${s.id}`)}>
                    <td className="text-slate-500">#{s.id}</td>
                    <td className="whitespace-nowrap">{dateShort(s.scheduled_start)} <span className="text-xs text-slate-400">{time(s.scheduled_start)}</span></td>
                    <td>{s.operator_name ?? '—'}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="num">{money(s.value)}</td>
                    <td className={`num ${marginClass(s.value ? (s.profit / s.value) * 100 : null)}`}>{s.status === 'cancelado' ? '—' : pct(s.value ? (s.profit / s.value) * 100 : null)}</td>
                    <td>{s.status === 'concluido' && <InvoiceBadge status={s.invoice_status} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      {edit && lk && <ClientModal initial={c} types={lk.client_types} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload() }} />}
    </div>
  )
}
