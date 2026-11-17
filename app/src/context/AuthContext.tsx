import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, setCsrfToken } from '../lib/api'
import { hasSessionHint, setSessionHint } from '../lib/sessionHint'

export interface Usuario {
  id: number | string
  name?: string
  username?: string
  email: string
  isAdmin: boolean
  mustChangePassword: boolean
  hasActiveNotice?: boolean
  csrfToken: string
}

interface AuthContextValue {
  usuario: Usuario | null
  carregando: boolean
  restaurandoSessao: boolean
  erroSessao: string
  login: (email: string, password: string) => Promise<void>
  registrar: (name: string, email: string, password: string, passwordConfirm: string) => Promise<void>
  logout: () => Promise<void>
  trocarSenha: (atual: string, nova: string, confirmacao: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function extrairUsuario(payload: { user?: Usuario; data?: Usuario } | Usuario) {
  const user = ('user' in payload && payload.user) || ('data' in payload && payload.data) || payload as Usuario
  setCsrfToken(user.csrfToken)
  setSessionHint(true)
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroSessao, setErroSessao] = useState('')
  const [sessaoAnterior] = useState(hasSessionHint)
  const versaoSessao = useRef(0)

  useEffect(() => {
    function exigirTroca() {
      setUsuario(atual => atual ? { ...atual, mustChangePassword: true } : atual)
    }
    window.addEventListener('studia:password-change-required', exigirTroca)
    function expirar() { versaoSessao.current++; setUsuario(null); setCarregando(false); setSessionHint(false); setCsrfToken(''); setErroSessao('Sua sessão expirou. Entre novamente para continuar. O rascunho do cronômetro foi preservado.') }
    window.addEventListener('studia:session-expired', expirar)
    return () => { window.removeEventListener('studia:password-change-required', exigirTroca); window.removeEventListener('studia:session-expired', expirar) }
  }, [])

  useEffect(() => {
    const versao = versaoSessao.current
    let ativo = true
    api<{ user?: Usuario; data?: Usuario } | Usuario>('/v1/me')
      .then((payload) => { if (ativo && versao === versaoSessao.current) setUsuario(extrairUsuario(payload)) })
      .catch((erro) => {
        if (ativo && versao === versaoSessao.current && erro instanceof ApiError && erro.status === 401) setSessionHint(false)
        if (ativo && versao === versaoSessao.current && (!(erro instanceof ApiError) || erro.status !== 401)) setErroSessao('Não foi possível restaurar sua sessão. Verifique a conexão e tente novamente.')
      })
      .finally(() => { if (ativo && versao === versaoSessao.current) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  async function login(email: string, password: string) {
    versaoSessao.current++
    const payload = await api<{ user?: Usuario; data?: Usuario } | Usuario>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).finally(() => setCarregando(false))
    setUsuario(extrairUsuario(payload))
    setErroSessao('')
    setCarregando(false)
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
    versaoSessao.current++
    setUsuario(null)
    setSessionHint(false)
    setCsrfToken('')
    setCarregando(false)
  }

  async function trocarSenha(atual: string, nova: string, confirmacao: string) {
    versaoSessao.current++
    const payload = await api<{ user: Usuario }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: atual, password: nova, password_confirm: confirmacao }),
    })
    setUsuario(extrairUsuario(payload))
  }

  const restaurandoSessao = carregando && sessaoAnterior
  const value = useMemo(() => ({ usuario, carregando, restaurandoSessao, erroSessao, login, registrar, logout, trocarSenha }), [usuario, carregando, restaurandoSessao, erroSessao])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}
