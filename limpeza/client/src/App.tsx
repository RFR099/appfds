import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loading } from './components/ui'
import { homeFor, useAuth } from './lib/auth'
import type { Role } from './lib/types'
import Login from './Login'

const DirectorApp = lazy(() => import('./director/DirectorApp'))
const OperatorApp = lazy(() => import('./operator/OperatorApp'))

/**
 * Guarda de rota por função. É apenas conveniência de interface — a segurança real está na API,
 * que recusa qualquer pedido fora da função do utilizador (ver server/src/app.js).
 */
function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />
  return <>{children}</>
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={homeFor(user)} replace /> : <Login />} />
        <Route path="/diretor/*" element={<RequireRole role="director"><DirectorApp /></RequireRole>} />
        <Route path="/operador/*" element={<RequireRole role="operator"><OperatorApp /></RequireRole>} />
        <Route path="*" element={<Navigate to={user ? homeFor(user) : '/login'} replace />} />
      </Routes>
    </Suspense>
  )
}
