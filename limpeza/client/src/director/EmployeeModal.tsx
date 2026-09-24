import { useState } from 'react'
import { Button, ErrorBox, Field, Modal } from '../components/ui'
import { api } from '../lib/api'

export interface Employee {
  id?: number
  name: string
  job_title: string
  status: 'ativo' | 'inativo'
  hourly_rate: number
  phone: string | null
  email: string | null
  nif: string | null
  hired_at: string | null
  notes: string | null
}

const JOBS = ['Operador de limpeza', 'Especialista em vidros', 'Operador de máquinas', 'Chefe de carrinha']

export default function EmployeeModal({ initial, onClose, onSaved }: { initial: Partial<Employee>; onClose: () => void; onSaved: () => void }) {
  const [e, setE] = useState<Partial<Employee>>(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof Employee, v: string) => setE((x) => ({ ...x, [k]: v }))
  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      if (e.id) await api.put(`/admin/employees/${e.id}`, e)
      else await api.post('/admin/employees', e)
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={e.id ? 'Editar funcionário' : 'Novo funcionário'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={save}>Guardar</Button></>}>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Os funcionários são apenas registos internos: não têm login nem acesso à aplicação.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2"><input className="field" value={e.name ?? ''} onChange={(x) => set('name', x.target.value)} /></Field>
        <Field label="Cargo">
          <select className="field" value={e.job_title ?? JOBS[0]} onChange={(x) => set('job_title', x.target.value)}>{JOBS.map((j) => <option key={j}>{j}</option>)}</select>
        </Field>
        <Field label="Valor/hora (€) *"><input type="number" step="0.01" min="0" className="field" value={e.hourly_rate ?? ''} onChange={(x) => set('hourly_rate', x.target.value)} /></Field>
        <Field label="Estado">
          <select className="field" value={e.status ?? 'ativo'} onChange={(x) => set('status', x.target.value)}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select>
        </Field>
        <Field label="Data de admissão"><input type="date" className="field" value={e.hired_at ?? ''} onChange={(x) => set('hired_at', x.target.value)} /></Field>
        <Field label="Telefone"><input className="field" value={e.phone ?? ''} onChange={(x) => set('phone', x.target.value)} /></Field>
        <Field label="NIF"><input className="field" value={e.nif ?? ''} onChange={(x) => set('nif', x.target.value)} /></Field>
        <Field label="Email" className="sm:col-span-2"><input className="field" value={e.email ?? ''} onChange={(x) => set('email', x.target.value)} /></Field>
        <Field label="Notas" className="sm:col-span-2"><textarea className="field" rows={2} value={e.notes ?? ''} onChange={(x) => set('notes', x.target.value)} /></Field>
      </div>
    </Modal>
  )
}
