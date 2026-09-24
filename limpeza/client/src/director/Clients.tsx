import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Empty, Icon, Loading, PageHeader } from '../components/ui'
import { date, money } from '../lib/format'
import type { Lookups } from '../lib/types'
import { useApi } from '../lib/useApi'
import ClientModal, { type Client } from './ClientModal'

interface ClientRow extends Client {
  id: number
  services_done: number
  services_open: number
  revenue_12m: number
  open_amount: number
  last_service: string | null
}

export default function Clients() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const { data, loading, reload } = useApi<ClientRow[]>('/admin/clients')
  const { data: lk } = useApi<Lookups>('/admin/lookups')
  const [edit, setEdit] = useState<Partial<Client> | null>(null)
  const nav = useNavigate()
  const rows = (data ?? []).filter((c) => (!type || c.type === type) && (!q || `${c.name} ${c.city} ${c.nif} ${c.contact_name}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <div>
      <PageHeader title="Clientes" subtitle={data ? `${data.length} clientes` : undefined}
        actions={<Button onClick={() => setEdit({ type: 'Escritório', active: 1 })}><Icon name="plus" className="size-4" /> Novo cliente</Button>} />
      <Card padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-3">
          <input className="field max-w-xs" placeholder="Pesquisar nome, NIF, localidade…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="field w-auto" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {lk?.client_types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty>Nenhum cliente.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Cliente</th><th>Tipo</th><th>Contacto</th><th>Localidade</th><th className="num">Serviços</th><th>Último serviço</th><th className="num">Faturação 12m</th><th className="num">Em aberto</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => nav(`/diretor/clientes/${c.id}`)}>
                    <td><div className="font-medium">{c.name}</div><div className="text-xs text-slate-400">NIF {c.nif ?? '—'}</div></td>
                    <td><Badge>{c.type}</Badge> {!c.active && <Badge tone="red">Inativo</Badge>}</td>
                    <td><div>{c.contact_name ?? '—'}</div><div className="text-xs text-slate-400">{c.phone}</div></td>
                    <td>{c.city}</td>
                    <td className="num">{c.services_done}{c.services_open > 0 && <span className="ml-1 text-xs text-amber-600">+{c.services_open}</span>}</td>
                    <td>{date(c.last_service)}</td>
                    <td className="num">{money(c.revenue_12m)}</td>
                    <td className="num">{c.open_amount > 0 ? <span className="text-orange-700">{money(c.open_amount)}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {edit && lk && <ClientModal initial={edit} types={lk.client_types} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </div>
  )
}
