import { useState } from 'react'
import { money, money0, monthLabel, pct } from '../lib/format'

interface MonthPoint {
  month: string
  revenue: number
  total_cost: number
  profit: number
  margin?: number | null
}

const SERIES = [
  { key: 'revenue', label: 'Faturação', color: 'var(--color-series-1)' },
  { key: 'total_cost', label: 'Custos diretos', color: 'var(--color-series-2)' },
] as const

function niceMax(v: number) {
  if (v <= 0) return 100
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

/** Barras agrupadas (faturação vs custos) + linha de lucro, tudo no mesmo eixo em €. */
export function MonthlyChart({ data, height = 240 }: { data: MonthPoint[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = height
  const pad = { l: 56, r: 12, t: 12, b: 28 }
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.revenue, d.total_cost)), 1))
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const band = iw / Math.max(data.length, 1)
  const bw = Math.min(26, (band - 16) / 2)
  const y = (v: number) => pad.t + ih - (Math.max(v, 0) / max) * ih
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const profitPts = data.map((d, i) => [pad.l + band * i + band / 2, y(d.profit)] as const)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: 'var(--color-series-3)' }} />
          Lucro
        </span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Faturação, custos e lucro por mês">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#64748b">{money0(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x0 = pad.l + band * i + band / 2 - bw - 1
            return (
              <g key={d.month}>
                {hover === i && <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="#f1f5f9" />}
                {SERIES.map((s, k) => {
                  const v = d[s.key]
                  const top = y(v)
                  const h = Math.max(pad.t + ih - top, 0)
                  const r = Math.min(4, h)
                  const x = x0 + k * (bw + 2)
                  return (
                    <path key={s.key} fill={s.color}
                      d={`M${x},${pad.t + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${pad.t + ih} Z`} />
                  )
                })}
                <text x={pad.l + band * i + band / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#64748b">{monthLabel(d.month)}</text>
              </g>
            )
          })}
          <polyline points={profitPts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--color-series-3)" strokeWidth={2} />
          {profitPts.map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={4} fill="var(--color-series-3)" stroke="#fff" strokeWidth={2} />
          ))}
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="#94a3b8" />
          {data.map((d, i) => (
            <rect key={d.month} x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)} />
          ))}
        </svg>
        {hover !== null && data[hover] && (
          <div className="pointer-events-none absolute top-2 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `${Math.min(((pad.l + band * hover + band) / W) * 100, 70)}%` }}>
            <div className="mb-1 font-semibold text-slate-800">{monthLabel(data[hover].month)}</div>
            <Row color="var(--color-series-1)" label="Faturação" value={money(data[hover].revenue)} />
            <Row color="var(--color-series-2)" label="Custos diretos" value={money(data[hover].total_cost)} />
            <Row color="var(--color-series-3)" label="Lucro" value={money(data[hover].profit)} />
            {data[hover].margin !== undefined && <div className="mt-1 text-slate-500">Margem {pct(data[hover].margin)}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-1.5 text-slate-600">
        <span className="size-2 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className="font-medium text-slate-900 tabular-nums">{value}</span>
    </div>
  )
}

/** Barras horizontais simples (uma série) para rankings. */
export function RankBars({ rows, format = money0 }: { rows: { label: string; value: number; sub?: string }[]; format?: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="truncate text-slate-700">{r.label}</span>
            <span className="shrink-0 font-medium text-slate-900 tabular-nums">
              {format(r.value)}
              {r.sub && <span className="ml-1.5 font-normal text-slate-500">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded bg-slate-100">
            <div className="h-2 rounded" style={{ width: `${(Math.max(r.value, 0) / max) * 100}%`, background: 'var(--color-series-1)' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Barra empilhada de composição de custos, com legenda. */
export function CostBreakdown({ parts }: { parts: { label: string; value: number }[] }) {
  const colors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
  const total = parts.reduce((a, p) => a + p.value, 0) || 1
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded">
        {parts.map((p, i) => p.value > 0 && (
          <div key={p.label} title={`${p.label}: ${money(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: colors[i % colors.length] }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="size-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} />
              {p.label}
            </span>
            <span className="font-medium text-slate-900 tabular-nums">
              {money0(p.value)} <span className="font-normal text-slate-400">{Math.round((p.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
