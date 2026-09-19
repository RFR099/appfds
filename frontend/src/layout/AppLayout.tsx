import { Outlet } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import Sidebar from "./Sidebar"

export default function AppLayout() {
  const { utilizador, papeis, logout } = useAuth()

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-brand-900 px-6 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧪</span>
          <span className="font-semibold tracking-wide">
            Plataforma Gestão de Produtos Químicos
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            {utilizador} <span className="text-brand-100">({papeis.join(", ")})</span>
          </span>
          <button onClick={logout} className="rounded bg-brand-700 px-3 py-1.5 hover:bg-brand-600">
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
