import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Empty, ErrorBox, Icon, InvoiceBadge, Loading, PageHeader, StatusBadge } from '../components/ui'
import { qs } from '../lib/api'
import { dateShort, marginClass, money, pct, STATUS, time } from '../lib/format'
import type { Lookups, ServiceRow } from '../lib/types'
import { useApi } from '../lib/useApi'

interface ListResponse {
  rows: ServiceRow[]
  total: number
  page: number
  page_size: number
  totals: { value: number; cost: number; profit: number }
}

export default function Services() {
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const f = Object.fromEntries(sp.entries())
  const [q, setQ] = useState(f.q ?? '')
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v)
    else n.delete(k)
    if (k !== 'page') n.delete('page')
    setSp(n, { replace: true })
  }
  const { data: lk } = useApi<Lookups>('/admin/lookups')
  const { data, error, loading } = useApi<ListResponse>(`/admin/services${qs({ ...f, page_size: 50 })}`)
  const pages = data ? Math.ceil(data.total / data.page_size) : 1
  const margin = data && data.totals.value ? (data.totals.profit / data.totals.value) * 100 : null

  return (
    <div>
      <PageHeader title="Serviços" subtitle="Todos os serviços da empresa — planeamento, execução e resultado."
        actions={<Link to="/diretor/servicos/novo"><Button><Icon name="plus" className="size-4" /> Novo serviço</Button></Link>} />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <form className="col-span-2" onSubmit={(e) => { e.preventDefault(); set('q', q) }}>
            <input className="field" placeholder="Pesquisar cliente, local ou nº…" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => set('q', q)} />
          </form>
          <input type="date" className="field" value={f.from ?? ''} onChange={(e) => set('from', e.target.value)} aria-label="Desde" title="Desde" />
          <input type="date" className="field" value={f.to ?? ''} onChange={(e) => set('to', e.target.value)} aria-label="Até" title="Até" />
          <select className="field" value={f.status ?? ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">Todos os estados</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="field" value={f.operator_id ?? ''} onChange={(e) => set('operator_id', e.target.value)}>
            <option value="">Todos os chefes</option>
            {lk?.operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select className="field" value={f.van_id ?? ''} onChange={(e) => set('van_id', e.target.value)}>
            <option value="">Todas as carrinhas</option>
            {lk?.vans.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select className="field" value={f.client_id ?? ''} onChange={(e) => set('client_id', e.target.value)}>
            <option value="">Todos os clientes</option>
            {lk?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={f.problems === '1'} onChange={(e) => set('problems', e.target.checked ? '1' : '')} /> Só com problemas</label>
          <select className="field w-auto" value={f.sort ?? 'desc'} onChange={(e) => set('sort', e.target.value === 'desc' ? '' : e.target.value)}>
            <option value="desc">Mais recentes primeiro</option>
            <option value="asc">Mais antigos primeiro</option>
          </select>
          {sp.size > 0 && <button className="text-brand-700 hover:underline" onClick={() => { setQ(''); setSp({}, { replace: true }) }}>Limpar filtros</button>}
        </div>
      </Card>

      {data && (
        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
          <span><b className="text-slate-900">{data.total}</b> serviços</span>
          <span>Valor <b className="text-slate-900">{money(data.totals.value)}</b></span>
          <span>Custo <b className="text-slate-900">{money(data.totals.cost)}</b></span>
          <span>Lucro <b className="text-slate-900">{money(data.totals.profit)}</b></span>
          <span>Margem <b className={marginClass(margin)}>{pct(margin)}</b></span>
        </div>
      )}

      <Card padded={false}>
        {loading && !data ? <Loading /> : error ? <div className="p-4"><ErrorBox message={error} /></div> : !data?.rows.length ? <Empty>Nenhum serviço encontrado.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nº</th><th>Data</th><th>Cliente</th><th>Carrinha</th><th>Chefe</th><th>Equipa</th><th>Estado</th>
                  <th className="num">Valor</th><th className="num">Custo</th><th className="num">Margem</th><th>Faturação</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((s) => {
                  const m = s.value ? (s.profit / s.value) * 100 : null
                  return (
                    <tr key={s.id} className="cursor-pointer" onClick={() => nav(`/diretor/servicos/${s.id}`)}>
                      <td className="text-slate-500">#{s.id}</td>
                      <td className="whitespace-nowrap">
                        <div >{dateShort(s.scheduled_start)}</div>
                        <div className="text-xs text-slate-400 tabular-nums">{time(s.scheduled_start)}–{time(s.scheduled_end)}</div>
                      </td>
                      <td>
                        <div className="max-w-[15rem] truncate font-medium">{s.client_name}</div>
                        <div className="text-xs text-slate-400">{s.service_type} · {s.city}</div>
                      </td>
                      <td className="whitespace-nowrap">{s.van_name ?? '—'}</td>
                      <td className="whitespace-nowrap">{s.operator_name ?? <span className="text-rose-600">Sem chefe</span>}</td>
                      <td className="text-center">{s.team_size}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <StatusBadge status={s.status} />
                          {!!s.had_problems && <span className="text-rose-600" title="Problema registado"><Icon name="warning" className="size-4" /></span>}
                        </div>
                      </td>
                      <td className="num">{money(s.value)}</td>
                      <td className="num text-slate-600">{money(s.total_cost)}</td>
                      <td className={`num font-medium ${marginClass(m)}`}>{s.status === 'cancelado' ? '—' : pct(m)}</td>
                      <td>{s.status === 'concluido' ? <InvoiceBadge status={s.invoice_status} /> : <span className="text-xs text-slate-400">—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">Página {data.page} de {pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={data.page <= 1} onClick={() => set('page', String(data.page - 1))}>Anterior</Button>
              <Button variant="secondary" disabled={data.page >= pages} onClick={() => set('page', String(data.page + 1))}>Seguinte</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
