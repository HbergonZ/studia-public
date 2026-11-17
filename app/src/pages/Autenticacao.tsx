import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'

export default function Autenticacao() {
  const { usuario, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

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
    <main className="flex min-h-screen items-center justify-center bg-navy-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-navy-900 p-7 shadow-2xl">
        <p className="font-display text-2xl font-semibold text-brand-300">Studia</p>
        <h1 className="mt-7 text-xl font-semibold text-white">Entrar</h1>
        <p className="mt-1 text-sm text-slate-400">Organize seus estudos e revisões em um só lugar.</p>
        <form onSubmit={enviar} className="mt-6 flex flex-col gap-4">
          <Campo label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <Campo label="Senha" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
          {erro && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}
          <button disabled={enviando} className="rounded-xl bg-brand-600 px-4 py-3 font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-60">
            {enviando ? 'Aguarde…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}

function Campo({ label, value, onChange, type = 'text', autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) {
  return <label className="flex flex-col gap-1.5 text-sm text-slate-300">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="rounded-xl border border-white/10 bg-navy-850 px-3 py-2.5 text-white outline-none transition-colors focus:border-brand-400/60" /></label>
}
