import { useState } from 'react'
import { Button, ErrorBox, Field, Modal } from '../components/ui'
import { api } from '../lib/api'

export interface Client {
  id?: number
  name: string
  type: string
  nif: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  notes: string | null
  active: number
}

export default function ClientModal({ initial, types, onClose, onSaved }: { initial: Partial<Client>; types: string[]; onClose: () => void; onSaved: () => void }) {
  const [c, setC] = useState<Partial<Client>>(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof Client, v: string | number) => setC((x) => ({ ...x, [k]: v }))
  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      if (c.id) await api.put(`/admin/clients/${c.id}`, c)
      else await api.post('/admin/clients', c)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }
  const input = (k: keyof Client, label: string, cls = '') => (
    <Field label={label} className={cls}><input className="field" value={(c[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} /></Field>
  )
  return (
    <Modal open onClose={onClose} title={c.id ? 'Editar cliente' : 'Novo cliente'} wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={save}>Guardar</Button></>}>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {input('name', 'Nome *', 'sm:col-span-2')}
        <Field label="Tipo *">
          <select className="field" value={c.type ?? ''} onChange={(e) => set('type', e.target.value)}>{types.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        {input('nif', 'NIF')}
        {input('contact_name', 'Pessoa de contacto')}
        {input('phone', 'Telefone')}
        {input('email', 'Email', 'sm:col-span-2')}
        {input('address', 'Morada', 'sm:col-span-2')}
        {input('postal_code', 'Código postal')}
        {input('city', 'Localidade')}
        <Field label="Notas" className="sm:col-span-2"><textarea className="field" rows={2} value={c.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.active !== 0} onChange={(e) => set('active', e.target.checked ? 1 : 0)} /> Cliente ativo</label>
      </div>
    </Modal>
  )
}
