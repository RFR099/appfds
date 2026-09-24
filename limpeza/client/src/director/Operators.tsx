import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, ErrorBox, Field, Icon, Loading, Modal, PageHeader, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { dateTime, money } from '../lib/format'
import type { Lookups } from '../lib/types'
import { useApi } from '../lib/useApi'

interface Operator {
  id: number
  username: string
  name: string
  phone: string | null
  active: number
  can_manage_team: number
  last_login_at: string | null
  employee_id: number | null
  hourly_rate: number | null
  team_name: string | null
  van_name: string | null
  month_done: number
  today_total: number
  month_problems: number
  current_status: string | null
}

export default function Operators() {
  const { data, loading, reload } = useApi<Operator[]>('/admin/operators')
  const [edit, setEdit] = useState<Partial<Operator> & { password?: string; hourly_rate?: number | null } | null>(null)

  return (
    <div>
      <PageHeader title="Operadores / chefes de carrinha"
        subtitle="Únicos utilizadores (além do diretor) com acesso à aplicação — só veem os serviços que lhes são atribuídos e nunca dados financeiros."
        actions={<Button onClick={() => setEdit({ active: 1, can_manage_team: 0, hourly_rate: 11 })}><Icon name="plus" className="size-4" /> Novo operador</Button>} />
      {loading && !data ? <Loading /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((o) => (
            <Card key={o.id} className={o.active ? '' : 'opacity-60'}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-full bg-brand-100 font-semibold text-brand-800">{o.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
                  <div>
                    <div className="font-semibold text-slate-900">{o.name}</div>
                    <div className="text-xs text-slate-500">@{o.username} · {o.phone ?? 'sem telefone'}</div>
                  </div>
                </div>
                {o.active ? (o.current_status ? <StatusBadge status={o.current_status} /> : <Badge>Disponível</Badge>) : <Badge tone="red">Desativado</Badge>}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-slate-50 py-2"><dt className="text-[11px] text-slate-500">Hoje</dt><dd className="font-semibold">{o.today_total}</dd></div>
                <div className="rounded-lg bg-slate-50 py-2"><dt className="text-[11px] text-slate-500">Concluídos (mês)</dt><dd className="font-semibold">{o.month_done}</dd></div>
                <div className="rounded-lg bg-slate-50 py-2"><dt className="text-[11px] text-slate-500">Com problemas</dt><dd className="font-semibold">{o.month_problems}</dd></div>
              </dl>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div>Equipa base: <b className="text-slate-700">{o.team_name ?? '—'}</b>{o.van_name && ` · ${o.van_name}`}</div>
                <div>Valor/hora: {money(o.hourly_rate)} · Último acesso: {dateTime(o.last_login_at)}</div>
                <div>{o.can_manage_team ? <Badge tone="brand">Pode ajustar a equipa no tablet</Badge> : 'Sem permissão para alterar equipas'}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => setEdit(o)}><Icon name="edit" className="size-4" /> Editar</Button>
                <Link to={`/diretor/servicos?operator_id=${o.id}`}><Button variant="ghost">Serviços</Button></Link>
                {o.employee_id && <Link to={`/diretor/funcionarios/${o.employee_id}`}><Button variant="ghost">Horas</Button></Link>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {edit && <OperatorModal initial={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </div>
  )
}

function OperatorModal({ initial, onClose, onSaved }: { initial: Partial<Operator> & { password?: string; hourly_rate?: number | null }; onClose: () => void; onSaved: () => void }) {
  const [o, setO] = useState({ ...initial, password: '', employee_id: initial.employee_id ?? null })
  const { data: lk } = useApi<Lookups>(initial.id ? null : '/admin/lookups')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: unknown) => setO((x) => ({ ...x, [k]: v }))
  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      if (o.id) await api.put(`/admin/operators/${o.id}`, { ...o, password: o.password || undefined })
      else await api.post('/admin/operators', o)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }
  const candidates = lk?.employees.filter((e) => e.status === 'ativo' && e.job_title !== 'Chefe de carrinha') ?? []
  return (
    <Modal open onClose={onClose} title={o.id ? `Editar ${o.name}` : 'Novo operador (chefe de carrinha)'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={save}>Guardar</Button></>}>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {!o.id && (
          <Field label="Promover funcionário existente (opcional)" className="sm:col-span-2" hint="Se escolher um funcionário, a conta fica ligada ao seu registo (horas e valor/hora).">
            <select className="field" value={o.employee_id ?? ''} onChange={(e) => {
              const emp = candidates.find((x) => String(x.id) === e.target.value)
              setO((x) => ({ ...x, employee_id: emp?.id ?? null, name: emp?.name ?? x.name }))
            }}>
              <option value="">— Criar novo registo de funcionário —</option>
              {candidates.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Nome *" className="sm:col-span-2"><input className="field" value={o.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
        {!o.id && <Field label="Utilizador *"><input className="field" autoCapitalize="none" value={o.username ?? ''} onChange={(e) => set('username', e.target.value)} placeholder="nome.apelido" /></Field>}
        <Field label={o.id ? 'Nova password (deixe vazio para manter)' : 'Password * (mín. 8)'}><input type="password" className="field" autoComplete="new-password" value={o.password} onChange={(e) => set('password', e.target.value)} /></Field>
        <Field label="Telefone"><input className="field" value={o.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        {!o.id && !o.employee_id && <Field label="Valor/hora (€)"><input type="number" step="0.01" className="field" value={o.hourly_rate ?? ''} onChange={(e) => set('hourly_rate', e.target.value)} /></Field>}
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={!!o.can_manage_team} onChange={(e) => set('can_manage_team', e.target.checked)} /> Autorizado a adicionar/remover funcionários nos seus serviços</label>
        {o.id && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={!!o.active} onChange={(e) => set('active', e.target.checked)} /> Conta ativa (desativar bloqueia o acesso imediatamente)</label>}
      </div>
    </Modal>
  )
}
