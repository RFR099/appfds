import { useEffect, useState } from 'react'
import { Button, Card, ErrorBox, Field, Loading, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

type S = Record<string, string>
const FIELDS: [string, string, string?][] = [
  ['company_name', 'Nome da empresa'],
  ['company_nif', 'NIF'],
  ['company_address', 'Morada'],
  ['vat_rate', 'Taxa de IVA (%)', 'number'],
  ['default_fuel_cost', 'Custo de combustível por omissão (€)', 'number'],
  ['alert_start_tolerance_min', 'Alerta "não iniciado" após (min)', 'number'],
  ['alert_overrun_tolerance_min', 'Alerta "ultrapassou horário" após (min)', 'number'],
]

export default function Settings() {
  const { data, loading } = useApi<S>('/admin/settings')
  const [s, setS] = useState<S>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pw, setPw] = useState({ current: '', next: '' })
  useEffect(() => { if (data) setS(data) }, [data])

  const save = async () => {
    setErr(null); setMsg(null)
    try { setS(await api.put<S>('/admin/settings', s)); setMsg('Definições guardadas.') } catch (e) { setErr((e as Error).message) }
  }
  const changePw = async () => {
    setErr(null); setMsg(null)
    try { await api.post('/auth/password', pw); setPw({ current: '', next: '' }); setMsg('Password alterada.') } catch (e) { setErr((e as Error).message) }
  }
  if (loading && !data) return <Loading />
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Definições" />
      {msg && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>}
      {err && <ErrorBox message={err} />}
      <Card title="Empresa e alertas">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(([k, label, type]) => (
            <Field key={k} label={label} className={k === 'company_address' || k === 'company_name' ? 'sm:col-span-2' : ''}>
              <input className="field" type={type ?? 'text'} value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <div className="mt-4 flex justify-end"><Button onClick={save}>Guardar</Button></div>
      </Card>
      <Card title="A minha password">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password atual"><input type="password" className="field" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="Nova password (mín. 8)"><input type="password" className="field" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="secondary" onClick={changePw}>Alterar password</Button></div>
      </Card>
      <Card title="Níveis de acesso">
        <ul className="space-y-2 text-sm text-slate-600">
          <li><b className="text-slate-900">Diretor</b> — acesso total: operação, finanças, clientes, funcionários, frota, relatórios e definições.</li>
          <li><b className="text-slate-900">Operador / chefe de carrinha</b> — apenas os serviços que lhe são atribuídos (iniciar, terminar, observações, fotografias, problemas). Sem acesso a valores, custos, margens, salários ou outros serviços. Garantido pela API, não só pela interface.</li>
          <li><b className="text-slate-900">Funcionários</b> — sem acesso. Existem apenas como registos internos.</li>
        </ul>
      </Card>
    </div>
  )
}
