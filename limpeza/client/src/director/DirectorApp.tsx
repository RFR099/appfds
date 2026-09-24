import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { cx, Icon } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { cap, dateTime } from '../lib/format'
import type { Alert } from '../lib/types'
import { useApi } from '../lib/useApi'
import Billing from './Billing'
import ClientDetail from './ClientDetail'
import Clients from './Clients'
import Costs from './Costs'
import Dashboard from './Dashboard'
import EmployeeDetail from './EmployeeDetail'
import Employees from './Employees'
import Operation from './Operation'
import Operators from './Operators'
import Profitability from './Profitability'
import Reports from './Reports'
import ServiceDetail from './ServiceDetail'
import ServiceForm from './ServiceForm'
import Services from './Services'
import Settings from './Settings'
import Teams from './Teams'
import Vans from './Vans'

const MENU = [
  ['', 'Dashboard', 'dashboard'],
  ['servicos', 'Serviços', 'services'],
  ['operacao', 'Operação', 'operation'],
  ['clientes', 'Clientes', 'clients'],
  ['funcionarios', 'Funcionários', 'employees'],
  ['operadores', 'Operadores', 'operators'],
  ['carrinhas', 'Carrinhas', 'vans'],
  ['equipas', 'Equipas', 'teams'],
  ['custos', 'Custos', 'costs'],
  ['faturacao', 'Faturação', 'billing'],
  ['rentabilidade', 'Rentabilidade', 'profit'],
  ['relatorios', 'Relatórios', 'reports'],
  ['definicoes', 'Definições', 'settings'],
] as const

export default function DirectorApp() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setMenuOpen(false), [loc.pathname])

  return (
    <div className="flex min-h-full">
      <aside className={cx(
        'fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-slate-900 text-slate-300 transition-transform lg:translate-x-0',
        menuOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
          <div className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 32 32" className="size-5"><path d="M16 4l3 7.5L26.5 14 19 17l-3 7.5-3-7.5L5.5 14 13 11z" fill="currentColor" /></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">BrilhoTotal</div>
            <div className="text-[11px] text-slate-400">Área do diretor</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {MENU.map(([path, label, icon]) => (
            <NavLink key={path} to={`/diretor${path ? `/${path}` : ''}`} end={!path}
              className={({ isActive }) => cx(
                'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                isActive ? 'bg-brand-700/90 font-medium text-white' : 'hover:bg-white/5 hover:text-white',
              )}>
              <Icon name={icon} className="size-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid size-8 place-items-center rounded-full bg-slate-700 text-xs font-semibold text-white">
              {user?.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-white">{user?.name}</div>
              <div className="text-[11px] text-slate-400">Diretor</div>
            </div>
            <button onClick={logout} className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" title="Terminar sessão">
              <Icon name="logout" className="size-[18px]" />
            </button>
          </div>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <Icon name="menu" />
          </button>
          <div className="hidden text-sm text-slate-500 sm:block">
            {cap(new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Lisbon' }))}
          </div>
          <div className="flex-1" />
          <Link to="/diretor/servicos/novo" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-800">
            <Icon name="plus" className="size-4" /> Novo serviço
          </Link>
          <AlertsBell />
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="servicos" element={<Services />} />
            <Route path="servicos/novo" element={<ServiceForm />} />
            <Route path="servicos/:id" element={<ServiceDetail />} />
            <Route path="servicos/:id/editar" element={<ServiceForm />} />
            <Route path="operacao" element={<Operation />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="clientes/:id" element={<ClientDetail />} />
            <Route path="funcionarios" element={<Employees />} />
            <Route path="funcionarios/:id" element={<EmployeeDetail />} />
            <Route path="operadores" element={<Operators />} />
            <Route path="carrinhas" element={<Vans />} />
            <Route path="equipas" element={<Teams />} />
            <Route path="custos" element={<Costs />} />
            <Route path="faturacao" element={<Billing />} />
            <Route path="rentabilidade" element={<Profitability />} />
            <Route path="relatorios" element={<Reports />} />
            <Route path="definicoes" element={<Settings />} />
            <Route path="*" element={<div className="py-20 text-center text-slate-500">Página não encontrada.</div>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

const SEVERITY_DOT: Record<string, string> = { alta: 'bg-rose-500', media: 'bg-amber-500', info: 'bg-sky-500' }

function AlertsBell() {
  const { data, reload } = useApi<{ alerts: Alert[]; unread: number }>('/admin/alerts', { poll: 20000 })
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const markRead = async (keys: string[]) => {
    if (!keys.length) return
    await api.post('/admin/alerts/read', { keys })
    reload()
  }
  const unread = data?.unread ?? 0

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Alertas">
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold text-white">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold">Alertas {unread > 0 && <span className="text-slate-400">({unread} por ler)</span>}</div>
            <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => markRead(data?.alerts.filter((a) => !a.read).map((a) => a.key) ?? [])}>
              Marcar todos como lidos
            </button>
          </div>
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {data?.alerts.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">Sem alertas.</li>}
            {data?.alerts.map((a) => (
              <li key={a.key}>
                <button className={cx('flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50', a.read && 'opacity-55')}
                  onClick={() => { markRead([a.key]); setOpen(false); nav(`/diretor/servicos/${a.service_id}`) }}>
                  <span className={cx('mt-1.5 size-2 shrink-0 rounded-full', SEVERITY_DOT[a.severity])} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">{a.title}</span>
                    <span className="block text-xs text-slate-500">{a.detail}</span>
                    <span className="block text-[11px] text-slate-400">#{a.service_id} · {dateTime(a.at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
