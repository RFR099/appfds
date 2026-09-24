import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, ErrorBox, Field, Icon, Loading, Modal, PageHeader, Stat, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { money, number } from '../lib/format'
import { useApi } from '../lib/useApi'

interface Van {
  id: number
  name: string
  plate: string
  model: string | null
  year: number | null
  status: 'ativa' | 'manutencao' | 'inativa'
  km: number | null
  notes: string | null
  team_name: string | null
  leader_name: string | null
  month_services: number
  month_fuel: number
  month_expenses: number
  today_total: number
  current: { status: string; client: string; operator: string } | null
}

const VAN_STATUS = { ativa: ['Ativa', 'green'], manutencao: ['Em manutenção', 'amber'], inativa: ['Inativa', 'slate'] } as const

export default function Vans() {
  const { data, loading, reload } = useApi<Van[]>('/admin/vans', { poll: 30000 })
  const [edit, setEdit] = useState<Partial<Van> | null>(null)
  const inOp = data?.filter((v) => v.current).length ?? 0

  return (
    <div>
      <PageHeader title="Carrinhas" subtitle="Gestão da frota."
        actions={<Button onClick={() => setEdit({ status: 'ativa' })}><Icon name="plus" className="size-4" /> Nova carrinha</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Frota" value={data?.length ?? '—'} />
        <Stat label="Em operação agora" value={inOp} tone="amber" />
        <Stat label="Em manutenção" value={data?.filter((v) => v.status === 'manutencao').length ?? 0} />
        <Stat label="Custos da frota (mês)" value={money(data?.reduce((a, v) => a + v.month_fuel + v.month_expenses, 0))} sub="combustível + despesas" />
      </div>
      {loading && !data ? <Loading /> : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Carrinha</th><th>Matrícula</th><th>Modelo</th><th>Estado</th><th>Agora</th><th>Equipa base</th><th className="num">Serviços hoje</th><th className="num">Serviços (mês)</th><th className="num">Combustível (mês)</th><th className="num">Despesas (mês)</th><th /></tr></thead>
              <tbody>
                {data?.map((v) => (
                  <tr key={v.id}>
                    <td className="font-medium">{v.name}</td>
                    <td className="font-mono text-xs">{v.plate}</td>
                    <td>{v.model} <span className="text-xs text-slate-400">{v.year} · {number(v.km)} km</span></td>
                    <td><Badge tone={VAN_STATUS[v.status][1]}>{VAN_STATUS[v.status][0]}</Badge></td>
                    <td>{v.current ? <div className="flex items-center gap-2"><StatusBadge status={v.current.status} /><span className="max-w-[10rem] truncate text-xs">{v.current.client}</span></div> : <span className="text-xs text-slate-400">—</span>}</td>
                    <td>{v.team_name ?? '—'}<div className="text-xs text-slate-400">{v.leader_name}</div></td>
                    <td className="num">{v.today_total}</td>
                    <td className="num"><Link className="text-brand-700 hover:underline" to={`/diretor/servicos?van_id=${v.id}`}>{v.month_services}</Link></td>
                    <td className="num">{money(v.month_fuel)}</td>
                    <td className="num">{money(v.month_expenses)}</td>
                    <td><button className="text-slate-400 hover:text-slate-700" onClick={() => setEdit(v)} aria-label="Editar"><Icon name="edit" className="size-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {edit && <VanModal initial={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </div>
  )
}

function VanModal({ initial, onClose, onSaved }: { initial: Partial<Van>; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof Van, val: string) => setV((x) => ({ ...x, [k]: val }))
  const save = async () => {
    setError(null)
    try {
      if (v.id) await api.put(`/admin/vans/${v.id}`, v)
      else await api.post('/admin/vans', v)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <Modal open onClose={onClose} title={v.id ? `Editar ${v.name}` : 'Nova carrinha'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar</Button></>}>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome *"><input className="field" value={v.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Carrinha 16" /></Field>
        <Field label="Matrícula *"><input className="field" value={v.plate ?? ''} onChange={(e) => set('plate', e.target.value)} placeholder="AA-00-AA" /></Field>
        <Field label="Modelo"><input className="field" value={v.model ?? ''} onChange={(e) => set('model', e.target.value)} /></Field>
        <Field label="Ano"><input type="number" className="field" value={v.year ?? ''} onChange={(e) => set('year', e.target.value)} /></Field>
        <Field label="Quilómetros"><input type="number" className="field" value={v.km ?? ''} onChange={(e) => set('km', e.target.value)} /></Field>
        <Field label="Estado">
          <select className="field" value={v.status ?? 'ativa'} onChange={(e) => set('status', e.target.value)}>
            <option value="ativa">Ativa</option><option value="manutencao">Em manutenção</option><option value="inativa">Inativa</option>
          </select>
        </Field>
        <Field label="Notas" className="sm:col-span-2"><textarea className="field" rows={2} value={v.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
