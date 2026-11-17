import { useEffect, useRef, useState } from 'react'

export type ModoPomodoro = 'foco' | 'curta' | 'longa'

export const DURACOES_POMODORO: Record<ModoPomodoro, number> = {
  foco: 25 * 60,
  curta: 5 * 60,
  longa: 15 * 60,
}

export const LABELS_POMODORO: Record<ModoPomodoro, string> = {
  foco: 'Foco',
  curta: 'Pausa curta',
  longa: 'Pausa longa',
}

export function formatarTempo(segundos: number) {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function clamp(valor: number, min: number, max: number) {
  return Math.min(max, Math.max(min, valor))
}

export interface RascunhoPomodoro { blockId: string; date: string; modo: ModoPomodoro; duracaoBase: number; restante: number; segundosEstudados: number }

function lerRascunho(chave: string): RascunhoPomodoro | null {
  for (const key of Object.keys(localStorage).filter(k => k === chave || k.startsWith(chave + ':')).sort()) {
    let value: RascunhoPomodoro | null = null
    try { value = JSON.parse(localStorage.getItem(key) ?? 'null') } catch { continue }
    if (value && typeof value.blockId === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date) && ['foco','curta','longa'].includes(value.modo) && [value.duracaoBase,value.restante,value.segundosEstudados].every(n => Number.isInteger(n) && n >= 0 && n <= 360000) && value.restante <= value.duracaoBase && value.segundosEstudados > 0) return value
  }
  return null
}

export function usePomodoro(chave?: string) {
  const [modo, setModo] = useState<ModoPomodoro>('foco')
  const [duracaoBase, setDuracaoBase] = useState(DURACOES_POMODORO.foco)
  const [restante, setRestante] = useState(DURACOES_POMODORO.foco)
  const [rodando, setRodando] = useState(false)
  const [modoFoco, setModoFoco] = useState(false)
  const [segundosEstudados, setSegundosEstudados] = useState(0)
  const [rascunho, setRascunho] = useState<RascunhoPomodoro | null>(null)
  const [erroRascunho, setErroRascunho] = useState('')
  const permitirSalvar = useRef(false)
  const vinculo = useRef({ blockId: '', date: '' })
  const chaveCarregada = useRef<string | undefined>(undefined)
  useEffect(() => {
    permitirSalvar.current = false; chaveCarregada.current = chave
    setRodando(false); setModoFoco(false); setSegundosEstudados(0); setRascunho(null)
    if (!chave) return
    try {
      setRascunho(lerRascunho(chave))
    } catch { setErroRascunho('Não foi possível acessar o rascunho local. Registre o estudo antes de sair desta tela.') }
  }, [chave])
  useEffect(() => {
    if (!chave || chaveCarregada.current !== chave || !permitirSalvar.current || segundosEstudados <= 0 || !vinculo.current.blockId) return
    try { localStorage.setItem(`${chave}:${vinculo.current.blockId}`, JSON.stringify({ ...vinculo.current, modo, duracaoBase, restante, segundosEstudados })) }
    catch { setErroRascunho('Não foi possível guardar o rascunho neste navegador. Registre o estudo antes de sair.') }
  }, [chave, modo, duracaoBase, restante, segundosEstudados])
  function apagarRascunho() {
    let proximo: RascunhoPomodoro | null = null
    try {
      if (chave) {
        const id = rascunho?.blockId ?? vinculo.current.blockId
        localStorage.removeItem(`${chave}:${id}`)
        const legado = JSON.parse(localStorage.getItem(chave) ?? 'null')
        if (legado?.blockId === id) localStorage.removeItem(chave)
        proximo = lerRascunho(chave)
      }
    } catch { /* In-memory state remains available. */ }
    setRascunho(proximo)
  }
  function recuperar() {
    if (!rascunho) return
    vinculo.current = { blockId: rascunho.blockId, date: rascunho.date }; permitirSalvar.current = true
    setModo(rascunho.modo); setDuracaoBase(rascunho.duracaoBase); setRestante(rascunho.restante); setSegundosEstudados(rascunho.segundosEstudados); setRodando(false); setRascunho(null)
  }
  const restanteRef = useRef(restante)
  useEffect(() => { restanteRef.current = restante }, [restante])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!rodando) return
    let ultimaAtualizacao = performance.now()
    intervalRef.current = setInterval(() => {
      const delta = Math.floor((performance.now() - ultimaAtualizacao) / 1000)
      if (delta < 1) return
      ultimaAtualizacao += delta * 1000
      const realizado = Math.min(delta, restanteRef.current)
      restanteRef.current = Math.max(0, restanteRef.current - delta)
      setRestante(restanteRef.current)
      if (modo === 'foco') setSegundosEstudados(atual => atual + realizado)
      if (restanteRef.current === 0) setRodando(false)
    }, 250)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [rodando, modo])

  function encerrar() {
    setRodando(false)
    setModoFoco(false)
  }

  useEffect(() => {
    if (!modoFoco) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') encerrar()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [modoFoco])

  function trocarModo(novoModo: ModoPomodoro) {
    setModo(novoModo)
    setDuracaoBase(DURACOES_POMODORO[novoModo])
    setRestante(DURACOES_POMODORO[novoModo])
    setRodando(false)
  }

  function alternarPlay() {
    permitirSalvar.current = true
    setRodando((atual) => {
      const novoRodando = !atual
      if (novoRodando) setModoFoco(true)
      return novoRodando
    })
  }

  function reiniciar(confirmado = false) {
    if (!confirmado && segundosEstudados > 0 && !window.confirm('Reiniciar e descartar o tempo ainda não registrado?')) return
    if (segundosEstudados > 0 || confirmado) apagarRascunho()
    setSegundosEstudados(0)
    setRestante(duracaoBase)
    setRodando(false)
  }

  function aplicarTempo(horas: number, minutos: number, segundos: number) {
    const total = clamp(horas, 0, 99) * 3600 + clamp(minutos, 0, 59) * 60 + clamp(segundos, 0, 59)
    const seguro = Math.max(1, total)
    setDuracaoBase(seguro)
    setRestante(seguro)
  }

  return {
    rascunho, erroRascunho, recuperar, apagarRascunho,
    vincular: (blockId: string, date: string) => { vinculo.current = { blockId, date } },
    segundosEstudados,
    modo,
    duracaoBase,
    restante,
    rodando,
    modoFoco,
    setModoFoco,
    trocarModo,
    alternarPlay,
    reiniciar,
    encerrar,
    aplicarTempo,
  }
}

export type PomodoroEstado = ReturnType<typeof usePomodoro>
