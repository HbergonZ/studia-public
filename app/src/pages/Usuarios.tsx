import Carregamento from '../components/Carregamento'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

interface Conta { id: number; email: string; isAdmin: boolean; mustChangePassword: boolean }

export default function Usuarios() {
  const { usuario } = useAuth()
  const [contas, setContas] = useState<Conta[]>([])
  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [redefinindo, setRedefinindo] = useState(false)

  async function redefinir(conta: Conta) {
    if (redefinindo || !window.confirm(`Redefinir o acesso de ${conta.email}? As sessões anteriores serão encerradas e será gerada outra senha temporária.`)) return
    setRedefinindo(true); setErro('')
    try {
      const resultado = await api<{message: string}>(`/v1/admin/users/${conta.id}/reset-access`, { method: 'POST' })
      setMensagem(resultado.message); setCopiado(false)
      setContas(lista => lista.map(c => c.id === conta.id ? { ...c, mustChangePassword: true } : c))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível redefinir o acesso.') }
    finally { setRedefinindo(false) }
  }

  useEffect(() => {
    if (!usuario?.isAdmin) return
    let ativo = true
    api<Conta[]>('/v1/admin/users').then(dados => { if (ativo) setContas(dados) })
      .catch(error => { if (ativo) setErro(error instanceof Error ? error.message : 'Falha ao carregar usuários.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [usuario?.isAdmin])

  if (!usuario?.isAdmin) return <Navigate to="/" replace />

  async function criar(event: FormEvent) {
    event.preventDefault()
    setErro(''); setEnviando(true)
    try {
      const resultado = await api<{ user: Conta; message: string }>('/v1/admin/users', { method: 'POST', body: JSON.stringify({ email }) })
      setContas(anteriores => [resultado.user, ...anteriores])
      setMensagem(resultado.message); setCopiado(false); setEmail('')
    } catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível criar a conta.') }
    finally { setEnviando(false) }
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(mensagem); setCopiado(true) }
    catch { setErro('Não foi possível copiar. Selecione a mensagem e copie manualmente.') }
  }

  return <div className="users-page">
    <div><h1 className="text-2xl font-semibold">Usuários</h1><p className="mt-2 text-sm text-muted">Crie contas com senha temporária. Cada pessoa deverá trocá-la no primeiro acesso.</p></div>
    {erro && <p role="alert" className="rounded-md bg-red-500/10 p-4 text-sm text-red-700">{erro}</p>}
    {mensagem ? <section className="space-y-4 rounded-lg border border-brand-400/30 bg-surface p-5">
      <h2 className="font-semibold">Dados de acesso prontos para enviar.</h2>
      <p className="text-sm text-muted">Esta senha aparece apenas agora. Copie a mensagem antes de fechar ou sair da página.</p>
      <textarea aria-label="Mensagem de acesso" readOnly value={mensagem} rows={10} className="w-full rounded-md border border-line bg-canvas p-4 text-sm" />
      <div className="flex flex-wrap gap-3"><button onClick={() => { void copiar() }} className="rounded-md bg-brand-600 px-4 py-2 text-on-brand">{copiado ? 'Copiado' : 'Copiar mensagem'}</button><button onClick={() => { setMensagem(''); setCopiado(false) }} className="rounded-md border border-line px-4 py-2">Fechar mensagem</button></div>
    </section> : <form onSubmit={criar} className="space-y-4 rounded-lg border border-line bg-surface p-5">
      <h2 className="font-semibold">Nova conta</h2>
      <label className="block text-sm">E-mail<input required type="email" maxLength={254} autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-md border border-line bg-soft px-3 py-2.5" /></label>
      <button disabled={enviando || redefinindo} className="rounded-md bg-brand-600 px-4 py-2.5 text-on-brand disabled:opacity-60">{enviando ? 'Criando…' : 'Criar conta e gerar mensagem'}</button>
    </form>}
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-4 font-semibold">Contas cadastradas ({contas.length})</h2>
      {carregando ? <Carregamento rotulo="Carregando contas" /> : <ul className="max-h-96 overflow-y-auto divide-y divide-line" tabIndex={0} aria-label="Contas cadastradas">{contas.map(conta => <li key={conta.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="break-all text-sm">{conta.email}</span><span className="text-xs text-muted">{conta.isAdmin ? 'Administrador' : conta.mustChangePassword ? 'Aguardando troca de senha' : 'Usuário'}</span>{!conta.isAdmin && <button type="button" className="daily-button" disabled={redefinindo || enviando} onClick={() => void redefinir(conta)}>Redefinir acesso</button>}</li>)}</ul>}
    </section>
  </div>
}
