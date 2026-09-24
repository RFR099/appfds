import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cx, Icon, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { dateLong, localDate, time } from '../lib/format'
import type { OpService, OpServiceRow } from '../lib/types'

export function BigButton({ children, onClick, tone = 'brand', disabled, icon }: { children: ReactNode; onClick: () => void; tone?: 'brand' | 'amber' | 'rose' | 'sky' | 'slate'; disabled?: boolean; icon?: string }) {
  const tones = {
    brand: 'bg-emerald-600 active:bg-emerald-700 text-white',
    amber: 'bg-amber-500 active:bg-amber-600 text-white',
    rose: 'bg-rose-600 active:bg-rose-700 text-white',
    sky: 'bg-sky-600 active:bg-sky-700 text-white',
    slate: 'bg-white text-slate-700 ring-2 ring-slate-300 active:bg-slate-100',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={cx('flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl px-6 text-2xl font-bold tracking-wide uppercase shadow-sm transition disabled:opacity-50', tones[tone])}>
      {icon && <Icon name={icon} className="size-8" />}
      {children}
    </button>
  )
}

/** Cartão grande com toda a informação operacional do serviço (sem valores financeiros). */
export function ServiceCard({ s, heading }: { s: OpService; heading?: string }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      {heading && <div className="bg-slate-800 px-6 py-2.5 text-sm font-bold tracking-[0.2em] text-white uppercase">{heading}</div>}
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{s.client.name}</h2>
            <div className="mt-1 text-2xl font-semibold text-slate-700 tabular-nums">
              {time(s.scheduled_start)} — {time(s.scheduled_end)}
              {localDate(new Date(s.scheduled_start)) !== localDate() && <span className="ml-2 text-lg font-normal text-slate-500">{dateLong(s.scheduled_start)}</span>}
            </div>
            <div className="mt-1 text-base text-slate-500">{s.service_type} · Serviço #{s.id}</div>
          </div>
          <StatusBadge status={s.status} large />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Block label="Local" icon="pin">
            <div className="text-xl">{s.address}</div>
            <div className="text-slate-500">{s.city}</div>
            {s.address && (
              <a className="mt-1 inline-block text-base font-semibold text-brand-700 underline" target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.address}, ${s.city ?? ''}`)}`}>Abrir no mapa</a>
            )}
          </Block>
          <Block label="Carrinha" icon="truck">
            <div className="text-xl">{s.van?.name ?? '—'}</div>
            {s.van && <div className="text-slate-500">{s.van.plate} · {s.van.model}</div>}
          </Block>
          <Block label="Chefe de carrinha" icon="user">
            <div className="text-xl">{s.leader_name}</div>
          </Block>
          <Block label="Contacto no local" icon="phone">
            <div className="text-xl">{s.client.contact_name ?? '—'}</div>
            {s.client.phone && <a href={`tel:${s.client.phone}`} className="text-base font-semibold text-brand-700 underline">{s.client.phone}</a>}
          </Block>
        </div>

        <Block label={`Equipa (${s.team.length})`} icon="employees" className="mt-5">
          <ul className="mt-1 grid gap-2 sm:grid-cols-2">
            {s.team.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xl">
                <span className="grid size-10 place-items-center rounded-full bg-brand-100 text-base font-bold text-brand-800">{m.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                <span>{m.name}{!!m.is_leader && <span className="ml-2 text-sm font-semibold text-brand-700">CHEFE</span>}</span>
                {m.present === 0 && <span className="ml-auto text-sm text-rose-600">ausente</span>}
              </li>
            ))}
          </ul>
        </Block>

        {s.instructions && (
          <div className="mt-5 rounded-2xl bg-amber-50 px-5 py-4 text-xl text-amber-900 ring-1 ring-amber-200">
            <div className="text-sm font-bold tracking-wider uppercase">Instruções</div>
            {s.instructions}
          </div>
        )}

        {(s.started_at || s.finished_at) && (
          <div className="mt-5 flex flex-wrap gap-6 text-xl">
            {s.started_at && <div><span className="text-base text-slate-500">Iniciado às </span><b className="tabular-nums">{time(s.started_at)}</b></div>}
            {s.finished_at && <div><span className="text-base text-slate-500">Terminado às </span><b className="tabular-nums">{time(s.finished_at)}</b></div>}
          </div>
        )}
      </div>
    </section>
  )
}

function Block({ label, icon, children, className }: { label: string; icon: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-1.5 text-sm font-bold tracking-wider text-slate-500 uppercase"><Icon name={icon} className="size-4" />{label}</div>
      {children}
    </div>
  )
}

/** Botões de ação do serviço conforme o estado. */
export function ServiceActions({ s, onChanged }: { s: OpService; onChanged: (s: OpService, message?: string) => void }) {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (path: string) => {
    setBusy(true)
    setError(null)
    try {
      const r = await api.post<OpService | { message: string; service: OpService }>(`/op/services/${s.id}/${path}`)
      if ('service' in r) onChanged(r.service, r.message)
      else onChanged(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3">
      {error && <div className="rounded-2xl bg-rose-50 px-5 py-4 text-lg text-rose-800 ring-1 ring-rose-200">{error}</div>}
      {s.status === 'agendado' && <BigButton tone="sky" icon="truck" disabled={busy} onClick={() => run('travel')}>Iniciar deslocação</BigButton>}
      {(s.status === 'agendado' || s.status === 'em_deslocacao') && <BigButton icon="play" disabled={busy} onClick={() => run('start')}>Iniciar serviço</BigButton>}
      {s.status === 'em_execucao' && <BigButton tone="rose" icon="stop" disabled={busy} onClick={() => nav(`/operador/servicos/${s.id}/terminar`)}>Terminar serviço</BigButton>}
      {s.status === 'concluido' && (
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-50 py-6 text-2xl font-bold text-emerald-800 ring-1 ring-emerald-200">
          <Icon name="check" className="size-8" /> Serviço concluído às {time(s.finished_at)}
        </div>
      )}
    </div>
  )
}

export function ServiceRowCard({ s, onClick }: { s: OpServiceRow; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 active:bg-slate-50">
      <div className="w-24 shrink-0 text-center">
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{time(s.scheduled_start)}</div>
        <div className="text-base text-slate-500 tabular-nums">{time(s.scheduled_end)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xl font-bold text-slate-900">{s.client_name}</div>
        <div className="truncate text-base text-slate-500">{s.address}, {s.city}</div>
        <div className="text-sm text-slate-400">{s.van_name} · {s.team_size} pessoas</div>
      </div>
      <StatusBadge status={s.status} />
      <Icon name="chevron" className="size-6 shrink-0 text-slate-400" />
    </button>
  )
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed inset-x-4 top-20 z-50 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-emerald-600 px-6 py-5 text-2xl font-bold text-white shadow-xl" role="status" onClick={onDone}>
      <Icon name="check" className="size-8" /> {message}
    </div>
  )
}
