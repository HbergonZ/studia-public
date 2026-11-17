import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import Carregamento from '../components/Carregamento'

const Contexto = createContext<((id: symbol, ativo: boolean) => void) | null>(null)

export function CarregamentoPaginaProvider({ children }: { children: ReactNode }) {
  const [pendentes, setPendentes] = useState<ReadonlySet<symbol>>(() => new Set())
  const [visivel, setVisivel] = useState(false)
  const carregando = pendentes.size > 0
  const definir = useCallback((id: symbol, ativo: boolean) => {
    setPendentes(anteriores => {
      if (anteriores.has(id) === ativo) return anteriores
      const proximos = new Set(anteriores)
      if (ativo) proximos.add(id)
      else proximos.delete(id)
      return proximos
    })
  }, [])

  useEffect(() => {
    if (carregando) {
      const timer = window.setTimeout(() => setVisivel(true), 750)
      return () => window.clearTimeout(timer)
    }
    // Keep the same indicator mounted when one loading phase hands off to another.
    const frame = window.requestAnimationFrame(() => setVisivel(false))
    return () => window.cancelAnimationFrame(frame)
  }, [carregando])

  return <Contexto.Provider value={definir}>
    <div className="contents" inert={visivel}>{children}</div>
    {visivel && <div className="fixed inset-0 z-[100] bg-canvas" data-carregamento-pagina>
      <Carregamento telaInteira rotulo="Preparando sua página" />
    </div>}
  </Contexto.Provider>
}

export function useCarregamentoPagina(ativo: boolean) {
  const definir = useContext(Contexto)
  const [identidade] = useState(() => Symbol('carregamento-pagina'))
  if (!definir) throw new Error('Use CarregamentoPaginaProvider para coordenar o carregamento.')
  useLayoutEffect(() => {
    definir(identidade, ativo)
    return () => definir(identidade, false)
  }, [definir, identidade, ativo])
}
