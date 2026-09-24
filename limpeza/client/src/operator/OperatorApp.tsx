import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { cx, Icon } from '../components/ui'
import { useAuth } from '../lib/auth'
import { dateLong } from '../lib/format'
import FinishService from './FinishService'
import History from './History'
import Profile from './Profile'
import ServiceList from './ServiceList'
import ServicePage from './ServicePage'
import Today from './Today'

const NAV = [
  ['', 'Hoje', 'today'],
  ['servicos', 'Serviços', 'services'],
  ['historico', 'Histórico', 'history'],
  ['perfil', 'Perfil', 'user'],
] as const

/** Interface do tablet do chefe de carrinha: poucos elementos, texto e botões grandes. */
export default function OperatorApp() {
  const { user } = useAuth()
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex min-h-full flex-col bg-slate-100 text-lg">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-brand-800 px-5 text-white shadow">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-white/15">
            <svg viewBox="0 0 32 32" className="size-5"><path d="M16 4l3 7.5L26.5 14 19 17l-3 7.5-3-7.5L5.5 14 13 11z" fill="currentColor" /></svg>
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold">{user?.name}</div>
            <div className="text-xs text-brand-100">Chefe de carrinha</div>
          </div>
        </div>
        <div className="text-right leading-tight">
          <div className="text-2xl font-semibold tabular-nums">{now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })}</div>
          <div className="text-xs text-brand-100">{dateLong(now.toISOString())}</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-5 pb-32 sm:px-6">
        <Routes>
          <Route index element={<Today />} />
          <Route path="servicos" element={<ServiceList />} />
          <Route path="servicos/:id" element={<ServicePage />} />
          <Route path="servicos/:id/terminar" element={<FinishService />} />
          <Route path="historico" element={<History />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="*" element={<div className="py-20 text-center text-slate-500">Página não encontrada.</div>} />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="mx-auto grid max-w-4xl grid-cols-4">
          {NAV.map(([path, label, icon]) => (
            <NavLink key={path} to={`/operador${path ? `/${path}` : ''}`} end={!path}
              className={({ isActive }) => cx('flex min-h-20 flex-col items-center justify-center gap-1 text-base font-semibold transition', isActive ? 'text-brand-700' : 'text-slate-500 active:bg-slate-50')}>
              {({ isActive }) => (
                <>
                  <span className={cx('grid h-9 w-16 place-items-center rounded-full', isActive && 'bg-brand-100')}><Icon name={icon} className="size-7" /></span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
