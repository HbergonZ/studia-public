import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export default function TrocarSenha() {
  const { trocarSenha, logout } = useAuth()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(event: FormEvent) {
    event.preventDefault()
    setErro('')
    if (nova !== confirmacao) { setErro('As senhas não coincidem.'); return }
    setEnviando(true)
    try { await trocarSenha(atual, nova, confirmacao) }
    catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível trocar a senha.') }
    finally { setEnviando(false) }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <p className="font-display text-2xl font-semibold text-brand-600">Studia</p>
      <h1 className="mt-6 text-xl font-semibold">Escolha sua senha</h1>
      <p className="mt-2 text-sm text-muted">Para continuar, substitua a senha temporária por uma senha que só você conheça.</p>
      <form onSubmit={enviar} className="mt-6 flex flex-col gap-4">
        <label className="text-sm">Senha temporária<input required type="password" autoComplete="current-password" value={atual} onChange={e => setAtual(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-soft px-3 py-2.5" /></label>
        <label className="text-sm">Nova senha<input required type="password" minLength={8} autoComplete="new-password" value={nova} onChange={e => setNova(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-soft px-3 py-2.5" /></label>
        <label className="text-sm">Confirmar nova senha<input required type="password" minLength={8} autoComplete="new-password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-soft px-3 py-2.5" /></label>
        <p className="text-xs text-muted">Use pelo menos 8 caracteres e evite senhas comuns ou seus dados pessoais.</p>
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
        <button disabled={enviando} className="rounded-md bg-brand-600 px-4 py-3 font-medium text-on-brand disabled:opacity-60">{enviando ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>
      <button disabled={enviando} onClick={() => { void logout().catch(() => setErro('Não foi possível sair. Tente novamente.')) }} className="mt-5 text-sm text-muted">Sair da conta</button>
    </section>
  </main>
}
