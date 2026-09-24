import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, cx, Empty, InvoiceBadge, Loading, PageHeader, PeriodPicker, Stat, Tabs } from '../components/ui'
import { api, qs } from '../lib/api'
import { addDays, date, firstOfMonth, localDate, money, money0 } from '../lib/format'
import type { ServiceRow } from '../lib/types'
import { useApi } from '../lib/useApi'

interface BillingData {
  vat_rate: number
  summary: Record<'por_faturar' | 'faturado' | 'pago', { n: number; total: number }>
  by_client: { id: number; name: string; n: number; total: number; open_amount: number }[]
}
type Tab = 'por_faturar' | 'faturado' | 'pago'

export default function Billing() {
  const [from, setFrom] = useState(firstOfMonth(addDays(localDate(), -62)))
  const [to, setTo] = useState(localDate())
  const [tab, setTab] = useState<Tab>('por_faturar')
  const [sel, setSel] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const { data, reload: reloadSummary } = useApi<BillingData>(`/admin/billing${qs({ from, to })}`)
  const list = useApi<{ rows: ServiceRow[]; total: number }>(`/admin/services${qs({ from, to, invoice_status: tab, page_size: 500, sort: 'asc' })}`)
  const rows = list.data?.rows ?? []
  const vat = (data?.vat_rate ?? 23) / 100

  const mark = async (status: Tab) => {
    setBusy(true)
    await api.post('/admin/billing/mark', { ids: sel, status }).catch((e) => alert((e as Error).message))
    setSel([])
    setBusy(false)
    list.reload()
    reloadSummary()
  }
  const selTotal = rows.filter((r) => sel.includes(r.id)).reduce((a, r) => a + r.value, 0)

  return (
    <div className="space-y-5">
      <PageHeader title="Faturação" subtitle="Serviços concluídos: faturar, acompanhar recebimentos e valores em aberto."
        actions={<PeriodPicker from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); setSel([]) }} />} />
      {data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Faturação do período" value={money0(data.summary.por_faturar.total + data.summary.faturado.total + data.summary.pago.total)} sub={`s/ IVA · c/ IVA ${money0((data.summary.por_faturar.total + data.summary.faturado.total + data.summary.pago.total) * (1 + vat))}`} />
          <Stat label="Por faturar" value={money0(data.summary.por_faturar.total)} sub={`${data.summary.por_faturar.n} serviços`} tone="amber" onClick={() => setTab('por_faturar')} />
          <Stat label="Faturado, por receber" value={money0(data.summary.faturado.total)} sub={`${data.summary.faturado.n} faturas`} tone="sky" onClick={() => setTab('faturado')} />
          <Stat label="Recebido" value={money0(data.summary.pago.total)} sub={`${data.summary.pago.n} faturas`} tone="green" onClick={() => setTab('pago')} />
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2" padded={false}
          title={<Tabs value={tab} onChange={(t) => { setTab(t); setSel([]) }} options={[['por_faturar', 'Por faturar'], ['faturado', 'Faturado'], ['pago', 'Pago']]} />}
          actions={sel.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">{sel.length} sel. · {money(selTotal)}</span>
              {tab === 'por_faturar' && <Button disabled={busy} onClick={() => mark('faturado')}>Emitir faturas</Button>}
              {tab === 'faturado' && <Button disabled={busy} onClick={() => mark('pago')}>Marcar como pagas</Button>}
            </div>
          )}>
          {list.loading && !list.data ? <Loading /> : rows.length === 0 ? <Empty>Nada nesta categoria.</Empty> : (
            <div className="max-h-[36rem] overflow-auto">
              <table className="tbl">
                <thead><tr>
                  <th className="w-8">{tab !== 'pago' && <input type="checkbox" checked={sel.length === rows.length} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])} aria-label="Selecionar todos" />}</th>
                  <th>Serviço</th><th>Data</th><th>Cliente</th><th>Fatura</th><th className="num">Valor</th><th className="num">c/ IVA</th><th>Estado</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={cx(sel.includes(r.id) && 'bg-brand-50')}>
                      <td>{tab !== 'pago' && <input type="checkbox" checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} aria-label={`Selecionar ${r.id}`} />}</td>
                      <td><Link to={`/diretor/servicos/${r.id}`} className="text-brand-700 hover:underline">#{r.id}</Link></td>
                      <td>{date(r.scheduled_start)}</td>
                      <td>{r.client_name}</td>
                      <td className="text-xs">{r.invoice_number ?? '—'}</td>
                      <td className="num">{money(r.value)}</td>
                      <td className="num text-slate-500">{money(r.value * (1 + vat))}</td>
                      <td><InvoiceBadge status={r.invoice_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Clientes (período)" padded={false}>
          <table className="tbl">
            <thead><tr><th>Cliente</th><th className="num">Faturação</th><th className="num">Em aberto</th></tr></thead>
            <tbody>
              {data?.by_client.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/diretor/clientes/${c.id}`} className="hover:underline">{c.name}</Link><div className="text-xs text-slate-400">{c.n} serviços</div></td>
                  <td className="num">{money0(c.total)}</td>
                  <td className={cx('num', c.open_amount > 0 && 'text-orange-700')}>{c.open_amount > 0 ? money0(c.open_amount) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
