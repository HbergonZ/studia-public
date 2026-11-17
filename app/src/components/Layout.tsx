import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useEstudo } from '../context/EstudoContext'
import { inicioDoDia } from '../lib/curva'
import { calcularStreak, diasEstudadosDe } from '../lib/streak'
import { IconHome, IconBook, IconFile, IconSettings, IconMenu, IconArrowUp } from './icons'

const links = [
  { to: '/', label: 'Início', Icon: IconHome },
  { to: '/visao-geral', label: 'Tópicos', Icon: IconBook },
  { to: '/editais', label: 'Editais', Icon: IconFile },
  { to: '/configuracao', label: 'Configurar', Icon: IconSettings },
]

function pillClasses(isActive: boolean) {
  return [
    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-100',
  ].join(' ')
}

function drawerLinkClasses(isActive: boolean) {
  return [
    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-navy-800 hover:text-slate-100',
  ].join(' ')
}

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [mostrarTopo, setMostrarTopo] = useState(false)
  const { sessoes } = useEstudo()

  const streak = useMemo(() => {
    const hoje = inicioDoDia(new Date())
    return calcularStreak(diasEstudadosDe(sessoes), hoje)
  }, [sessoes])

  useEffect(() => {
    function verificarScroll() {
      setMostrarTopo(window.scrollY > 400)
    }
    verificarScroll()
    window.addEventListener('scroll', verificarScroll)
    return () => window.removeEventListener('scroll', verificarScroll)
  }, [])

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <header className="hidden items-center justify-between border-b border-white/10 bg-navy-900 px-8 py-3 md:flex">
        <div className="flex items-center gap-8">
          <span className="font-display text-xl font-semibold tracking-tight text-brand-300">Studia</span>
          <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {links.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => pillClasses(isActive)}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <span className="flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="#fcd34d">
                <path d="M10 2s3 3.5 3 6.5a3 3 0 1 1-6 0c0-.9.4-1.7.9-2.3C8.2 7 8 8 8 8s-3 2.2-3 5.5a5 5 0 0 0 10 0C15 8 10 2 10 2Z" />
              </svg>
              <span className="text-sm font-medium text-amber-300">
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </span>
            </span>
          )}
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400">Protótipo</span>
        </div>
      </header>

      <header className="flex items-center gap-3 border-b border-white/10 bg-navy-900 px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-navy-800 hover:text-white"
        >
          <IconMenu className="h-6 w-6" />
        </button>
        <p className="flex-1 font-display font-semibold text-brand-300">Studia</p>
        <span className="rounded-full bg-amber-400/15 px-2 py-1 text-xs font-medium text-amber-300">Protótipo</span>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-8">
        <Outlet />
      </main>

      {mostrarTopo && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-navy-800 text-slate-200 shadow-lg transition-colors hover:bg-navy-700"
        >
          <IconArrowUp className="h-5 w-5" />
        </button>
      )}

      {menuAberto && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div className="animate-overlay absolute inset-0 bg-black/60" onClick={() => setMenuAberto(false)} />
          <div className="animate-drawer relative flex h-full w-64 flex-col bg-navy-900 p-4 shadow-xl">
            <div className="mb-8 flex items-center justify-between px-2">
              <span className="font-display font-semibold text-brand-300">Studia</span>
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-navy-800 hover:text-white"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {links.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) => drawerLinkClasses(isActive)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
