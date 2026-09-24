import { useState } from 'react'
import { CostBreakdown } from '../components/charts'
import { Button, Card, Empty, ErrorBox, Field, Icon, Loading, Modal, PageHeader, PeriodPicker, Stat } from '../components/ui'
import { api, qs } from '../lib/api'
import { date, EXPENSE_LABEL, firstOfMonth, lastOfMonth, localDate, money, money0 } from '../lib/format'
import type { Agg, Lookups } from '../lib/types'
import { useApi } from '../lib/useApi'

interface Expense { id: number; date: string; category: string; description: string; amount: number; van_id: number | null; van_name: string | null }
interface CostsData {
  direct: Agg
  overhead: number
  overhead_by_category: Record<string, number>
  total: number
  by_van: { id: number; name: string; services: number; fuel: number; expenses: number; total: number }[]
  expenses: Expense[]
}

export default function Costs() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(lastOfMonth())
  const { data, loading, reload } = useApi<CostsData>(`/admin/costs${qs({ from, to })}`)
  const { data: lk } = useApi<Lookups>('/admin/lookups')
  const [edit, setEdit] = useState<Partial<Expense> | null>(null)

  return (
    <div className="space-y-5">
      <PageHeader title="Custos" subtitle="Custos diretos dos serviços concluídos + custos gerais da empresa."
        actions={<>
          <PeriodPicker from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b) }} />
          <Button onClick={() => setEdit({ date: localDate(), category: 'manutencao' })}><Icon name="plus" className="size-4" /> Registar custo</Button>
        </>} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Custo total" value={money0(data.total)} />
            <Stat label="Custos diretos (serviços)" value={money0(data.direct.total_cost)} sub={`${data.direct.services} serviços concluídos`} />
            <Stat label="Custos gerais" value={money0(data.overhead)} sub={`${data.expenses.length} registos`} />
            <Stat label="Mão de obra" value={money0(data.direct.labor)} sub={`${data.direct.hours} h pagas`} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Custos diretos por natureza">
              <CostBreakdown parts={[
                { label: 'Funcionários', value: data.direct.labor },
                { label: 'Combustível', value: data.direct.fuel },
                { label: 'Materiais', value: data.direct.materials },
                { label: 'Outros', value: data.direct.other },
              ]} />
            </Card>
            <Card title="Custos gerais por categoria">
              {Object.keys(data.overhead_by_category).length === 0 ? <Empty>Sem custos gerais no período.</Empty> : (
                <CostBreakdown parts={Object.entries(data.overhead_by_category).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: EXPENSE_LABEL[k] ?? k, value: v }))} />
              )}
            </Card>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <Card title="Custos por carrinha" padded={false}>
              <table className="tbl">
                <thead><tr><th>Carrinha</th><th className="num">Serviços</th><th className="num">Combustível</th><th className="num">Despesas</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {data.by_van.map((v) => (
                    <tr key={v.id}><td>{v.name}</td><td className="num">{v.services}</td><td className="num">{money0(v.fuel)}</td><td className="num">{money0(v.expenses)}</td><td className="num font-medium">{money0(v.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Registo de custos gerais" className="xl:col-span-2" padded={false}>
              {data.expenses.length === 0 ? <Empty>Sem registos.</Empty> : (
                <div className="max-h-[32rem] overflow-auto">
                  <table className="tbl">
                    <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Carrinha</th><th className="num">Valor</th><th /></tr></thead>
                    <tbody>
                      {data.expenses.map((x) => (
                        <tr key={x.id}>
                          <td className="whitespace-nowrap">{date(`${x.date}T12:00:00`)}</td>
                          <td>{EXPENSE_LABEL[x.category] ?? x.category}</td>
                          <td>{x.description}</td>
                          <td>{x.van_name ?? '—'}</td>
                          <td className="num">{money(x.amount)}</td>
                          <td><button className="text-slate-400 hover:text-slate-700" onClick={() => setEdit(x)} aria-label="Editar"><Icon name="edit" className="size-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
      {edit && lk && <ExpenseModal initial={edit} lk={lk} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </div>
  )
}

function ExpenseModal({ initial, lk, onClose, onSaved }: { initial: Partial<Expense>; lk: Lookups; onClose: () => void; onSaved: () => void }) {
  const [x, setX] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof Expense, v: string) => setX((o) => ({ ...o, [k]: v }))
  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  const save = () => run(() => (x.id ? api.put(`/admin/expenses/${x.id}`, x) : api.post('/admin/expenses', x)))
  return (
    <Modal open onClose={onClose} title={x.id ? 'Editar custo' : 'Registar custo geral'}
      footer={<>
        {x.id && <Button variant="ghost" className="mr-auto text-rose-700" onClick={() => confirm('Eliminar este registo?') && run(() => api.del(`/admin/expenses/${x.id}`))}>Eliminar</Button>}
        <Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar</Button>
      </>}>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data *"><input type="date" className="field" value={x.date ?? ''} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Categoria *">
          <select className="field" value={x.category ?? ''} onChange={(e) => set('category', e.target.value)}>
            {lk.expense_categories.map((c) => <option key={c} value={c}>{EXPENSE_LABEL[c] ?? c}</option>)}
          </select>
        </Field>
        <Field label="Descrição *" className="sm:col-span-2"><input className="field" value={x.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Valor (€) *"><input type="number" step="0.01" min="0" className="field" value={x.amount ?? ''} onChange={(e) => set('amount', e.target.value)} /></Field>
        <Field label="Carrinha (opcional)">
          <select className="field" value={x.van_id ?? ''} onChange={(e) => set('van_id', e.target.value)}>
            <option value="">—</option>{lk.vans.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}
