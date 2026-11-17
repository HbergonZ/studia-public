import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import { IconBook } from '../components/icons'
import RestaurandoSessao from '../components/RestaurandoSessao'

export default function Autenticacao() {
  const { usuario, login, restaurandoSessao, erroSessao } = useAuth()
  const { pathname } = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={pathname === '/entrar' ? '/' : pathname} replace />
  if (restaurandoSessao) return <RestaurandoSessao />

  async function enviar(event: FormEvent) {
    event.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await login(email, password)
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível acessar sua conta.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="auth-brand"><IconBook className="h-6 w-6" />Studia</p>
        <h1 className="mt-7 text-xl font-semibold text-ink">Entrar</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Use seu e-mail e senha para acessar seus estudos.</p>
        {erroSessao && <p role="alert" className="daily-error mt-4">{erroSessao} <button type="button" className="quiet-link" onClick={() => window.location.reload()}>Tentar restaurar sessão</button></p>}
        <p className="mt-3 text-sm text-muted">Esqueceu a senha ou perdeu o primeiro acesso? Peça ao administrador para redefinir seu acesso.</p>
        <form onSubmit={enviar} className="mt-6 flex flex-col gap-4">
          <Campo label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <Campo label="Senha" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
          {erro && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <button disabled={enviando} className="rounded-md bg-brand-600 px-4 py-3 font-medium text-on-brand transition-colors hover:bg-brand-500 disabled:opacity-60">
            {enviando ? 'Aguarde…' : 'Entrar'}
          </button>
        </form>
        <p className="auth-access-note">O acesso é fornecido pelo administrador.</p>
      </div>
    </main>
  )
}

function Campo({ label, value, onChange, type = 'text', autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) {
  return <label className="flex flex-col gap-1.5 text-sm text-ink">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="rounded-md border border-line bg-soft px-3 py-2.5 text-ink outline-none transition-colors focus:border-brand-400/60" /></label>
}
