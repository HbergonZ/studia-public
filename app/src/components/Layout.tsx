import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEstudo } from '../context/EstudoContext'
import { useAuth } from '../context/AuthContext'
import { inicioDoDia } from '../lib/curva'
import { calcularStreak, diasEstudadosDe } from '../lib/streak'
import { IconHome, IconBook, IconFile, IconSettings, IconArrowUp, IconCalendar, IconChartBar, IconClipboardList, IconUsers } from './icons'

const links = [
  { to: '/', label: 'Hoje', Icon: IconHome },
  { to: '/planejamento', label: 'Planejamento', Icon: IconCalendar },
  { to: '/progresso', label: 'Progresso', Icon: IconChartBar },
  { to: '/editais', label: 'Editais', Icon: IconFile },
  { to: '/visao-geral', label: 'Tópicos', Icon: IconClipboardList },
]

export default function Layout() {
  const { sessoes, nomeEdital, editalId, erro: erroEstudo, recarregar, statusAlteracoes, falhaAlteracoes, repetirAlteracoes, hoje } = useEstudo()
  const { usuario, logout } = useAuth()
  const { pathname } = useLocation()
  const revisandoEdital = pathname.endsWith('/revisar')
  const [mostrarTopo, setMostrarTopo] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [erro, setErro] = useState('')
  const conta = useRef<HTMLDetailsElement>(null)
  const botaoConta = useRef<HTMLElement>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const linksVisiveis = [...links, ...(usuario?.isAdmin ? [{ to: '/usuarios', label: 'Usuários', Icon: IconUsers }] : []), { to: '/configuracao', label: 'Configurar', Icon: IconSettings }]
  const nome = usuario?.name || usuario?.email.split('@')[0] || 'Minha conta'
  const streak = useMemo(() => calcularStreak(diasEstudadosDe(sessoes), inicioDoDia(new Date(hoje + 'T12:00:00'))), [sessoes, hoje])
  const data = new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const titulo = linksVisiveis.find(link => link.to !== '/' && pathname.startsWith(link.to))?.label ?? 'Área de estudos'

  useEffect(() => { setMenuAberto(false); if (conta.current) conta.current.open = false }, [pathname])

  useEffect(() => {
    function fora(event: PointerEvent) {
      if (conta.current?.open && !conta.current.contains(event.target as Node)) conta.current.open = false
    }
    function teclado(event: KeyboardEvent) {
      if (event.key === 'Escape' && conta.current?.open) {
        conta.current.open = false
        botaoConta.current?.focus()
      }
    }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', teclado)
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', teclado) }
  }, [])

  useEffect(() => {
    function verificarScroll() { setMostrarTopo(window.scrollY > 500) }
    verificarScroll()
    window.addEventListener('scroll', verificarScroll, { passive: true })
    return () => window.removeEventListener('scroll', verificarScroll)
  }, [])

  async function sair() {
    setSaindo(true); setErro('')
    try { await logout() }
    catch { setErro('Não foi possível sair. Tente novamente.'); setSaindo(false) }
  }

  return <div className="studia-app">
    <a href="#conteudo" className="skip-to-content">Pular para o conteúdo</a>
    <header className="app-sidebar">
      <NavLink to="/" className="app-brand" aria-label="Studia, início"><IconBook className="h-7 w-7" /><span>studia</span></NavLink>
      <button type="button" className="agenda-menu-toggle" aria-expanded={menuAberto} aria-controls="navegacao-principal" onClick={() => setMenuAberto(aberto => !aberto)}>{menuAberto ? 'Fechar menu' : 'Menu'}</button>
      <nav id="navegacao-principal" className={`app-navigation ${menuAberto ? 'is-open' : ''}`} aria-label="Navegação principal">{linksVisiveis.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}><Icon className="h-[18px] w-[18px]" /><span>{label}</span></NavLink>)}</nav>
      <details ref={conta} className="agenda-account"><summary ref={botaoConta} aria-label="Abrir minha conta"><span className="account-avatar" aria-hidden="true">{nome.slice(0, 2).toUpperCase()}</span><span>Minha conta</span></summary><div className="sidebar-bottom"><button type="button" className="quiet-link" onClick={() => { if (conta.current) conta.current.open = false; botaoConta.current?.focus() }}>Fechar minha conta</button>
        <div className="sidebar-account"><span className="account-avatar" aria-hidden="true">{nome.slice(0, 2).toUpperCase()}</span><div><strong title={usuario?.email}>{usuario?.email || nome}</strong><span>{usuario?.isAdmin ? 'Administrador' : 'Minha conta'}</span></div></div>
        <button onClick={() => { void sair() }} disabled={saindo} className="sidebar-logout">{saindo ? 'Saindo…' : 'Sair da conta'}</button>
        {erro && <p role="alert" className="sidebar-error">{erro}</p>}
        {streak > 0 && <p className="agenda-account-streak">{streak} {streak === 1 ? 'dia seguido de estudo' : 'dias seguidos de estudo'}</p>}
      </div></details>
    </header>
    <div className="app-main">
      <header className="app-topbar"><div className="sidebar-plan"><span>{revisandoEdital ? 'Edital em revisão' : 'Meu edital ativo'}</span><strong>{editalId ? nomeEdital : 'Nenhum edital ativo'}</strong></div><span className="agenda-route-name">{titulo}</span><time>{data}</time></header>
      <main id="conteudo" className="app-content" tabIndex={-1}><>{erroEstudo && <p role="alert" className="daily-error">{erroEstudo} <button className="quiet-link" onClick={() => void recarregar()}>Tentar novamente</button></p>}{statusAlteracoes && <p role="status" className="save-status">{statusAlteracoes}{falhaAlteracoes && <button type="button" className="quiet-link" onClick={repetirAlteracoes}>Tentar salvar novamente</button>}</p>}<Outlet /></></main>
      <footer className="app-footer"><span>Studia</span><span>Seu espaço de estudo e revisão.</span></footer>
    </div>
    {mostrarTopo && <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Voltar ao topo" className="scroll-top"><IconArrowUp className="h-5 w-5" /></button>}
  </div>
}
