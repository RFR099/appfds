import { NavLink } from "react-router-dom"

const navItemBase =
  "block rounded-md px-4 py-3 text-sm font-medium transition-colors"

function navItemClass({ isActive }: { isActive: boolean }) {
  return `${navItemBase} ${isActive ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`
}

export default function Sidebar() {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4">
      <NavLink
        to="/fds/nova"
        className="flex items-center justify-center gap-2 rounded-md bg-brand-800 py-3 font-semibold text-white hover:bg-brand-900"
      >
        <span className="text-lg leading-none">+</span> NOVA
      </NavLink>

      <div className="overflow-hidden rounded-md">
        <div className="bg-brand-700 px-4 py-3 font-semibold text-white">
          Fichas de Dados de Segurança
        </div>
        <nav className="flex flex-col gap-1 bg-slate-50 p-2">
          <NavLink to="/fds?estado=RASCUNHO" className={navItemClass}>
            Rascunhos
          </NavLink>
          <NavLink to="/alertas" className={navItemClass}>
            <span className="flex items-center justify-between">
              Alertas
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">+99</span>
            </span>
          </NavLink>
          <NavLink to="/obras" className={navItemClass}>
            Obras
          </NavLink>
          <NavLink to="/centros-produtivos" className={navItemClass}>
            Centros Produtivos
          </NavLink>
        </nav>
      </div>
    </aside>
  )
}
