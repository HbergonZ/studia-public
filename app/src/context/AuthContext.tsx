import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from '../lib/api'

export interface Usuario {
  id: number | string
  name?: string
  username?: string
  email: string
}

interface AuthContextValue {
  usuario: Usuario | null
  carregando: boolean
  login: (email: string, password: string) => Promise<void>
  registrar: (name: string, email: string, password: string, passwordConfirm: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function extrairUsuario(payload: { user?: Usuario; data?: Usuario } | Usuario) {
  if ('user' in payload && payload.user) return payload.user
  if ('data' in payload && payload.data) return payload.data
  return payload as Usuario
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api<{ user?: Usuario; data?: Usuario } | Usuario>('/v1/me')
      .then((payload) => setUsuario(extrairUsuario(payload)))
      .catch((erro) => {
        if (!(erro instanceof ApiError) || erro.status !== 401) console.error(erro)
      })
      .finally(() => setCarregando(false))
  }, [])

  async function login(email: string, password: string) {
    const payload = await api<{ user?: Usuario; data?: Usuario } | Usuario>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setUsuario(extrairUsuario(payload))
  }

  async function registrar(name: string, email: string, password: string, passwordConfirm: string) {
    void name
    const payload = await api<{ user?: Usuario; data?: Usuario } | Usuario>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, password_confirm: passwordConfirm }),
    })
    setUsuario(extrairUsuario(payload))
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    setUsuario(null)
  }

  const value = useMemo(() => ({ usuario, carregando, login, registrar, logout }), [usuario, carregando])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}
