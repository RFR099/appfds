import { useState } from 'react'
import { Badge, Button, Card, cx, ErrorBox, Field, Icon, Loading, Modal, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { money } from '../lib/format'
import type { Lookups } from '../lib/types'
import { useApi } from '../lib/useApi'

interface Team {
  id: number
  name: string
  van_id: number | null
  leader_user_id: number | null
  active: number
  van_name: string | null
  leader_name: string | null
  members: { id: number; name: string; job_title: string; hourly_rate: number; status: string }[]
}

export default function Teams() {
  const { data, loading, reload } = useApi<Team[]>('/admin/teams')
  const { data: lk } = useApi<Lookups>('/admin/lookups')
  const [edit, setEdit] = useState<{ id?: number; name: string; van_id: string; leader_user_id: string; member_ids: number[]; active: boolean } | null>(null)

  return (
    <div>
      <PageHeader title="Equipas" subtitle="Equipas base (carrinha + chefe + funcionários). Ao criar um serviço, escolher a equipa preenche tudo automaticamente."
        actions={<Button onClick={() => setEdit({ name: '', van_id: '', leader_user_id: '', member_ids: [], active: true })}><Icon name="plus" className="size-4" /> Nova equipa</Button>} />
      {loading && !data ? <Loading /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((t) => {
            const rate = t.members.reduce((a, m) => a + m.hourly_rate, 0)
            return (
              <Card key={t.id} className={t.active ? '' : 'opacity-60'} title={<span className="flex items-center gap-2">{t.name} {!t.active && <Badge>Inativa</Badge>}</span>}
                actions={<button className="text-slate-400 hover:text-slate-700" aria-label="Editar" onClick={() => setEdit({ id: t.id, name: t.name, van_id: t.van_id ? String(t.van_id) : '', leader_user_id: t.leader_user_id ? String(t.leader_user_id) : '', member_ids: t.members.map((m) => m.id), active: !!t.active })}><Icon name="edit" className="size-4" /></button>}>
                <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-xs text-slate-500">Carrinha</div><div className="font-medium">{t.van_name ?? '—'}</div></div>
                  <div><div className="text-xs text-slate-500">Chefe de carrinha</div><div className="font-medium">{t.leader_name ?? '—'}</div></div>
                </div>
                <div className="text-xs text-slate-500">Funcionários ({t.members.length}) · {money(rate)}/h</div>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {t.members.map((m) => <li key={m.id} className="flex justify-between"><span>{m.name}{m.status !== 'ativo' && <span className="text-rose-600"> (inativo)</span>}</span><span className="text-xs text-slate-400">{m.job_title}</span></li>)}
                </ul>
              </Card>
            )
          })}
        </div>
      )}
      {edit && lk && (
        <TeamModal value={edit} lk={lk} onChange={setEdit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />
      )}
    </div>
  )
}

type TeamForm = { id?: number; name: string; van_id: string; leader_user_id: string; member_ids: number[]; active: boolean }
function TeamModal({ value: t, lk, onChange, onClose, onSaved }: { value: TeamForm; lk: Lookups; onChange: (t: TeamForm) => void; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    setError(null)
    try {
      const body = { ...t, van_id: t.van_id || null, leader_user_id: t.leader_user_id || null }
      if (t.id) await api.put(`/admin/teams/${t.id}`, body)
      else await api.post('/admin/teams', body)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  const toggle = (id: number) => onChange({ ...t, member_ids: t.member_ids.includes(id) ? t.member_ids.filter((x) => x !== id) : [...t.member_ids, id] })
  return (
    <Modal open wide onClose={onClose} title={t.id ? `Editar ${t.name}` : 'Nova equipa'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar</Button></>}>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nome *"><input className="field" value={t.name} onChange={(e) => onChange({ ...t, name: e.target.value })} /></Field>
        <Field label="Carrinha">
          <select className="field" value={t.van_id} onChange={(e) => onChange({ ...t, van_id: e.target.value })}>
            <option value="">—</option>{lk.vans.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        <Field label="Chefe de carrinha">
          <select className="field" value={t.leader_user_id} onChange={(e) => onChange({ ...t, leader_user_id: e.target.value })}>
            <option value="">—</option>{lk.operators.filter((o) => o.active).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="label mt-4">Funcionários</div>
      <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-3">
        {lk.employees.filter((e) => e.status === 'ativo' && e.job_title !== 'Chefe de carrinha').map((e) => (
          <label key={e.id} className={cx('flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm', t.member_ids.includes(e.id) ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50')}>
            <input type="checkbox" checked={t.member_ids.includes(e.id)} onChange={() => toggle(e.id)} /> {e.name}
          </label>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={t.active} onChange={(e) => onChange({ ...t, active: e.target.checked })} /> Equipa ativa</label>
    </Modal>
  )
}
