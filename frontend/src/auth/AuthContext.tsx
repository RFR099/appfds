import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import keycloak from "../lib/keycloak"

interface AuthState {
  autenticado: boolean
  utilizador: string | null
  papeis: string[]
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false)
  const [autenticado, setAutenticado] = useState(false)

  useEffect(() => {
    keycloak
      .init({ onLoad: "login-required", pkceMethod: "S256", checkLoginIframe: false })
      .then((ok) => {
        setAutenticado(ok)
        setPronto(true)
      })
      .catch(() => setPronto(true))
  }, [])

  if (!pronto) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-800 text-white">
        A autenticar…
      </div>
    )
  }

  if (!autenticado) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-800 text-white">
        Não foi possível autenticar. <button className="underline ml-2" onClick={() => keycloak.login()}>Tentar novamente</button>
      </div>
    )
  }

  const value: AuthState = {
    autenticado,
    utilizador: keycloak.tokenParsed?.preferred_username ?? null,
    papeis: (keycloak.tokenParsed?.realm_access?.roles as string[] | undefined) ?? [],
    logout: () => keycloak.logout({ redirectUri: window.location.origin }),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth tem de ser usado dentro de um AuthProvider")
  return ctx
}
